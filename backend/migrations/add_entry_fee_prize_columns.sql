-- Run this in your Supabase SQL editor to add entry_fee and prize columns
-- and migrate data from the old entry_fee_prize column

-- Add new columns
ALTER TABLE competitions 
  ADD COLUMN IF NOT EXISTS entry_fee TEXT,
  ADD COLUMN IF NOT EXISTS prize TEXT;

-- Migrate existing data: if entry_fee_prize contained data, try to keep it in entry_fee for now
-- (admin can manually edit or we can split intelligently)
UPDATE competitions SET entry_fee = entry_fee_prize WHERE entry_fee_prize IS NOT NULL;

-- The old column entry_fee_prize can be dropped after verification:
-- ALTER TABLE competitions DROP COLUMN IF EXISTS entry_fee_prize;