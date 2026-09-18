# 🤖 BOT INTEGRATION GUIDE - Complete Reference

**Version**: 1.0  
**Last Updated**: June 2, 2026  
**Scope**: WhatsApp bot ↔ Backend API mapping and workflows

---

## 📡 BOT ARCHITECTURE

```
┌─────────────────────┐
│  WhatsApp Messages  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Bot Parser         │
│  (Recognize cmds)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Route Handler      │
│  (Determine action) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│  API Request        ├────▶│  Backend API     │
│  (HTTP to backend)  │     │  /api/v1/*       │
└──────────┬──────────┘     └──────────────────┘
           │
           ▼
┌─────────────────────┐
│  Format Response    │
│  (Make readable)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Send Message       │
│  (WhatsApp reply)   │
└─────────────────────┘
```

---

## 🔄 COMMAND FLOWS

### FLOW 1: User Registration

```
User: "Chess.com GrandMaster_Alex"
  ▼
Bot Parser: "register-chess command"
  ▼
Handler extracts: chess_username = "GrandMaster_Alex"
  ▼
API Call: POST /users/{user_id}/register-chess
{
  "chess_username": "GrandMaster_Alex",
  "chess_platform": "chess.com"
}
  ▼
Backend validates username on Chess.com
  ▼
Response:
{
  "success": true,
  "data": {
    "chess_username": "GrandMaster_Alex",
    "chess_elo": 2150
  }
}
  ▼
Bot replies:
"✅ Successfully registered as GrandMaster_Alex!
♟️ Ratings: Rapid 2150 | Blitz 1950 | Bullet 1800

Tip: Check your stats anytime with 'Stats GrandMaster_Alex'"
  ▼
Update user activity: last_activity_at = NOW
```

---

### FLOW 2: Tournament Registration

```
User: "reg-chess GrandMaster_Alex"
  ▼
Bot checks: Is there an active tournament?
  
  IF NO:
  ▼
  Bot replies:
  "No active tournament. Registration opens when admin creates one."
  ▼
  EXIT
  
  IF YES:
  ▼
  Handler extracts: chess_username = "GrandMaster_Alex"
  ▼
  Get active competition:
  GET /competitions?status=active
  ▼
  API Call: POST /competitions/{competition_id}/join
  {
    "user_id": 1
  }
  ▼
  Response:
  {
    "success": true,
    "data": {
      "participant_id": 10,
      "competition_id": 1,
      "participant_status": "registered",
      "score": 0
    }
  }
  ▼
  Bot replies:
  "✅ You're registered for Rapid Masters Cup!
  
  Players: 24/32
  Rounds: 5
  Start Date: June 11, 2026
  
  Good luck! ♟️"
```

---

### FLOW 3: Player Submits Match Result

```
User: "Match result: I won against Bob Smith
Game: https://www.chess.com/live/game/123456"
  ▼
Bot Parser: "submit-result command"
  ▼
Handler extracts:
  - result_winner = "a" (current user)
  - opponent = "Bob Smith"
  - game_link = "https://www.chess.com/live/game/123456"
  ▼
Get match:
GET /competitions/1/matches?player_id=1
Response: Returns match #5 with player_b=Bob Smith
  ▼
API Call: POST /matches/5/submit-result
{
  "result_winner": "a",
  "chess_game_link": "https://www.chess.com/live/game/123456",
  "chess_game_id": "123456",
  "user_id": 1
}
  ▼
Backend validates:
- Match exists ✓
- User is participant ✓
- Match status is "pending" or "ongoing" ✓
- Game link is valid ✓
  ▼
Updates match:
{
  "match_status": "result_submitted",
  "result_winner": "a",
  "result_submitted_by": 1,
  "result_submitted_at": "2026-06-12T15:30:00Z"
}
  ▼
Bot replies to current user:
"✅ Result submitted!
Player: You
Opponent: Bob Smith
Result: You won
Game: https://www.chess.com/live/game/123456

Awaiting admin confirmation..."
  ▼
Bot sends message to opponent (Bob):
"⚠️ Alex submitted match result
Opponent: Alex Johnson
Result: You lost
Game: https://www.chess.com/live/game/123456

Agree with result? Or dispute it?
- Reply 'APPROVE' to accept
- Reply 'DISPUTE <reason>' to contest"
  ▼
Admin notification:
"📋 New Result Submitted
Match: Alex vs Bob
Reported Result: Alex won
Game Link: https://www.chess.com/live/game/123456

Review: [Link to admin panel]"
```

---

### FLOW 4: Admin Forces Match Result

```
Admin (via WhatsApp or dashboard):
"!force-result match_5 winner:a reason:no-show"
  ▼
Handler extracts:
  - match_id = 5
  - winner = "a"
  - reason = "no-show"
  ▼
Verify admin status:
GET /users/{admin_id}
Check: user.role == 'admin' ✓
  ▼
API Call: POST /matches/5/force-result
{
  "result_winner": "a",
  "reason": "Player B failed to show up"
}
  ▼
Backend updates match:
{
  "match_status": "completed",
  "result_winner": "a",
  "forced": true,
  "force_reason": "Player B failed to show up"
}
  ▼
Notification to Player A:
"🏆 Match Completed
Your opponent failed to show up.
You win by default!

Match: Round 1, Rapid Masters Cup
Points: +1"
  ▼
Notification to Player B:
"⏱️ No-Show Match
You were marked as no-show for:
Match: Round 1 vs Alex Johnson
Result: Loss

Contact admin if this was an error."
  ▼
Admin log:
{
  "admin_id": 100,
  "action": "forced_match_result",
  "entity_type": "match",
  "entity_id": 5,
  "old_value": {"match_status": "pending"},
  "new_value": {"match_status": "completed", "result_winner": "a"}
}
```

---

### FLOW 5: Dispute Opened

```
User (via WhatsApp): "DISPUTE match_5
Reason: Engine assistance detected in opponent's moves"
  ▼
Handler extracts:
  - match_id = 5
  - reason = "Engine assistance detected"
  ▼
API Call: POST /matches/5/dispute
{
  "user_id": 3,
  "reason": "Engine assistance detected",
  "description": "Opponent's moves show clear engine patterns. Move 12 is impossible in live blitz."
}
  ▼
Backend creates dispute:
{
  "id": 1,
  "match_id": 5,
  "raised_by_user_id": 3,
  "reason": "Engine assistance detected",
  "dispute_status": "open",
  "created_at": "2026-06-13T10:30:00Z"
}
  ▼
Bot replies to disputer:
"✅ Dispute registered!
Dispute ID: #1
Status: Open
Match: vs Bob Smith
Reason: Engine assistance detected

Admin will review within 24h. You'll be notified of the decision."
  ▼
Bot message to opponent:
"⚠️ A dispute has been raised on your match
Opponent: Jane Doe
Match: Round 1 vs You
Reason: Engine assistance detected

Admin will review the game. Check back for decision."
  ▼
Admin notification:
"🚨 DISPUTE RAISED #1
Raised by: Jane Doe
Match: Jane vs Bob Smith
Reason: Engine assistance detected

Review: [Admin panel link]
Action required within 24h"
```

---

### FLOW 6: Dispute Resolution

```
Admin (via dashboard): Views dispute #1
  ▼
Admin reviews: Game link, move quality, timestamps
  ▼
Admin decides: "UPHELD" (overrule result)
  ▼
API Call: POST /disputes/1/resolve
{
  "admin_decision": "upheld",
  "admin_notes": "Analyzed game. Move 12 is a known engine sequence impossible in live blitz.",
  "new_match_result": "b"
}
  ▼
Backend updates:
- Dispute status = "resolved"
- Match result_winner = "b" (reversed)
- Match status = "completed"
  ▼
Bot message to disputer (Jane):
"✅ Dispute Resolved!
Decision: UPHELD ✓
Your complaint was valid.
Match result has been reversed.

You now win this match!
Points: +1"
  ▼
Bot message to opponent (Bob):
"⚠️ Dispute Resolved
Decision: OVERTURNED
Your match result was reversed due to evidence of rule violation.
Match: vs Jane Doe
New Result: Loss

If you believe this is unfair, contact the admin."
  ▼
Admin log created:
{
  "admin_id": 100,
  "action": "resolved_dispute",
  "entity_type": "dispute",
  "entity_id": 1,
  "old_value": {"dispute_status": "open"},
  "new_value": {"dispute_status": "resolved", "admin_decision": "upheld"}
}
```

---

### FLOW 7: Admin Starts Tournament

```
Admin (WhatsApp): "!comp-start swiss"
  ▼
Handler extracts:
  - tournament_type = "swiss"
  ▼
Get active draft competition:
GET /competitions?status=draft
  ▼
API Call: POST /competitions/{id}/start
{
  "tournament_type": "swiss"
}
  ▼
Backend executes:
1. Validates at least 2 participants
2. Updates competition status = "active"
3. Generates Round 1 fixtures using Swiss algorithm
4. Creates match records
  ▼
Response:
{
  "success": true,
  "data": {
    "competition_id": 1,
    "action": "started",
    "round": 1,
    "fixtures_generated": 12
  }
}
  ▼
Bot replies to admin:
"🏆 Tournament Started!
Tournament: Rapid Masters Cup
Type: Swiss
Participants: 24
Round 1: 12 matches scheduled"
  ▼
Bot sends to all participants:
"🏆 Tournament Started!
Tournament: Rapid Masters Cup

Round 1 Fixtures:
Match 1: Alex vs Bob (June 11, 2PM)
Match 2: Jane vs Charlie (June 11, 2:30PM)
...

Good luck! ♟️

Submit your result when done:
'Match result: I won'
'Match result: Draw'
'Match result: I lost'"
```

---

### FLOW 8: Inactivity Detection & Removal

```
System runs every 15 seconds:

FOR EACH user in group_members:
  IF user.last_activity_at < NOW - 28 days:
    AND user NOT in PROTECTED_PHONES:
    
    IF user.pending_kick_since IS NULL:
      ← STAGE 1: INITIAL WARNING
      
      Update: pending_kick_since = NOW
      Send message to user:
      "⚠️ Inactivity Warning
      
      We noticed you haven't been active in 28 days.
      Reply within 24 hours to stay in the group!
      
      This is your first warning."
      
    ELSE IF NOW - user.pending_kick_since > 24 hours:
      AND user.final_warning_since IS NULL:
      
      ← STAGE 2: FINAL WARNING
      
      Update: final_warning_since = NOW
      Send message to user:
      "🚨 Final Warning!
      
      Removing you in 1 minute due to inactivity.
      Reply NOW to stay in the group!"
      
    ELSE IF NOW - user.final_warning_since > 60 seconds:
      
      ← STAGE 3: REMOVAL
      
      Send DM to user:
      "🚫 You were removed from Chess & Mates group
      
      Reason: Prolonged inactivity after multiple warnings
      
      Feel free to request to rejoin when you're ready!"
      
    Removed members keep their historical records.

If a removed member returns later, they should complete the normal onboarding flow again as a new member, while their previous history remains preserved for admin reference.
      
      Broadcast to group:
      "🚮 Removed for Inactivity
      @username was removed due to prolonged inactivity."
```

---

### FLOW 9: Player Checks Stats (No Registration)

```
User: "Stats GrandMaster_Alex"
  ▼
Handler recognizes: "stats command" (not "Chess.com")
  ▼
Handler extracts: chess_username = "GrandMaster_Alex"
  ▼
Handler calls Chess.com API:
GET https://api.chess.com/pub/player/grandmaster_alex
GET https://api.chess.com/pub/player/grandmaster_alex/stats
GET https://api.chess.com/pub/player/grandmaster_alex/games/archives
  ▼
Gets last 3 games from archives
  ▼
Bot replies with:
"♟️ Profile: GrandMaster_Alex

📊 Current Ratings:
  Rapid: 2150 | Blitz: 1950 | Bullet: 1800

♟️ Last 3 Games:
1. vs BobSmith123 (June 10)
   ♔ White: GrandMaster_Alex ○ Black: BobSmith123
   Result: Won

2. vs JaneDoe456 (June 9)
   ♔ White: JaneDoe456 ○ Black: GrandMaster_Alex
   Result: Lost

3. vs Charlie789 (June 8)
   ♔ White: GrandMaster_Alex ○ Black: Charlie789
   Result: Draw"
  ▼
NOTE: No database write. Just info display.
```

---

### FLOW 10: Onboarding - New Member Introduction

```
New member joins group:
  ▼
Bot triggers: group_join event
  ▼
Store in pending_introductions:
{
  "whatsapp_id": "2348051219099@s.whatsapp.net"
}
  ▼
Send welcome message:
"👋 Welcome to Chess & Mates!

Please introduce yourself to the group so members can get to know you.

Example:
'Hi, my name is Alex. I'm from Lagos and I play chess on Chess.com as GrandMaster_Alex. Rating is 2150. Looking forward to playing with you all!'

⚠️ If you don't introduce yourself within 10 hours, you'll be removed."
  ▼
System checks every 5 minutes:
  
  IF time_since_join > INTRO_WARNING_INTERVAL (2.5 hours):
    AND warning_count < MAX_INTRO_WARNINGS (4):
    
    Send reminder:
    "⚠️ Reminder: Please introduce yourself to the group"
    
    Update: warning_count += 1, last_warning_at = NOW
    
  IF warning_count >= 4 AND time_since_join > INTRO_TIMEOUT (10 hours):
    
    Send DM:
    "🚫 You were removed for not completing introduction"
    
    Remove from groups
    Delete from onboarding_tracking
  ▼
User sends intro message:
"Hi, I'm Alex from Lagos. I play chess on Chess.com as GrandMaster_Alex (2150 rating). Excited to play!"
  ▼
Bot validates: isValidIntroduction(message)
  
  Checks:
  - Has intro keywords ("my name", "I am", "from", etc.) ✓
  - Enough words (5+) ✓
  - Not just random spam
  ▼
If valid:
  Delete from pending_introductions
  Update: introduced = 1 in onboarding_tracking
  
  Bot replies:
  "✅ Great! Thanks for introducing yourself!
  
  Now please link your Chess account using:
  'Chess.com <username> <phone number>'
  
  Example: 'Chess.com GrandMaster_Alex 08012345678'"
```

---

## 🔗 EXACT API CALLS FROM BOT

### Example 1: Register Chess Account

```javascript
// Bot receives: "Chess.com GrandMaster_Alex"
const username = "GrandMaster_Alex";
const userId = 1;  // From database

const response = await fetch('https://api.chesscommunity.com/v1/users/1/register-chess', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer BOT_API_KEY'
  },
  body: JSON.stringify({
    chess_username: username,
    chess_platform: 'chess.com'
  })
});

const result = await response.json();

if (result.success) {
  await sendMessage(
    chatId,
    `✅ Successfully registered as ${result.data.chess_username}!
    
♟️ Ratings: 
  Rapid: ${result.data.chess_elo} 
  Blitz: ${result.data.chess_blitz_elo}
  Bullet: ${result.data.chess_bullet_elo}

Tip: Check stats with 'Stats ${username}'`
  );
} else {
  await sendMessage(chatId, `❌ ${result.error.message}`);
}
```

---

### Example 2: Join Tournament

```javascript
// Bot receives: "reg-chess GrandMaster_Alex"
const username = "GrandMaster_Alex";
const userId = 1;

// Get active competition
const compResponse = await fetch(
  'https://api.chesscommunity.com/v1/competitions?status=active',
  {
    headers: { 'Authorization': 'Bearer BOT_API_KEY' }
  }
);

const comps = await compResponse.json();

if (!comps.data || comps.data.length === 0) {
  await sendMessage(chatId, "❌ No active tournament. Registration opens when admin creates one.");
  return;
}

const competitionId = comps.data[0].id;

// Join competition
const joinResponse = await fetch(
  `https://api.chesscommunity.com/v1/competitions/${competitionId}/join`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer BOT_API_KEY'
    },
    body: JSON.stringify({ user_id: user.id })
  }
);

const result = await joinResponse.json();

if (result.success) {
  await sendMessage(chatId, `✅ Registered for ${comps.data[0].name}!`);
} else {
  await sendMessage(chatId, `❌ ${result.error.message}`);
}
```

---

### Example 3: Submit Match Result

```javascript
// Bot receives: "Match result: I won\nGame: https://www.chess.com/live/game/123456"

const gameLink = "https://www.chess.com/live/game/123456";
const gameId = "123456";
const winner = "a";  // current user
const userId = 1;

// Get user's current match
const matchResponse = await fetch(
  `https://api.chesscommunity.com/v1/matches?player_id=${userId}&status=pending`,
  {
    headers: { 'Authorization': 'Bearer BOT_API_KEY' }
  }
);

const matches = await matchResponse.json();

if (!matches.data || matches.data.length === 0) {
  await sendMessage(chatId, "❌ No pending matches");
  return;
}

const matchId = matches.data[0].id;

// Submit result
const submitResponse = await fetch(
  `https://api.chesscommunity.com/v1/matches/${matchId}/submit-result`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer BOT_API_KEY'
    },
    body: JSON.stringify({
      result_winner: winner,
      chess_game_link: gameLink,
      chess_game_id: gameId,
      user_id: userId
    })
  }
);

const result = await submitResponse.json();

if (result.success) {
  await sendMessage(chatId, `✅ Result submitted!\nMatch: vs ${matches.data[0].player_b.display_name}\nResult: You won`);
  
  // Notify opponent
  await sendMessage(
    matches.data[0].player_b.whatsapp_id,
    `⚠️ ${matches.data[0].player_a.display_name} submitted result: You lost\n\nGame: ${gameLink}\n\nApprove or dispute?`
  );
} else {
  await sendMessage(chatId, `❌ ${result.error.message}`);
}
```

---

## ✅ VALIDATION CHECKLIST

Before launching bot:

- [ ] All API endpoints implemented and tested
- [ ] Chess.com API integration working
- [ ] Error handling for all endpoints (timeouts, 404s, etc.)
- [ ] Database migrations created
- [ ] Admin role system working
- [ ] API authentication (Bearer tokens) implemented
- [ ] Inactivity tracking worker running every 15 seconds
- [ ] Notification system queueing WhatsApp messages
- [ ] Message validation (no empty strings, etc.)
- [ ] Rate limiting (to prevent spam)
- [ ] Audit logging for all admin actions
- [ ] Test with all command flows above
- [ ] Test error scenarios (player not found, tournament full, etc.)

---

---

## 📋 COMPLETE BOT COMMAND REFERENCE

All endpoints are at `/api/v1/bot/*` and require `Authorization: Bearer <BOT_API_KEY>` header.
All endpoints accept `phone_number` as the primary user identifier (the bot knows this from the LID→phone mapping).
Alternatively, `whatsapp_id` or `lid` can be used.

### 👤 PLAYER COMMANDS

| Bot Command | API Endpoint | Body Params |
|---|---|---|
| `reg-chess <username>` | `POST /bot/join` | `{ phone_number, chess_username? }` |
| `my-matches` | `GET /bot/my-matches/:whatsappId` | URL param: whatsappId |
| `result <game-link>` | `POST /bot/submit-result` | `{ phone_number, chess_game_link, match_id? }` |
| `fixtures` | `GET /bot/fixtures` | Query: `{ phone_number, competition_id?, round?, status? }` |
| `standings` | `GET /bot/standings` | Query: `{ competition_id? }` |
| `withdraw` | `POST /bot/withdraw` | `{ phone_number, competition_id? }` |
| `dispute <match_id> <reason>` | `POST /bot/file-dispute` | `{ phone_number, match_id, reason, description? }` |
| `status` | `GET /bot/status` | None |
| `Chess.com <username>` | `POST /bot/lookup-user` | `{ chess_username }` |

### 🛡️ ADMIN COMMANDS

| Bot Command | API Endpoint | Body Params |
|---|---|---|
| `comp-start round-robin-single` | `POST /bot/comp-create` | `{ phone_number, command, name?, time_control?, min_elo?, max_elo?, max_participants? }` |
| `comp-begin` | `POST /bot/comp-begin` | `{ phone_number, competition_id? }` |
| `comp-next-round` | `POST /bot/comp-advance` | `{ phone_number, competition_id?, include_pending_matches? }` |
| `comp-delete <id>` | `POST /bot/comp-delete` | `{ phone_number, competition_id }` |
| `force-result <match_id> <a/b/draw>` | `POST /bot/force-result` | `{ phone_number, match_id, result_winner, reason?, is_absent?, absence_side? }` |
| `mark-absent <match_id> <a/b/both>` | `POST /bot/mark-absent` | `{ phone_number, match_id, absence_side }` |
| `extend <match_id> <hours>` | `POST /bot/extend-deadline` | `{ phone_number, match_id, hours }` |
| `admin-score <match_id> <a/b/draw>` | `POST /bot/admin-score` | `{ phone_number, match_id, result_winner, is_absent?, absence_side? }` |
| `disputes` | `GET /bot/disputes` | Query: `{ phone_number, competition_id?, status? }` |
| `resolve-dispute <id> <decision>` | `POST /bot/resolve-dispute` | `{ phone_number, dispute_id, admin_decision, admin_notes?, new_result_winner? }` |
| `reject-dispute <id>` | `POST /bot/reject-dispute` | `{ phone_number, dispute_id, admin_notes? }` |

### 🎮 COMP-START COMMAND FORMATS

| Command String | Tournament Type | Match Length |
|---|---|---|
| `round-robin-single` | Round Robin | Single Game |
| `round-robin-double` | Round Robin | Double Game (home & away) |
| `swiss-single` | Swiss | Single Game |
| `swiss-double` | Swiss | Double Game |
| `knockout-single` | Knockout | Single Game |
| `knockout-best-of-3` | Knockout | Best of 3 |
| `knockout-best-of-5` | Knockout | Best of 5 |

### 📝 COMP-START DEFAULTS

When creating a competition via `comp-start`, these defaults are used:
- **time_control**: `5+0` (5 minutes, no increment)
- **min_elo**: `900`
- **max_elo**: `3000`
- **max_participants**: `50`
- **registration_close_hours**: `24` (registration closes 24 hours from now)
- **start_in_hours**: `24` (competition starts 24 hours from now)
- **duration_days**: `30` (competition runs for 30 days)
- **platform**: `chess.com`
- **timezone**: `UTC+1:00`
- **competition_status**: `open_registration` (skips draft, immediately open)

All defaults can be overridden by passing the corresponding parameter in the request body.

### 🔄 TYPICAL TOURNAMENT FLOW

1. **Admin**: `comp-start round-robin-single` → Creates competition, opens registration
2. **Players**: `reg-chess <username>` → Join the competition
3. **Admin**: `comp-begin` → Generates fixtures, starts Round 1
4. **Players**: `result <game-link>` → Submit game results (auto-verified via chess.com API)
5. **Admin**: `comp-next-round` → Advances to Round 2 (generates new fixtures)
6. Repeat steps 4-5 until all rounds complete
7. **Anyone**: `standings` → View current standings

### 🔔 WEBHOOK EVENTS

The backend emits these webhook events to the bot:
- `competition.created` — New competition created
- `competition.started` — Tournament started (fixtures generated)
- `round.advanced` — Round advanced
- `match.result_submitted` — Player submitted result (auto-scored)
- `match.force_result` — Admin forced result
- `match.result_confirmed` — Admin confirmed result
- `dispute.created` — Player filed dispute
- `dispute.resolved` — Admin resolved dispute

---

**END OF BOT INTEGRATION GUIDE**
