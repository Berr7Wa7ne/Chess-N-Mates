# 🛠️ BACKEND IMPLEMENTATION CHECKLIST

**Status**: LOCKED  
**Target Completion**: 17 days (June 19, 2026)  
**Team**: Backend Developer + Database Admin

---

## 📋 PHASE 1: INFRASTRUCTURE (3 days - June 2-4)

### Database Setup
- [ ] Create MySQL/PostgreSQL database `chess_tournament_prod`
- [ ] Create all 8 tables (see BACKEND_SPECIFICATION.md)
- [ ] Create indexes on foreign keys & status fields
- [ ] Set up connection pooling (min: 5, max: 20)
- [ ] Create test data seeding script
- [ ] Document connection string format
- [ ] Set up automated backups

### API Framework
- [ ] Choose framework (Express, FastAPI, Django, etc.)
- [ ] Set up project structure
- [ ] Configure CORS for frontend domain
- [ ] Set up error handling middleware
- [ ] Create base response formatter (success/error)
- [ ] Set up logging system (Winston, structlog, etc.)
- [ ] Configure environment variables (.env)
- [ ] Set up API versioning (/v1/)

### Authentication & Security
- [ ] Implement API key generation system
- [ ] Create authentication middleware
- [ ] Implement rate limiting (100 req/min per key)
- [ ] Set up request validation
- [ ] Implement HTTPS enforcement
- [ ] Create admin role system
- [ ] Document API key format

### Testing Infrastructure
- [ ] Set up testing framework (Jest, Pytest, etc.)
- [ ] Create test database (separate from prod)
- [ ] Create test data fixtures
- [ ] Set up CI/CD pipeline basics
- [ ] Create Postman collection template

**Deliverable**: Database schema created, API running on localhost:3001, basic CRUD working

---

## 📋 PHASE 2: USER MANAGEMENT (3 days - June 5-7)

### User Endpoints
- [ ] **POST** `/users/register`
  - Validate phone format
  - Check phone uniqueness
  - Create user with status=pending
  - Return created user
  
- [ ] **POST** `/users/{id}/register-chess`
  - Validate chess username exists on Chess.com
  - Fetch ELO ratings (Rapid, Blitz, Bullet)
  - Update user record
  - Create audit log
  
- [ ] **GET** `/users/{id}`
  - Return user profile
  - Include chess account if linked
  
- [ ] **PUT** `/users/{id}`
  - Update display_name, avatar_url
  - Update updated_at timestamp

### Chess.com Integration
- [ ] Create Chess.com API client
  - Endpoint: `https://api.chess.com/pub/player/{username}`
  - Cache responses (TTL: 1 hour)
  - Handle 404s gracefully
  - Implement timeout (10s max)
  
- [ ] Extract ratings:
  - `chess_rapid.last.rating`
  - `chess_blitz.last.rating`
  - `chess_bullet.last.rating`
  
- [ ] Handle error cases:
  - Username doesn't exist → 400 INVALID_REQUEST
  - API timeout → 503 SERVICE_UNAVAILABLE
  - User already linked → 409 CONFLICT

### Activity Tracking
- [ ] Add `last_activity_at` update on:
  - User registration
  - Chess account link
  - Tournament registration
  - Match result submission
  - Any message received

**Deliverable**: Register 10 test users with Chess.com accounts, all fields populated

---

## 📋 PHASE 3: COMPETITIONS (4 days - June 8-11)

### Competition Endpoints
- [ ] **POST** `/competitions`
  - Validate required fields
  - Set default: max_participants=32, rounds=5
  - Status defaults to "draft"
  - Create audit log
  
- [ ] **GET** `/competitions`
  - Filter by status (optional)
  - Filter by tournament_type (optional)
  - Pagination (limit/offset)
  
- [ ] **GET** `/competitions/{id}`
  - Return all competition details
  - Include participant count
  
- [ ] **PATCH** `/competitions/{id}` (admin only)
  - Update any field except id, created_by, created_at
  - Create audit log with old/new values
  
- [ ] **GET** `/competitions/{id}/standings`
  - Sort by score DESC, head-to-head, Buchholz, ELO DESC
  - Include wins/draws/losses
  - Format as leaderboard

### Participant Management
- [ ] **POST** `/competitions/{id}/join`
  - Check competition status = "open_registration"
  - Check user not already registered
  - Check user ELO within range
  - Check spots available
  - Create participant record with score=0, status="registered"
  
- [ ] **POST** `/competitions/{id}/participants/{user_id}/withdraw` (before tournament starts)
  - Check competition status ≠ "active"
  - Update status = "withdrawn"
  - Mark as eliminated (knockout) if needed
  
- [ ] **POST** `/competitions/{id}/participants/{user_id}/eliminate` (admin only, knockout only)
  - Check tournament type = "knockout"
  - Update status = "eliminated"
  - Set eliminated_at = NOW
  - Create audit log

### Fixture Generation Algorithm

#### Swiss System
```
ALGORITHM: Generate Swiss Round N

1. Input: competition_id, round_number

2. Get all participants with status="active"
   ORDER BY score DESC, elo DESC

3. Group by score (within 0.5 points)

4. FOR EACH group:
   - Sort by ELO DESC
   - Pair (1st with 2nd, 3rd with 4th, etc.)
   - Avoid rematches from previous rounds
   - Skip players who already played >1 match this round

5. FOR EACH pairing:
   - Create match record
   - Set scheduled_date = NOW + 24h
   - Set deadline = scheduled_date + 48h
   - Status = "pending"

6. Return: matches created count
```

#### Knockout
```
ALGORITHM: Generate Knockout Bracket

1. Input: competition_id

2. Get all participants sorted by ELO DESC

3. Determine bracket size (next power of 2)
   - 4-8 players → 8 slots
   - 8-16 → 16 slots
   - 16-32 → 32 slots

4. Seed matchups:
   - 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5 (for 8)
   - etc.

5. Create match records for Round 1

6. Mark as "pending" with scheduled_date
```

#### Round Robin
```
ALGORITHM: Generate Round Robin

1. Input: competition_id

2. Get all participants sorted by ELO DESC

3. Calculate total rounds needed:
   N players → N-1 rounds
   
4. FOR EACH round:
   - Pair remaining unpaired players
   - Create match records
   
5. Distribute evenly:
   - Even players: all play each round
   - Odd players: one sits out each round
```

### Transaction Safety
- [ ] Wrap fixture generation in transaction
- [ ] If error: rollback all matches
- [ ] Return error response with details

**Deliverable**: Create tournament → Generate Round 1 fixtures for all 3 types → Verify 12 matches created

---

## 📋 PHASE 4: MATCHES (3 days - June 12-14)

### Match Endpoints
- [ ] **GET** `/competitions/{id}/matches`
  - Filter by round_number (optional)
  - Filter by status (optional)
  - Filter by player_id (optional)
  - Return list with player details
  
- [ ] **GET** `/matches/{id}`
  - Return full match details
  - Include both player profiles
  - Include game link if submitted
  
- [ ] **POST** `/matches/{id}/submit-result`
  - Validate user is participant
  - Validate match_status = "pending" or "ongoing"
  - Validate game link format (chess.com or lichess)
  - Extract game ID from link
  - Update match record
  - Return updated match
  
- [ ] **POST** `/matches/{id}/confirm-result` (admin only)
  - Check result_submitted_by is not null
  - Update match_status = "completed"
  - Update participant scores
  - Create audit log
  - Send notifications
  
- [ ] **POST** `/matches/{id}/force-result` (admin only)
  - No validation of game link needed
  - Force winner
  - Update match_status = "completed"
  - Update participant scores
  - Create audit log with reason
  - Send notifications
  
- [ ] **POST** `/matches/{id}/extend-deadline` (admin only)
  - Extend deadline by N hours
  - Log extension
  - Notify both players

### Score Calculation
When match completed:
```
FOR winner:
  participant.wins += 1
  participant.score += 1

FOR loser:
  participant.losses += 1
  participant.score += 0

FOR draw:
  participant.draws += 1
  participant.score += 0.5
```

### Notifications on Match Complete
- [ ] Notify player A: Result confirmed
- [ ] Notify player B: Result confirmed
- [ ] Update leaderboard in real-time

**Deliverable**: Submit 3 different match results → Scores update → Leaderboard reflects changes

---

## 📋 PHASE 5: DISPUTES (2 days - June 15-16)

### Dispute Endpoints
- [ ] **POST** `/matches/{id}/dispute`
  - Validate match exists
  - Validate match_status = "completed"
  - Check no existing dispute
  - Create dispute record
  - Update match_status = "disputed"
  - Notify admin
  
- [ ] **GET** `/disputes`
  - Filter by status (optional)
  - List all disputes (admin view)
  
- [ ] **GET** `/disputes/{id}`
  - Return full dispute with match + player info
  
- [ ] **POST** `/disputes/{id}/review` (admin only)
  - Update dispute_status = "under_review"
  - Set deadline: NOW + 24h
  
- [ ] **POST** `/disputes/{id}/resolve` (admin only)
  - Validate admin_decision in ["upheld", "overturned", "draw"]
  - IF admin_decision = "overturned":
    - Reverse match result
    - Reverse participant scores
    - Set result_winner to new winner
  - Update dispute_status = "resolved"
  - resolved_by = current admin
  - Create audit log
  - Send notifications
  
- [ ] **POST** `/disputes/{id}/reject` (admin only)
  - Update dispute_status = "rejected"
  - Create audit log
  - Notify disputer

### Decision Logic
```
UPHELD: Original result stands, dispute dismissed
  - Leave match.result_winner as is
  - Leave participant scores as is

OVERTURNED: Result flipped to opposite player
  - Flip match.result_winner
  - Reverse participant scores:
    OLD winner → remove 1 point/0.5 points
    OLD loser → add 1 point/0.5 points
  - Update participant.wins, .losses, .draws

DRAW: Match marked as draw
  - Set match.result_winner = null
  - Both participants get 0.5 points
  - Update participant.draws
```

**Deliverable**: Raise 2 disputes → Resolve 1 upheld, 1 overturned → Verify scores reversed correctly

---

## 📋 PHASE 6: TOURNAMENT FLOW (2 days - June 17)

### Start Tournament Endpoint
- [ ] **POST** `/competitions/{id}/start`
  - Check status = "open_registration"
  - Check participants >= 2
  - Update status = "active"
  - Set current_round = 1
  - Call fixture generation for Round 1
  - Send notifications to all participants
  - Notify admin

### Advance Round Endpoint
- [ ] **POST** `/competitions/{id}/advance-round`
  - Check current_round < total_rounds
  - Check all matches in current_round are completed
    OR include_pending_matches = true
  - Increment current_round
  - Call fixture generation for new round
  - IF new_round > total_rounds:
    - Set competition_status = "completed"
    - Finalize leaderboard
  - Send notifications

### Completion Logic
When last round completed:
```
FOR EACH competition:
  IF current_round > total_rounds:
    - status = "completed"
    - Notify all participants
    - Calculate final rankings
    - Update leaderboard (frozen)
    - Archive results
```

**Deliverable**: Create tournament → Start → Play 2 rounds → Advance → Complete → Verify final standings locked

---

## 📋 PHASE 7: NOTIFICATIONS & BOT (3 days - June 18-19)

### Notification System
- [ ] Create notifications table (see schema)
- [ ] Implement notification dispatcher
  - Queue system (Redis or DB-based)
  - Max 1000 msgs/minute
  
- [ ] Automatic triggers:
  - [ ] Match scheduled (24h before)
  - [ ] Match reminder (2h before)
  - [ ] Result submitted
  - [ ] Dispute opened
  - [ ] Dispute resolved
  - [ ] Tournament started
  - [ ] Round advanced
  - [ ] Player eliminated
  - [ ] Admin action

### WhatsApp Bot Integration
- [ ] **POST** `/whatsapp/message` webhook
  - Receive message from WhatsApp
  - Parse sender, body, timestamp
  - Update `last_activity_at` for user
  - Route to command handler
  - Send response via `/whatsapp/send`
  
- [ ] **POST** `/whatsapp/send`
  - Send message to user/group
  - Handle rate limiting
  - Log delivery status

### Inactivity Worker
- [ ] Implement worker process (runs every 15 seconds)
- [ ] Track `last_activity_at` for all group members
- [ ] 3-stage warning system:
  - Stage 1 (28 days): Send warning, set `pending_kick_since`
  - Stage 2 (24h later): Send final warning, set `final_warning_since`
  - Stage 3 (60s later): Remove from group, send DM, delete record
- [ ] Protected numbers: Admin phone + bot number (never kick)
- [ ] Update `last_activity_at` on:
  - Any message
  - Match result submission
  - Tournament join
  - Dispute raising

### Bot Commands
Implement parsing + routing for:
- [ ] `Chess.com <username>` → POST `/users/{id}/register-chess`
- [ ] `Stats <username>` → GET `/users?chess_username=`
- [ ] `reg-chess <username>` → POST `/competitions/{id}/join`
- [ ] `player-comp` → GET `/competitions/{id}/standings`
- [ ] `!comp-start <type>` → POST `/competitions/{id}/start`
- [ ] `!score <user> <amt>` → Adjust participant score
- [ ] `!eliminate <user>` → POST `/competitions/{id}/participants/{user_id}/eliminate`
- [ ] `!comp-reset` → Clear tournament registrations
- [ ] Match result submission (unstructured text parsing)
- [ ] Dispute submission (unstructured text parsing)

**Deliverable**: Bot receives command → API call made → Response sent to WhatsApp

---

## 📋 PHASE 8: TESTING & VALIDATION (Variable)

### Unit Tests
- [ ] User registration (valid/invalid cases)
- [ ] Chess.com integration (existing user, non-existent user, API timeout)
- [ ] Fixture generation (all 3 types)
- [ ] Score calculation (win/loss/draw)
- [ ] Dispute resolution (all 3 decision types)
- [ ] Inactivity detection

### Integration Tests
- [ ] Full tournament flow (register → start → submit results → advance round → complete)
- [ ] Dispute flow (raise → review → resolve → verify scores reversed)
- [ ] Bot commands (all 10+ commands)
- [ ] Error handling (bad input, missing fields, unauthorized access)

### Load Testing
- [ ] 1000 users simultaneously
- [ ] 100 concurrent match submissions
- [ ] API response time < 200ms (95th percentile)

### Manual Testing Checklist
- [ ] Create 3 tournaments (each type: swiss, knockout, round robin)
- [ ] Register 24 players in each
- [ ] Play through complete tournament
- [ ] Test all dispute scenarios
- [ ] Test all admin commands
- [ ] Test bot commands
- [ ] Verify all notifications sent
- [ ] Verify inactivity removal (with dev timings)

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] All tests passing (100% coverage of critical paths)
- [ ] API documentation generated (Swagger/OpenAPI)
- [ ] Database backups automated
- [ ] Monitoring set up (errors, latency, uptime)
- [ ] Logging aggregation set up
- [ ] Rate limiting tested
- [ ] HTTPS certificates valid
- [ ] API keys generated for bot + frontend
- [ ] Environment variables configured
- [ ] Load testing passed

### Launch Day
- [ ] Announce API is live
- [ ] Provide API key to bot team
- [ ] Provide API key to frontend team
- [ ] Test end-to-end: bot → API → response
- [ ] Monitor error logs for 24h
- [ ] Have rollback plan ready

### Post-Launch (Week 1)
- [ ] Monitor performance metrics
- [ ] Fix any bugs reported by bot/frontend
- [ ] Optimize slow queries
- [ ] Increase cache TTLs if needed

---

## 📊 SUCCESS METRICS

| Metric | Target |
|--------|--------|
| API response time (95%) | < 200ms |
| Uptime | 99.9% |
| Test coverage | > 80% |
| Error rate | < 0.1% |
| Database query time | < 100ms |

---

## ⏰ TIMELINE SUMMARY

| Phase | Days | Due Date |
|-------|------|----------|
| Infrastructure | 3 | June 4 |
| User Management | 3 | June 7 |
| Competitions | 4 | June 11 |
| Matches | 3 | June 14 |
| Disputes | 2 | June 16 |
| Tournament Flow | 2 | June 17 |
| Notifications & Bot | 3 | June 19 |
| **TOTAL** | **17 days** | **June 19** |

---

## 📞 CONTACTS & RESOURCES

- **Database Admin**: [Name]
- **API Framework Docs**: [Link]
- **Chess.com API**: https://www.chess.com/news/view/published-data-api
- **Postman Collection**: [Link]
- **Test Data**: See `scripts/seed.sql`

---

**THIS CHECKLIST IS LOCKED. NO DEVIATIONS WITHOUT APPROVAL.**

*Print this out. Stick it on your wall. Check off tasks daily.*
