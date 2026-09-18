# 📘 DOCUMENTATION HUB - Your Single Source of Truth

**Status**: ✅ LOCKED & READY  
**Date**: June 2, 2026  
**For**: Backend Developers + Bot Team + Frontend Team

---

## 🎯 THE GOAL

**Eliminate all back-and-forth and make the backend the single source of truth.**

Everything you need to build without assumptions is here. Frontend and bot are built **against this specification**, not guesses.

---

## 📂 YOUR DOCUMENTS (Choose Your Role)

### 👨‍💻 **Backend Developer?**

**START HERE** → Read in this order:

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (5 min)
   - One-page lookup of tables, routes, statuses
   - Use during coding as cheat sheet

2. **[BACKEND_SPECIFICATION.md](BACKEND_SPECIFICATION.md)** (30 min)
   - COMPLETE database schema
   - ALL API endpoints with request/response bodies
   - Status definitions & transitions
   - Business rules (fixtures, rankings, disputes)
   - Error handling

3. **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** (Ongoing)
   - Exact tasks to implement by phase
   - Test cases for each feature
   - 17-day timeline with milestones
   - Success metrics

**Your jobs**:
- [ ] Build all API endpoints
- [ ] Implement business logic
- [ ] Create database
- [ ] Write tests
- [ ] Launch by June 19

---

### 🤖 **WhatsApp Bot Developer?**

**START HERE** → Read in this order:

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (5 min)
   - Command → API endpoint mapping table
   - Status codes & error handling

2. **[BOT_INTEGRATION_GUIDE.md](BOT_INTEGRATION_GUIDE.md)** (20 min)
   - Exact flow for EVERY command (10 flows)
   - Step-by-step bot → API → response
   - Code examples for each flow
   - Inactivity tracking algorithm
   - Message templates

3. **[BACKEND_SPECIFICATION.md](BACKEND_SPECIFICATION.md)** (Endpoints section only)
   - Exact request/response format for each endpoint
   - Error codes you need to handle

**Your jobs**:
- [ ] Parse WhatsApp messages → recognize commands
- [ ] Call backend APIs with exact payloads
- [ ] Format responses as readable WhatsApp messages
- [ ] Run inactivity worker every 15 seconds
- [ ] Handle all error cases

---

### 🎨 **Frontend Developer?**

**START HERE** → Read in this order:

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (5 min)
   - All available API endpoints
   - Status values to display
   - Response format

2. **[BACKEND_SPECIFICATION.md](BACKEND_SPECIFICATION.md)** (API Endpoints section)
   - Request body format for each endpoint
   - Response body format for each endpoint
   - Error responses you'll receive
   - Status codes to handle

3. **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)** (Phases 1-7 overview)
   - When each API will be ready
   - Phases you can build UI for

**Your jobs**:
- [ ] Replace mock data with real API calls
- [ ] Use correct request/response formats from spec
- [ ] Handle all error codes appropriately
- [ ] Display status values per spec
- [ ] Show notifications from backend
- [ ] Build UI for all statuses

---

### 👨‍💼 **Project Manager / QA?**

**START HERE**:

1. **[IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md)**
   - 8 phases with clear deliverables
   - 17-day timeline (June 2-19)
   - Success metrics
   - What to test at each phase

2. **[BACKEND_SPECIFICATION.md](BACKEND_SPECIFICATION.md)** (Reference only)
   - Use for test case creation
   - Cross-check requirements

**Your jobs**:
- [ ] Ensure backend team stays on timeline
- [ ] Create test cases from the spec
- [ ] Verify each phase deliverable
- [ ] Check API response formats match spec
- [ ] Coordinate hand-offs between teams

---

## 🗺️ DOCUMENT TOUR

### What's in Each Document?

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| **BACKEND_SPECIFICATION.md** | Complete contract - all tables, endpoints, statuses, rules | Everyone | 45 min |
| **QUICK_REFERENCE.md** | One-pager lookup - use during coding | Developers | 5 min |
| **BOT_INTEGRATION_GUIDE.md** | Step-by-step flows for each bot command | Bot dev | 20 min |
| **IMPLEMENTATION_CHECKLIST.md** | Exact tasks to do, in order, with tests | Backend dev + PM | Ongoing |
| **DOCUMENTATION_HUB.md** | This file - where to start based on role | Everyone | 5 min |

---

## ✅ WHAT'S INCLUDED

### 1️⃣ Database Schema (LOCKED)

8 tables with:
- ✅ All fields with data types
- ✅ Foreign keys
- ✅ Indexes for performance
- ✅ Soft delete strategy
- ✅ Timestamp tracking

**Tables**: users, competitions, competition_participants, matches, disputes, group_members, notifications, admin_logs

---

### 2️⃣ API Contract (LOCKED)

27 endpoints with:
- ✅ Method + URL
- ✅ Request body (exact JSON)
- ✅ Response body (exact JSON)
- ✅ Error responses
- ✅ HTTP status codes
- ✅ Admin vs public access

**Endpoints**: 
- 4 user endpoints
- 10 competition endpoints
- 2 participant endpoints
- 8 match endpoints
- 6 dispute endpoints
- 2 notification endpoints
- 1 WhatsApp webhook

---

### 3️⃣ Status & State Definitions (LOCKED)

Complete state machines with:
- ✅ All possible statuses
- ✅ Valid transitions
- ✅ Terminal states

**Statuses**:
- User: pending → active ↔ inactive → banned
- Competition: draft → open_registration → active → completed
- Match: pending → ongoing → result_submitted → disputed → resolved → completed
- Dispute: open → under_review → resolved OR rejected
- Participant: registered → active → eliminated OR withdrawn
- Group member: active ↔ muted → removed OR left

---

### 4️⃣ Business Rules (LOCKED)

Detailed algorithms for:
- ✅ **Fixture Generation**
  - Swiss system (pairing by score + ELO)
  - Knockout brackets (single elimination)
  - Round robin (everyone plays everyone)
- ✅ **Winner Determination** (priority order)
- ✅ **Ranking Calculation** (4-level tiebreaker)
- ✅ **Notification Triggers** (9 automatic types)
- ✅ **Inactivity Rules** (3-stage removal process)

---

### 5️⃣ Bot Command Mapping (LOCKED)

Complete mapping of:
- ✅ 10+ WhatsApp commands
- ✅ Which API endpoint each calls
- ✅ Exact request payload for each
- ✅ Message templates for responses

**Commands**:
- `Chess.com <username> <phone>` → Register chess account
- `Stats <username>` → View stats (no registration)
- `reg-chess <username>` → Join tournament
- `player-comp` → View standings
- `!comp-start <type>` → Admin: Start tournament
- `!score <user> <amt>` → Admin: Adjust score
- `!eliminate <user>` → Admin: Remove player
- ... + 5 more

---

## 🚀 QUICK START (For Busy People)

### The 5-Minute Summary

**System Architecture**:
```
WhatsApp Bot → Backend API → Database
Frontend App → Backend API → Database
Admin → Dashboard → Backend API → Database
```

**What the system does**:
1. Users register + link Chess.com account
2. Join tournaments (Swiss / Knockout / Round Robin)
3. Submit match results with game links
4. Dispute contested results (admin decides)
5. Track rankings in real-time
6. Remove inactive members automatically

**What's locked**:
- ✅ Database schema (no changes)
- ✅ All API endpoints (no additions)
- ✅ Status definitions (no new statuses)
- ✅ Business rules (no variations)

**What's NOT locked**:
- Implementation details (use any backend framework)
- Optimization (cache, index strategies)
- Infrastructure (AWS/GCP/Azure)
- Scaling (sharding, replication)

---

## 🔄 DEPENDENCIES BETWEEN TEAMS

```
Phase 1-2: Backend (Users)
        ↓
Phase 3-4: Backend (Competitions)
        ↓
Phase 5: Bot + Backend (Integration)
        + Frontend starts building with mock data
        ↓
Phase 6: Backend complete → Bot + Frontend go live
```

**Timeline**:
- **June 2-4**: Infrastructure
- **June 5-11**: Backend core
- **June 12-16**: Backend complete
- **June 17-19**: Testing + polish
- **June 19**: LAUNCH

---

## 📌 CRITICAL RULES

### For EVERYONE

1. **Use the specification as source of truth**
   - Don't ask "should we do X?"
   - Read the spec. It's there.

2. **No assumptions**
   - If it's not in the spec, ask first
   - Don't build against guesses

3. **Exact request/response formats**
   - Copy-paste from spec
   - Don't invent field names
   - Don't reorder fields

### For Backend Devs

4. **Implement in phase order**
   - Phase 1 first, then 2, then 3, etc.
   - Don't skip phases
   - Each phase has deliverables

5. **Every admin action gets logged**
   - Create audit trail
   - Document who changed what

6. **Always update timestamps**
   - created_at, updated_at on every change
   - Use UTC ISO 8601

### For Bot Dev

7. **Parse commands carefully**
   - Handle typos gracefully
   - Show user-friendly errors
   - Never send raw API errors

8. **Track inactivity religiously**
   - Check every 15 seconds
   - Respect protected numbers (admin + bot)
   - 3-stage warning: clear, consistent

9. **Send notifications for everything**
   - Match scheduled
   - Result submitted
   - Dispute opened
   - Resolution made
   - etc.

### For Frontend Dev

10. **Don't build until API is ready**
    - Use mock data for UI development
    - Wait for API phase
    - Then swap in real calls

11. **Handle all error codes**
    - 400, 401, 403, 404, 409, 422, 500, 503
    - Show user-friendly messages
    - Never show raw error JSON

---

## 🆘 WHEN YOU GET STUCK

### "Can I add a new field to the user table?"
**NO** - See BACKEND_SPECIFICATION.md § Database Schema
The schema is locked. Propose it in next iteration.

### "Can I change the API endpoint URL?"
**NO** - See QUICK_REFERENCE.md § Core API Routes
All routes are locked. Use them as specified.

### "Should the bot send WhatsApp or email?"
**See**: BOT_INTEGRATION_GUIDE.md § Message Types
It's WhatsApp. Always WhatsApp.

### "What do I do if a player doesn't show up for a match?"
**See**: BACKEND_SPECIFICATION.md § Force Result
Admin calls `/matches/{id}/force-result` with reason.

### "How do I calculate final rankings?"
**See**: BACKEND_SPECIFICATION.md § Business Rules § Ranking Calculation
4-level sort: Score → Head-to-head → Buchholz → ELO

### "My API is returning a different error than spec says"
❌ WRONG - Change your code to match spec
Spec is source of truth. Your code must follow it.

---

## 📊 METRICS & MONITORING

### Phase Completion Checklist

**Phase 1** (June 4):
- [ ] Database created with all 8 tables
- [ ] API running on localhost:3001
- [ ] Basic CRUD working

**Phase 2** (June 7):
- [ ] 10 test users registered with Chess.com
- [ ] All user endpoints working
- [ ] Chess.com API integrated

**Phase 3** (June 11):
- [ ] 3 tournaments created (each type)
- [ ] 24 participants in each
- [ ] Round 1 fixtures auto-generated

... (continue for all 8 phases)

---

## 🎓 LEARNING RESOURCES

- **Chess.com API**: https://www.chess.com/news/view/published-data-api
- **Swiss Tournament Algorithm**: https://en.wikipedia.org/wiki/Swiss-system_tournament
- **REST API Best Practices**: https://restfulapi.net/
- **Database Design**: https://sqlzoo.net/

---

## 📞 QUESTIONS?

Before asking:
1. Search this documentation
2. Read the relevant section
3. Check BACKEND_SPECIFICATION.md in full
4. THEN ask (provide context from spec)

---

## ✨ YOU'RE READY

You have everything you need:
- ✅ Complete database schema
- ✅ All API contracts
- ✅ Status definitions
- ✅ Business rules
- ✅ Bot mappings
- ✅ Implementation timeline
- ✅ Test cases

**No more assumptions. No more surprises. Just build.**

---

**DOCUMENTATION COMPLETE**

*Last Updated: June 2, 2026*  
*Version: 1.0 - LOCKED*  
*Questions? Read the spec.*
