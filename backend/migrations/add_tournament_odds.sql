-- Tournament / match odds tracking (per competition)
-- Run: node backend/scripts/run-migration-api.js add_tournament_odds.sql

CREATE TABLE IF NOT EXISTS competition_odds_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  round_number INT NULL,
  standings_odds JSONB NOT NULL DEFAULT '[]'::jsonb,
  match_odds JSONB NOT NULL DEFAULT '[]'::jsonb,
  h2h_matrix JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_odds_snapshots_competition_time
  ON competition_odds_snapshots (competition_id, snapshot_at DESC);

-- Latest match-level odds cache (optional; live API also computes on read)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS odds_win_pct_a NUMERIC(5, 1) NULL,
  ADD COLUMN IF NOT EXISTS odds_draw_pct NUMERIC(5, 1) NULL,
  ADD COLUMN IF NOT EXISTS odds_win_pct_b NUMERIC(5, 1) NULL,
  ADD COLUMN IF NOT EXISTS odds_updated_at TIMESTAMPTZ NULL;
