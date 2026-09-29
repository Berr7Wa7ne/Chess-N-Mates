-- =====================================================================
-- Correction: Round 4 kayceea vs Ghostrhyderv2 (September 2026)
--
-- Background:
--   The match (8865490c-cf9c-440b-b2d1-b790e2edee3b) was mistakenly recorded
--   as a plain win for Ghostrhyderv2 (player_b). Ghostrhyderv2 was actually
--   the absentee, so kayceea (player_a) wins and Ghostrhyderv2 receives an absence.
--
-- Actions:
--   1. Matches: result_winner='a', is_absent=true, absence_side='b', forced=true
--   2. Participants:
--        kayceea       -> score=6, wins=3, losses=1, absences=0
--        Ghostrhyderv2 -> score=4, wins=2, losses=1, absences=1
--   3. Admin audit log recorded
--   4. Round 5 pairings were subsequently rebuilt with rebuild-swiss-round.js
--
-- Note: This is the SQL reference copy. The migration was already applied live via
-- backend/scripts/fix-round4-kayceea-ghostrhyderv2.js, so running this is idempotent.
-- =====================================================================

BEGIN;

DO $$
DECLARE
  v_match CONSTANT UUID := '8865490c-cf9c-440b-b2d1-b790e2edee3b';
  v_a     CONSTANT UUID := '7f51a23c-f434-4529-a7b7-e790bf5ea035';  -- kayceea
  v_b     CONSTANT UUID := '7de8f1c4-0d8d-4518-b3cc-b443e1535a08';  -- Ghostrhyderv2
  v_row   RECORD;
BEGIN
  SELECT * INTO v_row FROM matches WHERE id = v_match FOR UPDATE;
  IF NOT FOUND THEN
    RAISE NOTICE '[ABORT] match % not found', v_match;
    RETURN;
  END IF;

  IF v_row.result_winner = 'a' AND v_row.is_absent AND v_row.absence_side = 'b' THEN
    RAISE NOTICE '[ALREADY CORRECTED] match % is already in corrected state', v_match;
    RETURN;
  END IF;

  -- 1. Match update
  UPDATE matches
  SET result_winner    = 'a',
      is_absent        = TRUE,
      absence_side     = 'b',
      is_both_absent   = FALSE,
      match_status     = 'completed',
      result_source    = 'manual',
      needs_review     = FALSE,
      forced           = TRUE,
      force_reason     = 'R4 correction: Ghostrhyderv2 was the absentee; kayceea wins (previously recorded as a Ghostrhyderv2 win)',
      forced_at        = now(),
      updated_at       = now()
  WHERE id = v_match;

  -- 2. Participant updates
  UPDATE competition_participants
  SET score = 6, wins = 3, draws = 0, losses = 1, absences = 0, byes = 0
  WHERE competition_id = v_row.competition_id AND user_id = v_a;

  UPDATE competition_participants
  SET score = 4, wins = 2, draws = 0, losses = 1, absences = 1, byes = 0
  WHERE competition_id = v_row.competition_id AND user_id = v_b;

  -- 3. Audit trail
  INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, old_value, new_value)
  SELECT
    a.id,
    'match_result_corrected',
    'match',
    v_match,
    jsonb_build_object(
      'result_winner', v_row.result_winner,
      'is_absent', v_row.is_absent,
      'absence_side', v_row.absence_side
    ),
    jsonb_build_object(
      'result_winner', 'a',
      'is_absent', TRUE,
      'absence_side', 'b',
      'reason', 'R4 correction: Ghostrhyderv2 did not show in round 4, kayceea awarded win'
    )
  FROM users a
  WHERE a.role = 'admin'
  ORDER BY a.created_at ASC, a.id ASC
  LIMIT 1;

  RAISE NOTICE '[DONE] R4 corrected successfully.';
END $$;

COMMIT;

-- Verification
SELECT m.id, m.round_number, m.result_winner, m.is_absent, m.absence_side, m.forced, m.force_reason
FROM matches m
WHERE m.id = '8865490c-cf9c-440b-b2d1-b790e2edee3b';

SELECT cp.user_id, u.display_name, cp.score, cp.wins, cp.losses, cp.absences
FROM competition_participants cp
JOIN users u ON u.id = cp.user_id
WHERE cp.competition_id = 'b70b608d-3d15-412e-b3c2-3edaf917324f'
  AND cp.user_id IN ('7f51a23c-f434-4529-a7b7-e790bf5ea035', '7de8f1c4-0d8d-4518-b3cc-b443e1535a08');
