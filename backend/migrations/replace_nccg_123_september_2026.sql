-- =====================================================================
-- SUBSTITUTE THE nccg_123 SLOT WITH oreoluwa12 - September 2026
-- =====================================================================
--
-- WHY
--   nccg_123 abandoned the Round 3 fixture vs aida001 after a time-control
--   dispute (R3 result_source = 'manual', result_winner = 'a') and then left
--   the WhatsApp group. Admin decision: substitute a committed player who
--   inherits the slot's record and plays out the remaining rounds.
--
-- WHAT MOVES
--   competition     b70b608d-3d15-412e-b3c2-3edaf917324f  September 2026 (swiss, round 4 of 10)
--   slot user       b1475774-dbbe-4eb4-b62e-2d66c3817a6d  nccg_123      -> out (retired)
--   incoming user   2faae38e-2e97-4e09-a7f7-c56628038f1d  mattystreamer -> in, renamed oreoluwa12
--   participant     1cedbdfa-48dc-4a62-83f9-53a56b91072f  the record that is handed over
--   score kept      2.00 - W1 - D0 - L2 - absences 0 - byes 0
--   fixtures moved  R1 e5ee6241 win (a) vs IWEBS_M
--                   R2 fbb05808 loss (b) vs goatstein
--                   R3 e0397d1f forfeit loss (a) vs aida001
--                   R4 a27c7a16 pending vs Bobnestar
--
-- INVARIANT THIS PRESERVES
--   standingsService.applyMatches() silently drops any match whose player id
--   has no competition_participants row. The participant row AND every match
--   that references the slot must therefore move together - which is why
--   everything below is a single atomic DO block. Never move one without
--   the other, or round 1-3 results vanish from the standings.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   Equivalent CLI path once SUPABASE_DB_PASSWORD or DATABASE_URL is in .env:
--     node backend/scripts/run-migrations.js replace_nccg_123_september_2026.sql
--
-- SAFE TO RE-RUN
--   The block never raises: it aborts with a NOTICE if the swap is already
--   applied, if the slot row is missing, or if the incoming user is already a
--   participant in this competition. It is safe to leave in a full
--   `npm run migrate` batch.
--
-- AFTER RUNNING
--   node backend/scripts/verify-swap-nccg-123.js
--   node backend/scripts/sync-chesscom-ratings.js b70b608d-3d15-412e-b3c2-3edaf917324f
--
-- TIME CRITICAL
--   The inherited Round 4 fixture is oreoluwa12 vs Bobnestar, deadline
--   2026-09-28T05:39:49Z.
-- =====================================================================

DO $$
DECLARE
  -- ---- policy switches (D1 / D3 from the plan) ------------------------
  v_rename_new_account  BOOLEAN := TRUE;                 -- register the chess.com account he will actually play with
  v_new_chess_username  CONSTANT TEXT := 'oreoluwa12';   -- D1: his current chess.com handle
  v_ban_old_account     BOOLEAN := TRUE;                 -- D3: TRUE = 'banned' (blocks web sign-in), FALSE = 'inactive'
  -- D2 (Round 3 forfeit stays a loss for the slot) and D4 (the substitute
  -- inherits the record) need no switch: this script never touches results
  -- or the score/wins/draws/losses columns.

  -- ---- fixed identifiers ----------------------------------------------
  v_comp     CONSTANT UUID := 'b70b608d-3d15-412e-b3c2-3edaf917324f';
  v_slot_row CONSTANT UUID := '1cedbdfa-48dc-4a62-83f9-53a56b91072f';
  v_old_user CONSTANT UUID := 'b1475774-dbbe-4eb4-b62e-2d66c3817a6d';
  v_new_user CONSTANT UUID := '2faae38e-2e97-4e09-a7f7-c56628038f1d';

  -- ---- working variables ----------------------------------------------
  v_owner   UUID;
  v_new_dup INT;
  v_admin   UUID;
  v_moved_a INT := 0;
  v_moved_b INT := 0;
BEGIN


  -- ---- who acted (earliest admin) for the audit row --------------------
  SELECT id INTO v_admin
  FROM users
  WHERE role = 'admin'
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  -- ---- guards: never touch anything unless the state is exactly ours ----
  SELECT user_id INTO v_owner
  FROM competition_participants
  WHERE id = v_slot_row;

  IF v_owner IS NULL THEN
    RAISE NOTICE '[ABORT] slot participant row % does not exist - nothing changed.', v_slot_row;
    RETURN;
  END IF;

  SELECT count(*) INTO v_new_dup
  FROM competition_participants
  WHERE competition_id = v_comp
    AND user_id = v_new_user;

  IF v_new_dup > 0 THEN
    RAISE NOTICE '[ABORT] % is already a participant in % - resolve manually, nothing changed.',
      v_new_user, v_comp;
    RETURN;
  END IF;

  IF v_owner = v_new_user THEN
    RAISE NOTICE '[ALREADY APPLIED] slot % already belongs to %. Re-run is a no-op.',
      v_slot_row, v_new_user;
    RETURN;
  END IF;

  IF v_owner <> v_old_user THEN
    RAISE NOTICE '[ABORT] slot % belongs to unexpected user % (expected nccg_123 = %). Nothing changed.',
      v_slot_row, v_owner, v_old_user;
    RETURN;
  END IF;

  -- ---- 1/5 rename the incoming account (D1) ----------------------------
  IF v_rename_new_account THEN
    UPDATE users
    SET display_name       = v_new_chess_username,
        chess_com_username = v_new_chess_username,
        chess_username     = v_new_chess_username,
        chess_platform     = 'chess.com',
        updated_at         = now()
    WHERE id = v_new_user;

    RAISE NOTICE '[1/5] account % renamed to %.', v_new_user, v_new_chess_username;
  ELSE
    RAISE NOTICE '[1/5] rename skipped (v_rename_new_account = FALSE).';
  END IF;

  -- ---- 2/5 move the slot's fixtures (R1+R2 are player_a, R3+R4 player_b) --
  UPDATE matches
  SET player_a_id = v_new_user,
      updated_at  = now()
  WHERE competition_id = v_comp
    AND player_a_id = v_old_user;
  GET DIAGNOSTICS v_moved_a = ROW_COUNT;

  UPDATE matches
  SET player_b_id = v_new_user,
      updated_at  = now()
  WHERE competition_id = v_comp
    AND player_b_id = v_old_user;
  GET DIAGNOSTICS v_moved_b = ROW_COUNT;

  RAISE NOTICE '[2/5] fixtures moved: % as player_a, % as player_b (expected 2 and 2).',
    v_moved_a, v_moved_b;

  -- ---- 3/5 hand the record over (score/wins/draws/losses untouched) -----
  UPDATE competition_participants
  SET user_id = v_new_user
  WHERE id = v_slot_row
    AND user_id = v_old_user;

  RAISE NOTICE '[3/5] participant record % handed over with its score intact.', v_slot_row;

  -- ---- 4/5 retire the old account (D3) --------------------------------
  IF v_ban_old_account THEN
    UPDATE users SET user_status = 'banned', updated_at = now() WHERE id = v_old_user;
    RAISE NOTICE '[4/5] nccg_123 (%) marked banned.', v_old_user;
  ELSE
    UPDATE users SET user_status = 'inactive', updated_at = now() WHERE id = v_old_user;
    RAISE NOTICE '[4/5] nccg_123 (%) marked inactive.', v_old_user;
  END IF;

  -- ---- 5/5 audit trail (no app code writes admin_logs at runtime) -------
  IF v_admin IS NULL THEN
    RAISE NOTICE '[5/5] audit row skipped: no user with role = admin found.';
  ELSE
    INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (
      v_admin,
      'participant_replaced',
      'competition',
      v_comp,
      jsonb_build_object(
        'user_id',        v_old_user,
        'participant_id', v_slot_row,
        'display_name',   'nccg_123',
        'score', 2, 'wins', 1, 'draws', 0, 'losses', 2, 'absences', 0, 'byes', 0,
        'matches', jsonb_build_array(
          'R1 e5ee6241 win (a) vs IWEBS_M',
          'R2 fbb05808 loss (b) vs goatstein',
          'R3 e0397d1f forfeit loss (a) vs aida001',
          'R4 a27c7a16 pending vs Bobnestar'
        )
      ),
      jsonb_build_object(
        'user_id',            v_new_user,
        'display_name',       v_new_chess_username,
        'record_inherited',   TRUE,
        'reason',             'Abandoned Round 3 after a time-control dispute and left the group; substituted at admin discretion on 2026-09-27'
      )
    );

    RAISE NOTICE '[5/5] admin_logs row written (action = participant_replaced, admin = %).', v_admin;
  END IF;

  RAISE NOTICE '[DONE] nccg_123 slot replaced by %. Next: node backend/scripts/verify-swap-nccg-123.js', v_new_user;
END $$;


-- =====================================================================
-- VERIFICATION (read-only - safe to run in the same paste)
-- =====================================================================

-- V1 - the record now belongs to oreoluwa12.
-- EXPECT: exactly 1 row | score 2.00 | wins 1 | draws 0 | losses 2 | absences 0 | byes 0
SELECT cp.id          AS participant_id,
       u.display_name,
       u.chess_com_username,
       u.chess_elo,
       cp.participant_status,
       cp.score,
       cp.wins,
       cp.draws,
       cp.losses,
       cp.absences,
       cp.byes,
       cp.joined_at
FROM competition_participants cp
JOIN users u ON u.id = cp.user_id
WHERE cp.competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND cp.user_id IN ('2faae38e-2e97-4e09-a7f7-c56628038f1d',   -- new owner
                     'b1475774-dbbe-4eb4-b62e-2d66c3817a6d');  -- old owner (expect gone)

-- V2 - the slot's four fixtures now read oreoluwa12.
-- EXPECT: 4 rows, R1 completed/win, R2 completed/loss, R3 completed/loss, R4 pending vs Bobnestar
SELECT m.round_number,
       m.id             AS match_id,
       m.match_status,
       m.result_winner,
       m.result_source,
       m.deadline,
       pa.display_name  AS player_a,
       pb.display_name  AS player_b
FROM matches m
JOIN users pa ON pa.id = m.player_a_id
JOIN users pb ON pb.id = m.player_b_id
WHERE m.competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND '2faae38e-2e97-4e09-a7f7-c56628038f1d' IN (m.player_a_id, m.player_b_id)
ORDER BY m.round_number;

-- V3 - no nccg_123 leftovers in this competition.
-- EXPECT: 0 rows from both queries.
SELECT * FROM competition_participants
WHERE competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND user_id = 'b1475774-dbbe-4eb4-b62e-2d66c3817a6d';

SELECT * FROM matches
WHERE competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND 'b1475774-dbbe-4eb4-b62e-2d66c3817a6d' IN (player_a_id, player_b_id);

-- V4 - integrity net: any match pointing at a non-participant corrupts standings.
-- EXPECT: 0 rows.
SELECT m.id, m.round_number, m.player_a_id, m.player_b_id
FROM matches m
WHERE m.competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND (   m.player_a_id NOT IN (SELECT user_id FROM competition_participants WHERE competition_id = m.competition_id)
       OR m.player_b_id NOT IN (SELECT user_id FROM competition_participants WHERE competition_id = m.competition_id));

-- V5 - audit trail.
-- EXPECT: 1 row, action = participant_replaced.
SELECT id, admin_id, action, entity_type, entity_id, created_at
FROM admin_logs
WHERE action = 'participant_replaced'
ORDER BY created_at DESC
LIMIT 1;

-- V6 - participant count is unchanged (22) and the old account is retired.
-- EXPECT: 22 participants, 1 row with user_status = banned.
SELECT count(*) AS participants
FROM competition_participants
WHERE competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND participant_status <> 'withdrawn';

SELECT id, display_name, chess_com_username, user_status
FROM users
WHERE id IN ('b1475774-dbbe-4eb4-b62e-2d66c3817a6d',
             '2faae38e-2e97-4e09-a7f7-c56628038f1d');


-- =====================================================================
-- UNDO (only if the substitution has to be reversed) - commented out;
-- copy the whole block into the editor and remove the leading "-- " to run.
-- The old account is left 'banned'; flip the last statement to 'active'.
-- =====================================================================
-- DO $$
-- DECLARE
--   v_comp     CONSTANT UUID := 'b70b608d-3d15-412e-b3c2-3edaf917324f';
--   v_slot_row CONSTANT UUID := '1cedbdfa-48dc-4a62-83f9-53a56b91072f';
--   v_old_user CONSTANT UUID := 'b1475774-dbbe-4eb4-b62e-2d66c3817a6d';
--   v_new_user CONSTANT UUID := '2faae38e-2e97-4e09-a7f7-c56628038f1d';
-- BEGIN
--   UPDATE matches SET player_a_id = v_old_user, updated_at = now()
--   WHERE competition_id = v_comp AND player_a_id = v_new_user AND round_number IN (1, 2);
--
--   UPDATE matches SET player_b_id = v_old_user, updated_at = now()
--   WHERE competition_id = v_comp AND player_b_id = v_new_user AND round_number IN (3, 4);
--
--   UPDATE competition_participants SET user_id = v_old_user
--   WHERE id = v_slot_row AND user_id = v_new_user;
--
--   UPDATE users SET user_status = 'active', updated_at = now() WHERE id = v_old_user;
--
--   UPDATE users SET display_name = 'mattystreamer', chess_com_username = 'mattystreamer',
--                    chess_username = 'mattystreamer', updated_at = now()
--   WHERE id = v_new_user;
--
--   UPDATE admin_logs SET new_value = new_value || jsonb_build_object('reverted_at', now())
--   WHERE action = 'participant_replaced'
--     AND entity_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
--     AND admin_id IS NOT NULL
--     AND id = (SELECT id FROM admin_logs WHERE action = 'participant_replaced'
--               ORDER BY created_at DESC LIMIT 1);
--
--   RAISE NOTICE '[REVERTED] slot % handed back to nccg_123.', v_slot_row;
-- END $$;
