-- Add resale configurations to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS max_resale_multiplier_bps INTEGER DEFAULT 10000,
ADD COLUMN IF NOT EXISTS royalty_bps INTEGER DEFAULT 500;
