-- ============================================================
-- FIX ALL FK COLUMNS TO UUID & CREATE AUTH SYNC TRIGGER
-- 
-- This script assumes public.users.id is already UUID.
-- Run this in your Supabase SQL Editor AFTER supabase_migration_complete.sql
-- 
-- ⚠️ ORDER MATTERS: Drop policies FIRST, then alter columns
-- ============================================================

-- ============================================================
-- STEP 1: Drop ALL existing RLS policies FIRST
-- (Policies reference columns, so we must remove them before
--  altering column types)
-- ============================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================
-- STEP 2: Now fix all foreign key columns to UUID
-- (Reverting the damage from fix_user_id_bigint.sql)
-- ============================================================

-- -------------------------------------------------------
-- competition_participants
-- -------------------------------------------------------
ALTER TABLE competition_participants
  DROP CONSTRAINT IF EXISTS competition_participants_competition_id_fkey,
  DROP CONSTRAINT IF EXISTS competition_participants_user_id_fkey;

ALTER TABLE competition_participants
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE competition_participants
  ADD CONSTRAINT competition_participants_competition_id_fkey
    FOREIGN KEY (competition_id) REFERENCES competitions(id),
  ADD CONSTRAINT competition_participants_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);

-- -------------------------------------------------------
-- competitions
-- -------------------------------------------------------
ALTER TABLE competitions
  DROP CONSTRAINT IF EXISTS competitions_created_by_fkey;

ALTER TABLE competitions
  ALTER COLUMN created_by TYPE UUID USING created_by::uuid;

ALTER TABLE competitions
  ADD CONSTRAINT competitions_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users(id);

-- -------------------------------------------------------
-- matches
-- -------------------------------------------------------
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_competition_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player_a_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player_b_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_result_submitted_by_fkey;

ALTER TABLE matches
  ALTER COLUMN player_a_id TYPE UUID USING player_a_id::uuid,
  ALTER COLUMN player_b_id TYPE UUID USING player_b_id::uuid,
  ALTER COLUMN result_submitted_by TYPE UUID USING result_submitted_by::uuid;

ALTER TABLE matches
  ADD CONSTRAINT matches_competition_id_fkey
    FOREIGN KEY (competition_id) REFERENCES competitions(id),
  ADD CONSTRAINT matches_player_a_id_fkey
    FOREIGN KEY (player_a_id) REFERENCES users(id),
  ADD CONSTRAINT matches_player_b_id_fkey
    FOREIGN KEY (player_b_id) REFERENCES users(id),
  ADD CONSTRAINT matches_result_submitted_by_fkey
    FOREIGN KEY (result_submitted_by) REFERENCES users(id);

-- -------------------------------------------------------
-- disputes
-- -------------------------------------------------------
ALTER TABLE disputes
  DROP CONSTRAINT IF EXISTS disputes_match_id_fkey,
  DROP CONSTRAINT IF EXISTS disputes_raised_by_user_id_fkey,
  DROP CONSTRAINT IF EXISTS disputes_resolved_by_fkey;

ALTER TABLE disputes
  ALTER COLUMN raised_by_user_id TYPE UUID USING raised_by_user_id::uuid,
  ALTER COLUMN resolved_by TYPE UUID USING resolved_by::uuid;

ALTER TABLE disputes
  ADD CONSTRAINT disputes_match_id_fkey
    FOREIGN KEY (match_id) REFERENCES matches(id),
  ADD CONSTRAINT disputes_raised_by_user_id_fkey
    FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
  ADD CONSTRAINT disputes_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES users(id);

-- -------------------------------------------------------
-- admin_logs
-- -------------------------------------------------------
ALTER TABLE admin_logs
  DROP CONSTRAINT IF EXISTS admin_logs_admin_id_fkey;

ALTER TABLE admin_logs
  ALTER COLUMN admin_id TYPE UUID USING admin_id::uuid,
  ALTER COLUMN entity_id TYPE UUID USING entity_id::uuid;

ALTER TABLE admin_logs
  ADD CONSTRAINT admin_logs_admin_id_fkey
    FOREIGN KEY (admin_id) REFERENCES users(id);

-- -------------------------------------------------------
-- group_members
-- -------------------------------------------------------
ALTER TABLE group_members
  DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

ALTER TABLE group_members
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE group_members
  ADD CONSTRAINT group_members_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);

-- -------------------------------------------------------
-- notifications
-- -------------------------------------------------------
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id);

-- ============================================================
-- STEP 3: Create auth.users → public.users sync trigger
-- When someone signs up via Supabase Auth, a row is 
-- automatically created in public.users with the SAME UUID
-- ============================================================

-- Function that runs when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    phone_number,
    display_name,
    role,
    user_status,
    last_activity_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '0000000000'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    'active',
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists (e.g., created by backend register endpoint)
    -- Just update the email if missing
    UPDATE public.users
    SET email = COALESCE(public.users.email, NEW.email),
        last_activity_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create a trigger for when auth email is confirmed/updated
CREATE OR REPLACE FUNCTION public.handle_auth_user_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET email = COALESCE(NEW.email, public.users.email),
      last_activity_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_update();

-- ============================================================
-- STEP 4: Enable RLS on all tables (if not already)
-- ============================================================
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tablename);
    END LOOP;
END $$;

-- ============================================================
-- STEP 5: Create RLS policies with correct UUID comparison
-- ============================================================

-- USERS TABLE: Row matches the authenticated user's UUID
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

CREATE POLICY "users_delete_own"
  ON users
  FOR DELETE
  USING (
    auth.uid() = id
    OR auth.role() = 'service_role'
  );

-- ALL OTHER TABLES WITH user_id COLUMN: Row belongs to the user
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'user_id'
        AND table_schema = 'public'
        AND table_name != 'users'
    LOOP
        EXECUTE format('
            CREATE POLICY "%I_all_access"
            ON %I
            FOR ALL
            USING (
                auth.uid() = user_id
                OR auth.role() = ''service_role''
            )
            WITH CHECK (
                auth.uid() = user_id
                OR auth.role() = ''service_role''
            );
        ', t.table_name, t.table_name);
    END LOOP;
END $$;

-- ============================================================
-- STEP 6: Also create policies for tables WITHOUT user_id
-- (competitions uses created_by, matches uses player_a_id/player_b_id)
-- ============================================================

-- COMPETITIONS: created_by or service_role
CREATE POLICY "competitions_select_own"
  ON competitions
  FOR SELECT
  USING (
    auth.uid() = created_by
    OR auth.role() = 'service_role'
  );

CREATE POLICY "competitions_insert_own"
  ON competitions
  FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    OR auth.role() = 'service_role'
  );

CREATE POLICY "competitions_update_own"
  ON competitions
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR auth.role() = 'service_role'
  );

CREATE POLICY "competitions_delete_own"
  ON competitions
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR auth.role() = 'service_role'
  );

-- MATCHES: player_a_id or player_b_id or service_role
CREATE POLICY "matches_all_access"
  ON matches
  FOR ALL
  USING (
    auth.uid() = player_a_id
    OR auth.uid() = player_b_id
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = player_a_id
    OR auth.uid() = player_b_id
    OR auth.role() = 'service_role'
  );

-- DISPUTES: raised_by_user_id or service_role
CREATE POLICY "disputes_all_access"
  ON disputes
  FOR ALL
  USING (
    auth.uid() = raised_by_user_id
    OR auth.role() = 'service_role'
  )
  WITH CHECK (
    auth.uid() = raised_by_user_id
    OR auth.role() = 'service_role'
  );

-- ADMIN_LOGS: service_role only (admins via service_role)
CREATE POLICY "admin_logs_all_access"
  ON admin_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- DONE! All FK columns are UUID, auth sync is enabled,
-- and RLS policies use correct UUID comparisons.
-- ============================================================
