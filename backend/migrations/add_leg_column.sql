-- Add leg column to matches table for double-game round robin
-- leg = 1 for first game, leg = 2 for second game (reverse fixture)
-- Defaults to 1 for single-game formats

ALTER TABLE matches ADD COLUMN IF NOT EXISTS leg integer NOT NULL DEFAULT 1;

-- Add index for efficient grouping by round + player pair
CREATE INDEX IF NOT EXISTS idx_matches_round_leg ON matches (round_number, competition_id, leg);