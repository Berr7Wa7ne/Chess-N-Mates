# 🏗️ SYSTEM ARCHITECTURE & FLOW DIAGRAMS

**Version**: 1.0  
**Date**: June 2, 2026

---

## 🔷 SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHESS TOURNAMENT SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌─────────────────────────┐
│  WhatsApp Users  │         │   Browser Users         │
│  (via Bot)       │         │   (Admin + Players)     │
└────────┬─────────┘         └────────────┬────────────┘
         │                                │
         │ Messages                       │ HTTP Requests
         │                                │
         ▼                                ▼
   ┌─────────────┐                  ┌──────────────┐
   │  WhatsApp   │                  │   Frontend   │
   │    Bot      │                  │   Web App    │
   └──────┬──────┘                  └──────┬───────┘
          │                                │
          │ API Calls                      │ API Calls
          │                                │
          └────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │     BACKEND API (v1)             │
        │  https://api.chesscommunity.com  │
        └──────────────────┬───────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │      DATABASE (MySQL/PG)         │
        │                                  │
        │  Users | Competitions | Matches  │
        │  Participants | Disputes | Logs  │
        └──────────────────────────────────┘

External Services:
┌────────────────────────────┐
│  Chess.com API             │
│  (Validate accounts)       │
└────────────────────────────┘
```

---

## 🔄 TOURNAMENT FLOW (Complete Lifecycle)

```
1. REGISTRATION PHASE
   ┌─────────────────────────────────────────┐
   │ Admin creates tournament                │
   │ Status: DRAFT                           │
   └────────────┬────────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────┐
   │ Open registration                       │
   │ Status: OPEN_REGISTRATION               │
   │ Players can join (POST /join)           │
   └────────────┬────────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────┐
   │ Admin closes registration               │
   │ (or registration deadline reached)      │
   └────────────┬────────────────────────────┘

2. ROUND 1
   ┌─────────────────────────────────────────┐
   │ Admin starts tournament                 │
   │ POST /competitions/{id}/start           │
   │ Status: ACTIVE                          │
   │ Current Round: 1                        │
   └────────────┬────────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────┐
   │ Fixtures generated                      │
   │ All matches: PENDING                    │
   │ Players notified                        │
   └────────────┬────────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────┐
   │ Players submit results                  │
   │ Match status: RESULT_SUBMITTED          │
   │ Admin confirms                          │
   │ Match status: COMPLETED                 │
   └────────────┬────────────────────────────┘
                │
                ▼
   ┌─────────────────────────────────────────┐
   │ Admin advances round                    │
   │ POST /competitions/{id}/advance-round   │
   │ Current Round: 2                        │
   └────────────┬────────────────────────────┘

3. SUBSEQUENT ROUNDS (repeat 2)
   ...

4. FINAL ROUND COMPLETION
   ┌─────────────────────────────────────────┐
   │ Last round completed                    │
   │ Admin advances                          │
   │ Status: COMPLETED                       │
   │ Leaderboard finalized                   │
   └─────────────────────────────────────────┘
```

---

## 🎮 MATCH RESULT FLOW

```
Player A                          Backend                      Player B
   │                                │                            │
   │ 1. Play match on Chess.com     │                            │
   │───────────────────────────────>│<───────────────────────────│
   │                                │                            │
   │ 2. Submit result               │                            │
   │    POST /matches/{id}/          │                            │
   │    submit-result               │                            │
   │────────────────────────────────>│                            │
   │                                │                            │
   │                                │ 3. Validate:              │
   │                                │    - User is participant  │
   │                                │    - Match status OK      │
   │                                │    - Game link valid      │
   │                                │                            │
   │                                │ 4. Update match status:   │
   │                                │    RESULT_SUBMITTED       │
   │                                │                            │
   │ 5. Confirmation reply          │                            │
   │<────────────────────────────────│                            │
   │                                │ 6. Send notification      │
   │                                │─────────────────────────> │
   │                                │    (Result pending)       │
   │                                │                            │
   │    (Admin reviews)             │                            │
   │                                │ 7. Admin confirms         │
   │                                │    POST /matches/{id}/    │
   │                                │    confirm-result        │
   │                                │                            │
   │                                │ 8. Update scores         │
   │                                │    Update stats          │
   │                                │                            │
   │ 9. Final notification          │                            │
   │<────────────────────────────────│ 9. Final notification    │
   │    (Match completed)           │────────────────────────> │
   │                                │    (Match completed)      │
```

---

## ⚠️ DISPUTE FLOW

```
Player A                    Backend                    Player B (Admin)
   │                          │                            │
   │ Disagrees with result     │                            │
   │ POST /matches/{id}/       │                            │
   │ dispute                   │                            │
   │─────────────────────────> │                            │
   │                           │                            │
   │                           │ Validate:                 │
   │                           │ - Match completed ✓       │
   │                           │ - No existing dispute ✓   │
   │                           │ - Reason provided ✓       │
   │                           │                            │
   │                           │ Create dispute record     │
   │                           │ Update match status:      │
   │                           │ DISPUTED                  │
   │                           │                            │
   │ Confirmation reply        │ 🚨 Alert admin           │
   │<─────────────────────────│─────────────────────────>│
   │                           │                            │
   │ (Waiting for decision)    │                            │
   │                           │                            │
   │                           │ Admin reviews dispute     │
   │                           │ Analyzes game            │
   │                           │ Makes decision:          │
   │                           │ POST /disputes/{id}/      │
   │                           │ resolve                  │
   │                           │                            │
   │                           │ Decision: UPHELD          │
   │                           │ (Result stands)           │
   │                           │ OR                        │
   │                           │ Decision: OVERTURNED      │
   │                           │ (Reverse result)          │
   │                           │                            │
   │ Final notification        │ Final notification       │
   │<─────────────────────────│─────────────────────────>│
   │ (Decision made)          │ (Decision made)          │
```

---

## 🔗 API REQUEST/RESPONSE CYCLE

```
FRONTEND/BOT                      BACKEND

User Action
    │
    ▼
Build Request
{
  "method": "POST",
  "url": "/api/v1/...",
  "headers": {
    "Authorization": "Bearer API_KEY",
    "Content-Type": "application/json"
  },
  "body": { ... }
}
    │
    ├─────────────────────────────────────────┐
    │                                         │
    │ HTTP Request                            │
    ├────────────────────────────────────────>│
    │                                         │
    │                          Parse request ▼
    │                          Validate auth
    │                          Validate input
    │                          Query database
    │                          Execute logic
    │                          Update database
    │                          Create logs
    │
    │                          Build response
    │                         {
    │                          "success": true,
    │                          "data": { ... },
    │                          "timestamp": "..."
    │                         }
    │                          │
    │ HTTP Response            │
    │<────────────────────────┤
    │ 200 OK / 400 Error       │
    │ JSON response            │
    │
    ▼
Handle Response
├─ If success: Update UI
└─ If error: Show error message
    │
    ▼
User sees result
```

---

## 👥 DATABASE RELATIONSHIPS

```
users
├─ chess_username ← players link their chess account
├─ whatsapp_id ← group members track them
└─ user_status ← track active/inactive/banned

competitions
├─ created_by → users (who created tournament)
└─ tournament_type ← swiss/knockout/round_robin

competition_participants (junction table)
├─ competition_id → competitions
├─ user_id → users
└─ status ← registered/active/eliminated

matches
├─ competition_id → competitions
├─ player_a_id → users
├─ player_b_id → users
├─ result_submitted_by → users
└─ related to disputes

disputes
├─ match_id → matches (1:1 unique)
├─ raised_by_user_id → users
├─ resolved_by → users
└─ admin_decision ← upheld/overturned/draw

group_members
├─ group_id ← WhatsApp group identifier
└─ user_id → users

notifications
├─ user_id → users (recipient)
└─ related_entity_id ← match/dispute/competition

admin_logs
├─ admin_id → users
└─ entity_id ← any table (polymorphic)
```

---

## 🎲 FIXTURE GENERATION ALGORITHMS

### SWISS SYSTEM (Recommended)

```
Algorithm: GenerateSwissRound(competition_id, round_num)

INPUT:
  - All active participants
  - Results from previous rounds
  - ELO ratings

STEPS:

1. Group participants by score
   ┌──────────────────────────┐
   │ Group 1: 2.5 points      │
   │  - Bob (2200 ELO)        │
   │  - Jane (2100 ELO)       │
   └──────────────────────────┘
   ┌──────────────────────────┐
   │ Group 2: 2.0 points      │
   │  - Alex (2050 ELO)       │
   │  - Charlie (1950 ELO)    │
   └──────────────────────────┘

2. Within each group, pair by ELO descending
   ┌──────────────────────────┐
   │ Bob (2200) vs Jane (2100)│
   └──────────────────────────┘
   ┌──────────────────────────┐
   │ Alex (2050) vs Charlie   │
   │ (1950)                   │
   └──────────────────────────┘

3. Check for rematches
   IF Bob vs Jane played before:
     - Swap Jane with next in Group 2?
     - Or swap Bob with next in Group 1?
     - Avoid rematch if possible

4. Create match records
   FOR EACH pairing:
     - INSERT INTO matches (...)
     - Status = PENDING
     - Deadline = NOW + 48h

OUTPUT: List of match IDs created
```

### KNOCKOUT BRACKET

```
8 Players, Seeded by ELO:
┌─────────────────────────────────────────┐
│         ROUND 1                         │
│                                         │
│  1. Player A (2200)    ┐                │
│                        ├─ Winner → R2  │
│  8. Player H (1600)    ┘                │
│                                         │
│  2. Player B (2150)    ┐                │
│                        ├─ Winner → R2  │
│  7. Player G (1650)    ┘                │
│                                         │
│  3. Player C (2100)    ┐                │
│                        ├─ Winner → R2  │
│  6. Player F (1700)    ┘                │
│                                         │
│  4. Player D (2050)    ┐                │
│                        ├─ Winner → R2  │
│  5. Player E (1750)    ┘                │
│                                         │
└─────────────────────────────────────────┘

         ┌──────────────────────────────┐
         │      ROUND 2 (Semis)         │
         │                              │
         │  Winner(1v8)    ┐            │
         │                 ├─ Winner→F  │
         │  Winner(4v5)    ┘            │
         │                              │
         │  Winner(2v7)    ┐            │
         │                 ├─ Winner→F  │
         │  Winner(3v6)    ┘            │
         │                              │
         └──────────────────────────────┘

              ┌──────────────┐
              │  FINAL       │
              │              │
              │  Semi 1 Win  │
              │      vs      │
              │  Semi 2 Win  │
              │              │
              │   Champion   │
              └──────────────┘
```

### ROUND ROBIN

```
4 Players: A, B, C, D

ROUND 1:
  A vs B
  C vs D

ROUND 2:
  A vs C
  B vs D

ROUND 3:
  A vs D
  B vs C

Result: Each plays each once (3 rounds total)

Formula for N players:
  - Total rounds = N - 1
  - Matches per round = N / 2
  - Total matches = N * (N - 1) / 2
```

---

## 📊 LEADERBOARD CALCULATION

```
Sort by (in order):

1. Score (descending)
   Player A: 3.5 pts
   Player B: 3.5 pts  ← Same! Go to tiebreaker
   Player C: 3.0 pts

2. Head-to-Head (if tied)
   A vs B result: A won → A gets tiebreak
   Player A: 1 pt (from H2H)
   Player B: 0 pts (from H2H)

3. Buchholz Score (opponent strength)
   Add up ELO of opponents faced
   A faced: 2100 + 2050 + 1950 = 6100
   B faced: 2200 + 1900 + 1800 = 5900
   A has higher Buchholz

4. ELO Rating (descending)
   A ELO: 2200
   B ELO: 2150
   A wins

FINAL RANKING:
Rank  Player  Score  H2H  Buchholz  ELO   Wins  Draws  Losses
1.    A       3.5    W    6100      2200  3     1      0
2.    B       3.5    L    5900      2150  3     1      0
3.    C       3.0    -    5800      2100  3     0      1
```

---

## 🔐 STATUS TRANSITIONS (State Machine)

### MATCH STATUS

```
         ┌────────────┐
         │  PENDING   │◄─── Initial state
         └──────┬─────┘
                │ Players play
                ▼
         ┌────────────┐
         │  ONGOING   │
         └──────┬─────┘
                │ Player submits result
                ▼
         ┌────────────────┐
         │ RESULT_SUBMITTED│
         └──────┬─────────┘
                │
      ┌─────────┴──────────┐
      │                    │ Admin confirms
      │ Player disputes    ▼
      │         ┌────────────┐
      │         │ COMPLETED  │
      │         └────────────┘
      │
      ▼
┌────────────┐
│ DISPUTED   │
└──────┬─────┘
       │ Admin reviews
       ▼
┌────────────────┐
│ UNDER_REVIEW   │
└──────┬─────────┘
       │ Admin decides
       ▼
┌────────────┐
│ RESOLVED   │
└──────┬─────┘
       │ Update scores per decision
       ▼
┌────────────┐
│ COMPLETED  │ ◄─── Final state
└────────────┘
```

### PARTICIPANT STATUS

```
REGISTERED
    │ (Tournament starts)
    ▼
ACTIVE
    │
    ├─────────────────┐
    │ (Knockout only) │ (Swiss/RR)
    ▼                 ▼
ELIMINATED      ACTIVE
                    │ (Wins/draws/loses matches)
                    ├─────────────────┐
                    │ (End of tourney) │
                    ▼                 ▼
                INACTIVE              INACTIVE
    │
    └─────────────────┘
        (Or WITHDRAWN before start)
```

---

## 🚨 ERROR HANDLING FLOWCHART

```
API Request Received
    │
    ▼
Validate Request Format
│
├─ Invalid JSON? ──────────────────> 400 INVALID_REQUEST
├─ Missing required fields? ───────> 422 VALIDATION_ERROR
└─ Valid? ─────────────────> Continue
                │
                ▼
Check Authentication
│
├─ No API key? ────────────────────> 401 UNAUTHORIZED
├─ Invalid API key? ────────────────> 401 UNAUTHORIZED
└─ Valid? ─────────────────> Continue
                │
                ▼
Check Authorization
│
├─ Admin route + not admin? ───────> 403 FORBIDDEN
└─ Valid? ─────────────────> Continue
                │
                ▼
Validate Business Logic
│
├─ Tournament full? ───────────────> 409 CONFLICT
├─ Match not found? ────────────────> 404 NOT_FOUND
├─ Invalid state transition? ──────> 400 INVALID_REQUEST
└─ Valid? ─────────────────> Continue
                │
                ▼
Call External APIs (Chess.com)
│
├─ API timeout? ───────────────────> 503 SERVICE_UNAVAILABLE
├─ Username invalid? ──────────────> 400 INVALID_REQUEST
└─ Valid? ─────────────────> Continue
                │
                ▼
Execute Database Operation
│
├─ Database error? ────────────────> 500 INTERNAL_ERROR
└─ Success? ───────────────> Continue
                │
                ▼
Format Response
│
└─ Return 200 + JSON
   {
     "success": true,
     "data": { ... }
   }
```

---

## 📱 BOT MESSAGE FLOW

```
WhatsApp User sends:
"Chess.com GrandMaster_Alex"
    │
    ▼
Bot receives via webhook
    │
    ▼
Parse message
└─ Recognize command: "register-chess"
└─ Extract parameter: "GrandMaster_Alex"
    │
    ▼
Call backend API
POST /users/{id}/register-chess
{
  "chess_username": "GrandMaster_Alex",
  "chess_platform": "chess.com"
}
    │
    ▼
Backend returns
{
  "success": true,
  "data": {
    "chess_username": "GrandMaster_Alex",
    "chess_elo": 2150,
    ...
  }
}
    │
    ▼
Bot formats response
✅ Successfully registered!
♟️ Ratings: Rapid 2150 | Blitz 1950
    │
    ▼
Send to WhatsApp user
```

---

**END OF ARCHITECTURE DOCUMENTATION**

*For implementation: See IMPLEMENTATION_CHECKLIST.md*  
*For API details: See BACKEND_SPECIFICATION.md*
