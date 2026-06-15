-- ============================================================
-- COMPLETE SUPABASE SCHEMA MIGRATION
-- All tables use UUID primary keys (not BIGSERIAL)
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. DROP EXISTING TABLES (if resetting)
-- Order matters due to foreign key constraints
-- ============================================================
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS admin_logs CASCADE;
DROP TABLE IF EXISTS disputes CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS competition_participants CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- 2. DROP CUSTOM TYPES (if they exist)
-- ============================================================
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS chess_platform CASCADE;
DROP TYPE IF EXISTS tournament_type CASCADE;
DROP TYPE IF EXISTS competition_status CASCADE;
DROP TYPE IF EXISTS participant_status CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS match_winner CASCADE;
DROP TYPE IF EXISTS dispute_status CASCADE;
DROP TYPE IF EXISTS admin_decision CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;

-- ============================================================
-- 3. CREATE CUSTOM ENUM TYPES
-- ============================================================
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned', 'pending');
CREATE TYPE chess_platform AS ENUM ('chess.com', 'lichess', 'none');
CREATE TYPE tournament_type AS ENUM ('knockout', 'swiss', 'round_robin');
CREATE TYPE competition_status AS ENUM ('draft', 'open_registration', 'active', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('registered', 'active', 'eliminated', 'withdrawn');
CREATE TYPE match_status AS ENUM ('pending', 'ongoing', 'result_submitted', 'completed', 'disputed', 'cancelled');
CREATE TYPE match_winner AS ENUM ('a', 'b', 'draw');
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'rejected');
CREATE TYPE admin_decision AS ENUM ('upheld', 'overturned', 'draw');
CREATE TYPE member_status AS ENUM ('active', 'muted', 'removed', 'left');
CREATE TYPE notification_type AS ENUM ('match_scheduled', 'match_result', 'dispute_opened', 'dispute_resolved', 'tournament_started', 'tournament_ended', 'registration_closed', 'eliminated', 'admin_action');

-- ============================================================
-- 4. CREATE UUID EXTENSION (if not already enabled)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 5. CREATE ALL TABLES WITH UUID PRIMARY KEYS
-- ============================================================

-- -------------------------------------------------------
-- TABLE: users (Universal user table)
-- All user IDs are UUIDs
-- -------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,

  -- Chess Accounts
  chess_username VARCHAR(100),
  chess_platform chess_platform DEFAULT 'none',
  chess_elo INT DEFAULT 1000,
  chess_id VARCHAR(100),

  -- WhatsApp
  whatsapp_id VARCHAR(100) UNIQUE,
  whatsapp_phone VARCHAR(20),

  -- Display
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),

  -- Role
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player')),

  -- Status & Tracking
  user_status user_status DEFAULT 'pending',
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_id ON users(whatsapp_id);
CREATE INDEX idx_chess_username ON users(chess_username);
CREATE INDEX idx_user_status ON users(user_status);
CREATE INDEX idx_users_role ON users(role);

-- -------------------------------------------------------
-- TABLE: competitions (Tournament records)
-- -------------------------------------------------------
CREATE TABLE competitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type & Format
  tournament_type tournament_type NOT NULL,
  competition_status competition_status DEFAULT 'draft',

  -- Timing
  registration_open_at TIMESTAMP WITH TIME ZONE,
  registration_close_at TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,

  -- Structure
  max_participants INT DEFAULT 32,
  rounds INT DEFAULT 5,
  current_round INT DEFAULT 0,

  -- Configuration
  min_elo INT DEFAULT 800,
  max_elo INT DEFAULT 3000,
  allow_guest_participants BOOLEAN DEFAULT FALSE,

  -- Extra fields (from add_competition_structured_fields migration)
  time_control VARCHAR(50),
  timezone VARCHAR(50) DEFAULT 'UTC+1:00',
  entry_fee_prize TEXT,
  platform VARCHAR(30) DEFAULT 'chess.com',
  match_length VARCHAR(20) DEFAULT 'single_match',
  format_match_rules VARCHAR(50),
  rules JSONB DEFAULT '[]'::jsonb,
  round_robin_legs INT DEFAULT 1,

  -- Tracking
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_comp_status ON competitions(competition_status);
CREATE INDEX idx_comp_type ON competitions(tournament_type);
CREATE INDEX idx_comp_created_by ON competitions(created_by);

-- -------------------------------------------------------
-- TABLE: competition_participants (Who's in which tournament)
-- -------------------------------------------------------
CREATE TABLE competition_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  competition_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Status
  participant_status participant_status DEFAULT 'registered',

  -- Scoring
  score DECIMAL(10, 2) DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,

  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  eliminated_at TIMESTAMP WITH TIME ZONE NULL,

  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (competition_id, user_id)
);

CREATE INDEX idx_cp_competition_id ON competition_participants(competition_id);
CREATE INDEX idx_cp_user_id ON competition_participants(user_id);
CREATE INDEX idx_cp_status ON competition_participants(participant_status);

-- -------------------------------------------------------
-- TABLE: matches (Individual games)
-- -------------------------------------------------------
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship
  competition_id UUID NOT NULL,
  round_number INT NOT NULL,

  -- Players
  player_a_id UUID NOT NULL,
  player_b_id UUID NOT NULL,

  -- Match Info
  scheduled_date TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,

  -- Status
  match_status match_status DEFAULT 'pending',

  -- Results
  result_winner match_winner NULL,
  result_submitted_by UUID NULL,
  result_submitted_at TIMESTAMP WITH TIME ZONE NULL,

  -- Chess.com/Lichess
  chess_game_link VARCHAR(500),
  chess_game_id VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (player_a_id) REFERENCES users(id),
  FOREIGN KEY (player_b_id) REFERENCES users(id),
  FOREIGN KEY (result_submitted_by) REFERENCES users(id)
);

CREATE INDEX idx_m_comp_round ON matches(competition_id, round_number);
CREATE INDEX idx_m_status ON matches(match_status);
CREATE INDEX idx_m_players ON matches(player_a_id, player_b_id);

-- -------------------------------------------------------
-- TABLE: disputes (Contested match results)
-- -------------------------------------------------------
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  match_id UUID NOT NULL UNIQUE,
  raised_by_user_id UUID NOT NULL,

  -- Dispute Info
  reason VARCHAR(500) NOT NULL,
  description TEXT,

  -- Resolution
  dispute_status dispute_status DEFAULT 'open',
  admin_decision admin_decision NULL,
  admin_notes TEXT,
  resolved_by UUID NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE NULL,

  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX idx_d_status ON disputes(dispute_status);

-- -------------------------------------------------------
-- TABLE: admin_logs (Audit trail)
-- -------------------------------------------------------
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  admin_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,

  entity_type VARCHAR(50),
  entity_id UUID,

  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX idx_al_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_al_action ON admin_logs(action);
CREATE INDEX idx_al_created_at ON admin_logs(created_at);

-- -------------------------------------------------------
-- TABLE: group_members (WhatsApp group metadata)
-- -------------------------------------------------------
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  group_id VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL,

  -- Status in group
  member_status member_status DEFAULT 'active',

  -- Inactivity tracking
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  pending_kick_since TIMESTAMP WITH TIME ZONE NULL,
  final_warning_since TIMESTAMP WITH TIME ZONE NULL,

  -- Onboarding
  introduced_at TIMESTAMP WITH TIME ZONE NULL,
  introduction_attempts INT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_gm_group_id ON group_members(group_id);
CREATE INDEX idx_gm_user_id ON group_members(user_id);
CREATE INDEX idx_gm_status ON group_members(member_status);

-- -------------------------------------------------------
-- TABLE: notifications (System notifications)
-- -------------------------------------------------------
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  user_id UUID NOT NULL,

  notification_type notification_type NOT NULL,

  -- Content
  title VARCHAR(255),
  message TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE NULL,

  -- Delivery
  send_to_whatsapp BOOLEAN DEFAULT TRUE,
  send_to_web BOOLEAN DEFAULT TRUE,
  sent_at TIMESTAMP WITH TIME ZONE NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_n_user_id ON notifications(user_id);
CREATE INDEX idx_n_is_read ON notifications(is_read);

-- ============================================================
-- 6. TRIGGERS FOR updated_at AUTO-UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. SEED DATA: Insert an admin user
-- Change the values as needed before running
-- ============================================================
INSERT INTO users (id, email, phone_number, display_name, role, user_status, chess_elo)
VALUES (
  uuid_generate_v4(),
  'admin@chesscommunity.com',
  '2348000000000',
  'Admin',
  'admin',
  'active',
  1000
);

-- ============================================================
-- DONE! Your tables are ready with UUID primary keys.
-- ============================================================