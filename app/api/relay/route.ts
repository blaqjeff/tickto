import { NextResponse } from 'next/server';
import { Connection, PublicKey, VersionedTransaction, TransactionMessage, Keypair } from '@solana/web3.js';
import {
    getAssociatedTokenAddressSync,
    createAssociatedTokenAccountIdempotentInstruction,
    createTransferCheckedInstruction,
} from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import bs58 from 'bs58';
import { TicktoClient } from '@/lib/tickto-program';

// --- Constants ---
const USDC_DECIMALS = 6;
const GAS_REIMBURSEMENT_USDC = 0.02; // 0.02 USDC to cover relayer gas + tree rent costs
const PLATFORM_FEE_USDC = 0;         // Platform fee (set to 0 for now, easy to change later)

// --- Environment ---
function getEnvOrThrow(key: string): string {
    const val = process.env[key];
    if (!val) throw new Error(`Missing env var: ${key}`);
    return val;
}

export async function POST(req: Request) {
    try {
        // 1. Parse + validate request
        const body = await req.json();
        const { eventId, tierQuantities, buyerWallet } = body as {
            eventId: string;
            tierQuantities: Record<string, number>;
            buyerWallet: string;
        };

        if (!eventId || !tierQuantities || !buyerWallet) {
            return NextResponse.json({ error: 'Missing required fields: eventId, tierQuantities, buyerWallet' }, { status: 400 });
        }

        if (Object.values(tierQuantities).every((q) => q === 0)) {
            return NextResponse.json({ error: 'No tickets selected' }, { status: 400 });
        }

        // Validate buyer pubkey
        let buyerPubkey: PublicKey;
        try {
            buyerPubkey = new PublicKey(buyerWallet);
        } catch {
            return NextResponse.json({ error: 'Invalid buyer wallet address' }, { status: 400 });
        }

        // 2. Load relayer keypair
        const relayerKeypair = Keypair.fromSecretKey(bs58.decode(getEnvOrThrow('RELAYER_PRIVATE_KEY')));
        const relayerPubkey = relayerKeypair.publicKey;

        const usdcMint = new PublicKey(getEnvOrThrow('NEXT_PUBLIC_USDC_MINT_ADDRESS'));
        const merkleTree = new PublicKey(getEnvOrThrow('NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY'));

        // 3. Fetch event from Supabase
        const supabase = createClient(
            getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
            getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')
        );

        const { data: event, error: eventErr } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (eventErr || !event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        if (!event.organizer_wallet) {
            return NextResponse.json({ error: 'Event has no organizer wallet configured' }, { status: 400 });
        }

        const organizerPubkey = new PublicKey(event.organizer_wallet);

        // 4. Calculate USDC amounts from tier prices
        const dbTiers = event.ticket_tiers || event.tiers || [];
        const tiers = dbTiers.length > 0
            ? dbTiers
            : [{ id: 'general', name: 'General Admission', price: event.price_usd || 0 }];

        let ticketPriceUsd = 0;
        let totalQty = 0;

        for (const [tierId, qty] of Object.entries(tierQuantities) as [string, number][]) {
            if (qty <= 0) continue;
            const tier = tiers.find((t: any) => t.id === tierId || t.name === tierId);
            if (!tier) {
                return NextResponse.json({
                    error: `Tier '${tierId}' not found. Available: ${tiers.map((t: any) => t.id || t.name).join(', ')}`
                }, { status: 400 });
            }
            ticketPriceUsd += tier.price * qty;
            totalQty += qty;
        }

        if (totalQty === 0) {
            return NextResponse.json({ error: 'Zero quantity' }, { status: 400 });
        }

        // Convert to micro-USDC (6 decimals)
        const ticketPriceMicro = Math.floor(ticketPriceUsd * 1_000_000);
        const gasReimbursementMicro = Math.floor(GAS_REIMBURSEMENT_USDC * 1_000_000);
        const platformFeeMicro = Math.floor(PLATFORM_FEE_USDC * 1_000_000);
        const totalUserPaysMicro = ticketPriceMicro + gasReimbursementMicro + platformFeeMicro;

        // 5. Build transaction instructions
        const connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
            { commitment: 'confirmed' }
        );

        const buyerAta = getAssociatedTokenAddressSync(usdcMint, buyerPubkey, true);
        const organizerAta = getAssociatedTokenAddressSync(usdcMint, organizerPubkey, true);
        const relayerAta = getAssociatedTokenAddressSync(usdcMint, relayerPubkey, true);

        const instructions = [];

        // 5a. Create ATAs (idempotent — won't fail if they already exist)
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                relayerPubkey,  // payer (relayer pays for ATA creation)
                organizerAta,
                organizerPubkey,
                usdcMint,
            )
        );
        instructions.push(
            createAssociatedTokenAccountIdempotentInstruction(
                relayerPubkey,
                relayerAta,
                relayerPubkey,
                usdcMint,
            )
        );

        // 5b. Transfer USDC: buyer → organizer (ticket price)
        if (ticketPriceMicro > 0) {
            instructions.push(
                createTransferCheckedInstruction(
                    buyerAta,        // from
                    usdcMint,        // mint
                    organizerAta,    // to
                    buyerPubkey,     // owner (buyer signs)
                    ticketPriceMicro,
                    USDC_DECIMALS,
                )
            );
        }

        // 5c. Transfer USDC: buyer → relayer (gas reimbursement)
        if (gasReimbursementMicro > 0) {
            instructions.push(
                createTransferCheckedInstruction(
                    buyerAta,
                    usdcMint,
                    relayerAta,
                    buyerPubkey,
                    gasReimbursementMicro,
                    USDC_DECIMALS,
                )
            );
        }

        // 5d. Transfer USDC: buyer → treasury (platform fee) — currently $0
        // When platform fees are enabled, add another transfer instruction here
        // pointing to a TREASURY_WALLET instead of the relayer.

        // 5e. Mint ticket cNFT
        const ticktoClient = new TicktoClient(connection);
        const mintIx = await ticktoClient.createMintTicketIx(
            buyerPubkey,
            organizerPubkey,
            eventId,
            merkleTree,
            relayerPubkey,  // backendAuthority = relayer
        );
        instructions.push(mintIx);

        // 6. Build VersionedTransaction
        const latestBlockhash = await connection.getLatestBlockhash('confirmed');

        const messageV0 = new TransactionMessage({
            payerKey: relayerPubkey,  // relayer pays gas
            recentBlockhash: latestBlockhash.blockhash,
            instructions,
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);

        // 7. Simulate before signing
        const simResult = await connection.simulateTransaction(transaction);
        if (simResult.value.err) {
            console.error('[RELAY] Simulation failed:', JSON.stringify(simResult.value.err));
            console.error('[RELAY] Logs:', simResult.value.logs);
            return NextResponse.json({
                error: 'Transaction simulation failed',
                details: simResult.value.err,
                logs: simResult.value.logs,
            }, { status: 400 });
        }

        // 8. Sign with relayer (feePayer + backendAuthority)
        transaction.sign([relayerKeypair]);

        // 9. Return partially-signed transaction
        const serialized = Buffer.from(transaction.serialize()).toString('base64');

        return NextResponse.json({
            transaction: serialized,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            summary: {
                ticketPriceUsd,
                gasReimbursementUsd: GAS_REIMBURSEMENT_USDC,
                platformFeeUsd: PLATFORM_FEE_USDC,
                totalUsd: ticketPriceUsd + GAS_REIMBURSEMENT_USDC + PLATFORM_FEE_USDC,
                totalQty,
            },
        });

    } catch (err: any) {
        console.error('[RELAY] Error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
