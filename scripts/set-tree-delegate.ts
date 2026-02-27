/**
 * Sets the master_tree PDA as delegate on the V2 Merkle tree using Umi SDK.
 * Following Metaplex skill pattern from sdk-bubblegum.md.
 * Run with: npx tsx scripts/set-tree-delegate.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, setTreeDelegate } from '@metaplex-foundation/mpl-bubblegum';
import { mplCore } from '@metaplex-foundation/mpl-core';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { PublicKey } from '@solana/web3.js';
import fs from 'fs';

const TICKTO_PROGRAM_ID = new PublicKey("Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ");
const MERKLE_TREE = "ByKosrpTr1uT27EjNBEfqYdwHAuY1dzfnb7gyPLF8Hcz";
const RPC_URL = "https://devnet.helius-rpc.com/?api-key=0e7b36c7-b4c2-4d2c-995a-6997b64f02da";

async function main() {
    const umi = createUmi(RPC_URL)
        .use(mplBubblegum())
        .use(mplCore());

    const secretKey = JSON.parse(fs.readFileSync('C:\\solana-keys\\id.json', 'utf-8'));
    const keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(secretKey));
    umi.use(keypairIdentity(keypair));

    console.log("Payer (tree creator):", keypair.publicKey);

    // Derive master_tree_authority PDA from Tickto program
    const [masterTreeAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("master_tree")],
        TICKTO_PROGRAM_ID,
    );
    console.log("Master Tree Authority PDA:", masterTreeAuthority.toBase58());

    // Set the PDA as the new tree delegate using Umi SDK
    console.log("\nSetting tree delegate...");
    await setTreeDelegate(umi, {
        merkleTree: publicKey(MERKLE_TREE),
        treeCreator: umi.identity,
        newTreeDelegate: publicKey(masterTreeAuthority.toBase58()),
    }).sendAndConfirm(umi);

    console.log("✅ Tree delegate set!");
    console.log("Delegate:", masterTreeAuthority.toBase58());
}

main().catch((err) => {
    console.error("Failed:", err.message || err);
    if (err.logs) console.error("Logs:", err.logs);
});
