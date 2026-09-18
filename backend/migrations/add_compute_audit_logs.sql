-- Chess.com auto-compute audit trail (admin-visible)
-- Run: node backend/scripts/run-migrations.js add_compute_audit_logs.sql

CREATE TABLE IF NOT EXISTS compute_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  competition_id UUID NULL REFERENCES competitions(id) ON DELETE CASCADE,
  match_id UUID NULL,
  run_id UUID NULL,
  triggered_by VARCHAR(40) NOT NULL DEFAULT 'system',
  actor_user_id UUID NULL,
  action VARCHAR(80) NOT NULL,
  action_result VARCHAR(40) NOT NULL,
  message TEXT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_compute_audit_competition_time
  ON compute_audit_logs (competition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_compute_audit_run
  ON compute_audit_logs (run_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_compute_audit_action_result
  ON compute_audit_logs (action_result, created_at DESC);
