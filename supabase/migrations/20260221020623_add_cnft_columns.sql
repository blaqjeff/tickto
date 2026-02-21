-- Add cNFT supporting columns to Events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS collection_mint text,
ADD COLUMN IF NOT EXISTS merkle_tree text,
ADD COLUMN IF NOT EXISTS program_event_pda text;

-- Add cNFT tracking to Tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS asset_id text,
ADD COLUMN IF NOT EXISTS on_chain_status text CHECK (on_chain_status IN ('minted', 'burned', 'failed'));
