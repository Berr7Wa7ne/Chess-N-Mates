-- Add role column to users table (run in Supabase SQL editor)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player'
  CHECK (role IN ('admin', 'player'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
