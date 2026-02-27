
import {
    Program,
    AnchorProvider,
    web3,
    Idl,
    BN
} from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TicktoTickets } from "./idl/tickto_tickets";
import TICKTO_IDL from "./idl/tickto_tickets.json";


// Program ID from lib.rs
export const PROGRAM_ID = new PublicKey("Fqqoja5BG9g4mY1mocc8YErH4kdgtzHnM1CrJVzQ5PZZ");

export class TicktoClient {
    program: Program<TicktoTickets>;
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

        this.program = new Program(TICKTO_IDL as TicktoTickets, provider);
    }

    /**
     * Derives the Event Config PDA
     */
    getEventConfigPda(eventId: string): PublicKey {
        const safeEventId = eventId.replace(/-/g, '').substring(0, 32);
        const [pda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode("event"), new TextEncoder().encode(safeEventId)],
            PROGRAM_ID
        );
        return pda;
    }

    /**
     * Derives the Global Master Tree Authority PDA
     */
    getMasterTreeAuthorityPda(): PublicKey {
        const [pda] = PublicKey.findProgramAddressSync(
            [new TextEncoder().encode("master_tree")],
            PROGRAM_ID
        );
        return pda;
    }

    /**
     * Creates an instruction to create a new event.
     */
    async createCreateEventIx(
        organizer: PublicKey,
        eventId: string,
        eventName: string,
        metadataUri: string,
        ticketPriceLamports: BN,
        maxSupply: number,
        merkleTree: PublicKey
    ) {
        const safeEventId = eventId.replace(/-/g, '').substring(0, 32);

        return await this.program.methods
            .createEvent(
                safeEventId,
                eventName,
                metadataUri,
                ticketPriceLamports,
                maxSupply
            )
            .accounts({
                organizer,
                merkleTree: merkleTree,
            })
            .instruction();
    }

    /**
     * Creates an instruction to mint a ticket.
     */
    async createMintTicketIx(
        buyer: PublicKey,
        organizer: PublicKey,
        eventId: string,
        merkleTree: PublicKey
    ) {
        const safeEventId = eventId.replace(/-/g, '').substring(0, 32);

        // Bubblegum & Compression Program IDs
        const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
        const COMPRESSION_PROGRAM_ID = new PublicKey("mcmt6YrQEMKw8Mw43FmpRLmf7BqRnFMKmAcbxE3xkAW");
        const NOOP_PROGRAM_ID = new PublicKey("mnoopTCrg4p8ry25e4bcWA9XZjbNjMTfgYVGGEdRsf3");
        const MPL_CORE_PROGRAM_ID = new PublicKey("CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d");

        // Helper to derive tree config PDA (Bubblegum specific)
        const [treeConfig] = PublicKey.findProgramAddressSync(
            [merkleTree.toBuffer()],
            BUBBLEGUM_PROGRAM_ID
        );

        return await this.program.methods
            .mintTicket(safeEventId)
            .accounts({
                buyer,
                organizer,
                treeConfig: treeConfig,
                merkleTree: merkleTree,
                bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
                compressionProgram: COMPRESSION_PROGRAM_ID,
                logWrapper: NOOP_PROGRAM_ID,
                mplCoreProgram: MPL_CORE_PROGRAM_ID,
            })
            .instruction();
    }

    async fetchEventConfig(eventId: string) {
        const pda = this.getEventConfigPda(eventId);
        return await this.program.account.eventConfig.fetch(pda);
    }


    /**
     * Creates an instruction to asynchronously burn a ticket on-chain.
     */
    async createBurnTicketIx(
        payer: PublicKey,
        leafOwner: PublicKey,
        merkleTree: PublicKey,
        root: number[],
        dataHash: number[],
        creatorHash: number[],
        nonce: BN,
        index: number,
        proofKeys: PublicKey[]
    ) {
        const BUBBLEGUM_PROGRAM_ID = new PublicKey("BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY");
        const COMPRESSION_PROGRAM_ID = new PublicKey("cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK");
        const NOOP_PROGRAM_ID = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

        const [treeConfig] = PublicKey.findProgramAddressSync(
            [merkleTree.toBuffer()],
            BUBBLEGUM_PROGRAM_ID
        );

        return await this.program.methods
            .burnTicket(
                root,
                dataHash,
                creatorHash,
                nonce,
                index
            )
            .accounts({
                leafOwner,
                payer,
                treeConfig,
                merkleTree,
                bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
                compressionProgram: COMPRESSION_PROGRAM_ID,
                logWrapper: NOOP_PROGRAM_ID,
            })
            .remainingAccounts(
                proofKeys.map((pubkey) => ({
                    pubkey,
                    isSigner: false,
                    isWritable: false,
                }))
            )
            .instruction();
    }

}
