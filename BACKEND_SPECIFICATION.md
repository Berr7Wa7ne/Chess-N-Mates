# 🔧 BACKEND SPECIFICATION - Single Source of Truth

**Status**: LOCKED & APPROVED  
**Version**: 1.0  
**Last Updated**: June 2, 2026  
**Purpose**: Complete backend contract for frontend & bot integration

---

## 📋 TABLE OF CONTENTS

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Status & State Definitions](#status--state-definitions)
4. [Business Rules](#business-rules)
5. [Bot Command Mapping](#bot-command-mapping)
6. [Error Handling](#error-handling)
7. [Authentication & Authorization](#authentication--authorization)

---

## 🗄️ DATABASE SCHEMA

### ✅ LOCKED TABLES

#### `users` (Universal user table)
```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Identification
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  
  -- Chess Accounts
  chess_username VARCHAR(100),
  chess_platform ENUM('chess.com', 'lichess', 'none') DEFAULT 'none',
  chess_elo INT DEFAULT 1000,
  chess_id VARCHAR(100),  -- External ID from Chess.com/Lichess
  
  -- WhatsApp
  whatsapp_id VARCHAR(100) UNIQUE,  -- Format: "1234567890@s.whatsapp.net" or "120363...@g.us"
  whatsapp_phone VARCHAR(20),
  
  -- Display
  display_name VARCHAR(255),
  avatar_url VARCHAR(500),
  
  -- Status & Tracking
  user_status ENUM('active', 'inactive', 'banned', 'pending') DEFAULT 'pending',
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_phone (phone_number),
  UNIQUE KEY unique_email (email),
  INDEX idx_whatsapp_id (whatsapp_id),
  INDEX idx_chess_username (chess_username),
  INDEX idx_user_status (user_status)
);
```

**Notes**:
- `whatsapp_id`: Either personal (1234567890@s.whatsapp.net) or group (120363...@g.us)
- `chess_username`: null until user registers with Chess.com/Lichess
- `last_activity_at`: Updated on every message, match result, or action
- **Soft deletes**: Use `user_status = 'inactive'` instead of deleting

---

#### `competitions` (Tournament records)
```sql
CREATE TABLE competitions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Type & Format
  tournament_type ENUM('knockout', 'swiss', 'round_robin') NOT NULL,
  competition_status ENUM('draft', 'open_registration', 'active', 'completed', 'cancelled') DEFAULT 'draft',
  
  -- Timing
  registration_open_at TIMESTAMP,
  registration_close_at TIMESTAMP,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_status (competition_status),
  INDEX idx_type (tournament_type),
  INDEX idx_created_by (created_by)
);
```

**Notes**:
- `current_round`: 0 = registration phase, 1+ = active rounds
- `tournament_type`: Determines fixture generation algorithm
- Status flow: draft → open_registration → active → completed

---

#### `competition_participants` (Who's in which tournament)
```sql
CREATE TABLE competition_participants (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  competition_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  
  -- Status
  participant_status ENUM('registered', 'active', 'eliminated', 'withdrawn') DEFAULT 'registered',
  
  -- Scoring
  score DECIMAL(10, 2) DEFAULT 0,
  wins INT DEFAULT 0,
  draws INT DEFAULT 0,
  losses INT DEFAULT 0,
  
  -- Timestamps
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  eliminated_at TIMESTAMP NULL,
  
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_competition_user (competition_id, user_id),
  INDEX idx_competition_id (competition_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (participant_status)
);
```

**Notes**:
- `participant_status`: `registered` = waiting to play, `active` = playing, `eliminated` = knocked out (knockout), `withdrawn` = quit mid-tournament
- Score = cumulative points from all matches

---

#### `matches` (Individual games)
```sql
CREATE TABLE matches (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  -- Relationship
  competition_id BIGINT NOT NULL,
  round_number INT NOT NULL,
  
  -- Players
  player_a_id BIGINT NOT NULL,
  player_b_id BIGINT NOT NULL,
  
  -- Match Info
  scheduled_date TIMESTAMP,
  deadline TIMESTAMP,
  
  -- Status
  match_status ENUM('pending', 'ongoing', 'result_submitted', 'completed', 'disputed', 'cancelled') DEFAULT 'pending',
  
  -- Results (null until result submitted)
  result_winner ENUM('a', 'b', 'draw') NULL,
  result_submitted_by BIGINT NULL,
  result_submitted_at TIMESTAMP NULL,
  
  -- Chess.com/Lichess
  chess_game_link VARCHAR(500),
  chess_game_id VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (competition_id) REFERENCES competitions(id),
  FOREIGN KEY (player_a_id) REFERENCES users(id),
  FOREIGN KEY (player_b_id) REFERENCES users(id),
  FOREIGN KEY (result_submitted_by) REFERENCES users(id),
  INDEX idx_competition_round (competition_id, round_number),
  INDEX idx_status (match_status),
  INDEX idx_players (player_a_id, player_b_id)
);
```

**Notes**:
- `result_winner`: null until result is submitted/confirmed
- `deadline`: Calculated as scheduled_date + 24-48 hours based on format
- Status flow: pending → ongoing → result_submitted → completed OR disputed → resolved → completed

---

#### `disputes` (Contested match results)
```sql
CREATE TABLE disputes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  match_id BIGINT NOT NULL UNIQUE,
  raised_by_user_id BIGINT NOT NULL,
  
  -- Dispute Info
  reason VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Resolution
  dispute_status ENUM('open', 'under_review', 'resolved', 'rejected') DEFAULT 'open',
  admin_decision ENUM('upheld', 'overturned', 'draw') NULL,
  admin_notes TEXT,
  resolved_by BIGINT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (raised_by_user_id) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  INDEX idx_status (dispute_status)
);
```

**Notes**:
- One dispute per match maximum
- `admin_decision`: Determines final result (overrides `result_winner` in matches table)
- Timeline: open → under_review (24h max) → resolved or rejected

---

#### `admin_logs` (Audit trail)
```sql
CREATE TABLE admin_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  admin_id BIGINT NOT NULL,
  action VARCHAR(100) NOT NULL,
  
  entity_type VARCHAR(50),  -- 'user', 'match', 'competition', 'dispute'
  entity_id BIGINT,
  
  old_value JSON,
  new_value JSON,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id),
  INDEX idx_admin_id (admin_id),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
);
```

---

#### `group_members` (WhatsApp group metadata)
```sql
CREATE TABLE group_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  group_id VARCHAR(100) NOT NULL,
  user_id BIGINT NOT NULL,
  
  -- Status in group
  member_status ENUM('active', 'muted', 'removed', 'left') DEFAULT 'active',
  
  -- Inactivity tracking
  last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  pending_kick_since TIMESTAMP NULL,
  final_warning_since TIMESTAMP NULL,
  
  -- Onboarding
  introduced_at TIMESTAMP NULL,
  introduction_attempts INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_group_id (group_id),
  INDEX idx_user_id (user_id),
  INDEX idx_member_status (member_status)
);
```

---

#### `notifications` (System notifications)
```sql
CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  
  user_id BIGINT NOT NULL,
  
  notification_type ENUM('match_scheduled', 'match_result', 'dispute_opened', 'dispute_resolved', 'tournament_started', 'tournament_ended', 'registration_closed', 'eliminated', 'admin_action') NOT NULL,
  
  -- Content
  title VARCHAR(255),
  message TEXT,
  related_entity_type VARCHAR(50),  -- 'match', 'competition', 'dispute'
  related_entity_id BIGINT,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  
  -- Delivery
  send_to_whatsapp BOOLEAN DEFAULT TRUE,
  send_to_web BOOLEAN DEFAULT TRUE,
  sent_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read)
);
```

---

## 🔌 API ENDPOINTS

### BASE URL
```
https://api.chesscommunity.com/v1
```

### RESPONSE FORMAT
All responses follow this structure:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Optional message",
  "timestamp": "2026-06-02T10:30:00Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "timestamp": "2026-06-02T10:30:00Z"
}
```

---

### 👤 USER ENDPOINTS

#### **POST** `/users/register`
Register a new user (WhatsApp bot signup)

**Request**:
```json
{
  "phone_number": "2348051219099",
  "whatsapp_id": "2348051219099@s.whatsapp.net",
  "display_name": "Alex Johnson"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "phone_number": "2348051219099",
    "whatsapp_id": "2348051219099@s.whatsapp.net",
    "display_name": "Alex Johnson",
    "user_status": "pending",
    "created_at": "2026-06-02T10:30:00Z"
  }
}
```

**Errors**:
- `400`: Phone number already registered
- `400`: Invalid phone format

---

#### **POST** `/users/{id}/register-chess`
Link Chess.com/Lichess account to user

**Request**:
```json
{
  "chess_username": "GrandMaster_Alex",
  "chess_platform": "chess.com"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "chess_username": "GrandMaster_Alex",
    "chess_platform": "chess.com",
    "chess_elo": 2150,
    "chess_id": "grandmaster_alex"
  }
}
```

**Errors**:
- `404`: User not found
- `400`: Chess username doesn't exist on Chess.com/Lichess
- `409`: Chess username already linked to another user

---

#### **GET** `/users/{id}`
Get user profile

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "display_name": "Alex Johnson",
    "phone_number": "2348051219099",
    "whatsapp_id": "2348051219099@s.whatsapp.net",
    "chess_username": "GrandMaster_Alex",
    "chess_platform": "chess.com",
    "chess_elo": 2150,
    "user_status": "active",
    "last_activity_at": "2026-06-02T10:30:00Z"
  }
}
```

---

#### **PUT** `/users/{id}`
Update user profile

**Request**:
```json
{
  "display_name": "Alex J",
  "avatar_url": "https://..."
}
```

**Response** (200): Updated user object

---

#### **GET** `/users/activity/log`
Get activity feed (admin view)

**Query Parameters**:
- `limit`: 20 (default)
- `offset`: 0 (default)
- `user_id`: Filter by user (optional)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "user_name": "Bob Smith",
      "action": "registered",
      "timestamp": "2026-06-02T10:30:00Z"
    },
    {
      "id": 2,
      "user_id": 3,
      "user_name": "Jane Doe",
      "action": "submitted_match_result",
      "entity_type": "match",
      "entity_id": 42,
      "timestamp": "2026-06-02T10:25:00Z"
    }
  ]
}
```

---

### 🏆 COMPETITION ENDPOINTS

#### **POST** `/competitions`
Create a new tournament (admin only)

**Request**:
```json
{
  "name": "Rapid Masters Cup 2026",
  "description": "A fast-paced tournament for intermediate players",
  "tournament_type": "swiss",
  "max_participants": 32,
  "rounds": 5,
  "registration_open_at": "2026-06-02T00:00:00Z",
  "registration_close_at": "2026-06-10T23:59:59Z",
  "start_date": "2026-06-11T10:00:00Z",
  "min_elo": 1200,
  "max_elo": 2500
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Rapid Masters Cup 2026",
    "tournament_type": "swiss",
    "competition_status": "draft",
    "max_participants": 32,
    "rounds": 5,
    "current_round": 0,
    "created_at": "2026-06-02T10:30:00Z"
  }
}
```

---

#### **GET** `/competitions`
List all competitions

**Query Parameters**:
- `status`: active, completed, draft (optional)
- `type`: knockout, swiss, round_robin (optional)
- `limit`: 20
- `offset`: 0

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Rapid Masters Cup",
      "tournament_type": "swiss",
      "competition_status": "active",
      "current_round": 2,
      "participant_count": 24,
      "rounds": 5,
      "start_date": "2026-06-11T10:00:00Z",
      "created_by": 1
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 20,
    "offset": 0
  }
}
```

---

#### **GET** `/competitions/{id}`
Get competition details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Rapid Masters Cup",
    "description": "...",
    "tournament_type": "swiss",
    "competition_status": "active",
    "current_round": 2,
    "rounds": 5,
    "max_participants": 32,
    "participant_count": 24,
    "registration_open_at": "2026-06-02T00:00:00Z",
    "registration_close_at": "2026-06-10T23:59:59Z",
    "start_date": "2026-06-11T10:00:00Z",
    "created_by": 1
  }
}
```

---

#### **PATCH** `/competitions/{id}`
Update competition (admin only)

**Request**:
```json
{
  "competition_status": "active",
  "current_round": 2
}
```

**Response** (200): Updated competition object

---

#### **POST** `/competitions/{id}/start`
Transition competition to active state & generate Round 1 fixtures

**Request**:
```json
{}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "competition_id": 1,
    "action": "started",
    "round": 1,
    "fixtures_generated": 12,
    "timestamp": "2026-06-02T10:30:00Z"
  }
}
```

**Errors**:
- `400`: Competition not in "open_registration" status
- `400`: Not enough participants (minimum 2)

---

#### **POST** `/competitions/{id}/advance-round`
Finish current round & generate next round fixtures (admin only)

**Request**:
```json
{
  "include_pending_matches": false
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "competition_id": 1,
    "previous_round": 1,
    "current_round": 2,
    "fixtures_generated": 12,
    "unresolved_matches": 0,
    "timestamp": "2026-06-02T10:30:00Z"
  }
}
```

---

#### **GET** `/competitions/{id}/standings`
Get leaderboard/standings for a competition

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "user_id": 5,
      "display_name": "Bob Smith",
      "chess_username": "BobSmith123",
      "chess_elo": 2200,
      "score": 4.5,
      "wins": 4,
      "draws": 1,
      "losses": 0
    },
    {
      "rank": 2,
      "user_id": 3,
      "display_name": "Jane Doe",
      "chess_username": "JaneDoe456",
      "chess_elo": 2100,
      "score": 4.0,
      "wins": 4,
      "draws": 0,
      "losses": 1
    }
  ]
}
```

---

### 📋 PARTICIPANT ENDPOINTS

#### **POST** `/competitions/{id}/join`
User registers for a tournament

**Request**:
```json
{
  "user_id": 1
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 10,
    "competition_id": 1,
    "user_id": 1,
    "participant_status": "registered",
    "score": 0,
    "wins": 0,
    "joined_at": "2026-06-02T10:30:00Z"
  }
}
```

**Errors**:
- `404`: Competition not found
- `409`: User already registered
- `400`: Competition not open for registration
- `400`: User ELO outside competition range
- `400`: Competition full

---

#### **POST** `/competitions/{id}/participants/{user_id}/withdraw`
User withdraws from tournament before it starts (admin/user)

**Request**:
```json
{
  "reason": "Personal reasons"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "participant_id": 10,
    "previous_status": "registered",
    "new_status": "withdrawn",
    "timestamp": "2026-06-02T10:30:00Z"
  }
}
```

---

#### **POST** `/competitions/{id}/participants/{user_id}/eliminate`
Admin eliminates a participant from knockout tournament

**Request**:
```json
{
  "reason": "Failed to show up for match"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "participant_id": 10,
    "previous_status": "active",
    "new_status": "eliminated",
    "eliminated_at": "2026-06-02T10:30:00Z"
  }
}
```

---

### 🎮 MATCH ENDPOINTS

#### **GET** `/competitions/{competition_id}/matches`
Get all matches for a competition

**Query Parameters**:
- `round`: Filter by round number (optional)
- `status`: pending, ongoing, result_submitted, completed, disputed (optional)
- `player_id`: Filter matches involving specific player (optional)

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "competition_id": 1,
      "round_number": 1,
      "player_a": {
        "id": 5,
        "display_name": "Bob Smith",
        "chess_username": "BobSmith123",
        "chess_elo": 2200
      },
      "player_b": {
        "id": 3,
        "display_name": "Jane Doe",
        "chess_username": "JaneDoe456",
        "chess_elo": 2100
      },
      "scheduled_date": "2026-06-11T14:00:00Z",
      "deadline": "2026-06-13T14:00:00Z",
      "match_status": "pending",
      "result_winner": null
    }
  ]
}
```

---

#### **GET** `/matches/{id}`
Get match details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "competition_id": 1,
    "round_number": 1,
    "player_a": {
      "id": 5,
      "display_name": "Bob Smith",
      "chess_elo": 2200
    },
    "player_b": {
      "id": 3,
      "display_name": "Jane Doe",
      "chess_elo": 2100
    },
    "scheduled_date": "2026-06-11T14:00:00Z",
    "deadline": "2026-06-13T14:00:00Z",
    "match_status": "result_submitted",
    "result_winner": "a",
    "result_submitted_by": 5,
    "result_submitted_at": "2026-06-12T15:30:00Z",
    "chess_game_link": "https://www.chess.com/live/game/123456",
    "chess_game_id": "123456"
  }
}
```

---

#### **POST** `/matches/{id}/submit-result`
Player submits match result with game link

**Request**:
```json
{
  "result_winner": "a",
  "chess_game_link": "https://www.chess.com/live/game/123456",
  "chess_game_id": "123456",
  "user_id": 5
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "match_status": "result_submitted",
    "result_winner": "a",
    "result_submitted_by": 5,
    "result_submitted_at": "2026-06-12T15:30:00Z"
  }
}
```

**Errors**:
- `404`: Match not found
- `403`: User is not one of the match participants
- `400`: Match status is not "pending" or "ongoing"
- `400`: Invalid game link format

---

#### **POST** `/matches/{id}/confirm-result`
Admin confirms submitted result & updates competition scores (admin only)

**Request**:
```json
{}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "match_status": "completed",
    "result_winner": "a",
    "confirmed_at": "2026-06-13T10:00:00Z"
  }
}
```

---

#### **POST** `/matches/{id}/force-result`
Admin forces a result without player submission (admin only)

**Request**:
```json
{
  "result_winner": "a",
  "reason": "Player failed to show up"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "match_status": "completed",
    "result_winner": "a",
    "forced": true,
    "force_reason": "Player failed to show up"
  }
}
```

---

#### **POST** `/matches/{id}/extend-deadline`
Admin extends match deadline (admin only)

**Request**:
```json
{
  "hours": 24
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "previous_deadline": "2026-06-13T14:00:00Z",
    "new_deadline": "2026-06-14T14:00:00Z"
  }
}
```

---

### ⚠️ DISPUTE ENDPOINTS

#### **POST** `/matches/{id}/dispute`
Raise a dispute on a match result

**Request**:
```json
{
  "user_id": 3,
  "reason": "Opponent used chess engine",
  "description": "The game quality shows clear signs of engine assistance. Move 15 was impossible to calculate in live blitz."
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "match_id": 1,
    "raised_by_user_id": 3,
    "reason": "Opponent used chess engine",
    "dispute_status": "open",
    "created_at": "2026-06-13T10:30:00Z"
  }
}
```

**Errors**:
- `404`: Match not found
- `409`: Dispute already exists for this match
- `400`: Match not in "completed" status

---

#### **GET** `/disputes`
Get all disputes (admin view)

**Query Parameters**:
- `status`: open, under_review, resolved, rejected (optional)
- `limit`: 20
- `offset`: 0

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "match_id": 1,
      "raised_by": {
        "id": 3,
        "display_name": "Jane Doe"
      },
      "opponent": {
        "id": 5,
        "display_name": "Bob Smith"
      },
      "reason": "Opponent used chess engine",
      "dispute_status": "open",
      "created_at": "2026-06-13T10:30:00Z"
    }
  ]
}
```

---

#### **GET** `/disputes/{id}`
Get dispute details

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "match_id": 1,
    "match": {
      "id": 1,
      "round_number": 1,
      "player_a": { "id": 5, "display_name": "Bob Smith" },
      "player_b": { "id": 3, "display_name": "Jane Doe" },
      "result_winner": "a"
    },
    "raised_by": { "id": 3, "display_name": "Jane Doe" },
    "opponent": { "id": 5, "display_name": "Bob Smith" },
    "reason": "Opponent used chess engine",
    "description": "The game quality shows clear signs of engine assistance...",
    "dispute_status": "open",
    "created_at": "2026-06-13T10:30:00Z"
  }
}
```

---

#### **POST** `/disputes/{id}/review`
Admin moves dispute to under_review (admin only)

**Request**:
```json
{}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "dispute_status": "under_review"
  }
}
```

---

#### **POST** `/disputes/{id}/resolve`
Admin resolves a dispute with decision (admin only)

**Request**:
```json
{
  "admin_decision": "upheld",
  "admin_notes": "Analyzed the game. Move 15 is indeed impossible in live blitz. Cheating confirmed.",
  "new_match_result": "b"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "dispute_status": "resolved",
    "admin_decision": "upheld",
    "admin_notes": "Analyzed the game. Move 15 is indeed impossible in live blitz. Cheating confirmed.",
    "match_result_updated": true,
    "match": {
      "id": 1,
      "result_winner": "b"
    },
    "resolved_at": "2026-06-13T15:00:00Z",
    "resolved_by": 100
  }
}
```

**Decisions**:
- `upheld`: Original result is correct, dispute dismissed
- `overturned`: Result is changed to other player
- `draw`: Match is marked as draw

---

#### **POST** `/disputes/{id}/reject`
Admin rejects a dispute (admin only)

**Request**:
```json
{
  "admin_notes": "No evidence of cheating. Appeal dismissed."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "dispute_status": "rejected",
    "admin_notes": "No evidence of cheating. Appeal dismissed.",
    "resolved_at": "2026-06-13T15:00:00Z"
  }
}
```

---

### 📢 NOTIFICATION ENDPOINTS

#### **GET** `/users/{id}/notifications`
Get user's notifications

**Query Parameters**:
- `is_read`: true, false (optional)
- `limit`: 20
- `offset`: 0

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "notification_type": "match_scheduled",
      "title": "Match Scheduled",
      "message": "Your match against Bob Smith is scheduled for June 11 at 2 PM",
      "related_entity_type": "match",
      "related_entity_id": 1,
      "is_read": false,
      "created_at": "2026-06-10T10:00:00Z"
    }
  ]
}
```

---

#### **PUT** `/notifications/{id}/read`
Mark notification as read

**Response** (200):
```json
{
  "success": true,
  "data": { "is_read": true, "read_at": "2026-06-02T10:30:00Z" }
}
```

---

### 💬 WHATSAPP BOT ENDPOINTS

#### **POST** `/whatsapp/message`
Webhook for WhatsApp messages (bot receives & processes)

**Request** (from WhatsApp):
```json
{
  "messages": [
    {
      "from": "2348051219099@s.whatsapp.net",
      "body": "Chess.com GrandMaster_Alex",
      "id": "msg_123",
      "timestamp": 1717329000,
      "type": "text"
    }
  ]
}
```

**Response** (200):
```json
{
  "success": true,
  "processed": 1
}
```

---

#### **POST** `/whatsapp/send`
Send WhatsApp message (from backend to user)

**Request**:
```json
{
  "to": "2348051219099@s.whatsapp.net",
  "message": "✅ Successfully registered with GrandMaster_Alex!\n\nYour stats..."
}
```

**Response** (200):
```json
{
  "success": true,
  "message_id": "wamid_123"
}
```

---

## 🔄 STATUS & STATE DEFINITIONS

### User Status
```
pending → active ↔ inactive
  ↓
banned (terminal)
```

- **pending**: Just registered, no chess account linked yet
- **active**: Has chess account, can participate in tournaments
- **inactive**: Not participating anymore (soft delete)
- **banned**: Removed for cheating/violations (cannot rejoin)

---

### Competition Status
```
draft → open_registration → active → completed
  ↑                                      ↓
  └─────────── cancelled ◄──────────────┘
```

- **draft**: Being created by admin, not visible to public
- **open_registration**: Players can register, fixtures not yet generated
- **active**: Fixtures generated, matches in progress
- **completed**: All rounds finished, leaderboard final
- **cancelled**: Tournament cancelled, all participants notified

---

### Match Status
```
pending → ongoing → result_submitted ┐
                        ↓             │
                    disputed ────┐    │
                        ↓        │    │
                    under_review │    │
                        ↓        │    │
                    resolved ────┤────┘
                        ↓        │
                    completed ◄──┘
```

- **pending**: Not yet started
- **ongoing**: Players are playing
- **result_submitted**: One player submitted result, awaiting confirmation
- **disputed**: A player contested the result
- **completed**: Match result is final
- **cancelled**: Match was cancelled (walkover, no-show)

---

### Dispute Status
```
open → under_review → resolved OR rejected
```

- **open**: Just raised, admin hasn't looked yet
- **under_review**: Admin is analyzing
- **resolved**: Admin made a decision (upheld/overturned/draw)
- **rejected**: Admin found no evidence of cheating/rule violation

---

### Participant Status (Competition)
```
registered → active ┐
                    ├─ eliminated (knockout only)
                    └─ withdrawn (before tournament starts)
```

- **registered**: Signed up, tournament hasn't started
- **active**: Currently participating
- **eliminated**: Knocked out (knockout only) or failed to advance (swiss/round_robin)
- **withdrawn**: Left before or during tournament

---

### Group Member Status
```
active ↔ muted
  ↓
removed (kicked due to inactivity)
  ↓
left (voluntarily left)
```

---

## 🎲 BUSINESS RULES

### A. FIXTURE GENERATION

#### Swiss System (Recommended)
```
Algorithm:
1. Round 1: Pair players by ELO (highest vs 2nd highest, etc.)
2. Round 2+: 
   - Group players by current score
   - Within each group, pair by ELO
   - Avoid rematches
   - Prefer players who haven't played yet
```

**Scoring**:
- Win = 1 point
- Draw = 0.5 points
- Loss = 0 points

**Example**:
```
Round 1:
- Player A (2200 ELO) vs Player B (2150 ELO)
- Player C (2100 ELO) vs Player D (2050 ELO)

After Round 1 Results:
- Player A wins (1 pt)
- Player C wins (1 pt)
- Player B loses (0 pts)
- Player D loses (0 pts)

Round 2:
- Player A (1 pt) vs Player C (1 pt)  ← top scores
- Player B (0 pts) vs Player D (0 pts) ← bottom scores
```

---

#### Knockout
```
Algorithm:
1. Seed players by ELO
2. Generate bracket (8, 16, 32, 64 players)
3. Winner advances, loser is eliminated

Structure for 8 players:
Round 1 (4 matches):
  - 1 vs 8
  - 2 vs 7
  - 3 vs 6
  - 4 vs 5

Round 2 (2 matches):
  - Winner(1 vs 8) vs Winner(4 vs 5)
  - Winner(2 vs 7) vs Winner(3 vs 6)

Round 3 (1 match - Final):
  - Winner of semifinal 1 vs Winner of semifinal 2
```

---

#### Round Robin
```
Algorithm:
1. Every player plays every other player once
2. Matches distributed evenly across rounds

For 4 players (A, B, C, D):
Round 1: A-B, C-D
Round 2: A-C, B-D
Round 3: A-D, B-C
```

---

### B. WINNER DETERMINATION

**Priority Order**:
1. **Match completed** (one player won, other lost)
2. **Player submitted result** with game link
3. **Admin forced result** (no-show, cheating detected, etc.)
4. **Dispute resolved** (admin decision overrides match result)

**Game Link Validation**:
- Must be from Chess.com or Lichess
- Must contain valid game ID
- Game must show both players involved
- Can validate via API

---

### C. RANKING CALCULATION

#### Current Round Leaderboard
```
Sorted by:
1. Score (descending)
2. Head-to-head (if tied)
3. Buchholz score (strength of opponents faced)
4. ELO (descending)

Example:
Rank  Player      Score  Wins  Draws  Losses  ELO
1.    Bob Smith    4.5    4     1      0      2200
2.    Jane Doe     4.0    4     0      1      2100
3.    Alex Jones   3.5    3     1      1      2050
```

#### Final Tournament Leaderboard
```
- Same sorting as above
- Uses final scores after all rounds complete
- Tied players get same rank
- Next rank skips (e.g., 1, 1, 3 not 1, 1, 2)
```

---

### D. NOTIFICATION RULES

**Automatic Triggers**:
1. **Match Scheduled**: When match is created → notify both players 24h before
2. **Match Reminder**: 2h before deadline
3. **Match Result Posted**: When opponent submits result → notify other player
4. **Dispute Opened**: When dispute raised → notify admin
5. **Dispute Resolved**: When admin decides → notify both players
6. **Tournament Started**: When competition moves to active
7. **Round Advanced**: When new round fixtures generated
8. **Eliminated**: When player is knocked out (knockout only)

---

### E. INACTIVITY RULES (Bot-Specific)

**Tracking**:
- `last_activity_at`: Updated on any message, match result, or action
- Bot checks every 15 seconds

**3-Stage Warning System**:

**Stage 1 - Initial Warning** (after INACTIVITY_LIMIT):
- Message: "We noticed you haven't been active recently. Reply within 24h to stay"
- Mark: `pending_kick_since = NOW`

**Stage 2 - Final Warning** (24h after initial warning):
- Message: "Removing you in 1 minute. Reply NOW to stay!"
- Mark: `final_warning_since = NOW`

**Stage 3 - Removal** (1 minute after final warning):
- Remove from group
- Send DM: "You were removed due to inactivity"
- Delete from `group_members` table

**Exceptions** (Protected from removal):
- Admin phone numbers
- Bot's own number

---

## 🤖 BOT COMMAND MAPPING

### WhatsApp Commands → API Endpoints

| WhatsApp Command | HTTP Method | API Endpoint | Payload |
|---|---|---|---|
| `Chess.com <username>` | POST | `/users/{id}/register-chess` | `{chess_username, chess_platform: "chess.com"}` |
| `Stats <username>` | GET | `/users?chess_username=<username>` | - |
| `reg-chess <username>` | POST | `/competitions/{id}/join` | `{user_id}` |
| `player-comp` | GET | `/competitions/{id}/standings` | - |
| `unreg-comp` | POST | `/competitions/{id}/participants/{user_id}/withdraw` | - |
| `!comp-start <type>` | POST | `/competitions/{id}/start` | - |
| `!score <username> <amt>` | POST | `/competitions/{id}/participants/{user_id}/adjust-score` | `{amount}` |
| `!eliminate <username>` | POST | `/competitions/{id}/participants/{user_id}/eliminate` | - |
| `!sync-members` | GET/POST | `/competitions/{id}/participants` | - |
| `!comp-reset` | POST | `/competitions/{id}/reset` | - |

---

### Bot Message Types

| Trigger | Recipient | Message Type | Example |
|---|---|---|---|
| User registers chess account | User | ✅ Confirmation | "Successfully registered as GrandMaster_Alex" |
| Match scheduled | Both players | 📋 Notification | "Your match against Bob is scheduled for..." |
| Result submitted | Other player | ⚠️ Notification | "Jane submitted result: You lost. Approve/Dispute?" |
| Dispute opened | Admin | 🚨 Alert | "Dispute raised on Match #1 by Jane Doe" |
| Inactivity warning | User | ⏱️ Warning | "Reply within 24h to stay in group" |
| Tournament started | All participants | 🏆 Announcement | "Tournament started! Round 1 fixtures: ..." |

---

## ❌ ERROR HANDLING

### Standard Error Codes

| Code | Meaning | HTTP Status |
|---|---|---|
| `NOT_FOUND` | Resource doesn't exist | 404 |
| `INVALID_REQUEST` | Bad request format | 400 |
| `UNAUTHORIZED` | Not logged in | 401 |
| `FORBIDDEN` | Logged in but not allowed | 403 |
| `CONFLICT` | Resource already exists | 409 |
| `VALIDATION_ERROR` | Input validation failed | 422 |
| `INTERNAL_ERROR` | Server error | 500 |
| `SERVICE_UNAVAILABLE` | External service down (Chess.com API) | 503 |

### Example Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number already registered",
    "details": {
      "field": "phone_number",
      "value": "2348051219099"
    }
  },
  "timestamp": "2026-06-02T10:30:00Z"
}
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### API Keys
```
All requests require:
Header: Authorization: Bearer <API_KEY>
```

### Admin Routes
```
All /admin/* and /competitions/:id/* routes require:
- User logged in
- User role = 'admin' in users table

Example protected routes:
- POST /competitions
- PATCH /competitions/{id}
- POST /matches/{id}/force-result
- POST /disputes/{id}/resolve
```

### User Routes
```
Most /users/{id}/* routes require:
- Authenticated user
- User ID matches request parameter OR user is admin
```

### Public Routes
```
No authentication required:
- GET /competitions (list view only)
- GET /competitions/{id}/standings
```

---

## 📝 IMPLEMENTATION CHECKLIST

### Phase 1: Core Infrastructure
- [ ] Set up database (MySQL/PostgreSQL)
- [ ] Create all tables with proper indexes
- [ ] Set up connection pooling
- [ ] Create audit logging system

### Phase 2: User Management
- [ ] `/users/register` endpoint
- [ ] `/users/{id}/register-chess` endpoint
- [ ] Chess.com API integration
- [ ] Phone number validation

### Phase 3: Competition Management
- [ ] POST `/competitions` (create)
- [ ] GET `/competitions` (list)
- [ ] GET `/competitions/{id}` (details)
- [ ] POST `/competitions/{id}/start` (fixture generation)
- [ ] Swiss system algorithm
- [ ] Knockout bracket generation
- [ ] Round robin scheduling

### Phase 4: Match Management
- [ ] POST `/matches/{id}/submit-result`
- [ ] POST `/matches/{id}/confirm-result`
- [ ] POST `/matches/{id}/force-result`
- [ ] Game link validation

### Phase 5: Dispute Resolution
- [ ] POST `/matches/{id}/dispute`
- [ ] POST `/disputes/{id}/resolve`
- [ ] Dispute decision logic

### Phase 6: Notifications
- [ ] Create notification system
- [ ] WhatsApp integration
- [ ] Automatic notification triggers

### Phase 7: Bot Integration
- [ ] POST `/whatsapp/message` webhook
- [ ] Command parsing
- [ ] Inactivity tracking worker

---

## 🧪 TESTING ENDPOINTS

### Register User
```bash
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "2348051219099",
    "whatsapp_id": "2348051219099@s.whatsapp.net",
    "display_name": "Alex Johnson"
  }'
```

### Link Chess Account
```bash
curl -X POST http://localhost:3001/api/v1/users/1/register-chess \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "chess_username": "GrandMaster_Alex",
    "chess_platform": "chess.com"
  }'
```

### Create Competition
```bash
curl -X POST http://localhost:3001/api/v1/competitions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "name": "Rapid Masters Cup 2026",
    "tournament_type": "swiss",
    "max_participants": 32,
    "rounds": 5
  }'
```

---

**END OF BACKEND SPECIFICATION**

*This document is locked. All changes require approval from team lead.*
