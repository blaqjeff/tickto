-- Add resale support columns to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS listing_price_usd NUMERIC,
ADD COLUMN IF NOT EXISTS listing_status TEXT CHECK (listing_status IN ('active', 'sold', 'cancelled'));

-- Add index on listing_status to speed up marketplace queries
CREATE INDEX IF NOT EXISTS idx_tickets_listing_status ON tickets(listing_status) WHERE listing_status = 'active';
