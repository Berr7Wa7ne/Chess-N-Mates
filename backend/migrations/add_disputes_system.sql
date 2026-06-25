-- PART 1: Database Changes for Disputes System

-- 1.1 Remove unique constraint on disputes.match_id
ALTER TABLE public.disputes 
DROP CONSTRAINT IF EXISTS disputes_match_id_key;

-- 1.2 Add missing columns to disputes table
ALTER TABLE public.disputes
ADD COLUMN IF NOT EXISTS competition_id uuid NOT NULL 
  REFERENCES competitions(id),
ADD COLUMN IF NOT EXISTS category varchar(100) NOT NULL DEFAULT 'other',
ADD COLUMN IF NOT EXISTS filed_by_role varchar(20) NOT NULL DEFAULT 'player'
  CHECK (filed_by_role IN ('player', 'admin')),
ADD COLUMN IF NOT EXISTS opponent_user_id uuid 
  REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_disputes_competition_id 
  ON public.disputes(competition_id);
CREATE INDEX IF NOT EXISTS idx_disputes_match_id 
  ON public.disputes(match_id);

-- 1.3 Add chess.com and phone fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS chess_com_username varchar(100) UNIQUE,
ADD COLUMN IF NOT EXISTS phone_number varchar(30) UNIQUE;

-- 1.4 Add dispute_status enum values if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'under_review' AND enumtypid = 
    (SELECT oid FROM pg_type WHERE typname = 'dispute_status')) THEN
    ALTER TYPE dispute_status ADD VALUE 'under_review';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 
    (SELECT oid FROM pg_type WHERE typname = 'dispute_status')) THEN
    ALTER TYPE dispute_status ADD VALUE 'rejected';
  END IF;
END $$;