# ⚡ QUICK REFERENCE - Backend Developers

**Use this for rapid lookups during development. For details, see BACKEND_SPECIFICATION.md**

---

## 🗄️ DATABASE TABLES (One-Liner Summary)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | All humans (players, admins) | id, phone_number, whatsapp_id, chess_username, chess_elo, user_status |
| `competitions` | Tournaments | id, name, tournament_type (swiss/knockout/round_robin), competition_status, current_round |
| `competition_participants` | Who's in which tournament | id, competition_id, user_id, participant_status, score, wins/draws/losses |
| `matches` | Individual games | id, competition_id, round_number, player_a_id, player_b_id, match_status, result_winner |
| `disputes` | Contested results | id, match_id, raised_by_user_id, dispute_status, admin_decision |
| `group_members` | WhatsApp group tracking | id, group_id, user_id, member_status, last_message_at, pending_kick_since |
| `notifications` | System messages | id, user_id, notification_type, is_read, send_to_whatsapp |
| `admin_logs` | Audit trail | id, admin_id, action, entity_type, entity_id, old_value, new_value |

---

## 🔌 CORE API ROUTES

### Users
```
POST   /users/register                    → Create new user
POST   /users/{id}/register-chess         → Link Chess.com account
GET    /users/{id}                        → Get profile
PUT    /users/{id}                        → Update profile
```

### Competitions
```
POST   /competitions                      → Create tournament
GET    /competitions                      → List tournaments
GET    /competitions/{id}                 → Get tournament details
PATCH  /competitions/{id}                 → Update tournament
POST   /competitions/{id}/start           → Generate Round 1 fixtures
POST   /competitions/{id}/advance-round   → Generate next round
GET    /competitions/{id}/standings       → Get leaderboard
```

### Participants
```
POST   /competitions/{id}/join                           → Register for tournament
POST   /competitions/{id}/participants/{user_id}/withdraw → Leave tournament
POST   /competitions/{id}/participants/{user_id}/eliminate → Kick participant (admin)
```

### Matches
```
GET    /competitions/{id}/matches                    → List all matches
GET    /matches/{id}                                 → Get match details
POST   /matches/{id}/submit-result                   → Player submits result
POST   /matches/{id}/confirm-result                  → Admin confirms
POST   /matches/{id}/force-result                    → Admin forces result
POST   /matches/{id}/extend-deadline                 → Admin extends time
```

### Disputes
```
POST   /matches/{id}/dispute               → Raise dispute
GET    /disputes                           → List disputes (admin)
GET    /disputes/{id}                      → Get dispute details
POST   /disputes/{id}/review               → Mark under_review (admin)
POST   /disputes/{id}/resolve              → Admin decides (admin)
POST   /disputes/{id}/reject               → Dismiss dispute (admin)
```

---

## 📊 STATUSES (All Possible States)

### User Status
```
pending → active ↔ inactive
  ↓
banned
```

### Competition Status
```
draft → open_registration → active → completed
  ↑                                      ↓
  └─────────── cancelled ◄──────────────┘
```

### Match Status
```
pending → ongoing → result_submitted → disputed → under_review → resolved → completed
                          ↓_________________________________↑
```

### Participant Status
```
registered → active → eliminated (knockout)
  ↓
  withdrawn
```

### Dispute Status
```
open → under_review → resolved OR rejected
```

---

## 🎲 BUSINESS LOGIC

### Fixture Generation

**Swiss** (Round N):
- Group players by current score
- Pair by ELO within groups
- Avoid rematches
- Points: Win=1, Draw=0.5, Loss=0

**Knockout**:
- Seed by ELO
- Single elimination bracket
- Winner advances, loser eliminated

**Round Robin**:
- Every player plays every other player
- All matches scheduled upfront

### Match Result Determination
1. Player submits result with game link
2. Admin confirms or forces
3. If dispute: admin decision overrides

### Ranking Calculation
1. Score (descending)
2. Head-to-head (if tied)
3. Buchholz score (opponent strength)
4. ELO (descending)

---

## 🤖 BOT COMMANDS QUICK MAP

| User Types | Command | API Endpoint | Purpose |
|---|---|---|---|
| **Everyone** | `Chess.com <username> <phone>` | POST `/users/{id}/register-chess` | Link chess account |
| | `Stats <username>` | GET `/users?chess_username=` | View stats (no registration) |
| **Participants** | `reg-chess <username>` | POST `/competitions/{id}/join` | Register for tournament |
| | `player-comp` | GET `/competitions/{id}/standings` | View standings |
| | `unreg-comp` | POST `/competitions/{id}/participants/{user_id}/withdraw` | Leave tournament |
| **Admins** | `!comp-start <type>` | POST `/competitions/{id}/start` | Start tournament |
| | `!score <user> <amt>` | POST `/competitions/{id}/participants/{user_id}/adjust-score` | Adjust score |
| | `!eliminate <user>` | POST `/competitions/{id}/participants/{user_id}/eliminate` | Eliminate player |
| | `!comp-reset` | POST `/competitions/{id}/reset` | Clear registrations |

---

## 📋 INACTIVITY WORKER (Every 15 seconds)

```
FOR EACH user in group_members:
  
  IF last_activity_at < NOW - 28 days:
    AND user NOT protected:
    
    IF pending_kick_since IS NULL:
      → Send "Reply within 24h to stay"
      → Set pending_kick_since = NOW
    
    ELSE IF NOW - pending_kick_since > 24h AND final_warning_since IS NULL:
      → Send "Removing in 1 minute!"
      → Set final_warning_since = NOW
    
    ELSE IF NOW - final_warning_since > 60s:
      → Remove from group
      → Send DM
      → Delete from group_members
```

---

## ✅ ERROR CODES

| Code | HTTP | Meaning |
|---|---|---|
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `INVALID_REQUEST` | 400 | Bad format |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | Not allowed |
| `CONFLICT` | 409 | Already exists |
| `VALIDATION_ERROR` | 422 | Bad input |

---

## 🔐 PROTECTED ENDPOINTS (Admin Only)

```
POST   /competitions
PATCH  /competitions/{id}
POST   /competitions/{id}/start
POST   /competitions/{id}/advance-round
POST   /matches/{id}/confirm-result
POST   /matches/{id}/force-result
POST   /disputes/{id}/resolve
POST   /disputes/{id}/reject
```

---

## 📝 RESPONSE FORMAT

**Success**:
```json
{
  "success": true,
  "data": { /* actual data */ },
  "timestamp": "2026-06-02T10:30:00Z"
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable"
  },
  "timestamp": "2026-06-02T10:30:00Z"
}
```

---

## 🧪 QUICK TEST COMMANDS

```bash
# Register user
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "2348051219099", "whatsapp_id": "2348051219099@s.whatsapp.net", "display_name": "Alex"}'

# Register chess account
curl -X POST http://localhost:3001/api/v1/users/1/register-chess \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chess_username": "GrandMaster_Alex", "chess_platform": "chess.com"}'

# Create tournament
curl -X POST http://localhost:3001/api/v1/competitions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Rapid Cup", "tournament_type": "swiss", "rounds": 5}'

# Start tournament
curl -X POST http://localhost:3001/api/v1/competitions/1/start \
  -H "Authorization: Bearer YOUR_KEY"

# Submit match result
curl -X POST http://localhost:3001/api/v1/matches/1/submit-result \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"result_winner": "a", "chess_game_link": "https://chess.com/live/game/123", "user_id": 1}'
```

---

## 🎯 PRIORITY IMPLEMENTATION ORDER

**Phase 1**: User + Chess integration (3 days)
- [ ] Users table & endpoints
- [ ] Chess.com API integration

**Phase 2**: Competitions & Participants (4 days)
- [ ] Competitions table & CRUD
- [ ] Fixture generation (Swiss, Knockout, RR)
- [ ] Participant management

**Phase 3**: Matches (3 days)
- [ ] Matches table
- [ ] Result submission & confirmation
- [ ] Force result

**Phase 4**: Disputes (2 days)
- [ ] Disputes table
- [ ] Resolution logic

**Phase 5**: Bot Integration (3 days)
- [ ] Webhook for WhatsApp messages
- [ ] Command parsing
- [ ] Notification system

**Phase 6**: Polish (2 days)
- [ ] Error handling
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Testing

---

## 📌 CRITICAL NOTES

- **No soft deletes**: Use status field (e.g., `user_status = 'inactive'`)
- **Always update `updated_at`**: On every change
- **Always log admin actions**: To `admin_logs` table
- **Validate Chess.com username**: Before saving
- **Check match deadline**: Before accepting result
- **Verify admin role**: Before any admin endpoint
- **One dispute per match**: Enforce uniqueness
- **Protected numbers**: Admin + bot number never kicked for inactivity
- **All timestamps UTC**: Use ISO 8601 format
- **Base URL**: `https://api.chesscommunity.com/v1`

---

**LAST UPDATED**: June 2, 2026  
**VERSION**: 1.0 LOCKED  
**See BACKEND_SPECIFICATION.md for full details**
