-- Migration: Add webhook support and bot-specific settings
-- This migration adds a bot_settings table for storing webhook URLs and bot configuration

-- Check if bot_settings table exists, if not create it
CREATE TABLE IF NOT EXISTS bot_settings (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO bot_settings (key, value) VALUES
  ('bot_webhook_url', NULL),
  ('inactivity_paused', '0')
ON CONFLICT (key) DO NOTHING;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bot_settings_key ON bot_settings(key);

-- Add webhook-related columns to competitions table if not present
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS time_control VARCHAR(50);
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS match_length VARCHAR(50) DEFAULT 'single_match';
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS round_robin_legs INT DEFAULT 1;

-- Add activity tracking columns to users if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS chess_com_username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS chess_blitz_elo INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS chess_bullet_elo INT DEFAULT 0;

-- Add match-specific columns if not present
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS leg INT DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS absence_side VARCHAR(10);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_both_absent BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS forced BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS force_reason TEXT;

-- Add disputes columns
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS competition_id BIGINT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS opponent_user_id BIGINT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS filed_by_role VARCHAR(20) DEFAULT 'player';
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';