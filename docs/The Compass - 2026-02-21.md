# I Fed The Pet (IFTP) - Master Cognitive Timeline & Architecture Analysis

## Chronological Project Log

**22 January 2026**
* **Milestone**: Initial Database Architecture Brainstorming.
* **Architecture Shift**: Transitioned from a flat, single-user mental model to a multi-tenant relational model supporting shared pet custody. 

[Image of database entity relationship diagram]

* **Action**: Defined the core Entity Relationship Diagram (ERD), establishing a many-to-many relationship between Users and Households via a `HouseholdMember` or `UserHousehold` junction table.

**Late January 2026**
* **Milestone**: Figma AI Specification & ERD Revision.
* **Decision**: Formalized the ERD in Markdown for Dan to use with Figma AI.
* **Action**: Documented key design decisions including household-level Pro subscriptions, a 2-minute undo window tracked via an `UndoDeadline` field, and user invitation statuses (`Pending`/`Active`). Defined core logic for user registration, household management, and pet feeding in `database.ts`.

**28 January 2026, 09:00am**
* **Milestone**: App Prototype & Backend Strategy.
* **Architecture Shift**: Decided to evaluate Supabase as the backend to replace local storage, specifically to support the real-time syncing fundamental to a multi-user household app.
* **Action**: Transitioned from design validation to full-stack implementation after Dan successfully created a working UI prototype in Figma.

**31 January 2026, 15:30pm**
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

**21 February 2026, 1:53pm**
* **Milestone**: Auth Flow Hardening & Invalid Refresh Token Fix.
* **Problem**: An unhandled `AuthApiError: Invalid Refresh Token` caused a jarring UI flash when restoring a stale session.
* **Action**: Updated `AuthContext.tsx` to actively validate the session on startup via `getUser()` (which pings the server) instead of blindly trusting the local cache from `getSession()`.
* **Action**: Verified and permanently deleted the orphaned `OnboardingWelcomeScreen.tsx` dead code file.

**21 February 2026, 1:53pm**
* **Milestone**: Onboarding Flag Migration & Source of Truth Alignment.
* **Problem**: The `onboardingCompleted` flag was stored purely locally in `AsyncStorage` and was accidentally being wiped upon user sign-out, forcing returning users back through onboarding.
* **Architecture Shift**: Migrated the `is_onboarding_completed` flag directly into the Supabase `users` table via SQL, establishing the cloud as the source of truth to support multi-device syncing. 
* **Action**: Fixed an associated timing bug in `App.tsx` where the app briefly flashed the onboarding screen before evaluating the new cloud flag by setting `checkingOnboarding(true)` synchronously.

**21 February 2026, 1:53pm**
* **Milestone**: Notifications Database Migration & Cross-Household Scoping.
* **Problem**: The notification badge on `StatusScreen` persistently showed stale counts (e.g., "21") and `NotificationsPanel` hung on "Loading..." because notifications were still operating entirely on legacy local `AsyncStorage` data instead of Supabase.
* **Architecture Shift**: Migrated the entire notification system to Supabase. Created a `notifications` table (scoped to `household_id`) and a `notification_reads` junction table (tracking read state per user). 
* **Action**: Rewrote 7 core notification functions in `database.ts`. Simplified the data retrieval by replacing fragile PostgREST left-joins with two independent simple queries merged client-side. Implemented a `clearLegacyNotificationData()` function to explicitly wipe the stale `AsyncStorage` remnants causing the phantom "21" badge.

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

**10. Stubbed Notification Logic (Feature Debt)**
* **The Issue**: The "Ask member to feed" feature was visually integrated into the UI and gated for Pro users, but the button currently only fires a local `Alert.alert('Request Sent')`.
* **The Risk**: The actual server-side trigger and push notification delivery system via Supabase remains unimplemented. This UI facade will cause user frustration if not fully wired up to the backend notification tables.

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