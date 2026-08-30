-- Auth: password hashes for phone login
-- Run against Supabase / Postgres

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN users.password_hash IS 'bcrypt hash; null means legacy user (accept default password once, then set)';
