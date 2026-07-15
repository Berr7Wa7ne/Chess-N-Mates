-- Add is_both_absent column for the "both players absent" feature
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_both_absent BOOLEAN DEFAULT false;

-- Update absence_side check constraint to allow 'both' value
-- First drop the existing constraint if it exists
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_absence_side_check;

-- Add new constraint allowing 'a', 'b', or 'both'
ALTER TABLE matches ADD CONSTRAINT matches_absence_side_check 
  CHECK (absence_side IN ('a', 'b', 'both') OR absence_side IS NULL);