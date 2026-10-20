# Tickto - On-Chain Digital Ticketing Platform on Solana

Status: in active development.

Tickto is a decentralized, mobile-first Web3 ticketing dApp built on Solana. It is designed to solve the critical issues plaguing the traditional live event industry—specifically bot-sweeping, secondary market ticket scalping, fake ticket fraud, and the lack of tools for organizers to reward their loyal attendees.

Tickets are minted as **Compressed NFTs (cNFTs)** on Solana to ensure low-cost minting and absolute verification of authenticity, and they are burned on-chain once redeemed at the venue door.

⚠️ **Note: This is an ongoing project actively under development. New features are being rolled out continuously.**

---

## 🚀 Key Value Propositions

*   **Zero-Gas USDC Purchase UX:** Buyers pay for tickets in USDC. The Tickto Relayer co-signs the transaction, pays the SOL gas, and charges a tiny USDC fee for gas reimbursement. Buyers do not need to hold or buy SOL to attend events.
*   **Anti-Bot Guardrails:** Purchases are processed via a backend relayer that verifies Privy identity constraints (requiring linked phone numbers or verified emails) to prevent scripts/bots from bulk-purchasing tickets.
*   **Anti-Fraud / Anti-Scalp Resale:** Tickets can only be listed on-chain and transferred under organizer-controlled price caps (maximum resale of +100% of face value) to eliminate predatory scalping while returning customizable royalties to creators.
*   **Volunteer-Friendly Magic Scanning:** Organizers can generate temporary, secure "Magic Links" for event volunteers. Volunteers can scan ticket QR codes on mobile without needing to log in, register accounts, or connect wallets.
*   **On-Chain Redemption (Redeemed Ticket Burning):** Once scanned, tickets are marked `used` off-chain and asynchronously burned on-chain via a cron job, permanently invalidating them for future entry or resale.
*   **Loyalty Gating:** Organizers can restrict ticket sales (or open early presales) exclusively to wallets that have attended (and burned tickets for) past events.

---

## 🛠️ Technology Stack

*   **Frontend Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Framer Motion
*   **Web3 Identity & Wallet:** Privy (`@privy-io/react-auth`) for social/SMS logins and embedded Solana wallets
*   **Blockchain Engine:** Solana Web3.js, Anchor Framework (Rust smart contract)
*   **NFT Standard:** Metaplex Bubblegum (State Compression for cNFTs), Metaplex MPL Core
*   **Database & File Storage:** Supabase (PostgreSQL database, Storage Buckets, and Row Level Security)
*   **RPC Infrastructure:** Helius (RPC nodes, DAS Indexer API, and transaction simulation)

---

## 📁 Repository Structure

```
├── app/                      # Next.js pages, actions, and API routes
│   ├── admin/                # Platform admin views
│   ├── api/                  # Backend endpoints
│   │   ├── cron/             # Async ticket burning cron job
│   │   ├── magic-link/       # Magic link scanner token generation
│   │   └── relay/            # Gasless USDC purchase relayer
│   ├── create/               # Event creation page
│   ├── dashboard/            # Organizer event analytics & link manager
│   ├── event/[id]/           # Public event page with USDC checkout
│   ├── scan/                 # Volunteer ticket scanning camera UI
│   └── tickets/              # User ticket wallet (with card-flipping QR codes)
├── components/               # Reusable Tailwind + Framer Motion components
├── lib/                      # Shared helper functions, API clients, and constants
│   ├── api.ts                # Supabase database operations client
│   ├── tickto-program.ts     # Client SDK for Anchor Program interaction
│   └── idl/                  # Compiled Anchor smart contract IDL
├── supabase/                 # Database migrations and configuration schemas
└── tickto_tickets/           # Solana Anchor Smart Contract (Rust)
    ├── programs/             # Rust source code
    └── tests/                # Program integration test suites
```

---

## ⚙️ Local Development Setup

### 1. Prerequisites
*   Node.js (v18+)
*   Rust & Cargo (for smart contract development)
*   Solana CLI & Anchor CLI (v0.30+)
*   Supabase CLI (optional, or a free cloud database instance at [supabase.com](https://supabase.com))

### 2. Environment Setup
Clone the repository and copy the environment template:
```bash
cd tickto
cp .env.example .env.local
```
Fill in the credentials in `.env.local` (e.g. Privy app ID, Supabase URL, RPC endpoints, and admin/relayer keypairs).

### 3. Database Migration
Run the Supabase migrations in the `supabase/migrations/` folder against your database instance to set up the necessary tables (`events`, `tickets`, `users`, and `scanner_tokens`).

### 4. Running the Frontend
Install dependencies and boot up the Next.js development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Running the Smart Contract
Navigate to the Anchor program folder, build the contract, and run the integration tests:
```bash
cd tickto_tickets
anchor build
anchor test
```

---

## 📄 License

This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

You are free to view, download, modify, and redistribute the source code for personal, educational, and portfolio/recruitment demonstration purposes. Any commercial use, deployment, or monetization of the software is strictly prohibited without the express written permission of the copyright holder.

For details, see the [LICENSE](LICENSE) file.
