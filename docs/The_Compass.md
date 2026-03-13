# I Fed The Pet (IFTP) - Master Cognitive Timeline & Architecture Analysis

## Chronological Project Log

### 22 January 2026
* **Milestone**: Initial Database Architecture Brainstorming.
* **Architecture Shift**: Transitioned from a flat, single-user mental model to a multi-tenant relational model supporting shared pet custody. 

[Image of database entity relationship diagram]

* **Action**: Defined the core Entity Relationship Diagram (ERD), establishing a many-to-many relationship between Users and Households via a `HouseholdMember` or `UserHousehold` junction table.

### Late January 2026**

* **Milestone**: Figma AI Specification & ERD Revision.
* **Decision**: Formalized the ERD in Markdown for Dan to use with Figma AI.
* **Action**: Documented key design decisions including household-level Pro subscriptions, a 2-minute undo window tracked via an `UndoDeadline` field, and user invitation statuses (`Pending`/`Active`). Defined core logic for user registration, household management, and pet feeding in `database.ts`.

### 28 January 2026, 09:00am

* **Milestone**: App Prototype & Backend Strategy.
* **Architecture Shift**: Decided to evaluate Supabase as the backend to replace local storage, specifically to support the real-time syncing fundamental to a multi-user household app.
* **Action**: Transitioned from design validation to full-stack implementation after Dan successfully created a working UI prototype in Figma.

### 31 January 2026, 15:30pm

* **Milestone**: Project initialized for React Web to React Native (RN) conversion.
* **Architecture Shift**: Local storage paradigms were systematically replaced with asynchronous `AsyncStorage`.
* **Action**: Converted `database.ts` (over 60 functions) to handle async data retrieval and created `TestDataScreen.tsx` to verify physical persistence on an iOS device via Expo Go.

**03 February 2026, 14:40pm - 15:00pm**
* **Milestone**: Strategic pivot from pure functionality to high-fidelity UI design.
* **Decision**: Adopted the "Design Parallel" approach to convert and fully style one page at a time (starting with `OnboardingFlow`), ensuring Dan's Figma designs were respected and implemented perfectly.
* **Action**: Upgraded the basic `StatusScreen` to match exact brand colors, typography, and card layouts from the design files.

**03 February 2026, 15:20pm**
* **Milestone**: Global styling system and Onboarding Flow construction.
* **Architecture Shift**: Implemented a robust `ThemeContext` supporting dynamic Light/Dark modes, ensuring the UI responds to native device settings.
* **Action**: Extracted reusable UI components (`Card`, `Button`, `Input`, `Logo`) and built out the complete 5-step `OnboardingFlow` (Create vs. Join Household paths).

**05 February 2026**
* **Milestone**: High-Fidelity UI Synchronization & Pro Tier Gating.
* **Action**: Removed legacy styling (red borders) from `Input` components and standardized `borderRadius` across form elements to match the React Web card-like aesthetic.
* **Action**: Completely overhauled `SettingsScreen` UI, introducing Pro-tier visual gating for the new "Ask member to feed" feature, including disabled states and upgrade prompts.
* **Action**: Redesigned the "Invite Member" and "Add Pet" modals to match the web design, implementing unified header structures, new state variables (`inviteName`), and shadow-based elevation.

**07 February 2026**
* **Milestone**: Critical Database Migration Bug Resolution.
* **Problem**: A partial migration to Supabase resulted in critical "silent data loss" read/write mismatches. Data was written to local `AsyncStorage` but read from Supabase (or vice versa). Furthermore, a truthy check (`if (updates.LastFedDateTime)`) silently skipped `null` values, fundamentally breaking the undo functionality.
* **Action**: Synchronized read/write paths across `updateUser`, `updateHousehold`, `getPetById`, and `undoFeedingEvent` to strictly query Supabase. Replaced fragile truthy checks with strict `!== undefined` evaluations.

**07 February 2026**
* **Milestone**: Optimistic UI & Latency Elimination.
* **Architecture Shift**: Transitioned `StatusScreen` from a sequential, blocking network flow (2-5 seconds of UI lag) to an Optimistic Update pattern (0ms response). The UI now updates instantly on tap, syncs to Supabase in the background via parallel `Promise.all()` batches, and rolls back local state automatically upon network failure. 
* **Action**: Eradicated a severe polling bug where `canUndoLatest` queried Supabase every 1 second (60 network calls/min) by shifting the countdown timer to evaluate purely against local React state.

**07 February 2026, 15:33pm**
* **Milestone**: Multi-tenant data scoping realized.
* **Architecture Shift**: Identified that notifications were firing globally per device rather than per household.
* **Action**: Rewrote the Notification system to inject and require `HouseholdID`. Implemented a 30-day auto-cleanup and a migration script to destroy legacy global demo data.

**07-10 February 2026**
* **Milestone**: Phase A Migration Completion: Cache-First Architecture & Real-time Sync.
* **Architecture Shift**: System-wide adoption of the Cache-First data fetching pattern and expanded Real-Time WebSocket subscriptions across all primary screens.
* **Action**: Migrated the final 6 `user_household` relationship functions from `AsyncStorage` to Supabase and added the `mapUserHousehold` translator.
* **Action**: Implemented generic `getCachedScreenData` helpers on `StatusScreen` and `SettingsScreen` to eliminate loading spinners (achieving 0ms perceived load) followed by silent background network refreshes. 
* **Action**: Created `subscribeToSettingsChanges` for multi-device sync on the Settings screen, utilizing a `suppressNextRealtimeLoad` ref to prevent redundant data fetches (echoes) from own-device mutations.
* **Action**: Executed a massive dead-code purge, deleting 8 legacy local storage bulk functions (`getAllUsers`, `getAllPets`, `saveAllHouseholds`, etc.) and their storage keys.

**10 February 2026, 09:30am**
* **Milestone**: Project Documentation Consolidation.
* **Architecture Shift**: Addressed context limits and scattered documentation by consolidating the entire project state. 
* **Action**: Analyzed roughly 5,700 lines of source code across 19 TypeScript files to verify Phase A completion. Created a permanent `docs/` folder in the GitHub repository to act as the single source of truth for future AI sessions.

**10 February 2026, 11:20am**
* **Milestone**: QA Testing Blocker & Architecture Fix.
* **Problem**: An issue occurred where the Expo.dev build bypassed onboarding and blocked interaction. 
* **Action**: Built a `resetToNewUser()` developer tool in `SettingsScreen` to clear local AsyncStorage (session, onboarding flag, caches) for repeatable UI testing.
* **Problem**: Discovered a Postgres `23505` unique constraint violation (`users_email_address_key`) when the local reset didn't clear the cloud Supabase user record.
* **Action**: Updated `OnboardingFlow.tsx` to check `getUserByEmail` before creating a new user, mirroring the existing "Join Household" logic.

**14 February 2026, 13:45pm**
* **Milestone**: Multi-Household Switcher Implementation & Hardening.
* **Problem**: Initial implementation attempts introduced significant instability during MVP testing.
* **Action**: Identified and resolved 5 critical bugs across the application logic, including a broken `.single()` call on `updateHousehold`, inverted cache validation logic in `StatusScreen`, empty `allHouseholds` population, and missing validation gates during household switching. 

**14-15 February 2026**
* **Milestone**: Supabase RLS Footguns & RN Touch Interception Fixes.
* **Problem**: The Pro Toggle `Switch` was visually frozen, and `updateHousehold` was silently failing to update the UI correctly due to missing Row Level Security (RLS) UPDATE policies. 
* **Action**: Iterated on the database update pattern. Initially removed `.select()` to bypass a `SELECT` RLS policy footgun, but realized this masked *silent update failures* (where 0 rows are affected due to a missing `UPDATE` RLS policy). Reinstated the `.update().eq().select().single()` pattern to strictly catch these silent RLS failures and error out properly.

* **Action**: Fixed the frozen UI component by removing the parent `TouchableOpacity` (via `SettingsRow`) which was intercepting touch events before they could reach the Android `Switch` child. Converted the layout to a plain `View`.

* **Decision**: Consciously rejected an Optimistic UI pattern for the Pro Toggle switch, establishing the database as the strict, blocking source of truth for subscription status before updating the UI.

**15 February 2026, 12:20pm**
* **Milestone**: Login / Account Creation Strategy Alignment.
* **Problem**: Realized after a meeting with Dan that the onboarding flow was missing a formal login and account creation entry point.
* **Action**: Initiated the generation of complete, ready-to-implement code for a Welcome screen, Email signup screen, Login screen, and Auth service linked to Supabase.

**16 February 2026, 17:20pm**
* **Milestone**: Expo Routing & Protected Views Architecture.
* **Architecture Shift**: Transitioned to Expo Router to handle authentication state changes automatically.
* **Action**: Implemented `RootLayoutNav` within an `AuthProvider` context to watch `isLoggedIn` state, automatically replacing routes between the protected `/(app)/` group and the public `/(auth)/welcome` group.

**17 February 2026**
* **Milestone**: Supabase Authentication Provider Setup & Expo Go Limitations.
* **Problem**: Email verification deep links (`com.djeasoft.ifedthepet://`) failed to route back to the app because Expo Go does not support custom URL schemes natively.
* **Decision**: Temporarily disabled "Confirm email" in Supabase to unblock immediate UI and auth testing, deferring native deep link implementation until migrating to a true development build (`npx expo run:ios`).

**19 February 2026, 04:20am**
* **Milestone**: Post-Authentication Logic and User Linking.
* **Architecture Shift**: Shifted focus from raw authentication to post-authentication routing and mapping the newly authenticated user to existing Supabase table data (households/pets).

**19 February 2026, 06:40am**
* **Milestone**: User Authentication and Onboarding Flow Validation.
* **Architecture Shift**: Validated the "Three-gate system" in `AppRouter` (`Auth` -> `Onboarding` -> `Main App`) to handle brand new users, returning users, and interrupted onboarding edge cases safely without duplicate database records.
* **Action**: Mapped the interrupt-safe flag pattern ensuring `setOnboardingCompleted()` is only written to `AsyncStorage` after successful Supabase DB writes.

**19 February 2026, 8:53am**
* **Milestone**: Auth Flow Hardening & Invalid Refresh Token Fix.
* **Problem**: An unhandled `AuthApiError: Invalid Refresh Token` caused a jarring UI flash when restoring a stale session.
* **Action**: Updated `AuthContext.tsx` to actively validate the session on startup via `getUser()` (which pings the server) instead of blindly trusting the local cache from `getSession()`.
* **Action**: Verified and permanently deleted the orphaned `OnboardingWelcomeScreen.tsx` dead code file.

**19 February 2026, 1:53pm**
* **Milestone**: Onboarding Flag Migration & Source of Truth Alignment.
* **Problem**: The `onboardingCompleted` flag was stored purely locally in `AsyncStorage` and was accidentally being wiped upon user sign-out, forcing returning users back through onboarding.
* **Architecture Shift**: Migrated the `is_onboarding_completed` flag directly into the Supabase `users` table via SQL, establishing the cloud as the source of truth to support multi-device syncing. 
* **Action**: Fixed an associated timing bug in `App.tsx` where the app briefly flashed the onboarding screen before evaluating the new cloud flag by setting `checkingOnboarding(true)` synchronously.

**19 February 2026, 3:53pm**
* **Milestone**: Notifications Database Migration & Cross-Household Scoping.
* **Problem**: The notification badge on `StatusScreen` persistently showed stale counts (e.g., "21") and `NotificationsPanel` hung on "Loading..." because notifications were still operating entirely on legacy local `AsyncStorage` data instead of Supabase.
* **Architecture Shift**: Migrated the entire notification system to Supabase. Created a `notifications` table (scoped to `household_id`) and a `notification_reads` junction table (tracking read state per user). 
* **Action**: Rewrote 7 core notification functions in `database.ts`. Simplified the data retrieval by replacing fragile PostgREST left-joins with two independent simple queries merged client-side. Implemented a `clearLegacyNotificationData()` function to explicitly wipe the stale `AsyncStorage` remnants causing the phantom "21" badge.

**21 February 2026, 19:00pm**
* **Milestone**: Feed Button Restoration & Auth Session Self-Healing.
* **Problem 1**: The core "I FED THE PET" button was completely unresponsive on device — no logs fired on press, no UI change, no Supabase write. Root cause was a JavaScript naming collision in `StatusScreen.tsx` where the React state declaration `const [currentHouseholdId, setCurrentHouseholdId]` silently shadowed the identically-named `setCurrentHouseholdId` function imported from `../lib/database`. The state variable was therefore never correctly populated, causing the feed handler guard `if (!currentUser || !currentHouseholdId) return` to exit silently on every press.
* **Action**: Renamed the state variable and setter to `activeHouseholdId` / `setActiveHouseholdId` throughout `StatusScreen.tsx`. All references to the database import retained their original names. Versioned as `StatusScreen.tsx v3.2.0`.
* **Architectural Rule**: State variable names must never collide with imported function names in the same file. TypeScript does not warn on this — the inner scope silently wins.

* **Problem 2**: After running `npx expo start --clear`, `getCurrentUserId()` returned `null` even though a valid Supabase auth session was active. The function read exclusively from AsyncStorage (`currentUserId` key), which is wiped on cache clear and on fresh installs. `loadData()` bailed silently on `userId = null`, leaving `currentUser` and `activeHouseholdId` state as null/undefined — compounding Problem 1.
* **Architecture Shift**: Updated `getCurrentUserId()` in `database.ts` to implement a self-healing fallback. If AsyncStorage returns null, the function now calls `supabase.auth.getSession()`, resolves the internal user record via `getUserByAuthId()`, re-hydrates the AsyncStorage key for subsequent calls, and returns the valid user ID. The function is now resilient to cache clears, fresh installs, and AsyncStorage corruption.
* **Architectural Rule**: AsyncStorage must never be the sole source of truth for identity. Supabase auth session is always the authoritative fallback for determining who the current user is.

* **Outcome**: Feed button fully operational. Real-time sync between devices confirmed working (Device A feeds → Device B StatusScreen auto-updates). Cross-device notifications confirmed. Phase A validated end-to-end on real devices.

**23 February 2026, 19:00pm**
* **Milestone**: Notification Bell Badge Fix — Lifted State Pattern.
* **Problem**: After tapping "Mark all as read" in `NotificationsPanel`, the bell badge on `StatusScreen` retained its stale count until the app was fully reloaded. Root cause: `unreadCount` was local state inside `StatusScreen.tsx`, and `NotificationsPanel.tsx` (rendered as a sibling in `App.tsx`) had no mechanism to update it. The two components shared no common state for the badge count.
* **Action**: Lifted `unreadCount` state from `StatusScreen.tsx` to `App.tsx`, establishing `App.tsx` as the single owner. `StatusScreen` now receives `unreadCount` as a prop (reads) and calls `onUnreadCountChange` when loading fresh data. `NotificationsPanel` calls the same `onUnreadCountChange` callback after marking single or all notifications as read, immediately zeroing the badge.
* **Files changed**: `App.tsx` v3.6.0, `StatusScreen.tsx` v3.3.0, `NotificationsPanel.tsx` v2.2.0.
* **Architectural Rule**: When two sibling components need to share and mutate the same piece of state, lift it to their nearest common parent rather than attempting cross-component communication via refs, events, or redundant network fetches.
* **Outcome**: Bell badge resets to zero instantly on mark-all-read. Changes pushed to GitHub and Expo preview. Dan notified.

**27 February 2026**
* **Milestone**: Bug 3 Fix — Multi-Household Switching Now Propagates to All Screens.
* **Problem**: `handleSwitchHousehold` in `SettingsScreen.tsx` correctly saved the new household ID to AsyncStorage via `setCurrentHouseholdId()`, but nothing downstream was listening. `StatusScreen` only called `loadData()` on mount and on real-time Supabase events — neither fired on a same-device household switch. The result: StatusScreen continued showing the previous household's pets, feeding history, and data even after the user switched.
* **Secondary Problem**: `SettingsScreen.loadData()` always defaulted to `households[0]` instead of reading the saved household ID from AsyncStorage. Every time the Settings modal was reopened after a switch, it silently reverted to the first household.
* **Architecture Shift**: Established `App.tsx` as the single source of truth for `currentHouseholdId`. The fix follows the same lifted-state pattern used for `unreadCount` (v3.6.0). `SettingsScreen` now calls `onHouseholdSwitch(newHouseholdId)` after a successful switch. `App.tsx` receives this, updates `currentHouseholdId` state, and passes it as a `householdId` prop to both `StatusScreen` and `NotificationsPanel`. Each screen reacts to prop changes via `useEffect` rather than polling AsyncStorage.
* **Files changed**: `App.tsx` v3.7.0, `StatusScreen.tsx` v3.4.0, `SettingsScreen.tsx` v3.1.0, `NotificationsPanel.tsx` v2.3.0.
* **Architectural Rule**: When a piece of state needs to drive behaviour across multiple sibling screens, it must live in their nearest common parent (`App.tsx`) and flow down as props. Never rely on AsyncStorage as a real-time communication channel between components — it has no event system and changes to it are completely silent.
* **Double-Load Prevention**: A `prevHouseholdIdPropRef` was added to `StatusScreen` to guard the `useEffect([householdId])`. On boot, `householdId` transitions from `null` → a real ID — this must NOT trigger a second `loadData()` since the initial mount already ran one. The ref tracks the previous value and only reloads when switching from one non-null ID to a different non-null ID.
* **Git Workflow Note**: Changes were implemented in a separate Git branch (`claude/brave-hopper`) via a Git worktree (a mechanism that checks out a second branch into a separate folder simultaneously, allowing main to remain untouched while changes are tested). Files were manually copied to `main` after successful device testing on iPhone and Android, then the worktree and branch were cleaned up. **Rule established**: always branch → test on device via Expo Go → merge. Never work directly on `main`.
* **Outcome**: Switching households in the Settings modal now immediately updates StatusScreen, NotificationsPanel, and all household-scoped data. Verified on real devices.

**27 February 2026 — Session 1**
* **Milestone**: Account Identity Block Added to Settings Screen Top.
* **Problem**: When testing across multiple user accounts (e.g., Jarques, Dan, Henry), there was no way to tell which user was currently logged in without navigating away or checking the members list.
* **Action**: Added an Account section as the very first item in the `SettingsScreen` scroll view, displaying the current user's `MemberName` and `EmailAddress`, followed by a divider and the existing Sign Out button. This is a testing and UX quality-of-life improvement — immediately clear which account is active the moment Settings opens.
* **Files changed**: `SettingsScreen.tsx` v3.2.0.
* **Design Decision**: No star, badge, or icon — just name and email as plain text rows. The identity itself is the indicator. Clean, consistent with the existing card style.

**27 February 2026 — Session 2**
* **Milestone**: Item 5 — "Ask Member to Feed" Notification Wired Up.
* **Problem**: The "Ask member to feed" button in `SettingsScreen.tsx` fired only a local `Alert.alert('Request Sent')` stub. No data was written to Supabase, and no other household members were notified.
* **Action**: Replaced the stub `onPress` handler with an async function calling `addNotification()` with parameters: `householdId`, `type: 'feed_request'`, `message: "[RequesterName] asked [TargetName] to feed the pet(s)"`, `memberName`, `requestedBy`. No schema changes were required — the `notifications` table, `addNotification()` function, and `NotificationsPanel` rendering for `feed_request` type were already in place from the notification migration.
* **Files changed**: `SettingsScreen.tsx` v3.2.0 → v3.3.0.
* **Outcome**: Tapping "Ask [Member] to feed" now inserts a real notification into Supabase. All household members see it in their `NotificationsPanel`.

**27 February 2026 — Session 3**
* **Milestone**: Real-Time Notification Subscription & Bell Sound.
* **Problem**: The notification bell badge on `StatusScreen` only updated when the user manually opened `NotificationsPanel` or when `loadData()` ran (triggered by pet/feeding changes). Standalone notifications like `feed_request` had no real-time listener — only `pets` and `feeding_events` tables had subscriptions.
* **Action**: Added `subscribeToNotificationChanges()` in `database.ts` — a Supabase real-time WebSocket subscription on the `notifications` table filtered by `household_id`, listening for `INSERT` events only. Added a bell chime sound using `expo-av` (`assets/notification_bell.wav`). When the real-time listener fires from another device's action, `StatusScreen` plays the bell and refreshes the unread count.
* **Architecture Pattern — Merged Subscription useEffect**: Initially, the notification subscription lived in its own `useEffect` with `[activeHouseholdId, currentUser?.UserID]` as dependencies. This caused a critical bug: every time `loadData()` refreshed `currentUser` state (triggered by any pet/feeding change), the notification subscription was torn down and briefly recreated — creating a window where standalone notifications (e.g. `feed_request`) could arrive and be missed. Fixed by merging both subscriptions (household changes + notification inserts) into a single `useEffect` keyed only on `[activeHouseholdId]`. The notification callback uses `getCurrentUserId()` (reads AsyncStorage fresh each invocation) instead of closing over `currentUser` state, eliminating the dependency.
* **Architecture Pattern — Cross-Screen Bell Suppression**: The `suppressNotificationSoundRef` is a `useRef` owned by `App.tsx` and passed as a prop to both `StatusScreen` and `SettingsScreen`. When `SettingsScreen` creates a feed request notification, it sets the ref to `true` before the insert. When `StatusScreen`'s real-time listener fires, it checks the ref — if `true`, it skips the sound (but still updates the badge count). The same local `suppressNextNotificationSound` ref is set during `handleFeedClick` since feeding also creates a notification.
* **Architectural Rule**: Any screen that programmatically inserts into the `notifications` table must set `suppressNotificationSoundRef.current = true` before the insert to prevent the sender hearing their own bell sound.
* **Files changed**: `database.ts` (new function), `App.tsx` v3.7.0 → v3.8.0, `StatusScreen.tsx` v3.4.0 → v3.7.0, `SettingsScreen.tsx` v3.3.0 → v3.4.0.
* **Dependency added**: `expo-av` for audio playback.

**27 February 2026 — Session 4**
* **Milestone**: Supabase Replication Configuration Fix.
* **Problem**: After wiring up `subscribeToNotificationChanges()`, the bell badge still did not update in real time on any device. The subscription callback never fired. The `subscribeToHouseholdChanges()` listener (watching `pets` and `feeding_events`) worked perfectly — same code pattern, different table. Root cause: the `notifications` table was not included in the Supabase real-time replication publication (`supabase_realtime`).
* **Action**: Enabled real-time replication for the `notifications` table in the Supabase Dashboard → Database → Replication.
* **Architectural Rule**: Any table that uses Supabase real-time subscriptions (`supabase.channel().on('postgres_changes', ...)`) must be explicitly added to the `supabase_realtime` publication in the Supabase Dashboard. This is a per-table opt-in — it is not automatic. Failing to do this produces zero errors and zero logs; the subscription simply never fires.
* **Outcome**: Bell badge updates in real time on all devices. Other-device notifications play a bell chime. Own-device actions are silent. Verified on real devices.

**27 February 2026 — Session 5**
* **Milestone**: Real-time notification bell + "Ask member to feed" fully wired.
* **Action**: `SettingsScreen.tsx` v3.3.0 → v3.4.0. "Ask member to feed" button now inserts a real `feed_request` notification into Supabase via `addNotification()`.
* **Action**: Added real-time subscription on the `notifications` table. Bell badge updates instantly on all devices when a new notification arrives.
* **Action**: Bell chime sound (`expo-av`) plays on receiving devices. `suppressNotificationSoundRef` lifted to `App.tsx` and passed as a prop to `StatusScreen` and `SettingsScreen` — prevents the sender hearing their own bell.
* **Bug Fixed**: Bell badge not updating in real time — root cause was `notifications` table missing from Supabase Replication. Fixed by enabling it in Dashboard → Database → Replication.
* **Verified**: Jarques tested on iPhone + Android simultaneously. Real-time bell and sound confirmed working cross-device.

**27 February 2026 — Session 6**
* **Milestone**: Email invitations fully wired via Supabase Edge Function.
* **Security Fix**: Discovered that `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env` was actually the service role key (JWT payload contained `"role": "service_role"`). This gave the client app full admin DB access. Replaced with the correct anon key immediately.
* **Architecture Decision**: Sensitive server-side operations requiring the service role key must never run in the app bundle. Established the Edge Function pattern — deploy a Supabase Edge Function that holds the service role key as a Supabase secret, called from the app via `fetch()` with the anon key as a Bearer token.
* **Action**: Installed Supabase CLI v2.75.0 (Windows). Logged in and linked to project `dswbgtbrorhxxnargbdw`.
* **Action**: Created and deployed Supabase Edge Function `send-invite-email`. Uses `supabase.auth.admin.inviteUserByEmail()` with the service role key injected automatically by Supabase as `SUPABASE_SERVICE_ROLE_KEY` (built-in secret, not manually set).
* **Action**: Replaced mock `sendEmail()` in `database.ts` with real `sendInviteEmail()` function that calls the Edge Function via `fetch()`.
* **Action**: Updated `handleInviteMember` in `SettingsScreen.tsx` v3.4.0 → v3.5.0. Now calls `sendInviteEmail()` after creating the pending user. Shows success alert with household name, or graceful fallback alert with manual code if email fails.
* **Action**: Updated Supabase email template (Authentication → Email Templates → Invite user) with step-by-step join instructions and `{{ .Token }}` to display the invitation code prominently.
* **Decision**: Removed `{{ .ConfirmationURL }}` link from email template — it leads to a blank page until deep linking is implemented in Phase B. Cleaner UX to exclude it entirely for now.
* **Decision**: `{{ .Household }}` is not a valid Supabase template variable — household name cannot be injected into the template without a custom SMTP email body. Deferred to Phase B.
* **Verified**: Real invite email received in inbox with invitation code and join instructions.
* **Future consideration noted**: Deep link in invite email (open app directly to Join Household screen with code pre-filled) — requires production build + custom URL scheme. Phase B item.
* **Future consideration noted**: Custom email body via SMTP from Edge Function would give full control over email content including household name. Phase B item.
* **Future consideration noted**: `sendMemberRemovedEmail()` is currently a no-op. Wire up a proper removal notification email in Phase B.

### 28 February 2026

**Session 1**

* **Milestone**: Invited User Signup Unblocked — `claim-invite` Edge Function.
* **Problem**: After an admin sent an invite email via the `send-invite-email` Edge Function, `supabase.auth.admin.inviteUserByEmail()` created a ghost auth record in Supabase's `auth.users` table for the invitee's email. When the invitee then tapped "Sign up free with email" and called `supabase.auth.signUp()`, Supabase threw `AuthApiError: User already registered` — the invitee was completely unable to enter the app.
* **Root Cause**: The Edge Function returned the ghost auth user's ID, but `sendInviteEmail()` in `database.ts` discarded it (returned only `boolean`). The ghost auth ID was never stored anywhere, so there was no way to identify and update the correct auth record later.
* **Secondary Bug**: `handleMemberComplete` in `OnboardingFlow.tsx` called `createUserHousehold()` for a link that `handleInviteMember` had already created — risking a duplicate or unique constraint error.
* **Architecture Decision — Claim-Invite Pattern**: Rather than removing `inviteUserByEmail()`, the solution keeps the ghost auth user and exposes a new `claim-invite` Edge Function that uses the service role key to set a password and confirm the email on the ghost user via `supabase.auth.admin.updateUserById()`. The invited user picks their own password — consistent with normal signup UX. No new external services or deep links required.
* **Action**: Created and deployed Supabase Edge Function `claim-invite/index.ts`. Security model: validates the email exists in `users` with `invitation_status = 'Pending'` and a non-null `auth_user_id` before touching anything.
* **Action**: `sendInviteEmail()` in `database.ts` return type changed from `Promise<boolean>` to `Promise<string | false>` — now returns the ghost auth user ID on success.
* **Action**: `handleInviteMember` in `SettingsScreen.tsx` now stores the returned ghost auth ID on the pending user record via `updateUser(newUser.UserID, { AuthUserID: ghostAuthUserId })`.
* **Action**: New `claimInvite(email, password)` function added to `database.ts` — calls the `claim-invite` Edge Function.
* **Action**: `createUserHousehold()` made idempotent — checks for existing `(user_id, household_id)` link before inserting. Returns existing record silently if found.
* **Action**: `AuthScreen.handleSignUp` now calls `getUserByEmail` first. If `InvitationStatus === 'Pending'` → calls `claimInvite` + `signInWithEmail` (no new auth record created). If `InvitationStatus === 'Active'` → clear error directing to login screen. Normal new user → original signup path unchanged.
* **Files changed**: NEW `supabase/functions/claim-invite/index.ts`, `database.ts`, `SettingsScreen.tsx` v3.5.0 → v3.6.0, `AuthScreen.tsx` v1.1.0 → v1.2.0.
* **Architectural Rules Established**:
  - Ghost auth ID thread-through rule: any caller of `sendInviteEmail()` must store the returned `string | false` and call `updateUser({ AuthUserID: ghostId })` if non-empty. If skipped, `claim-invite` will reject with "Invitation was not properly set up."
  - `createUserHousehold` must always be idempotent. The invite flow pre-creates the link; onboarding re-calls the same function. Without idempotency this produces a duplicate or constraint error.
* **Verified**: Fresh invited user (jzwennis@icloud.com / Jay) signed up, landed in OnboardingFlow, joined household, reached StatusScreen. No errors. Tested on device by Jarques, 28 February 2026.

**Session 2**

* **Milestone**: Bug #8 Fixed — New Members No Longer Inherit Stale Notification History.
* **Problem**: When a new user joined a household, they saw the full history of household notifications in `NotificationsPanel` (e.g. Henry saw 12 unread notifications from Daniel's activity before Henry joined). The bell badge reflected the same inflated count. Both `getAllNotifications` and `getUnreadNotificationsCount` queried the `notifications` table by `household_id` only — no filter for when the requesting user joined.
* **Root Cause**: `user_households.created_at` (the user's join timestamp) existed but was never used in any notification query.
* **Action**: Applied a join-date filter to both `getAllNotifications` and `getUnreadNotificationsCount` in `database.ts`. Each function now first fetches `created_at` from `user_households` for the current user/household pair (via `.maybeSingle()`), then applies `.gte('created_at', joinDate)` to the notifications query. If the membership row is not found, `joinDate` falls back to `null` and the filter is skipped — degrading gracefully to the previous behaviour rather than breaking. Existing members are unaffected: their join date predates all notifications, so `.gte` returns the full history.
* **Architectural Rule Established — Join-date filter rule**: Any function that queries the `notifications` table on behalf of a specific user must also fetch `user_households.created_at` for that user/household pair and apply `.gte('created_at', joinDate)`. Both `getAllNotifications` and `getUnreadNotificationsCount` must always use the same filter — if one is updated, the other must be updated too. Failure to keep them in sync causes the badge and panel to show different counts.

* **Milestone**: Duplicate `member_joined` Notifications Fixed — Loading Guard in OnboardingFlow.
* **Problem**: When Jay joined a household, two identical `member_joined` notifications appeared in the database 1.26 seconds apart. No database trigger existed — the double insert came purely from `handleMemberComplete` in `OnboardingFlow.tsx` being called twice. The "Join Household" button remained enabled while async DB operations were in flight, and the keyboard `onSubmitEditing` handler provided a second trigger path that could fire simultaneously with a button tap.
* **Action**: Added `isLoading` state to `OnboardingFlow.tsx`. Four guard points: `if (isLoading) return` at top of `handleMemberComplete`; `setIsLoading(true)` before try block with `setIsLoading(false)` in finally; `disabled={!canContinue() || isLoading}` on the button; `!isLoading` guard added to `onSubmitEditing`. Button label changes to "Joining..." while in flight so the user has visual feedback.
* **Architectural Rule Established — Loading guard rule**: Any async submit handler in an onboarding or join flow must have an `isLoading` guard (state or ref) that prevents re-entry. Both the button's `disabled` prop and any keyboard `onSubmitEditing` handler must check the same guard.
* **Files changed**: `database.ts` (`getAllNotifications`, `getUnreadNotificationsCount`), `OnboardingFlow.tsx` (isLoading guard).
* **Verified**: Fresh user joined household with existing notification history. Bell badge showed 0. Panel matched badge. Only one `member_joined` entry in database. Tested on device by Jarques, 28 February 2026.

### 1 March 2026

* **Milestone:** Improvements backlog begun — I1 resolved.
* **Problem:** Pet checkboxes on StatusScreen were rendering in a vertical column instead of a horizontal row, making the UI inconsistent with the intended design.
* **Action:** Wrapped individual pet checkbox items in a `petCheckboxRow` container with `flexDirection: 'row'` and `flexWrap: 'wrap'`. Added `checkboxRowInline` style for individual pet items. `StatusScreen.tsx` bumped to v3.8.0.
* **Files changed**: `StatusScreen.tsx`

### 3 March 2026 — Improvements & Bug Fix Session

**Milestone**: Invite Modal Overhaul (I2 + Bug 12).
* **Action**: Removed name field from Invite Member modal (Bug 12). Invite now requires email only. Name placeholder derived from email prefix and stored as temporary value until the invited user sets their real name during onboarding.
* **Action**: Added `isSendingInvite` state to `SettingsScreen`. Moved guard before `canAddMember` call so spinner appears instantly on tap. All modal controls (Send button, Cancel button, X close, email input) disabled while send is in flight. `ActivityIndicator` replaces button text during send.
* **Action**: Removed spurious `member_joined` notification on invite send. Notification was semantically incorrect (user hasn't joined yet) and created duplicate notifications when the user later completed onboarding.
* **Files changed**: `SettingsScreen.tsx` v3.5.0 → v3.7.1.

**Milestone**: Member Sort Order.
* **Action**: Added `sortMembers()` helper to `SettingsScreen`. Sort order: main member first, then active members, then pending members. Within each tier: oldest joined first.
* **Architecture**: `getMembersOfHousehold` in `database.ts` updated to `.order('created_at', { ascending: true })` on the `user_households` query. Added step to re-apply join-date order after `.in()` fetch (Supabase `.in()` does not preserve insertion order). `sortMembers()` applied on fresh fetch, household switch, and cache load.
* **Files changed**: `SettingsScreen.tsx` v3.7.1 → v3.7.2, `database.ts`.

**Milestone**: Member Name Editing Moved to Account Section (Bug 15 + Bug 16).
* **Problem**: Main member could edit any member's name via pencil icons in the Members section. Design decision changed — each member edits only their own name.
* **Action**: Removed pencil icon from all rows in the Members section.
* **Action**: Added pencil icon to Account section. Tapping it opens an inline `TextInput` reusing existing `editingMemberId` / `memberNameInput` / `handleSaveMemberName` infrastructure — no new state or functions needed.
* **Action**: Updated `handleSaveMemberName` to call `setCurrentUser` when `editingMemberId === currentUser?.UserID`, so the Account section name refreshes instantly without a `loadData()` call. Same eventual-consistency pattern as member sort — other devices see the updated name next time they open Settings.
* **Architectural Rule**: For non-time-critical data changes (name edits, member removal), prefer optimistic local state updates over real-time subscriptions. Real-time sync is reserved for feeding events and notifications where timing matters.
* **Files changed**: `SettingsScreen.tsx` v3.7.2 → v3.7.3.

**Milestone**: Bug 17 Fixed — Member Deletion Now Working.
* **Problem**: Tapping "Remove" on a member did nothing visually and the member remained in the database. Two root causes identified.
* **Root Cause 1**: `suppressNextRealtimeLoad.current = true` was set at the top of the try block. This muted the Supabase broadcast triggered by the delete, and also interfered with the subsequent `loadData()` call — which read from cache and returned the stale member list.
* **Root Cause 2**: The Supabase RLS DELETE policy on `user_households` was written as `auth.uid() = user_id` — only allowing a user to delete their own row. The main member deleting another member always resulted in 0 rows deleted because `auth.uid()` (main member) never matched `user_id` (removed member).
* **Action**: Removed `suppressNextRealtimeLoad.current = true` from `handleRemoveMember` — no optimistic UI here, no echo to suppress.
* **Action**: Replaced old RLS policy with: allow delete if the authenticated user is the main member of the household. Policy checks `users.is_main_member = true` for the requesting auth user against the household in question.
* **Action**: Replaced `loadData()` with an optimistic state update — `setMembers(prev => prev.filter(m => m.UserID !== member.UserID))`. Member disappears from the list instantly. Other devices see the change next time they open Settings (eventual consistency).
* **Architectural Rule — RLS DELETE pattern**: When the deleting user is not the owner of the row being deleted, the RLS policy must join to a permissions table (e.g. `user_households`) to verify the requester has authority. A simple `auth.uid() = column` policy will always fail in admin-deletes-member scenarios.
* **Architectural Rule — suppress ref scope**: `suppressNextRealtimeLoad.current = true` must only be set for optimistic UI operations where an immediate echo from the triggered broadcast would cause a redundant re-render. It must never be set for pessimistic DB writes that rely on `loadData()` for UI refresh.
* **Files changed**: `SettingsScreen.tsx` v3.7.3 (no version bump — logic only), `database.ts` (count check added to `removeUserFromHousehold`). Supabase RLS policy updated on `user_households` table.

---

### 4 March 2026

* **Milestone**: Bug 18 + I9 + Bug 13 Fixed — Settings Changes Now Propagate to StatusScreen Instantly.
* **Problem**: After any change in SettingsScreen (household name rename, pet added, pet deleted), StatusScreen continued to show stale data until the user tapped the feed button or restarted the app. Both I9 (household name not updating) and Bug 13 (new pet not appearing in StatusScreen checkboxes) were root-caused to the same gap.
* **Root Cause**: `handleSaveHouseholdName`, `handleAddPet`, and `handleDeletePet` in `SettingsScreen.tsx` updated SettingsScreen's local state and wrote to Supabase, but had no mechanism to notify `StatusScreen`. StatusScreen only reloaded on mount, real-time Supabase broadcasts (pets/feeding_events tables), or a `householdId` prop change — none of which fired on a same-device Settings save.
* **Architecture Decision — Eventual Consistency for Non-Time-Critical Data**: Real-time subscriptions are reserved for feeding events and notifications where timing matters. Household name and pet list changes use the prop-driven push pattern instead: Device A sees the change instantly; Device B sees it on the next natural load. This was a conscious decision, consistent with the architectural rule established on 3 March 2026.
* **Action**: Added `onHouseholdNameChange` and `onPetsChange` callback props to `SettingsScreen`. Each relevant handler calls its callback after a successful Supabase write.
* **Action**: `App.tsx` holds `overrideHouseholdName` and `overridePets` state. It receives the callbacks from `SettingsScreen` and passes the values down to `StatusScreen` as props.
* **Action**: `StatusScreen` has two new `useEffect` hooks — one patches `household.HouseholdName` in local state when `overrideHouseholdName` changes; the other patches `pets` and resets checkbox selection when `overridePets` changes. Both use an `=== undefined` guard to prevent false triggers on boot.
* **Architectural Rule**: For non-time-critical data (household name, pet list, member names), prefer the prop-driven push pattern over real-time subscriptions. The pattern: SettingsScreen callback → App.tsx state → StatusScreen `useEffect` patch. This avoids unnecessary WebSocket subscriptions and keeps the subscription layer clean.
* **Files changed**: `App.tsx` v3.8.0 → v3.9.0, `StatusScreen.tsx` v3.8.0 → v3.9.0, `SettingsScreen.tsx` v3.7.3 → v3.8.0.
* **Outcome**: Household name and pet list changes on Device A reflect on StatusScreen instantly after Settings closes. Device B sees changes on next natural load.

---

### 5 March 2026

* **Milestone**: I6 Fixed — Android Safe Area on StatusScreen.
* **Problem**: The header (menu button, logo, notification bell) rendered under the Android system status bar. `SafeAreaView` from React Native does not apply a top inset on Android, so the content was not cleared.
* **Action**: Replaced all outer `SafeAreaView` instances in `StatusScreen.tsx` (main screen, loading screen, and history modal) with plain `View` components. Applied `paddingTop: insets.top` inline via the `useSafeAreaInsets()` hook from `react-native-safe-area-context`.
* **Action**: Added `<SafeAreaProvider>` as the outermost wrapper in `App.tsx` — this is a required peer for `useSafeAreaInsets()` to function. Without it the app crashes with "No safe area value available."
* **Action**: Removed `SafeAreaView` from the `StatusScreen.tsx` React Native import block (now unused).
* **Architectural Rule**: Any screen using `useSafeAreaInsets()` requires `<SafeAreaProvider>` as an ancestor in the component tree. Add it once at the root of `App.tsx` — all screens then have access without further setup. `SafeAreaView` and `useSafeAreaInsets` are not interchangeable — `SafeAreaView` does not apply the Android status bar inset reliably; the hook does.
* **Files changed**: `App.tsx` v3.9.0 → v3.10.0, `StatusScreen.tsx` v3.9.0 → v3.10.0.
* **Verified**: Tested on real Android device, 5 March 2026.

* **Milestone**: Logo Centring and Size Fix (I10).
* **Problem**: The logo in the StatusScreen header was visually offset left of centre on both iOS and Android. Root cause: `logoContainer` used `marginLeft: -40` to compensate for the menu button, which is a fragile approximation that varies by screen width.
* **Action**: Changed `logoContainer` to use `position: 'absolute'` with `left: 0` and `right: 0`. The logo now centres on the true screen width regardless of button sizes on either side. Menu button and bell remain tappable — they sit above the absolutely positioned logo in the z-order.
* **Action**: Increased logo size from `height: 22.4 / width: 140` to `height: 26.4 / width: 165`, preserving the original aspect ratio (6.25:1).
* **Architectural Rule**: When centering a header title/logo between two action buttons, always use absolute positioning (`position: 'absolute', left: 0, right: 0`) rather than negative margins or flex offsets. Negative margins are screen-width-dependent and will drift on different devices.
* **Files changed**: `StatusScreen.tsx` v3.10.0 → v3.10.1.
* **Verified**: Tested on real iOS and Android devices, 5 March 2026.

* **Milestone**: Bug 11 + I13 Fixed — Onboarding Step Reorder & Invited User Guard.
* **Problem (I13)**: The onboarding flow collected the user's name before establishing household intent, which was inconsistent with the Figma design and created a confusing UX for both paths.
* **Problem (Bug 11)**: An invited user who arrived at `OnboardingFlow` after completing `AuthScreen` sign-up was presented with the welcome choice screen. If they tapped "Create Household" they ended up with a spurious extra household alongside the one they were invited to.
* **Root Cause (Bug 11)**: The pending user check only ran when a card was tapped (`handleModeSelection`), not on mount. The welcome screen rendered immediately while the user's `InvitationStatus` was still unknown.
* **Action (I13)**: Reordered steps for both paths — household intent (household name or invitation code) is now collected first; name is always the final step. Step type updated: `welcome → household/invite-code → name`. `handleHouseholdStepContinue` introduced as the intermediate handler advancing from household intent to name. Back navigation updated throughout.
* **Action (Bug 11)**: Added a mount-time `useEffect` in `OnboardingFlow` that calls `getUserByEmail` immediately on render. If `InvitationStatus === 'Pending'`, it calls `getHouseholdsForUser` to retrieve the household name, sets `invitedHouseholdName` state, forces `mode = 'member'`, and navigates directly to `invite-code` — all before the welcome screen is visible.
* **Action**: Added `checkingInvite` boolean state (starts `true`). A full-screen `ActivityIndicator` is shown while the mount check runs, preventing any flash of the welcome screen before the redirect fires.
* **Action**: Personalised subtitle on invite-code screen: *"You've been invited to join [HouseholdName] — enter your code to continue."* Back button hidden for hard-routed invited users.
* **Action**: Invalid invitation code entered at the name step bounces the user back to `invite-code` with a clear error message rather than failing silently on the final screen.
* **Architectural Rule**: Any onboarding flow that has conditional routing based on user state must perform that check at mount time, not on user interaction. Interaction-time checks create a race condition where the UI renders before the check resolves.
* **Files changed**: `OnboardingFlow.tsx` v4.0.0 → v5.1.0.
* **Verified**: Verified on device, 5 March 2026.

* **Milestone**: Project Focus Shift — App Store Readiness.
* **Decision**: After a meeting between Jarques and Dan, the project focus shifted from general bug fixes to a prioritised App Store readiness list. Items are fixed in the agreed order and not reordered. Priority list: (1) Android real-time sync, (2) Native push notifications, (3) Ask to feed targeting, (4) Reminders, (5) Notification toggle per member, (6) T&C, (7) How to section, (8) Support/feedback link, (9) Supabase RLS, (10) View History padding fix.

---

### 5 March 2026 — Evening Session

* **Milestone**: App Store Priority #3 — "Ask to Feed" Now Targets a Specific Member Only.
* **Problem**: The "Ask member to feed" notification broadcast to every member of the household. The sender selected a specific person to ask, but all household members received and could see the notification — creating noise and removing the sense of personal accountability.
* **Architecture Decision**: Added `target_user_id` and `sender_user_id` as nullable UUID columns to the `notifications` table. A visibility filter was applied in `getAllNotifications` and `getUnreadNotificationsCount` so that `feed_request` notifications are only visible to the sender and the specific target member. All other notification types remain household-wide and are unaffected.
* **Action**: SQL migration run in Supabase Dashboard adding `target_user_id UUID` and `sender_user_id UUID` nullable columns to the `notifications` table.
* **Action**: `types.ts` updated to v1.2.0 — `TargetUserID` and `SenderUserID` optional fields added to the `Notification` interface.
* **Action**: `database.ts` updated to v4.2.0 — `mapNotification` updated to map the two new fields; `addNotification` updated to accept and persist `targetUserId` and `senderUserId`; `getAllNotifications` and `getUnreadNotificationsCount` updated with a consistent visibility filter: for `feed_request` type, only return the notification if the current user is the sender or the target.
* **Action**: `SettingsScreen.tsx` updated to v3.9.0 — `addNotification` call now passes `targetUserId` (the selected member's UserID) and `senderUserId` (the current user's UserID).
* **Architectural Rule**: The visibility filter for targeted notifications must be applied consistently in both `getAllNotifications` and `getUnreadNotificationsCount`. If one is updated, the other must be updated too — failure to keep them in sync causes the badge count and the panel to show different numbers (same rule as the join-date filter).
* **Files changed**: `types.ts` v1.2.0, `database.ts` v4.2.0, `SettingsScreen.tsx` v3.8.0 → v3.9.0. SQL migration applied to Supabase.

---

### 8 March 2026

* **Milestone**: App Store Priority #8 — "Give your feedback" link added to Settings footer.
* **Action**: Replaced the plain static `feedback@ifedthepet.app` text in the Settings footer with a tappable `TouchableOpacity` that calls `Linking.openURL('mailto:feedback@ifedthepet.app')`. The link is underlined to signal interactivity. Jarques refined the layout — both the Version number and the feedback link now sit inside the same `versionContainer` block rather than two separate containers. `Linking` was already imported — no new dependencies.
* **Files changed**: `SettingsScreen.tsx` v3.9.0 → v3.10.0.

* **Milestone**: App Store Priority #10 — Feed History Modal Redesigned to Match Dan's Figma.
* **Problem**: The history modal used a two-column `flexDirection: 'row'` layout — time + "Fed by" on the left, pet names + time ago on the right. `modalHistoryItemRight` had no `flex` or `maxWidth` constraint, so with many pets (8+) the right column expanded greedily, collapsing the left column and producing a broken multi-line block with missing time and "Fed by" text.
* **Action**: Replaced the two-column row layout with a single-column card per event, matching Dan's Figma design. Each card contains: (1) top row — time bold-left + time ago right, using `flexDirection: 'row'` + `justifyContent: 'space-between'`; (2) pet names below, left-aligned, wrapping freely with no constraints; (3) "Fed by [name]" at the bottom in small tertiary colour. Border-bottom dividers replaced with card `marginBottom` gap. Cards have `borderRadius: 12`, `backgroundColor: theme.surface`, and shadow/elevation.
* **Action**: Modal title updated from "Feeding History" to "Feed History" to match Dan's design. "Last 30 days" subtitle added below the title.
* **Files changed**: `StatusScreen.tsx` v3.10.1 → v3.10.2.
* **Verified**: Tested on iOS (iPhone 16 Pro) and Android simultaneously, 8 March 2026.

* **Milestone**: iOS History Card Shadow Fix.
* **Problem**: On iOS (iPhone 16 Pro), the Feed History cards were barely distinguishable from the background — the shadow was almost invisible. On Android, `elevation: 2` produced clean, visible card separation. The discrepancy was caused by `shadowOpacity: 0.05` being too subtle when the card `backgroundColor` (`theme.surface`) is close to the screen `backgroundColor` (`theme.background`).
* **Action**: Strengthened iOS shadow: `shadowOffset: { width: 1, height: 1 }`, `shadowOpacity: 0.15`, `shadowRadius: 1`. Added an iOS-only hairline border via `Platform.select({ ios: { borderWidth: 0.4, borderColor: 'rgba(0,0,0,0.1)' } })` to give cards visual definition independent of shadow contrast. `Platform` was already imported — no new dependencies. Android `elevation` unchanged.
* **Files changed**: `StatusScreen.tsx` v3.10.2 → v3.10.3.
* **Verified**: Jarques fine-tuned shadow values on device. Confirmed cards visually distinct on iOS and Android.

* **Milestone**: Invitation Code Merged into Household Card.
* **Problem**: The Invitation Code sat as a separate standalone card below the Household card, visually disconnected from the household it belonged to. The pattern was inconsistent with the Account card which groups related rows (name, email, Sign Out) inside a single card.
* **Action**: Removed the standalone `inviteCodeCard` container. Moved the Invitation Code content (label, code text, Copy button) inside the Household `card` View, separated by a `divider`. `isMainMember && household` guard preserved — non-main members see the Household card without the invite code row. `inviteCodeCard` style removed; replaced with `inviteCodeInner` (padding only — the parent card provides borderRadius and backgroundColor).
* **Architectural Rule**: Related settings that belong to the same entity (household name, switcher, invite code) should be grouped in a single card. Use `divider` rows to separate logical sub-sections within a card, consistent with the Account card pattern.
* **Files changed**: `SettingsScreen.tsx` v3.10.0 → v3.11.0.

---

### 9 March 2026

* **Milestone**: Bug 14 Fixed — Feed Button Flicker / Own-Device Real-Time Echo Eliminated.
* **Problem**: When a user tapped the "I FED THE PET" button, the status card instantly showed the new time (optimistic update ✅), then briefly reverted to the previous time for ~0.5s on iPhone and ~1s+ on Android, before snapping back to the correct time. Affected own device only — other devices always received updates correctly.
* **Root Cause — Evolution of the fix**: Three iterations were required to isolate the true root cause.
  * **v3.10.4 attempt**: `suppressNextRealtimeLoad` (boolean) was moved to before the Supabase write. This helped partially but did not fully resolve the issue because the boolean was being cleared on the first broadcast while subsequent broadcasts still triggered `loadData()`.
  * **v3.10.5 attempt**: Changed `suppressNextRealtimeLoad` from a boolean to a counter (`useRef(0)`), set to `petsToFeed.length + 1` (N pets broadcasts + 1 feeding_events broadcast). This fixed own-device flicker but broke cross-device updates — the `finally` block reset the counter to 0 immediately after writes completed, before broadcasts arrived over the network. Broadcasts from Device B were then also suppressed if they arrived during the window between the write completing and the counter naturally decrementing.
  * **v3.10.6 attempt**: Removed the `finally` reset and added a 5-second safety timeout instead. Channel names in `subscribeToHouseholdChanges` were also made unique per household (`status:pets:${householdId}`, `status:feeding_events:${householdId}`) to prevent channel object reuse across household switches. Cross-device updates were partially restored but timing edge cases remained.
  * **v3.10.7 — final fix**: Replaced the entire counter approach with a **timestamp-based suppression window** (`suppressUntilRef`). No broadcast counting required. No timer infrastructure.
* **Architecture Decision — Timestamp Suppression Window**: `suppressUntilRef` is a `useRef<number>(0)`. When `handleFeedClick` or `handleUndo` begins, it is set to `Date.now() + 3000`. The subscription callback checks `if (Date.now() < suppressUntilRef.current) return` — any broadcast arriving within 3 seconds of the write is treated as an own-device echo and skipped. Broadcasts from other devices arrive after the 3-second window and call `loadData()` normally. On rollback (network error), `suppressUntilRef.current` is reset to `0` immediately — no broadcasts will arrive for a failed write.
* **Why this is better than the counter**: The counter required knowing exactly how many broadcasts a feed operation would generate (N pets + 1 feeding_events = N+1). This count is fragile — it changes with schema, subscription setup, and Supabase behaviour. The timestamp window makes no assumptions about broadcast count and is immune to missed or extra broadcasts.
* **Architectural Rule — Timestamp Suppression Pattern**: For optimistic UI operations that trigger real-time broadcasts, use a timestamp window ref rather than a counter. Set `suppressUntilRef.current = Date.now() + 3000` before the write. In the subscription callback: `if (Date.now() < suppressUntilRef.current) return`. Clear to `0` on rollback only. The 3-second window safely covers all Supabase round-trip latencies on any realistic mobile network while allowing cross-device updates to pass through cleanly.
* **Architectural Rule — Supabase channel name uniqueness**: All channels in `subscribeToHouseholdChanges` must be scoped by household ID (e.g. `status:pets:${householdId}`). In Supabase JS v2, `supabase.channel(name)` returns the same object if the name is already registered — re-using a generic name like `'public:pets'` across household switches causes the cleanup `removeChannel()` to destroy a shared channel, leaving the new subscription dead.
* **Files changed**: `StatusScreen.tsx` v3.10.6 → v3.10.7. `database.ts` channel names already updated in v3.10.6 — no further change.
* **Verified**: Jarques tested on iPhone and Android simultaneously, 9 March 2026. No flicker on own device. Cross-device updates confirmed working.

### 10 March 2026 — Session 1 (Morning)

* **Milestone**: App Store Priority #4 + #5 — Feed Reminders Modal & Per-Member Reminder Toggle.
* **Design Decisions (confirmed with Dan's Figma flows)**:
  - Reminders are household-scoped — any member can create or delete a reminder; all reminders belong to the household, not to individual members.
  - Per-member opt-out controlled by the "Feed reminders" toggle in the Notifications card (`receives_reminders` on `user_households`). This is the sole on/off mechanism per member.
  - No per-reminder toggle — earlier Figma iterations showed one but it was removed from the agreed design.
  - Any household member can create and delete reminders (not admin-only).
  - Native platform time picker used on both platforms — no custom drum-roll.
  - `FeedRemindersModal` extracted as a separate file rather than inlined in SettingsScreen due to complexity.
* **Database**: New `reminders` table created in Supabase: `id` (uuid pk), `household_id` (uuid fk → households), `label` (text), `time` (text, stored as `"HH:mm"`), `created_at`. RLS enabled with four household-scoped policies (INSERT, SELECT, UPDATE, DELETE). Each policy checks membership via: `EXISTS (SELECT 1 FROM user_households WHERE household_id = reminders.household_id AND user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()))`. Confirmed working — reminders CRUD fully operational. `user_households.receives_reminders` boolean column was already present.
* **Action**: Replaced all legacy AsyncStorage-backed reminder functions in `database.ts` with Supabase equivalents. Functions removed: `getAllFeedReminders`, `saveAllFeedReminders`, `updateFeedReminder` (no longer needed — reminders are deleted and re-created, not edited). Functions rewritten: `getFeedRemindersByHouseholdId`, `addFeedReminder`, `deleteFeedReminder`. New functions added: `setReceivesReminders(userId, householdId, value)`, `getReceivesReminders(userId, householdId)`. New mapper: `mapFeedReminder`. Unused `FEED_REMINDERS` storage key removed.
* **Action**: Created `FeedRemindersModal.tsx` v1.0.0. Full-screen modal with: empty state ("No reminders yet" + "Create your first reminder" button); add form (label `TextInput` + time display field that opens native `DateTimePicker`); iOS inline spinner with Cancel/Apply buttons; Android system dialog picker; reminder list (label + time + red trash icon per card); native `Alert.alert` delete confirmation; `isAdding` guard prevents double-submit. Reminders sorted by `time` ASC (server-side, via `.order('time', { ascending: true })`).
* **Action**: Updated `SettingsScreen.tsx` v3.12.0: added "Feed reminders" as a third toggle row in the Notifications card (greyed/disabled on Free tier via `opacity: 0.4`; active on Pro via `handleRemindersToggle`); `handleRemindersToggle` uses pessimistic UI — awaits Supabase confirmation before updating state (same pattern as Pro toggle); `receivesReminders` loaded from `user_households` via `getReceivesReminders()` on `loadData()` and written into cache; `SettingsScreenCache` interface updated; Reminders section row now opens `FeedRemindersModal` (replacing the "Coming Soon" stub).
* **Action**: Updated `types.ts` v1.3.0: `remindersEnabled` added to `NotificationPreferences`; `FeedReminder` interface updated to match Supabase shape — `IsActive` removed, `DateUpdated` removed, `Title` renamed to `Label`.
* **Dependency added**: `@react-native-community/datetimepicker` — install via `npx expo install @react-native-community/datetimepicker`.
* **Architectural Rule — Pessimistic UI for reminders toggle**: The "Feed reminders" toggle uses pessimistic UI — awaits Supabase confirmation before updating state. Rationale: preference changes must be correct before reflecting in UI, consistent with the Pro toggle pattern.
* **Architectural Rule — Reminder opt-out scope**: `receives_reminders` on `user_households` is the sole per-member opt-out for reminders. There is no per-reminder toggle. OS-level notification scheduling (the actual alarm when the phone is locked) is not yet wired — requires `expo-notifications` and will be implemented alongside #2 (EAS Build). The Supabase persistence layer and modal UI are complete.
* **Files changed**: `types.ts` v1.3.0, `database.ts` v4.3.0, `SettingsScreen.tsx` v3.12.0, NEW `FeedRemindersModal.tsx` v1.0.0.
* **Milestone**: Reminder Notification Architecture Designed — pg_cron + Edge Function.
* **Action**: Enabled `pg_cron` and `pg_net` extensions in Supabase Dashboard → Database → Extensions. These are prerequisites for server-side reminder scheduling.
* **Architecture Decision — Server-side reminder scheduling**: Reminders fire via a `process-reminders` Supabase Edge Function invoked by `pg_cron` every minute. The Edge Function queries `reminders` for rows where `time = HH:mm UTC`, then for each matching reminder inserts one `reminder` type notification per household member where `receives_reminders = true`, with `target_user_id` set to that member's user_id. The existing real-time subscription on `notifications` handles the bell badge + chime client-side — no polling. This architecture is forward-compatible with native push notifications (Phase B) — the push call slots into the same Edge Function alongside the DB insert.
* **Action**: `supabase/functions/process-reminders/index.ts` v1.0.0 created. `supabase/functions/process-reminders/deno.json` created. `supabase/config.toml` updated with `[functions.process-reminders]` block. `types.ts` bumped to v1.3.1 — `'reminder'` added to Notification type union. Edge Function not yet deployed — deploy next.
* **Architectural Rule — Timezone**: Reminder times are stored and matched as `HH:mm` text in UTC. Users in non-UTC timezones will see reminders fire at the wrong local time until timezone offset handling is added. This is tracked as D12 in the Handoff.
* **Note — visibility filter**: The `reminder` notification type sets `target_user_id` per eligible member, so the existing `target_user_id`-based visibility filter in `getAllNotifications` and `getUnreadNotificationsCount` handles it correctly without type-specific code changes.

### 10 March 2026 — Session 2 (Afternoon - Evening)

* **Milestone**: `process-reminders` Edge Function Deployed & Verified End-to-End.
* **Problem**: The `process-reminders` Edge Function had been deployed (2 deployments visible in Supabase Dashboard) but the pg_cron job was failing every minute with `ERROR: unrecognized configuration parameter "app.service_role_key"`. The cron schedule SQL used `current_setting('app.service_role_key')` to retrieve the service role key — but this database configuration parameter had never been set. The `SET app.service_role_key` step documented in The Handoff was skipped when the cron job was originally scheduled.
* **Secondary Problem**: When the cron command was updated with a key, the wrong key type was used — a Supabase secret (`sb_secret_` prefix) rather than the service role JWT (`eyJ...` prefix). This produced 401 Unauthorized responses from the Edge Function, confirmed via the Invocations log in the Supabase Dashboard.
* **Root Cause Summary**: Two compounding errors — (1) `current_setting('app.service_role_key')` is not a supported Supabase database parameter; (2) the service role key is a JWT found at Dashboard → Project Settings → API → `service_role`, not a Supabase secret.
* **Action**: Unscheduled the broken cron job via `SELECT cron.unschedule('process-reminders-every-minute')`. Rescheduled with the service role JWT hardcoded directly in the `net.http_post` headers jsonb.
* **Architectural Rule — pg_cron auth pattern**: The service role JWT must be hardcoded directly in the `net.http_post` headers in the cron schedule command. `current_setting('app.service_role_key')` does NOT work — Supabase does not support that database configuration parameter. The JWT is found at Dashboard → Project Settings → API → `service_role`. It begins with `eyJ...` and is distinct from Supabase secrets (`sb_secret_` prefix). Remember to rotate the hardcoded JWT when rotating the service role key (D6).
* **Verified**: `cron.job_run_details` confirmed `status = succeeded`. Test reminder inserted for current UTC minute — `reminder` type notification appeared in the `notifications` table and pushed to device via the existing real-time subscription. Bell badge updated and chime played on Expo Go. Full pipeline confirmed: pg_cron → Edge Function → Supabase notifications table → real-time subscription → bell + chime on device.
* **Debt added**: D13 — pg_cron service role JWT hardcoded in cron job SQL — rotate when rotating D6 (service role key rotation).
* **Files changed**: No code changes. Supabase cron job rescheduled only.

### 10 March 2026 — Session 3 (Evening)

* **Milestone**: App Store Priority #5 — "Feed Reminders" Toggle Now Persists Correctly.
* **Problem**: The "Feed reminders" toggle in the Notifications card of `SettingsScreen` appeared to save — it updated visually on tap — but reverted to its previous state on every reload. No error was thrown. `handleRemindersToggle` returned `success = true` despite nothing being written to the database.
* **Root Cause**: `setReceivesReminders` in `database.ts` called `.update({ receives_reminders: value }).eq('user_id', userId).eq('household_id', householdId)` on the `user_households` table. RLS was active but no UPDATE policy existed that allowed a **member to update their own row**. The existing UPDATE policy only covered the admin-deletes-member scenario (added 3 March 2026). Supabase silently returned 0 rows affected with no error — so `success` came back `true`, the optimistic UI stuck, but the value was never written to the database.
* **Diagnosis pattern**: Toggle reverts on reload + no error logged + `success = true` = silent RLS UPDATE failure. This is the same class of bug as the Pro Toggle footgun documented in the Categorised Debt section.
* **Action**: Added a new RLS UPDATE policy to the `user_households` table in Supabase Dashboard:
  ```sql
  CREATE POLICY "Members can update their own user_households row"
  ON user_households
  FOR UPDATE
  USING (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
  ```
* **No code changes** — `SettingsScreen.tsx` and `database.ts` were correct. The fix was entirely a Supabase RLS policy addition.
* **Architectural Rule**: Any column a member needs to update on their own `user_households` row requires a dedicated RLS UPDATE policy scoped via `users.auth_user_id = auth.uid()`. A policy covering admin-deletes-member does not cover member-updates-own-row — these are separate policies. Silent 0-row updates with no error are the signature of a missing UPDATE RLS policy.
* **Verified**: Toggle persists correctly across reloads. Verified on device, 10 March 2026.
* **Files changed**: No code files. Supabase RLS policy added to `user_households` table.

### 11 March 2026

* **Milestone**: Global Modal Header Consistency Fix.
* **Problem**: `SettingsScreen.tsx` and `FeedRemindersModal.tsx` had near-identical but duplicated modal header stylesheet classes. The close button (X) rendered on the left in both files. The heading text was not perfectly centred.
* **Architecture Shift**: Introduced `src/styles/globalStyles.ts` as the first shared style module in the project. Established the pattern that shared cross-screen styles live here rather than being duplicated per file.
* **Action**: Created `globalStyles.ts` v1.0.0 — exports `modalHeaderStyles` with a three-column row layout: `modalHeaderSpacer` (32px balancing weight, left), `modalTitle` (flex 1, centred, semibold), `modalCloseButton` (right). Padding and borders intentionally excluded — each call site applies its own.
* **Action**: Updated `FeedRemindersModal.tsx` v1.0.0 → v1.1.0. Removed local `header`, `headerTitle`, `closeButton` styles (13 lines). Added spacer View before title. Imported and applied `modalHeaderStyles`.
* **Action**: Updated `SettingsScreen.tsx` v3.12.0 → v3.13.0. Removed local `modalHeader`, `modalCloseButton`, `modalTitle` styles (9 lines). Applied `modalHeaderStyles` to all three modal headers (Invite Member, Add Pet, Select Household). Fixed Settings main screen header — JSX reordered from `[X][Settings][spacer]` to `[spacer][Settings][X]`, no stylesheet changes needed.
* **Architectural Rule**: When two or more screens share structural UI patterns, extract to `globalStyles.ts`. Never duplicate — drift between call sites is the risk.
* **Verified**: iOS (11 Mar). Android (13 Mar). Fully verified on both platforms.
* **Files changed**: `src/styles/globalStyles.ts` (new, v1.0.0), `FeedRemindersModal.tsx` (v1.1.0), `SettingsScreen.tsx` (v3.13.0).

### 12 March 2026

**Milestone: #6 T&C — LegalModal built and verified (iOS + Android)**
* **Action**: Created `LegalModal.tsx` (new file) — a `pageSheet` modal reusing `modalHeaderStyles` from `globalStyles.ts`. Tapping "Privacy Policy" or "Terms of Service" in the Settings Legal card opens the modal with the relevant page loaded via `react-native-webview`.
* **URLs**: Privacy Policy → `https://ifedthepet.app/privacy-policy.html` · Terms of Service → `https://ifedthepet.app/terms-of-service.html`
* **Dependency**: `react-native-webview` installed via `npx expo install react-native-webview` (SDK 54 compatible).
* **iOS Bug Found & Fixed**: `onLoadStart` fires multiple times on iOS (once per sub-resource/redirect). Each call was resetting `loading: true`, but `onLoad` only fires once — leaving the spinner permanently visible after the content appeared. Fixed by removing `onLoadStart` and replacing `onLoad` with `onLoadEnd`. Android was unaffected.
* **Final simplification**: Custom loading spinner and error state removed entirely. The native WebView handles its own loading presentation on both platforms. Component reduced to modal shell + header + `WebView` only.
* **File versions**: `LegalModal.tsx` v2.2.0 (new file, iterated v1.0.0 → v2.2.0 in session). `SettingsScreen.tsx` unchanged at v3.13.0.
* **Pattern note**: `react-native-webview` confirmed working in Expo Go on iOS and Android — no native build required. Verified by Jarques, 13 March 2026.

---

### 13 March 2026 (evening)

**Milestone: #14 Feed Reminders redesign — admin-only write, per-reminder household mute**
* **Architecture Shift**: Per-member reminder opt-out (`receives_reminders` on `user_households`) replaced by a per-reminder `enabled` flag (`reminders.enabled` in Supabase). Toggling a reminder off mutes it for the whole household. Admin-only enforcement via Supabase RLS UPDATE policy.
* **Actions:**
  - `reminders` table: added `enabled boolean NOT NULL DEFAULT true` column (SQL migration run manually in Supabase dashboard).
  - RLS UPDATE policy added to `reminders`: only `is_main_member = true` users can update (enforced via `user_households` + `users` join on `auth.uid()`).
  - `FeedRemindersModal.tsx` v2.1.0: `isAdmin` prop added. Admin sees create/delete/toggle; non-admins see read-only view with greyed-out Switch. Custom animated `Switch` (from `src/components/Switch.tsx` via `globalStyles.ts` re-export) replaces native RN Switch. `handleToggleEnabled` uses optimistic update + rollback pattern.
  - `SettingsScreen.tsx` v3.15.0: `receives_reminders` toggle removed from Notifications card entirely; `isAdmin={isMainMember}` passed to `FeedRemindersModal`.
  - `database.ts` v4.4.0: `setReminderEnabled(reminderId, enabled)` added (updates `reminders.enabled`); `setReceivesReminders` and `getReceivesReminders` removed.
  - `types.ts` v1.4.0: `FeedReminder.Enabled: boolean` added; `remindersEnabled` removed from `NotificationPreferences` interface.
  - `process-reminders` Edge Function v1.1.0: `.eq('enabled', true)` added to reminder query; `receives_reminders` filter removed from members query — all household members now receive reminder notifications.
  - `globalStyles.ts` v1.1.0: re-exports `Switch` from `src/components/Switch.tsx` as a shared convenience import.
* **Debt added**: D14 — `receives_reminders` column on `user_households` now unused. D15 — RLS INSERT/DELETE on `reminders` still allows any household member (should be admin-only).
* **Verified**: Jarques + Dan, 13 March 2026.

---

### Categorized Debt & Ghost Logic

**1. Row Level Security (RLS) Silent Failure Vulnerabilities (Critical Security Debt)**
* **The Issue**: RLS policies were initially disabled to unblock development. During this time, a footgun was discovered where omitting `.select().single()` on an `.update()` call masked silent update failures if the target table lacked an explicit `UPDATE` RLS policy. 
* **The Risk**: Anyone with the anon key currently has unrestricted read/write access. Once `auth.uid()` checks are re-enabled, developers must strictly adhere to the `.update().eq().select().single()` pattern to actively catch and handle RLS-driven write rejections rather than silently failing and leaving the UI out of sync with the database.

**2. Asymmetric Update Patterns: Optimistic vs. Pessimistic (Architectural Rule)**
* **The Decision**: The feeding flow (`StatusScreen`) utilizes a purely Optimistic Update pattern to ensure 0ms latency. In contrast, sensitive tier-gating functions like the Pro Toggle (`SettingsScreen`) utilize a Pessimistic pattern, awaiting database confirmation before altering the UI.
* **The Risk**: Developers might accidentally implement Optimistic UI on sensitive backend states (like subscription tiers or auth), allowing users to momentarily bypass paywalls or security gates before the network rolls the state back.

**3. React Native Touch Interception Hierarchy (UI/UX Debt)**
* **The Issue**: Nested interactive elements (like `Switch` components inside `TouchableOpacity` wrappers) silently absorb touch events, rendering the child component unresponsive, specifically on Android.
* **The Risk**: As new UI rows are added to Settings or other screens, developers must use standard `View` containers rather than clickable rows when placing discrete interactive elements inside them.

**4. Real-Time Echo Suppression (Architectural Rule)**
* **The Decision**: Established a timestamp-based suppression window pattern (`suppressUntilRef`) to prevent UI jitter on own-device optimistic updates. When a device performs an optimistic update, `suppressUntilRef.current` is set to `Date.now() + 3000`. The subscription callback skips `loadData()` while `Date.now() < suppressUntilRef.current`. Broadcasts from other devices arrive after the 3-second window and are never blocked. See 9 March 2026 entry for full evolution history.
* **The Risk**: Future developers adding real-time listeners to new screens must implement this suppression pattern, otherwise the app will re-fetch data and cause UI flickering immediately after user interactions. Do not use a boolean or counter — use the timestamp window approach.

**5. Optimistic Update Offline Queue (State Management Debt)**
* **The Issue**: The Optimistic UI implementation successfully hides network latency. If the background Supabase sync fails, it correctly rolls back the state.
* **The Risk**: If a user feeds the pet while in a true offline state (or closes the app before the sync resolves), the transaction will fail and roll back. The app currently lacks a local SQLite or AsyncStorage queue to store and retry failed optimistic writes upon reconnecting.

**6. Null-Value Mapping Vulnerability (Architectural Rule)**
* **The Decision**: Established a strict rule to map partial database updates using `if (updates.Field !== undefined)` rather than generic truthy checks (`if (updates.Field)`).
* **The Risk**: If future developers revert to truthy checks, any action meant to clear a field (like passing `null` to `LastFedDateTime` during an undo operation) will be silently stripped out of the payload, corrupting database states.

**7. Email Verification Bypassed (Security/Auth Debt)**
* **The Issue**: "Confirm email" was disabled in the Supabase Dashboard to unblock local Expo Go development.
* **The Risk**: New accounts are created instantly without validating email ownership. This must be turned back on before any production launch to prevent spam accounts and ensure credential recovery.

**8. Expo Go Deep Linking Limitations (Infrastructure Debt)**
* **The Issue**: Expo Go cannot interpret the custom URL scheme (`com.djeasoft.ifedthepet://`) used for Supabase Auth redirects.
* **The Risk**: The project is outgrowing Expo Go. The environment must be migrated to a native development build (`npx expo run:ios`/`android`) to test full deep linking, auth callbacks, and future push notifications.

**9. Three-Gate Routing Architecture (Architectural Decision)**
* **The Decision**: Established a strict sequential routing order in `AppRouter`: Gate 1 (`!isAuthenticated || !isEmailVerified`) routes to `AuthScreen`. Gate 2 (`!onboardingComplete`) routes to `OnboardingFlow`. Gate 3 routes to the main app (`StatusScreen`).
* **The Risk**: This logic relies on `is_onboarding_completed` from Supabase and explicit check-before-create patterns to prevent duplicate keys during onboarding interruptions.

**10. ~~Stubbed Notification Logic~~ (RESOLVED — 27 February 2026)**
* **Resolution**: The "Ask member to feed" button now inserts a real `feed_request` notification into the Supabase `notifications` table via `addNotification()`. All household members see it in `NotificationsPanel`. Real-time subscription on the `notifications` table updates the bell badge and plays a sound on other devices.

**11. Legacy AsyncStorage Cleanup & Drift (Structural Debt)**
* **The Issue**: A massive purge removed 8 legacy bulk functions (`getAllUsers`, etc.). 
* **The Risk**: As more systems move entirely to the cloud, developers must remain vigilant against adding new features that rely heavily on persistent AsyncStorage beyond the established patterns of temporary cache arrays, session tokens, and system preferences.

**12. Client-Side Query Merging vs. SQL Joins (Architectural Decision)**
* **The Decision**: Due to syntax issues and silent failures with Supabase JS's PostgREST left-joins on the `notification_reads` table, the query was simplified into two separate network calls (fetch notifications, fetch reads) that are merged on the client side.
* **The Risk**: As the number of notifications grows, client-side merging will consume more device memory and processing power. A dedicated Supabase RPC (Remote Procedure Call) or database view should eventually be written to handle the join on the server.

**13. Incomplete Tenant Scoping (Scalability Debt)**
* **The Issue**: While `NotificationsPanel` successfully transitioned to support cross-household visibility, other data models (like feeding histories or pet profiles) might still be lacking strict household scoping. 
* **The Risk**: If a user is a member of two households, the app needs airtight logic to prevent cross-contamination of feeding events.

**14. The "Leave Household" Cleanup (Logic Debt)**
* **The Issue**: A `deleteNotificationsByHouseholdId()` function was created as a placeholder for when a user leaves a household.
* **The Risk**: The actual UI and backend logic for a user gracefully exiting a household (or being kicked out) has not been fully mapped or implemented. This will cause data orphans if not resolved before launch.

**15. Multi-Tenant Identity Architecture (Architectural Decision)**
* **The Decision**: Validated that one email address equals one unique user record. Users can belong to multiple households via the `user_households` junction table. 
* **The Risk**: This must be strictly enforced. The database throws `23505` unique constraint errors if the app attempts to create duplicate user records instead of linking existing ones to new households.

**16. Undo Window & Subscription Enforcement (Architectural Decision)**
* **The Decision**: A 2-minute undo window was established for the feeding flow, tracked via an `undo_deadline` timestamp, and Pro subscriptions were scoped strictly to the Household level (`households.is_pro`).
* **The Risk**: If the undo window is only validated on the client side, users with skewed device clocks could bypass the restriction. Additionally, household-level subscription tier limits must be strictly enforced on the server side via Supabase functions or RLS policies, rather than solely hidden in the React Native UI.

**17. ~~Feed Request Household-Wide Broadcast~~ (RESOLVED — 5 March 2026)**
* **Resolution**: `feed_request` notifications now target a specific member only. `target_user_id` and `sender_user_id` columns added to `notifications` table. Visibility filter applied in `getAllNotifications` and `getUnreadNotificationsCount` — only the sender and target see the notification. Per-pet targeting (which pet needs feeding) remains a future enhancement.

**18. Supabase Replication Must Be Explicitly Enabled Per Table (Infrastructure Rule)**
* **The Decision**: Supabase real-time subscriptions (`supabase.channel().on('postgres_changes', ...)`) only fire if the target table is added to the `supabase_realtime` publication in the Supabase Dashboard → Database → Replication.
* **The Risk**: This is a silent failure. No errors are thrown, no logs are emitted — the subscription simply never fires. Any new table that needs real-time subscriptions must be added to the publication before the subscription code will work. Currently enabled tables: `pets`, `feeding_events`, `households`, `user_households`, `notifications`.

**19. ~~Invited User Onboarding Path Not Guarded~~ (RESOLVED — 5 March 2026)**
* **Resolution**: Mount-time `useEffect` in `OnboardingFlow` detects `InvitationStatus === 'Pending'` and hard-routes to `invite-code` before the welcome screen renders. `checkingInvite` spinner prevents any flash. Spurious extra household bug eliminated. `OnboardingFlow.tsx` v5.1.0.

**20. Self-Notification on Household Creation (UX Debt)**
* **The Issue**: When a user creates a new household, a `member_joined` or `household_created` notification is inserted and appears in their own NotificationsPanel and bell badge. The creator is notifying themselves of an action they just performed.
* **The Risk**: This is noise that could erode trust in the notification system. The fix is either to suppress the notification insert entirely for the creator, or to filter out notifications where `requested_by` equals the current user's ID in both `getAllNotifications` and `getUnreadNotificationsCount`.

**21. Self-Deletion / Account Deletion Required (Policy Debt)**
* **The Issue**: Both Apple App Store and Google Play Store require apps to provide a mechanism for users to delete their own account. Currently only main members can remove other members from a household — there is no self-deletion flow.
* **The Risk**: App will be rejected at review without this feature. Full account deletion requires removing the auth record, the `users` row, all `user_households` links, and handling the edge case where the user is the main member of a household (transfer or dissolve the household first).
* **When to fix**: Before launch.

**22. Native Push Notifications — EAS Build Required (Infrastructure Debt)**
* **The Decision**: Push notifications (#2 on App Store Priority List) cannot be implemented or tested in Expo Go. Expo Go is a shared Expo-owned app — Apple (APNs) and Google (FCM) will not deliver notifications to an app they don't recognise as yours.
* **The Path Forward**: Expo EAS Build is a cloud-based build service that produces a real signed app bundle from Windows 11 — no Mac required. iOS: distribute via TestFlight for testing. Android: distribute via Google Play Internal Testing track.
* **Why deferred**: EAS Build requires a dedicated setup session (Apple Developer account, EAS CLI, build configuration). All Expo Go-compatible items on the App Store Priority List will be completed first.
* **The Risk**: Until a real build exists, push notifications (lock screen alerts triggered by other household members' actions) cannot be delivered. In-app real-time bells via Supabase WebSocket subscriptions remain the fallback for foreground notifications.

---