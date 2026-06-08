-- Create custom types (enums)
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

-- users table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,

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

-- competitions table
CREATE TABLE competitions (
  id BIGSERIAL PRIMARY KEY,

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

  -- Tracking
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_comp_status ON competitions(competition_status);
CREATE INDEX idx_comp_type ON competitions(tournament_type);
CREATE INDEX idx_comp_created_by ON competitions(created_by);

-- competition_participants table
CREATE TABLE competition_participants (
  id BIGSERIAL PRIMARY KEY,

  competition_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,

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

-- matches table
CREATE TABLE matches (
  id BIGSERIAL PRIMARY KEY,

  -- Relationship
  competition_id BIGINT NOT NULL,
  round_number INT NOT NULL,

  -- Players
  player_a_id BIGINT NOT NULL,
  player_b_id BIGINT NOT NULL,

  -- Match Info
  scheduled_date TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,

  -- Status
  match_status match_status DEFAULT 'pending',

  -- Results
  result_winner match_winner NULL,
  result_submitted_by BIGINT NULL,
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

-- disputes table
CREATE TABLE disputes (
  id BIGSERIAL PRIMARY KEY,

  match_id BIGINT NOT NULL UNIQUE,
  raised_by_user_id BIGINT NOT NULL,

  -- Dispute Info
  reason VARCHAR(500) NOT NULL,
  description TEXT,

  -- Resolution
  dispute_status dispute_status DEFAULT 'open',
  admin_decision admin_decision NULL,
  admin_notes TEXT,
  resolved_by BIGINT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE NULL,

  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
);

CREATE INDEX idx_d_status ON disputes(dispute_status);

-- admin_logs table
CREATE TABLE admin_logs (
  id BIGSERIAL PRIMARY KEY,

  admin_id BIGINT NOT NULL,
  action VARCHAR(100) NOT NULL,

  entity_type VARCHAR(50),
  entity_id BIGINT,

  old_value JSONB,
  new_value JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX idx_al_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_al_action ON admin_logs(action);
CREATE INDEX idx_al_created_at ON admin_logs(created_at);

-- group_members table
CREATE TABLE group_members (
  id BIGSERIAL PRIMARY KEY,

  group_id VARCHAR(100) NOT NULL,
  user_id BIGINT NOT NULL,

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

-- notifications table
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,

  user_id BIGINT NOT NULL,

  notification_type notification_type NOT NULL,

  -- Content
  title VARCHAR(255),
  message TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id BIGINT,

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

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON competitions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_group_members_updated_at BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
