-- Fix: Revert competition_participants.user_id back to BIGINT
-- because public.users.id is BIGINT (int8), not UUID.

-- First drop the FK if it was changed (it may reference the wrong column type)
ALTER TABLE competition_participants
  DROP CONSTRAINT IF EXISTS competition_participants_user_id_fkey;

-- Change the column back to BIGINT
ALTER TABLE competition_participants
  ALTER COLUMN user_id TYPE BIGINT USING user_id::bigint;

-- Re-add the FK constraint
ALTER TABLE competition_participants
  ADD CONSTRAINT competition_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id);

-- Also check matches table for any user_id columns that may have been changed
-- (player_a_id, player_b_id, result_submitted_by)
ALTER TABLE matches
  ALTER COLUMN player_a_id TYPE BIGINT USING player_a_id::bigint;

ALTER TABLE matches
  ALTER COLUMN player_b_id TYPE BIGINT USING player_b_id::bigint;

ALTER TABLE matches
  ALTER COLUMN result_submitted_by TYPE BIGINT USING result_submitted_by::bigint;