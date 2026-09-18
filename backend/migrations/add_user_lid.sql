-- WhatsApp LID identity support (run in Supabase SQL editor or:
-- node backend/scripts/run-migration-api.js add_user_lid.sql)
--
-- WhatsApp now identifies many group members by a "LID" (privacy ID) instead
-- of their phone number. The bot stores it, but lookups and logins need it
-- available as a first-class column so a player's identity is stable across
-- bot commands even when their phone number is repaired/changed.

ALTER TABLE users ADD COLUMN IF NOT EXISTS lid TEXT;

CREATE INDEX IF NOT EXISTS idx_users_lid ON users(lid);

-- Backfill: every row whose whatsapp_id is a LID gets the bare lid stored.
UPDATE users
SET lid = REPLACE(whatsapp_id, '@lid', '')
WHERE lid IS NULL AND whatsapp_id LIKE '%@lid';
