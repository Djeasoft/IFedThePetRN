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

## Unresolved Technical Debt & Architectural Decisions

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
* **The Decision**: Established a pattern using `useRef(suppressNextRealtimeLoad)` to prevent UI jitter. When a device performs an optimistic update, this flag temporarily mutes the incoming Supabase WebSocket broadcast triggered by that exact same action.
* **The Risk**: Future developers adding real-time listeners to new screens must remember to implement this suppression ref, otherwise the app will needlessly re-fetch data and cause UI flickering immediately after user interactions.

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

**17. Feed Request Enhancement Backlog (Feature Debt)**
* **The Issue**: The "Ask member to feed" notification currently broadcasts to the entire household. It does not support targeting a specific member or selecting which pet(s) need feeding.
* **The Risk**: As the app scales, users may find household-wide broadcasts noisy. Per-member targeting and pet selection should be added in a future iteration. The `notifications` table already has `member_name` and `requested_by` columns to support this.

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