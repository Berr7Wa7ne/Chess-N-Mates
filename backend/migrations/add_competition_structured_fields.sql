-- Run this in your Supabase SQL editor to add all new fields to the competitions table

ALTER TABLE competitions 
  ADD COLUMN IF NOT EXISTS time_control VARCHAR(50),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC+1:00',
  ADD COLUMN IF NOT EXISTS entry_fee_prize TEXT,
  ADD COLUMN IF NOT EXISTS platform VARCHAR(30) DEFAULT 'chess.com',
  ADD COLUMN IF NOT EXISTS match_length VARCHAR(20) DEFAULT 'single_match',
  ADD COLUMN IF NOT EXISTS format_match_rules VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS round_robin_legs INT DEFAULT 1;