-- ============================================================
-- ROUND ROBIN SINGLE GAME SCHEMA ADDITIONS
-- Adds columns for absences, byes, and absence tracking
-- ============================================================

-- Add absences and byes to competition_participants
ALTER TABLE competition_participants
  ADD COLUMN IF NOT EXISTS absences INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS byes INT DEFAULT 0;

-- Add absence tracking to matches  
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS is_bye BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_absent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS absence_side TEXT CHECK (absence_side IN ('a', 'b') OR absence_side IS NULL);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_matches_competition_round 
  ON matches(competition_id, round_number);
CREATE INDEX IF NOT EXISTS idx_matches_bye 
  ON matches(competition_id) WHERE is_bye = TRUE;

-- ============================================================
-- DONE
-- ============================================================