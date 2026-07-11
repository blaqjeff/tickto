import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Connection, Keypair, PublicKey, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { TicktoClient } from '@/lib/tickto-program';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

// 1. Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

// 2. Initialize Solana Admin
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

// Load Keypair: Fallback to a generated one during build if the env var is missing
const adminKeypair = process.env.SOLANA_ADMIN_PRIVATE_KEY
    ? Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_ADMIN_PRIVATE_KEY))
    : Keypair.generate();

const ticktoClient = new TicktoClient(connection);

const HELIUS_RPC_URL = RPC_URL; // Used for DAS API calls

async function getAssetProof(assetId: string) {
    const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'my-id',
            method: 'getAssetProof',
            params: { id: assetId }
        }),
    });
    const { result } = await response.json();
    return result;
}

// We need a helper to find the specific asset ID using the mint_tx signature.
async function getAssetByMintTx(signature: string) {
    // Helius doesn't easily let us query "what asset was minted in tx X". 
    // We can query the tx itself to get the assetId.
    const tx = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    if (!tx || !tx.meta) return null;

    // Bubblegum logs typically emit the asset ID or we can parse the leaf index from CPI logs.
    // Instead, since the tree is public, maybe we can search by owner if needed.
    // BUT the simplest approach using Helius is to look at the tx state changes or log messages.
    // Or we could query `/v0/transactions` on Helius? Let's check the logs.
    // Actually, we can fetch all assets for the specific owner, but that's slow.
    // To reliably get the asset ID from mint, the Bubblegum program logs the tree and index: `Program log: Leaf Index: XX`

    // Bubblegum "MintV2" instructions emit: `Program log: Leaf Index: XX`
    const leafIndexLog = tx.meta.logMessages?.find(l => l.includes("Leaf Index: "));
    if (!leafIndexLog) return null;

    // Parse index
    const leafIndexStr = leafIndexLog.split("Leaf Index: ")[1].trim();
    const leafIndex = parseInt(leafIndexStr, 10);

    // The assetId for a compressed NFT is just a PDA derived from the Merkle Tree and Leaf Index!
    const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
    const [assetIdPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from("asset", "utf8"),
            new PublicKey(process.env.NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY!).toBuffer(),
            Uint8Array.from(new BN(leafIndex).toArray('le', 8)), // Leaf index as u64 Little Endian
        ],
        BUBBLEGUM_PROGRAM_ID
    );

    return assetIdPda.toBase58();
}
// We imported Anchor BN, let's just make a utility
import { BN } from '@coral-xyz/anchor';

export async function GET(req: Request) {
    // Verify secret for basic security against uninvited invocations
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Just return 401 if unauthorized
        // BUT for MVP testing, allow if secret is absent or match
        if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // 1. Fetch up to 10 used but unburned tickets
        const { data: tickets, error } = await supabaseAdmin
            .from('tickets')
            .select('id, mint_tx, owner_id')
            .eq('status', 'used')
            .eq('is_burned_onchain', false)
            .not('mint_tx', 'is', null) // Must have a mint_tx
            .limit(10);

        if (error) throw error;
        if (!tickets || tickets.length === 0) {
            return NextResponse.json({ message: 'No tickets require burning.' }, { status: 200 });
        }

        const merkleTree = new PublicKey(process.env.NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY!);
        const burnedIds = [];
        const errors = [];

        for (const ticket of tickets) {
            try {
                // Determine Asset ID via transaction logs
                const assetId = await getAssetByMintTx(ticket.mint_tx);
                if (!assetId) {
                    errors.push({ id: ticket.id, msg: 'Asset ID not deducible from tx logs' });
                    continue;
                }

                // Fetch Merkle Proof from Helius
                const proofData = await getAssetProof(assetId);
                if (!proofData) {
                    errors.push({ id: ticket.id, msg: 'Could not fetch asset proof' });
                    continue;
                }

                // Prepare parameters
                const root = Array.from(bs58.decode(proofData.root));
                const dataHash = Array.from(bs58.decode(proofData.leaf)); // Oh wait, leaf is not data_hash. 
                // DAS API returns: tree_id, root, leaf, proof, node_index
                // We need `dataHash` and `creatorHash` and `nonce`.

                // Real DAS return for `getAssetProof` does NOT have dataHash/creatorHash. 
                // We need `getAsset` to get the compression specifics!
                const assetMetaRes = await fetch(HELIUS_RPC_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 'my-id',
                        method: 'getAsset',
                        params: { id: assetId }
                    }),
                });
                const { result: assetMeta } = await assetMetaRes.json();

                if (!assetMeta || !assetMeta.compression) {
                    errors.push({ id: ticket.id, msg: 'Could not fetch asset compression metadata' });
                    continue;
                }

                const c_dataHash = Array.from(bs58.decode(assetMeta.compression.data_hash));
                const c_creatorHash = Array.from(bs58.decode(assetMeta.compression.creator_hash));
                const c_nonce = new BN(assetMeta.compression.leaf_id);
                const c_index = assetMeta.compression.leaf_id;

                // Proof is returned as an array of base58 strings
                const proofKeys = proofData.proof.map((p: string) => new PublicKey(p));

                // Formulate Burn Instruction
                const burnIx = await ticktoClient.createBurnTicketIx(
                    adminKeypair.publicKey,
                    new PublicKey(ticket.owner_id), // Leaf Owner (usually ticket owner_id, but the PDA signs on its behalf)
                    merkleTree,
                    root,
                    c_dataHash,
                    c_creatorHash,
                    c_nonce,
                    c_index,
                    proofKeys
                );

                // Build and send atomic transaction
                const blockhashInfo = await connection.getLatestBlockhash('confirmed');
                const messageV0 = new TransactionMessage({
                    payerKey: adminKeypair.publicKey,
                    recentBlockhash: blockhashInfo.blockhash,
                    instructions: [burnIx],
                }).compileToV0Message();

                const transaction = new VersionedTransaction(messageV0);
                transaction.sign([adminKeypair]);

                const txId = await connection.sendTransaction(transaction);
                await connection.confirmTransaction({
                    signature: txId,
                    blockhash: blockhashInfo.blockhash,
                    lastValidBlockHeight: blockhashInfo.lastValidBlockHeight
                });

                // Update database strictly upon finality
                await supabaseAdmin
                    .from('tickets')
                    .update({ is_burned_onchain: true })
                    .eq('id', ticket.id);

                burnedIds.push(ticket.id);
            } catch (err: any) {
                console.error(`Error burning ticket ${ticket.id}:`, err);
                errors.push({ id: ticket.id, msg: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            burned: burnedIds,
            errors,
            message: `Processed ${burnedIds.length} burns.`
        });

    } catch (err: any) {
        console.error("Cron Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
