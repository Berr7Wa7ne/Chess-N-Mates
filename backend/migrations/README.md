# Database Migration Guide

## Problem Solved

The RLS error **"new row violates row-level security policy for table 'users'"** was caused by:

1. **UUID type mismatch**: The `public.users.id` column uses UUID (correct), but `auth.uid()` (also UUID) couldn't match against child table columns that were incorrectly set to BIGINT by `fix_user_id_bigint.sql`.

2. **No auth sync trigger**: When a user signs up via Supabase Auth, no corresponding row was automatically created in `public.users` with the same UUID.

3. **Backend using anon key**: The backend was using the Supabase anonymous key which is subject to RLS. Backend operations need the `service_role` key to bypass RLS.

---

## Step-by-Step Migration Instructions

### Step 1: Get your Supabase Service Role Key

1. Go to your [Supabase Dashboard](https://supabase.com)
2. Select your project
3. Go to **Project Settings** → **API**
4. Copy the `service_role` key (NOT the `anon` key)
5. Paste it into `.env` at the project root:
   ```
   SUPABASE_SERVICE_KEY=your_service_role_key_here
   ```

### Step 2: Run the SQL Migration

1. Go to your Supabase Dashboard → **SQL Editor**
2. Open `backend/migrations/fix_all_user_id_columns_to_uuid.sql`
3. **Review the script carefully** — it:
   - Drops and re-adds foreign key constraints
   - Casts all user_id columns from BIGINT to UUID
   - Creates an auth sync trigger (auto-creates `public.users` rows on signup)
   - Drops all existing RLS policies
   - Creates new RLS policies with correct UUID comparisons
4. Click **Run** to execute
5. Verify no errors in the output

### Step 3: Restart Backend Server

```bash
npm run dev
# or: node backend/index.js
```

---

## What Changed

### Files Modified

| File | Change |
|------|--------|
| `.env` | Added `SUPABASE_SERVICE_KEY` |
| `backend/config/supabase.js` | Now exports `supabase` (anon) and `supabaseAdmin` (service_role) |
| All controllers + helpers | Use `supabaseAdmin` for DB operations (bypasses RLS) |
| `backend/migrations/fix_user_id_bigint.sql` | Archived (incorrect migration) |

### New Files

| File | Purpose |
|------|---------|
| `backend/migrations/fix_all_user_id_columns_to_uuid.sql` | Complete fix: UUID casts + auth sync trigger + RLS policies |

---

## How Everything Now Works

1. **User signs up** → Your app calls `supabase.auth.signUp()` → creates row in `auth.users`
2. **Auth trigger fires** → Auto-creates row in `public.users` with the SAME UUID
3. **Backend operations** → Use `supabaseAdmin` (service_role key) → bypasses RLS entirely
4. **Client-side queries** → Use `supabase` (anon key) → RLS enforced with correct UUID comparison via `auth.uid()`

---

## Verification Checklist

After running the migration:

- [ ] `public.users.id` is UUID
- [ ] All FK columns (`competition_participants.user_id`, `matches.player_a_id`, etc.) are UUID
- [ ] Auth trigger exists: `on_auth_user_created` on `auth.users`
- [ ] `.env` has `SUPABASE_SERVICE_KEY` set
- [ ] Backend restarted
- [ ] Test user registration works without RLS error
- 