
import {
    Program,
    AnchorProvider,
    web3,
    Idl,
    BN
} from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
    createTree,
    createAllocTreeIx
} from "@solana/spl-account-compression";

// Program ID from lib.rs
export const PROGRAM_ID = new PublicKey("Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ");

// Temporary IDL interface while build is blocked
// Once build succeeds, we will import the full IDL JSON
export const IDL: Idl = {
    "version": "0.1.0",
    "name": "tickto_tickets",
    "instructions": [
        {
            "name": "initializePlatform",
            "accounts": [
                { "name": "admin", "isMut": true, "isSigner": true },
                { "name": "platformConfig", "isMut": true, "isSigner": false },
                { "name": "merkleTree", "isMut": false, "isSigner": false },
                { "name": "collectionMint", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "createEvent",
            "accounts": [
                { "name": "organizer", "isMut": true, "isSigner": true },
                { "name": "eventConfig", "isMut": true, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "eventId", "type": "string" },
                { "name": "eventName", "type": "string" },
                { "name": "metadataUri", "type": "string" },
                { "name": "ticketPriceLamports", "type": "u64" },
                { "name": "maxSupply", "type": "u32" }
            ]
        },
        {
            "name": "mintTicket",
            "accounts": [
                { "name": "buyer", "isMut": true, "isSigner": true },
                { "name": "organizer", "isMut": true, "isSigner": false },
                { "name": "eventConfig", "isMut": true, "isSigner": false },
                { "name": "platformConfig", "isMut": true, "isSigner": false },
                { "name": "merkleTree", "isMut": true, "isSigner": false },
                { "name": "treeConfig", "isMut": true, "isSigner": false },
                { "name": "bubblegumProgram", "isMut": false, "isSigner": false },
                { "name": "compressionProgram", "isMut": false, "isSigner": false },
                { "name": "logWrapper", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "eventId", "type": "string" }
            ]
        }
    ]
} as any;

export class TicktoClient {
    program: Program;
    connection: Connection;

    constructor(
        connection: Connection,
        wallet?: any // Anchor wallet adapter
    ) {
        this.connection = connection;

        // Use a dummy provider if no wallet is connected (read-only)
        const provider = new AnchorProvider(
            connection,
            wallet || { signTransaction: () => Promise.reject(), signAllTransactions: () => Promise.reject(), publicKey: PublicKey.default },
            AnchorProvider.defaultOptions()
        );

        this.program = new Program(IDL, PROGRAM_ID, provider);
    }

    /**
     * Derives the Event Config PDA
     */
    getEventConfigPda(eventId: string): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode("event"), new TextEncoder().encode(eventId)],
            PROGRAM_ID
        );
        return pda;
    }

    /**
     * Derives the Platform Config PDA
     */
    getPlatformConfigPda(): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode("platform")],
            PROGRAM_ID
        );
        return pda;
    }

    /**
     * Creates an instruction to create a new event.
     * Note: Does NOT create a Merkle tree anymore (shared tree model).
     */
    async createCreateEventIx(
        organizer: PublicKey,
        eventId: string,
        eventName: string,
        metadataUri: string,
        ticketPriceLamports: BN,
        maxSupply: number
    ) {
        const eventConfigPda = this.getEventConfigPda(eventId);

        return await this.program.methods
            .createEvent(
                eventId,
                eventName,
                metadataUri,
                ticketPriceLamports,
                maxSupply
            )
            .accounts({
                organizer,
                eventConfig: eventConfigPda,
                systemProgram: SystemProgram.programId,
            } as any) // Cast to any until type generation works
            .instruction();
    }

    /**
     * Creates an instruction to mint a ticket.
     * Requires knowledge of the platform's shared tree address.
     */
    async createMintTicketIx(
        buyer: PublicKey,
        eventId: string,
        merkleTree: PublicKey // Passed from platform config lookup
    ) {
        const eventConfigPda = this.getEventConfigPda(eventId);
        const platformConfigPda = this.getPlatformConfigPda();

        // Bubblegum & Compression Program IDs
        const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
        const COMPRESSION_PROGRAM_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
        const NOOP_PROGRAM_ID = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

        // Helper to derive tree config PDA (Bubblegum specific)
        const [treeConfig] = PublicKey.findProgramAddressSync(
            [merkleTree.toBuffer()],
            BUBBLEGUM_PROGRAM_ID
        );

        // Fetch event config to get organizer
        // In a real app, we'd fetch the account. Here we might need the caller to provide it.
        // But wait, the instruction builder needs the organizer account for the constraint check.
        // We'll create a helper method `fetchEventConfig` to get this data.

        return {
            instructionBuilder: (organizer: PublicKey) => this.program.methods
                .mintTicket(eventId)
                .accounts({
                    buyer,
                    organizer,
                    eventConfig: eventConfigPda,
                    platformConfig: platformConfigPda,
                    merkleTree: merkleTree,
                    treeConfig: treeConfig,
                    bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
                    compressionProgram: COMPRESSION_PROGRAM_ID,
                    logWrapper: NOOP_PROGRAM_ID,
                    systemProgram: SystemProgram.programId,
                } as any)
                .instruction()
        };
    }

    async fetchEventConfig(eventId: string) {
        const pda = this.getEventConfigPda(eventId);
        // Cast to any because TS types aren't generated yet
        return await (this.program.account as any).eventConfig.fetch(pda);
    }

    async fetchPlatformConfig() {
        const pda = this.getPlatformConfigPda();
        return await (this.program.account as any).platformConfig.fetch(pda);
    }
}
