-- Tournament hero image + featured flag for player dashboard
-- Run against Supabase / Postgres

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_competitions_featured
  ON competitions (is_featured, competition_status)
  WHERE is_featured = TRUE;
