-- RLS_Migration.sql
-- Version: 1.0.0 — Initial RLS rollout (15 Mar 2026)
-- Resolves: D1 (unrestricted anon access), D15 (reminders INSERT/DELETE not admin-only)
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → run each STEP block in order.
--   Each step is safe to re-run (CREATE OR REPLACE / IF NOT EXISTS patterns used where possible).
--   If a step fails, do NOT proceed to the next — investigate first.
--
-- EXECUTION ORDER:
--   Step 0  → Helper functions (MUST run first — all policies depend on these)
--   Step 8  → reminders     (RLS already enabled; just fixing policies — lowest risk)
--   Step 7  → notification_reads
--   Step 6  → notifications
--   Step 5  → feeding_events
--   Step 4  → pets
--   Step 3  → user_households
--   Step 2  → households
--   Step 1  → users          (run last — most impact on onboarding flow)
--
-- AFTER ALL STEPS: test the app end-to-end (see Verification Checklist in plan).

-- ============================================================
-- STEP 0: Helper functions (run FIRST — everything else depends on these)
-- ============================================================

-- Returns the app-layer users.id for the current Supabase Auth session.
-- Returns NULL for unauthenticated calls.
-- SECURITY DEFINER: runs as DB owner so internal SELECT bypasses RLS,
-- preventing infinite recursion when policies on users/user_households
-- reference this function.
CREATE OR REPLACE FUNCTION my_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid();
$$;

-- Returns TRUE if the current authenticated user is a member of the given household.
-- SECURITY DEFINER: same recursion-prevention reason as above.
CREATE OR REPLACE FUNCTION is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_households uh
    JOIN users u ON u.id = uh.user_id
    WHERE uh.household_id = p_household_id
      AND u.auth_user_id  = auth.uid()
  );
$$;

-- Verify: should return your users.id
-- SELECT my_user_id();
-- Verify: should return true for a household you belong to
-- SELECT is_household_member('<your-household-id>');


-- ============================================================
-- STEP 8: reminders — fix D15 (admin-only INSERT/DELETE)
-- RLS is already ENABLED on this table — only policies change.
-- ============================================================

-- Check existing policy names first (run this separately, note the names):
-- SELECT policyname FROM pg_policies WHERE tablename = 'reminders';

-- Drop all existing policies (add any additional names returned by the query above)
DROP POLICY IF EXISTS "reminders_select" ON reminders;
DROP POLICY IF EXISTS "reminders_insert" ON reminders;
DROP POLICY IF EXISTS "reminders_update" ON reminders;
DROP POLICY IF EXISTS "reminders_delete" ON reminders;

-- SELECT: any household member can read reminders
CREATE POLICY "reminders_select"
ON reminders
FOR SELECT
TO authenticated
USING (is_household_member(household_id));

-- INSERT: admin only (main_member_id matches current user)
CREATE POLICY "reminders_insert"
ON reminders
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = reminders.household_id
      AND h.main_member_id = my_user_id()
  )
);

-- UPDATE: admin only
CREATE POLICY "reminders_update"
ON reminders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = reminders.household_id
      AND h.main_member_id = my_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = reminders.household_id
      AND h.main_member_id = my_user_id()
  )
);

-- DELETE: admin only
CREATE POLICY "reminders_delete"
ON reminders
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = reminders.household_id
      AND h.main_member_id = my_user_id()
  )
);


-- ============================================================
-- STEP 7: notification_reads
-- RLS status was unverified — enabling now.
-- ============================================================

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- SELECT: own reads only
CREATE POLICY "notification_reads_select"
ON notification_reads
FOR SELECT
TO authenticated
USING (user_id = my_user_id());

-- INSERT: own reads only (covers markNotificationAsRead upserts)
CREATE POLICY "notification_reads_insert"
ON notification_reads
FOR INSERT
TO authenticated
WITH CHECK (user_id = my_user_id());

-- UPDATE: own reads only (upsert update path)
CREATE POLICY "notification_reads_update"
ON notification_reads
FOR UPDATE
TO authenticated
USING (user_id = my_user_id())
WITH CHECK (user_id = my_user_id());

-- DELETE: own reads only (clearAllNotifications)
CREATE POLICY "notification_reads_delete"
ON notification_reads
FOR DELETE
TO authenticated
USING (user_id = my_user_id());


-- ============================================================
-- STEP 6: notifications
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: household member AND (household-wide OR targeted to me OR sent by me)
-- Mirrors the visibility filter already applied in getAllNotifications /
-- getUnreadNotificationsCount in database.ts — now enforced at DB level too.
-- Covers real-time subscription channel filtering as well.
CREATE POLICY "notifications_select"
ON notifications
FOR SELECT
TO authenticated
USING (
  is_household_member(household_id)
  AND (
    target_user_id IS NULL            -- household-wide broadcast
    OR target_user_id = my_user_id()  -- I am the target
    OR sender_user_id  = my_user_id() -- I sent this (feed_request)
  )
);

-- INSERT: household members (addNotification from app)
-- Edge Functions (process-reminders) use service role — bypass RLS automatically.
CREATE POLICY "notifications_insert"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (is_household_member(household_id));

-- DELETE: household members (deleteNotification, clearAllNotifications)
CREATE POLICY "notifications_delete"
ON notifications
FOR DELETE
TO authenticated
USING (is_household_member(household_id));


-- ============================================================
-- STEP 5: feeding_events
-- ============================================================

ALTER TABLE feeding_events ENABLE ROW LEVEL SECURITY;

-- SELECT: household members (getFeedingEventsByHouseholdId, real-time sub)
CREATE POLICY "feeding_events_select"
ON feeding_events
FOR SELECT
TO authenticated
USING (is_household_member(household_id));

-- INSERT: household members (addFeedingEvent / feedPet)
CREATE POLICY "feeding_events_insert"
ON feeding_events
FOR INSERT
TO authenticated
WITH CHECK (is_household_member(household_id));

-- DELETE: household members (undoFeedingEvent)
-- Any household member can delete (matches current app undo behaviour).
-- Undo-window enforcement (undo_deadline) is handled in app code.
CREATE POLICY "feeding_events_delete"
ON feeding_events
FOR DELETE
TO authenticated
USING (is_household_member(household_id));


-- ============================================================
-- STEP 4: pets
-- ============================================================

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- SELECT: household members (getPetById, getPetsByHouseholdId, real-time sub)
CREATE POLICY "pets_select"
ON pets
FOR SELECT
TO authenticated
USING (is_household_member(household_id));

-- INSERT: household members (createPet — including default pet during onboarding)
-- NOTE: is_household_member returns true at onboarding time because createUserHousehold
-- is awaited before createPet in handleMainMemberComplete.
CREATE POLICY "pets_insert"
ON pets
FOR INSERT
TO authenticated
WITH CHECK (is_household_member(household_id));

-- UPDATE: household members (feedPet, undoFeedPet, updatePet)
CREATE POLICY "pets_update"
ON pets
FOR UPDATE
TO authenticated
USING (is_household_member(household_id))
WITH CHECK (is_household_member(household_id));

-- DELETE: household members (deletePet)
CREATE POLICY "pets_delete"
ON pets
FOR DELETE
TO authenticated
USING (is_household_member(household_id));


-- ============================================================
-- STEP 3: user_households
-- ============================================================

ALTER TABLE user_households ENABLE ROW LEVEL SECURITY;

-- SELECT: own row OR same household (for getMembersOfHousehold)
-- IMPORTANT: uses is_household_member() instead of a raw subquery on user_households.
-- A raw subquery on user_households WITHIN a user_households policy causes infinite
-- recursion in Postgres RLS. is_household_member() is SECURITY DEFINER so its internal
-- query bypasses RLS — no recursion.
CREATE POLICY "user_households_select"
ON user_households
FOR SELECT
TO authenticated
USING (
  user_id = my_user_id()
  OR is_household_member(household_id)
);

-- INSERT: user can only insert their own link (createUserHousehold)
-- Covers both onboarding (createHousehold path) and joining via invite code.
CREATE POLICY "user_households_insert"
ON user_households
FOR INSERT
TO authenticated
WITH CHECK (user_id = my_user_id());

-- UPDATE: own row only (receives_reminders and future per-member settings)
CREATE POLICY "user_households_update"
ON user_households
FOR UPDATE
TO authenticated
USING (user_id = my_user_id())
WITH CHECK (user_id = my_user_id());

-- DELETE: self-removal OR admin removes a member
CREATE POLICY "user_households_delete"
ON user_households
FOR DELETE
TO authenticated
USING (
  -- Self-removal
  user_id = my_user_id()
  OR
  -- Admin (main_member) removes another member
  EXISTS (
    SELECT 1 FROM households h
    WHERE h.id = user_households.household_id
      AND h.main_member_id = my_user_id()
  )
);


-- ============================================================
-- STEP 2: households
-- SHORT-TERM NOTE: SELECT uses USING (true) to allow
-- getHouseholdByInvitationCode() without an Edge Function.
-- Future: move that call to a service-role Edge Function and
-- tighten SELECT to USING (is_household_member(id)).
-- ============================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user (needed for invite-code join flow)
CREATE POLICY "households_select"
ON households
FOR SELECT
TO authenticated
USING (true);

-- INSERT: authenticated user creating their own household
-- main_member_id in the new row must match the current user
CREATE POLICY "households_insert"
ON households
FOR INSERT
TO authenticated
WITH CHECK (main_member_id = my_user_id());

-- UPDATE: household members (name changes, pro toggle, etc.)
CREATE POLICY "households_update"
ON households
FOR UPDATE
TO authenticated
USING (is_household_member(id))
WITH CHECK (is_household_member(id));


-- ============================================================
-- STEP 1: users (run LAST)
-- SHORT-TERM NOTE: SELECT uses USING (true) to allow
-- getUserByEmail() during onboarding to find pending-invite
-- users whose auth_user_id is null (created before signup).
-- Future: move that call to a service-role Edge Function and
-- tighten SELECT to own row + co-member check.
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user
-- Acceptable: users table has no credentials or payment data.
CREATE POLICY "users_select"
ON users
FOR SELECT
TO authenticated
USING (true);

-- INSERT: authenticated user inserts their own row (onboarding createUser)
CREATE POLICY "users_insert"
ON users
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- UPDATE: own row only (updateUser — rename, notification prefs, etc.)
CREATE POLICY "users_update"
ON users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after all steps to confirm policies are in place.
-- ============================================================

-- List all policies across all 8 tables:
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN (
  'users', 'households', 'user_households',
  'pets', 'feeding_events', 'notifications',
  'notification_reads', 'reminders'
)
ORDER BY tablename, cmd;

-- Confirm RLS is enabled on all tables:
SELECT
  relname AS table_name,
  relrowsecurity AS rls_enabled,
  relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relname IN (
  'users', 'households', 'user_households',
  'pets', 'feeding_events', 'notifications',
  'notification_reads', 'reminders'
)
ORDER BY relname;
