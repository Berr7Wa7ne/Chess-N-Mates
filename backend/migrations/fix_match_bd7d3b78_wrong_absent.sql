-- ============================================================
-- FIX: Match bd7d3b78-83ad-42fb-8863-ac3c4acd1c98
-- Grandmonsieur (player_a) vs infamosnuel (player_b)
--
-- PROBLEM: Zig mistakenly scored infamosnuel as winner and
--          marked Grandmonsieur absent.
-- CORRECT: infamosnuel was the one absent. Grandmonsieur wins.
-- ============================================================

BEGIN;

-- STEP 1: Inspect current (wrong) state
SELECT m.id AS match_id, m.round_number,
  pa.display_name AS player_a, pb.display_name AS player_b,
  m.result_winner, m.is_absent, m.absence_side, m.is_both_absent, m.match_status, m.forced, m.force_reason
FROM matches m
JOIN users pa ON pa.id = m.player_a_id
JOIN users pb ON pb.id = m.player_b_id
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98';

-- STEP 2: Reverse WRONG scores
-- (Currently: absence_side='a', result_winner='b')
--   player_b (infamosnuel) got +2 score, +1 win
--   player_a (Grandmonsieur) got +1 absence
UPDATE competition_participants cp
SET score = GREATEST(0, cp.score - 2), wins = GREATEST(0, cp.wins - 1)
FROM matches m
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98'
  AND cp.competition_id = m.competition_id AND cp.user_id = m.player_b_id;

UPDATE competition_participants cp
SET absences = GREATEST(0, cp.absences - 1)
FROM matches m
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98'
  AND cp.competition_id = m.competition_id AND cp.user_id = m.player_a_id;

-- STEP 3: Apply CORRECT scores
-- (Correct: absence_side='b', result_winner='a')
--   player_a (Grandmonsieur) gets +2 score, +1 win
--   player_b (infamosnuel) gets +1 absence
UPDATE competition_participants cp
SET score = cp.score + 2, wins = cp.wins + 1
FROM matches m
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98'
  AND cp.competition_id = m.competition_id AND cp.user_id = m.player_a_id;

UPDATE competition_participants cp
SET absences = cp.absences + 1
FROM matches m
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98'
  AND cp.competition_id = m.competition_id AND cp.user_id = m.player_b_id;

-- STEP 4: Fix the match record itself
UPDATE matches
SET result_winner = 'a', absence_side = 'b', is_absent = true, is_both_absent = false,
    match_status = 'completed', forced = true,
    force_reason = 'CORRECTION: Zig mistakenly scored infamosnuel as winner and marked Grandmonsieur absent. Actually infamosnuel was absent, so Grandmonsieur wins.',
    updated_at = NOW()
WHERE id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98';

-- STEP 5: Verify the fix
SELECT m.id AS match_id, m.round_number,
  pa.display_name AS player_a, pb.display_name AS player_b,
  m.result_winner, m.is_absent, m.absence_side, m.is_both_absent, m.match_status, m.forced, m.force_reason
FROM matches m
JOIN users pa ON pa.id = m.player_a_id
JOIN users pb ON pb.id = m.player_b_id
WHERE m.id = 'bd7d3b78-83ad-42fb-8863-ac3c4acd1c98';

-- STEP 6: Print ROUND 1 RESULTS for sharing to the group
SELECT m.round_number AS "Round",
  pa.display_name AS "Player A",
  pb.display_name AS "Player B",
  CASE
    WHEN m.match_status = 'completed' AND m.is_absent AND m.absence_side = 'a' THEN pb.display_name || ' won (by default - ' || pa.display_name || ' absent)'
    WHEN m.match_status = 'completed' AND m.is_absent AND m.absence_side = 'b' THEN pa.display_name || ' won (by default - ' || pb.display_name || ' absent)'
    WHEN m.match_status = 'completed' AND m.is_absent AND m.is_both_absent THEN 'Both players absent - no result'
    WHEN m.match_status = 'completed' AND m.result_winner = 'a' THEN pa.display_name || ' won'
    WHEN m.match_status = 'completed' AND m.result_winner = 'b' THEN pb.display_name || ' won'
    WHEN m.match_status = 'completed' AND m.result_winner = 'draw' THEN 'Draw'
    WHEN m.match_status = 'result_submitted' THEN 'Result submitted - pending confirmation'
    WHEN m.match_status = 'disputed' THEN 'Disputed'
    ELSE 'Pending'
  END AS "Result"
FROM matches m
JOIN users pa ON pa.id = m.player_a_id
JOIN users pb ON pb.id = m.player_b_id
WHERE m.round_number = 1
  AND m.competition_id = (SELECT id FROM competitions WHERE competition_status IN ('active', 'open_registration') ORDER BY created_at DESC LIMIT 1)
ORDER BY m.id;

COMMIT;