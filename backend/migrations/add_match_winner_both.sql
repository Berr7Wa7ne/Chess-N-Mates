-- Mutual win: both players awarded a win (2 pts each). Used when a scheduled
-- game cannot be played but both receive full points (admin decision).
ALTER TYPE match_winner ADD VALUE IF NOT EXISTS 'both';
