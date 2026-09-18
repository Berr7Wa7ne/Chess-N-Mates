-- Per-competition round play window (hours). Same-day Swiss/RR can use 1–2.
-- Run: node backend/scripts/run-migrations.js add_match_deadline_hours.sql

ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS match_deadline_hours INT NOT NULL DEFAULT 24;

COMMENT ON COLUMN competitions.match_deadline_hours IS
  'Hours each round stays open for play/auto-compute. Use 1–2 for same-day events.';
