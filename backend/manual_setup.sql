-- ============================================
-- CHESS TOURNAMENT MANUAL SETUP
-- Run this in Supabase SQL Editor
-- ============================================
-- This script is SEGMENTED. Run each segment separately.
-- For now, we are only populating the USERS table.
-- Competition creation & player registration come later
-- once you know who is actually participating.
-- ============================================


-- ============================================
-- SEGMENT 1: RESET DATABASE
-- ============================================
-- Clears ALL data from every table (schema is preserved).
-- Run this first to start fresh.

TRUNCATE TABLE
  notifications,
  group_members,
  admin_logs,
  disputes,
  matches,
  competition_participants,
  competitions,
  users
RESTART IDENTITY CASCADE;


-- ============================================
-- SEGMENT 2: CREATE ADMIN USER
-- ============================================
-- Replace the values below with your actual admin details.

INSERT INTO users (
  email,
  phone_number,
  whatsapp_id,
  display_name,
  chess_username,
  chess_com_username,
  chess_platform,
  role,
  user_status
) VALUES (
  '2348108962585@temp.com',             -- Placeholder email (matches backend pattern)
  '2348108962585',                      -- Your phone number
  '2348108962585@s.whatsapp.net',       -- Your WhatsApp ID
  'Code Valor',                         -- Your display name
  'Berr7Wa7ne',                         -- Your chess.com username
  'Berr7Wa7ne',                         -- chess_com_username column
  'chess.com',
  'admin',
  'active'
)
ON CONFLICT DO NOTHING;  -- Handles ANY unique constraint conflict (phone_number, chess_com_username, email, whatsapp_id)

-- Verify admin was created
SELECT id, phone_number, display_name, role FROM users WHERE role = 'admin';


-- ============================================
-- SEGMENT 3: INSERT PLAYERS (USERS TABLE ONLY)
-- ============================================
-- 40 players with chess.com usernames and phone numbers.
-- (Berr7Wa7ne is the admin, already created in Segment 2)
-- Phone numbers normalized to international format (no + or spaces):
--   070/080/090/091... -> 234...  (strip leading 0, prepend 234)
--   +234...            -> 234...  (strip +)
--   234...             -> 234...  (keep as-is)
--   +254... (Kenya)    -> 254...  (strip +)
--
-- email:          {phone}@temp.com        (placeholder, matches backend pattern)
-- whatsapp_id:    {phone}@s.whatsapp.net
-- display_name:   chess.com username
-- chess_username: chess.com username
-- chess_com_username: chess.com username
-- chess_platform: 'chess.com'
-- role:           'player'
-- user_status:    'active'

INSERT INTO users (
  email,
  phone_number,
  whatsapp_id,
  display_name,
  chess_username,
  chess_com_username,
  chess_platform,
  role,
  user_status
) VALUES
  ('2347044156814@temp.com', '2347044156814', '2347044156814@s.whatsapp.net', 'Astro_of_ph',       'Astro_of_ph',       'Astro_of_ph',       'chess.com', 'player', 'active'),
  ('2348134086393@temp.com', '2348134086393', '2348134086393@s.whatsapp.net', 'infamosnuel',        'infamosnuel',        'infamosnuel',        'chess.com', 'player', 'active'),
  ('2348093208733@temp.com', '2348093208733', '2348093208733@s.whatsapp.net', 'Sheuntop',           'Sheuntop',           'Sheuntop',           'chess.com', 'player', 'active'),
  ('2347064885761@temp.com', '2347064885761', '2347064885761@s.whatsapp.net', 'Oladisea',           'Oladisea',           'Oladisea',           'chess.com', 'player', 'active'),
  ('2349036006275@temp.com', '2349036006275', '2349036006275@s.whatsapp.net', 'efosartstudios',     'efosartstudios',     'efosartstudios',     'chess.com', 'player', 'active'),
  ('2349032950140@temp.com', '2349032950140', '2349032950140@s.whatsapp.net', 'Iamdamorah',         'Iamdamorah',         'Iamdamorah',         'chess.com', 'player', 'active'),
  ('2348051763431@temp.com', '2348051763431', '2348051763431@s.whatsapp.net', 'geniusofmankind',    'geniusofmankind',    'geniusofmankind',    'chess.com', 'player', 'active'),
  ('2349046904715@temp.com', '2349046904715', '2349046904715@s.whatsapp.net', 'Kaymoney12345',      'Kaymoney12345',      'Kaymoney12345',      'chess.com', 'player', 'active'),
  ('2347046657476@temp.com', '2347046657476', '2347046657476@s.whatsapp.net', 'Vkenzo10',           'Vkenzo10',           'Vkenzo10',           'chess.com', 'player', 'active'),
  ('2349045896822@temp.com', '2349045896822', '2349045896822@s.whatsapp.net', 'loftygms',           'loftygms',           'loftygms',           'chess.com', 'player', 'active'),
  ('2348109299162@temp.com', '2348109299162', '2348109299162@s.whatsapp.net', 'J13IN',              'J13IN',              'J13IN',              'chess.com', 'player', 'active'),
  ('2347032528460@temp.com', '2347032528460', '2347032528460@s.whatsapp.net', '4ti5ied',            '4ti5ied',            '4ti5ied',            'chess.com', 'player', 'active'),
  ('2347011328154@temp.com', '2347011328154', '2347011328154@s.whatsapp.net', 'ParisenP',           'ParisenP',           'ParisenP',           'chess.com', 'player', 'active'),
  ('2349015570974@temp.com', '2349015570974', '2349015570974@s.whatsapp.net', 'Tomviticus',         'Tomviticus',         'Tomviticus',         'chess.com', 'player', 'active'),
  ('2348051997337@temp.com', '2348051997337', '2348051997337@s.whatsapp.net', 'Abydin',             'Abydin',             'Abydin',             'chess.com', 'player', 'active'),
  ('2348136075535@temp.com', '2348136075535', '2348136075535@s.whatsapp.net', 'Blaq-voltage',       'Blaq-voltage',       'Blaq-voltage',       'chess.com', 'player', 'active'),
  ('2349131084531@temp.com', '2349131084531', '2349131084531@s.whatsapp.net', 'EvergreenXI',        'EvergreenXI',        'EvergreenXI',        'chess.com', 'player', 'active'),
  ('2349132147570@temp.com', '2349132147570', '2349132147570@s.whatsapp.net', 'Thegerman42',        'Thegerman42',        'Thegerman42',        'chess.com', 'player', 'active'),
  ('2348100865244@temp.com', '2348100865244', '2348100865244@s.whatsapp.net', 'iix12345',           'iix12345',           'iix12345',           'chess.com', 'player', 'active'),
  ('254702657287@temp.com',  '254702657287',  '254702657287@s.whatsapp.net',  'Kalers3',            'Kalers3',            'Kalers3',            'chess.com', 'player', 'active'),
  ('2348100184812@temp.com', '2348100184812', '2348100184812@s.whatsapp.net', 'Aboloye00',          'Aboloye00',          'Aboloye00',          'chess.com', 'player', 'active'),
  ('2348080924317@temp.com', '2348080924317', '2348080924317@s.whatsapp.net', 'nmaduabuchukwu',     'nmaduabuchukwu',     'nmaduabuchukwu',     'chess.com', 'player', 'active'),
  ('2347067532229@temp.com', '2347067532229', '2347067532229@s.whatsapp.net', 'Aida001',            'Aida001',            'Aida001',            'chess.com', 'player', 'active'),
  ('2348142761060@temp.com', '2348142761060', '2348142761060@s.whatsapp.net', 'Ghostrhyderv2',      'Ghostrhyderv2',      'Ghostrhyderv2',      'chess.com', 'player', 'active'),
  ('2348138115240@temp.com', '2348138115240', '2348138115240@s.whatsapp.net', 'Mrfreddd1',          'Mrfreddd1',          'Mrfreddd1',          'chess.com', 'player', 'active'),
  ('2349033203136@temp.com', '2349033203136', '2349033203136@s.whatsapp.net', 'davidtheElite',      'davidtheElite',      'davidtheElite',      'chess.com', 'player', 'active'),
  ('2348131845196@temp.com', '2348131845196', '2348131845196@s.whatsapp.net', 'Precious_Ajao',      'Precious_Ajao',      'Precious_Ajao',      'chess.com', 'player', 'active'),
  ('2348149672730@temp.com', '2348149672730', '2348149672730@s.whatsapp.net', 'Fidelis99',          'Fidelis99',          'Fidelis99',          'chess.com', 'player', 'active'),
  ('2347013604664@temp.com', '2347013604664', '2347013604664@s.whatsapp.net', 'Grandmonsieur',      'Grandmonsieur',      'Grandmonsieur',      'chess.com', 'player', 'active'),
  ('2348135958839@temp.com', '2348135958839', '2348135958839@s.whatsapp.net', 'Yusfaith01',         'Yusfaith01',         'Yusfaith01',         'chess.com', 'player', 'active'),
  ('2347044577467@temp.com', '2347044577467', '2347044577467@s.whatsapp.net', 'goatstein',          'goatstein',          'goatstein',          'chess.com', 'player', 'active'),
  ('2349049077511@temp.com', '2349049077511', '2349049077511@s.whatsapp.net', 'blank_knight',       'blank_knight',       'blank_knight',       'chess.com', 'player', 'active'),
  ('2348106503151@temp.com', '2348106503151', '2348106503151@s.whatsapp.net', 'VictorYB2',          'VictorYB2',          'VictorYB2',          'chess.com', 'player', 'active'),
  ('2348094969256@temp.com', '2348094969256', '2348094969256@s.whatsapp.net', 'adewale-mudasiru',   'adewale-mudasiru',   'adewale-mudasiru',   'chess.com', 'player', 'active'),
  ('2349128383181@temp.com', '2349128383181', '2349128383181@s.whatsapp.net', 'Davidokama',         'Davidokama',         'Davidokama',         'chess.com', 'player', 'active'),
  ('2348148429834@temp.com', '2348148429834', '2348148429834@s.whatsapp.net', 'afangMonster',       'afangMonster',       'afangMonster',       'chess.com', 'player', 'active'),
  ('2349111659127@temp.com', '2349111659127', '2349111659127@s.whatsapp.net', 'EUK2026',            'EUK2026',            'EUK2026',            'chess.com', 'player', 'active'),
  ('2347045622049@temp.com', '2347045622049', '2347045622049@s.whatsapp.net', '092ik',              '092ik',              '092ik',              'chess.com', 'player', 'active'),
  ('2349099637474@temp.com', '2349099637474', '2349099637474@s.whatsapp.net', 'Neptuneninjah',      'Neptuneninjah',      'Neptuneninjah',      'chess.com', 'player', 'active'),
  ('2347058645690@temp.com', '2347058645690', '2347058645690@s.whatsapp.net', 'Eric_1712',          'Eric_1712',          'Eric_1712',          'chess.com', 'player', 'active')
ON CONFLICT DO NOTHING;  -- Handles ANY unique constraint conflict (phone_number, chess_com_username, email, whatsapp_id)


-- ============================================
-- SEGMENT 4: VERIFY USERS TABLE
-- ============================================
-- Check that all users were inserted correctly.
-- Expect: 1 admin + 40 players = 41 total users.

-- Count by role
SELECT 
  COUNT(*) AS total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admins,
  COUNT(CASE WHEN role = 'player' THEN 1 END) AS players
FROM users;

-- View all players
SELECT 
  id,
  display_name,
  chess_username,
  chess_com_username,
  phone_number,
  whatsapp_id,
  chess_platform,
  role,
  user_status
FROM users
WHERE role = 'player'
ORDER BY chess_username;


-- ============================================
-- SEGMENT 5: CREATE COMPETITION
-- ============================================
-- Round Robin, Single Game, 5+0 time control, 900+ ELO
-- Run this AFTER Segments 1-4 (users table is populated).

INSERT INTO competitions (
  name,
  description,
  tournament_type,
  competition_status,
  registration_open_at,
  registration_close_at,
  start_date,
  end_date,
  max_participants,
  rounds,
  min_elo,
  max_elo,
  time_control,
  timezone,
  platform,
  match_length,
  format_match_rules,
  round_robin_legs,
  rules,
  created_by,
  current_round
) VALUES (
  'Chess Tournament - August 2026',
  'Round Robin single game tournament for the community. 5+0 time control. 900+ ELO.',
  'round_robin',
  'open_registration',
  NOW(),
  NOW() + INTERVAL '24 hours',
  NOW(),
  NOW() + INTERVAL '30 days',
  50,
  17,                                  -- 18 players - 1 = 17 rounds for round-robin
  900,
  3000,
  '5+0',
  'UTC+1:00',
  'chess.com',
  'single_game',
  'single_leg',
  1,
  '[]'::jsonb,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  0
)
RETURNING id, name, tournament_type;

-- Verify competition was created
SELECT id, name, competition_status, tournament_type, rounds, time_control, min_elo, max_elo
FROM competitions
ORDER BY created_at DESC LIMIT 1;


-- ============================================
-- SEGMENT 6: REGISTER PLAYERS FOR COMPETITION
-- ============================================
-- 18 players who said "I'M IN" in the WhatsApp group.
-- Uses chess_com_username to look up user IDs.
-- Competition ID = 1 (adjust if different).

-- Uses a subquery to get the competition ID (no hardcoding needed).
INSERT INTO competition_participants (
  competition_id,
  user_id,
  participant_status,
  score,
  wins,
  draws,
  losses
)
SELECT
  c.id,
  u.id,
  'registered',
  0, 0, 0, 0
FROM competitions c
CROSS JOIN users u
WHERE c.id = (SELECT id FROM competitions WHERE competition_status = 'open_registration' ORDER BY created_at DESC LIMIT 1)
  AND u.chess_com_username IN (
    'infamosnuel', 'blank_knight', 'Ghostrhyderv2', 'goatstein', 'EUK2026',
    'J13IN', 'Mrfreddd1', 'Aida001', 'Yusfaith01', 'Neptuneninjah',
    'Fidelis99', 'Kaymoney12345', 'afangMonster', 'Grandmonsieur',
    'Precious_Ajao', 'Berr7Wa7ne', 'itzfleeky', 'Mr_ZiG'
  )
ON CONFLICT DO NOTHING;

-- Verify registrations
SELECT
  COUNT(*) AS total_registered
FROM competition_participants
WHERE competition_id = (SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1)
  AND participant_status = 'registered';

-- List all registered players
SELECT
  cp.id,
  u.chess_com_username,
  u.display_name,
  u.chess_elo
FROM competition_participants cp
JOIN users u ON cp.user_id = u.id
WHERE cp.competition_id = (SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1)
ORDER BY u.chess_com_username;


-- ============================================
-- SEGMENT 7: START COMPETITION (Generate Fixtures)
-- ============================================
-- Generates all round-robin fixtures using the circle method.
-- 18 players → 17 rounds × 9 matches = 153 total matches.
-- Sets competition to 'active' and participants to 'active'.
-- Deadline for each round = 24 hours from when it starts.
--
-- IMPORTANT: Run this AFTER Segment 6 (players are registered).

DO $$
DECLARE
  v_comp_id UUID;
  v_players UUID[];
  v_n INTEGER;
  v_round INTEGER;
  v_i INTEGER;
  v_pa UUID;
  v_pb UUID;
  v_temp UUID;
  v_deadline TIMESTAMP WITH TIME ZONE;
  v_match_count INTEGER := 0;
BEGIN
  -- Get the competition ID
  SELECT id INTO v_comp_id FROM competitions
  WHERE competition_status = 'open_registration'
  ORDER BY created_at DESC LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'No competition with open_registration status found. Run Segment 5 first.';
  END IF;

  -- Get all registered player IDs ordered by chess_com_username
  SELECT array_agg(cp.user_id ORDER BY u.chess_com_username)
  INTO v_players
  FROM competition_participants cp
  JOIN users u ON cp.user_id = u.id
  WHERE cp.competition_id = v_comp_id
    AND cp.participant_status = 'registered';

  v_n := array_length(v_players, 1);

  IF v_n IS NULL OR v_n < 2 THEN
    RAISE EXCEPTION 'Not enough registered players (minimum 2, found %)', v_n;
  END IF;

  RAISE NOTICE 'Generating fixtures for % players...', v_n;

  -- If odd number of players, add a NULL (bye)
  IF v_n % 2 = 1 THEN
    v_players := array_append(v_players, NULL::UUID);
    v_n := v_n + 1;
    RAISE NOTICE 'Odd number of players — added a bye. Total positions: %', v_n;
  END IF;

  v_deadline := NOW() + INTERVAL '24 hours';

  -- Circle method: generate N-1 rounds
  FOR v_round IN 1..v_n-1 LOOP
    -- Generate matches for this round
    FOR v_i IN 0..(v_n/2 - 1) LOOP
      v_pa := v_players[v_i + 1];       -- 1-indexed: position i
      v_pb := v_players[v_n - v_i];     -- 1-indexed: position N-1-i

      IF v_pa IS NOT NULL AND v_pb IS NOT NULL THEN
        -- Normal match
        INSERT INTO matches (competition_id, round_number, player_a_id, player_b_id, match_status, leg, deadline)
        VALUES (v_comp_id, v_round, v_pa, v_pb, 'pending', 1, v_deadline);
        v_match_count := v_match_count + 1;
      ELSIF v_pa IS NOT NULL THEN
        -- Bye for player A
        INSERT INTO matches (competition_id, round_number, player_a_id, player_b_id, match_status, is_bye, leg)
        VALUES (v_comp_id, v_round, v_pa, v_pa, 'completed', true, 1);
      ELSIF v_pb IS NOT NULL THEN
        -- Bye for player B
        INSERT INTO matches (competition_id, round_number, player_a_id, player_b_id, match_status, is_bye, leg)
        VALUES (v_comp_id, v_round, v_pb, v_pb, 'completed', true, 1);
      END IF;
    END LOOP;

    -- Rotate: keep position 0 fixed, rotate the rest
    -- Save last element, shift positions 2..N-1 right by 1, put saved at position 2
    v_temp := v_players[v_n];
    FOR v_i IN REVERSE v_n-1..2 LOOP
      v_players[v_i + 1] := v_players[v_i];
    END LOOP;
    v_players[2] := v_temp;

  END LOOP;

  -- Start the competition
  UPDATE competitions
  SET competition_status = 'active', current_round = 1
  WHERE id = v_comp_id;

  -- Update participants to active
  UPDATE competition_participants
  SET participant_status = 'active'
  WHERE competition_id = v_comp_id
    AND participant_status = 'registered';

  RAISE NOTICE '✅ Tournament started! Generated % rounds with % total matches.', v_n - 1, v_match_count;
END;
$$;


-- ============================================
-- SEGMENT 8: VIEW ROUND 1 FIXTURES
-- ============================================
-- Shows all Round 1 matches with player names.
-- Copy this output to send to the WhatsApp group.

SELECT
  m.id AS match_id,
  m.round_number AS round,
  pa.chess_com_username AS player_a,
  pb.chess_com_username AS player_b,
  m.match_status,
  CASE
    WHEN m.is_bye THEN 'Bye (auto-win)'
    WHEN m.match_status = 'completed' AND m.result_winner = 'a' THEN pa.chess_com_username || ' won'
    WHEN m.match_status = 'completed' AND m.result_winner = 'b' THEN pb.chess_com_username || ' won'
    WHEN m.match_status = 'completed' AND m.result_winner = 'draw' THEN 'Draw'
    ELSE 'Pending'
  END AS result,
  m.deadline
FROM matches m
JOIN users pa ON m.player_a_id = pa.id
JOIN users pb ON m.player_b_id = pb.id
WHERE m.competition_id = (SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1)
  AND m.round_number = 1
  AND m.is_bye = false
ORDER BY m.id;


-- ============================================
-- SEGMENT 9: VIEW ALL ROUNDS SUMMARY
-- ============================================
-- Shows how many matches per round.

SELECT
  round_number,
  COUNT(*) AS total_matches,
  COUNT(CASE WHEN match_status = 'pending' THEN 1 END) AS pending,
  COUNT(CASE WHEN match_status = 'completed' THEN 1 END) AS completed,
  COUNT(CASE WHEN is_bye = true THEN 1 END) AS byes
FROM matches
WHERE competition_id = (SELECT id FROM competitions ORDER BY created_at DESC LIMIT 1)
GROUP BY round_number
ORDER BY round_number;
