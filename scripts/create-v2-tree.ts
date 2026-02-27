/**
 * Creates a V2 schema Merkle tree using Umi + Bubblegum V2 SDK.
 * Following exact patterns from Metaplex skill: sdk-bubblegum.md + sdk-umi.md
 * Run with: npx tsx scripts/create-v2-tree.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import fs from 'fs';

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=0e7b36c7-b4c2-4d2c-995a-6997b64f02da";

async function main() {
    // Create Umi with Bubblegum + Core plugins
    const umi = createUmi(RPC_URL)
        .use(mplBubblegum())
        .use(mplCore());

    // Load payer keypair using Umi's eddsa helper
    const secretKey = JSON.parse(fs.readFileSync('C:\\solana-keys\\id.json', 'utf-8'));
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    umi.use(keypairIdentity(keypair));

    console.log("Payer:", keypair.publicKey);

    // Generate a new Merkle tree signer
    const merkleTree = generateSigner(umi);
    console.log("New Merkle Tree:", merkleTree.publicKey);

    // Create V2 tree: maxDepth=14, maxBufferSize=64 (~16,384 cNFTs)
    console.log("\nCreating V2 Merkle tree (maxDepth=14, maxBufferSize=64)...");

    const builder = await createTreeV2(umi, {
        merkleTree,
        maxDepth: 14,
        maxBufferSize: 64,
    });

    const result = await builder.sendAndConfirm(umi);

    console.log("\n✅ V2 Merkle Tree created!");
    console.log("Merkle Tree Address:", merkleTree.publicKey);
    console.log("\n🔧 Update your .env.local with:");
    console.log(`NEXT_PUBLIC_SHARED_MERKLE_TREE_PUBKEY=${merkleTree.publicKey}`);
}

main().catch((err) => {
    console.error("Failed:", err.message || err);
    if (err.logs) console.error("Logs:", err.logs);
});
