ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS chess_platform varchar(30)
  CHECK (chess_platform IN ('chess.com', 'lichess', 'over_the_board')),
ADD COLUMN IF NOT EXISTS chess_com_username varchar(100),
ADD COLUMN IF NOT EXISTS lichess_username varchar(100);