import { NextResponse } from 'next/server';
import { Connection, PublicKey, VersionedTransaction, TransactionMessage, Keypair } from '@solana/web3.js';
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferCheckedInstruction,
} from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';
import { BN } from '@coral-xyz/anchor';
import { TicktoClient } from '@/lib/tickto-program';

export const dynamic = 'force-dynamic';

// --- Constants ---
const USDC_DECIMALS = 6;
const GAS_REIMBURSEMENT_USDC = 0.02; // Fee to cover relayer SOL gas

function getEnvOrThrow(key: string): string {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var: ${key}`);
    return val;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { ticketId, buyerWallet } = body as {
            ticketId: string;
            buyerWallet: string;
        };

        if (!ticketId || !buyerWallet) {
            return NextResponse.json({ error: 'Missing required fields: ticketId, buyerWallet' }, { status: 400 });
        }

        let buyerPubkey: PublicKey;
        try {
            buyerPubkey = new PublicKey(buyerWallet);
        } catch {
            return NextResponse.json({ error: 'Invalid buyer wallet address' }, { status: 400 });
        }

        // 1. Initialize Supabase and connection
        const supabase = createClient(
            getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
            getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')
        );

        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            { commitment: 'confirmed' }
        );

        // 2. Fetch ticket details from database
        const { data: ticket, error: ticketErr } = await supabase
            .from('tickets')
            .select('*, events(*)')
            .eq('id', ticketId)
            .single();

        if (ticketErr || !ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        if (ticket.listing_status !== 'active' || !ticket.listing_price_usd) {
            return NextResponse.json({ error: 'Ticket is not currently listed for sale' }, { status: 400 });
        }

        const event = ticket.events;
        if (!event || !event.organizer_wallet) {
            return NextResponse.json({ error: 'Associated event or organizer wallet not found' }, { status: 400 });
        }

        // 3. Resolve Asset ID and fetch compression details from Helius
        const assetId = ticket.asset_id;
        if (!assetId) {
            return NextResponse.json({ error: 'On-chain asset ID not found for this ticket' }, { status: 400 });
        }

        const HELIUS_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

        // Fetch Proof
        const proofRes = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'resell-proof',
                method: 'getAssetProof',
                params: { id: assetId }
            }),
        });
        const { result: proofData } = await proofRes.json();
        if (!proofData) {
            return NextResponse.json({ error: 'Could not fetch asset proof from RPC' }, { status: 400 });
        }

        // Fetch Asset Compression Metadata
        const assetMetaRes = await fetch(HELIUS_RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'resell-meta',
                method: 'getAsset',
                params: { id: assetId }
            }),
        });
        const { result: assetMeta } = await assetMetaRes.json();
        if (!assetMeta || !assetMeta.compression || !assetMeta.ownership) {
            return NextResponse.json({ error: 'Could not fetch asset compression metadata from RPC' }, { status: 400 });
        }

        const sellerWallet = assetMeta.ownership.owner;
        const sellerPubkey = new PublicKey(sellerWallet);

        if (buyerPubkey.equals(sellerPubkey)) {
            return NextResponse.json({ error: 'Buyer cannot be the seller of the ticket' }, { status: 400 });
        }

        // Decode compression parameters
        const root = Array.from(bs58.decode(proofData.root));
        const c_dataHash = Array.from(bs58.decode(assetMeta.compression.data_hash));
        const c_creatorHash = Array.from(bs58.decode(assetMeta.compression.creator_hash));
        const c_nonce = new BN(assetMeta.compression.leaf_id);
        const c_index = assetMeta.compression.leaf_id;
        const proofKeys = proofData.proof.map((p: string) => new PublicKey(p));

        // 4. Calculate prices in micro-USDC (6 decimals)
        const salePriceMicro = Math.floor(Number(ticket.listing_price_usd) * 1_000_000);
        const gasFeeMicro = Math.floor(GAS_REIMBURSEMENT_USDC * 1_000_000);

        // 5. Build transaction instructions
        const relayerKeypair = Keypair.fromSecretKey(bs58.decode(getEnvOrThrow('RELAYER_PRIVATE_KEY')));
        const relayerPubkey = relayerKeypair.publicKey;
        const usdcMint = new PublicKey(getEnvOrThrow('NEXT_PUBLIC_USDC_MINT_ADDRESS'));
        const merkleTree = new PublicKey(getEnvOrThrow('NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY'));
        const organizerPubkey = new PublicKey(event.organizer_wallet);

        const buyerAta = getAssociatedTokenAddressSync(usdcMint, buyerPubkey, true);
        const sellerAta = getAssociatedTokenAddressSync(usdcMint, sellerPubkey, true);
        const organizerAta = getAssociatedTokenAddressSync(usdcMint, organizerPubkey, true);
        const relayerAta = getAssociatedTokenAddressSync(usdcMint, relayerPubkey, true);

        const instructions = [];

        // 5a. Create necessary ATAs
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                relayerPubkey, // relayer pays for creating token accounts
                sellerAta,
                sellerPubkey,
                usdcMint
            )
        );
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                relayerPubkey,
                organizerAta,
                organizerPubkey,
                usdcMint
            )
        );
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                relayerPubkey,
                relayerAta,
                relayerPubkey,
                usdcMint
            )
        );

        // 5b. Transfer Relayer gas fee (buyer → relayer)
        if (gasFeeMicro > 0) {
            instructions.push(
                createTransferCheckedInstruction(
                    buyerAta,
                    usdcMint,
                    relayerAta,
                    buyerPubkey,
                    gasFeeMicro,
                    USDC_DECIMALS
                )
            );
        }

        // 5c. Resell Ticket Smart Contract instruction
        const ticktoClient = new TicktoClient(connection);
        const resellIx = await ticktoClient.createResellTicketIx(
            buyerPubkey,
            sellerPubkey,
            organizerPubkey,
            event.id,
            merkleTree,
            relayerPubkey,
            buyerAta,
            sellerAta,
            organizerAta,
            root,
            c_dataHash,
            c_creatorHash,
            c_nonce,
            c_index,
            new BN(salePriceMicro),
            proofKeys
        );
        instructions.push(resellIx);

        // 6. Build VersionedTransaction
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');
        const messageV0 = new TransactionMessage({
            payerKey: relayerPubkey, // relayer pays transaction fee
            recentBlockhash: latestBlockhash.blockhash,
            instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        // 7. Simulate transaction
        const simResult = await connection.simulateTransaction(transaction);
        if (simResult.value.err) {
            console.error('[RESELL] Simulation failed:', JSON.stringify(simResult.value.err));
            console.error('[RESELL] Logs:', simResult.value.logs);
            return NextResponse.json({
                error: 'Resale transaction simulation failed',
                details: simResult.value.err,
                logs: simResult.value.logs,
            }, { status: 400 });
        }

        // 8. Sign transaction with Relayer Keypair (feePayer & backendAuthority)
        transaction.sign([relayerKeypair]);

        const serialized = Buffer.from(transaction.serialize()).toString('base64');

        return NextResponse.json({
            transaction: serialized,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            summary: {
                salePriceUsd: Number(ticket.listing_price_usd),
                gasFeeUsd: GAS_REIMBURSEMENT_USDC,
                totalUsd: Number(ticket.listing_price_usd) + GAS_REIMBURSEMENT_USDC,
            }
        });

    } catch (err: any) {
        console.error('[RESELL] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
