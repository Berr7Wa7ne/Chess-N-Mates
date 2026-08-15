-- ============================================================
-- LIVE COMPETITION STANDINGS
-- Shows current standings for the active/open_registration competition
-- Ordered by: Score (desc) → Wins (desc) → Draws (desc) → Losses (asc)
-- ============================================================

SELECT
  ROW_NUMBER() OVER (
    ORDER BY cp.score DESC, cp.wins DESC, cp.draws DESC, cp.losses ASC
  ) AS "Position",
  u.display_name AS "Player",
  u.chess_com_username AS "Chess Username",
  u.chess_elo AS "ELO",
  cp.score AS "Points",
  cp.wins AS "Wins",
  cp.draws AS "Draws",
  cp.losses AS "Losses",
  cp.absences AS "Absences",
  cp.participant_status AS "Status"
FROM competition_participants cp
JOIN users u ON u.id = cp.user_id
WHERE cp.competition_id = (
  SELECT id FROM competitions
  WHERE competition_status IN ('active', 'open_registration')
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY cp.score DESC, cp.wins DESC, cp.draws DESC, cp.losses ASC;