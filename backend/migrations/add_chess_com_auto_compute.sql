-- Chess.com daily auto-compute support
-- Run against Supabase / Postgres

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS result_source VARCHAR(30) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_candidates JSONB NULL;

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS auto_compute_enabled BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ NULL,
  summary JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_needs_review ON matches (needs_review) WHERE needs_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_competitions_auto_compute
  ON competitions (competition_status, auto_compute_enabled)
  WHERE competition_status = 'active';
