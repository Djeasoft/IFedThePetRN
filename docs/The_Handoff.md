# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Friday, 13 March 2026
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — #2 Native push notifications is highest priority. StatusCard UI polish complete (v3.10.8). #14 Feed Reminders redesign fully complete and verified. #6 T&C fully complete and verified on Expo Go (iOS + Android).

---

> **HOW TO USE THIS DOCUMENT**
> This is the only document you read when returning to this project.
> Read it in under 60 seconds. Then open your IDE.
> At the end of each session, rewrite this file. Keep it to one page.
> Completed items move to The Compass as a milestone entry. This file never grows.

---

## 1. WHERE AM I?

**Phase A — COMPLETE. Focus shifted to App Store readiness.**

The app is live on Expo preview. Supabase backend fully operational.

What is verified and working:
- Email authentication (signup, login, session persistence)
- Three-gate routing: AuthScreen → OnboardingFlow → StatusScreen
- Onboarding flow (Create Household and Join Household paths)
- Cache-first loading with real-time subscriptions on StatusScreen and SettingsScreen
- Optimistic UI on feed button (0ms response, background Supabase sync)
- Feed button → Supabase write → feeding history display ✅
- Real-time sync: Device A feeds pet → Device B StatusScreen auto-updates ✅
- Cross-device notifications ✅
- 2-minute undo window
- Pro tier toggle (pessimistic UI — awaits DB confirmation)
- Timestamp-based own-device echo suppression (`suppressUntilRef` — 3s window) ✅ *(fixed 9 Mar)*
- Household-scoped notifications stored in Supabase
- Read/unread notification state persisted per user per household
- 30-day notification auto-cleanup
- Notification bell badge resets to zero after marking all read ✅
- Multi-household switching propagates to all screens ✅
- Settings screen shows current user name + email at top ✅
- "Ask member to feed" → real Supabase insert → target member only sees it ✅
- Real-time notification subscription → bell badge updates instantly on all devices ✅
- Bell chime sound plays on other devices when a notification arrives ✅
- `suppressNotificationSoundRef` prevents sender hearing own bell ✅
- Email invitations sending via Supabase Edge Function ✅
- Invite email contains invitation code and join instructions ✅
- Invited user signup no longer blocked by "User already registered" error ✅ *(fixed 28 Feb)*
- New members only see notifications from after their join date ✅ *(fixed 28 Feb)*
- Bell badge count matches NotificationsPanel count for new members ✅ *(fixed 28 Feb)*
- Duplicate member_joined notifications eliminated via loading guard ✅ *(fixed 28 Feb)*
- Pet checkboxes render in horizontal row on StatusScreen ✅ *(fixed 1 Mar)*
- Invite modal: name field removed, spinner on Send Invite, `isSendingInvite` guard ✅ *(fixed 3 Mar)*
- Spurious invite notification removed — no notification fired on invite send ✅ *(fixed 3 Mar)*
- Members sorted: main member first, then active, then pending (oldest joined first within tier) ✅ *(fixed 3 Mar)*
- Account section: pencil icon lets logged-in user rename themselves inline ✅ *(fixed 3 Mar)*
- Members section: pencil removed — admin can no longer rename other members ✅ *(fixed 3 Mar)*
- Member removal works: RLS policy fixed, member disappears from view instantly ✅ *(fixed 3 Mar)*
- Household name change in Settings updates StatusScreen instantly on Device A ✅ *(fixed 4 Mar)*
- Pet added/deleted in Settings updates StatusScreen checkboxes instantly on Device A ✅ *(fixed 4 Mar)*
- Android safe area fixed — header, logo, and bell clear the status bar correctly ✅ *(fixed 5 Mar)*
- Logo centred precisely in header on all screen widths, size increased ✅ *(fixed 5 Mar)*
- Onboarding step order swapped: household intent first, name last (both paths) ✅ *(fixed 5 Mar)*
- Invited users auto-routed to invite-code screen on OnboardingFlow mount ✅ *(fixed 5 Mar)*
- "Ask member to feed" targets specific member only ✅ *(fixed 5 Mar, evening)*
- "Give your feedback" tappable mailto link in Settings footer ✅ *(8 Mar)*
- Feed History modal redesigned: single-column cards, pet names wrap freely ✅ *(8 Mar)*
- Feed History card shadow fixed on iOS via Platform.select ✅ *(8 Mar)*
- Invitation Code merged into Household card ✅ *(8 Mar)*
- Feed reminders: `reminders` table in Supabase, `FeedRemindersModal` built, "Feed reminders" toggle in Notifications card (Pro only), `receives_reminders` per member ✅ *(10 Mar)*
- `pg_cron` and `pg_net` Supabase extensions enabled ✅ *(10 Mar)*
- `process-reminders` Edge Function deployed and verified — reminder notifications fire on device via Expo Go ✅ *(10 Mar)*
- pg_cron job scheduled every minute — confirmed `succeeded` status in `cron.job_run_details` ✅ *(10 Mar)*
- Privacy Policy and Terms of Service modals — `LegalModal.tsx` built, `react-native-webview` installed, content loads from live URLs ✅ *(12 Mar)*
- Global modal header style — `globalStyles.ts` v1.0.0, X right-aligned, title centred. Verified iOS + Android ✅ *(13 Mar)*
- Feed Reminders redesign (#14) — admin-only create/delete/toggle. Per-reminder `enabled` toggle (household-wide mute). Non-admins see read-only view. `reminders.enabled` column in Supabase. RLS UPDATE policy (admin only). `FeedRemindersModal.tsx` v2.1.0, `SettingsScreen.tsx` v3.15.0, `database.ts` v4.4.0, `types.ts` v1.4.0, `process-reminders` v1.1.0. Verified 13 Mar ✅
- Custom animated Switch in `FeedRemindersModal` — matches Settings screen toggles. `globalStyles.ts` v1.1.0 (re-exports `Switch` from `src/components/Switch.tsx`). Verified 13 Mar ✅
- StatusCard UI polish — `contentContainer` paddingHorizontal reduced 24→16; `maxWidth: 320` cap removed from `statusCard`, `petCheckboxContainer`, `historySection`, `upgradeSection`; `statusCard` + `petCheckboxContainer` shadow tightened (radius 8→4, opacity 0.1→0.08, elevation 4→2). `StatusScreen.tsx` v3.10.8 ✅ *(13 Mar)*

What is **not** working:
- Invite email link leads to blank page (deep linking not yet implemented — expected) ❌
- OS-level reminder scheduling (alarm when phone is locked) not yet wired — requires EAS Build + `expo-notifications` ❌

**Tested by:** Dan + Jamie (Henry) on 20 Feb via Expo Go. Real-time bell verified Jarques iPhone + Android, 27 Feb. Invite flow verified 27 Feb. Bug fixes verified 28 Feb. Android safe area + logo verified 5 Mar. Bug 11 + I13 verified 5 Mar. Feed History cards verified iOS + Android, 8 Mar. Feed button flicker fix verified 9 Mar. Reminders modal + reminder notifications verified on device (Expo Go), 10 Mar. Reminders toggle persistence verified (RLS fix), 10 Mar. LegalModal verified Android + iOS (iOS WebView onLoadStart bug fixed), 12 Mar. Modal header fix verified Android, 13 Mar. #14 Feed Reminders redesign (admin-only write, per-reminder enabled toggle) verified Jarques + Dan, 13 Mar.

**Testing**  
**Date:** 13 March 2026  
**Jarques + Dan**   

    1. Testing the fed big red, it works now that all devices do not flicker anymore

    2 Feed Reminders

        2.1 Model screen is working, it shows
        2.2 Notification for Feed reminders the cron job is working

    3. 

---

## 2. APP STORE PRIORITY LIST

*Dan and Jarques agreed order — do not reorder.*

| # | Item | Severity | Notes |
|---|------|----------|-------|
| 1 | ~~Feed button flicker / own-device echo~~ | ✅ Done | `suppressUntilRef` (3s timestamp window). `StatusScreen.tsx` v3.10.7. |
| 2 | Native phone notifications | 🔴 Major | Requires EAS Build — cannot test in Expo Go. Dedicated setup session needed (see D11). |
| 3 | ~~Ask to feed — target specific member~~ | ✅ Done | `target_user_id` + `sender_user_id` columns. Visibility filter in both notification queries. `types.ts` v1.2.0, `database.ts` v4.2.0, `SettingsScreen.tsx` v3.9.0. |
| 4 | ~~Reminders — modal + Supabase persistence + notification firing~~ | ✅ Done | `FeedRemindersModal.tsx` v1.0.0. `reminders` table. `database.ts` v4.3.0. `process-reminders` Edge Function deployed and verified. pg_cron scheduled every minute. Notifications fire on device. Timezone note: times stored as HH:mm UTC — offset handling needed before launch (D12). |
| 5 | ~~Reminders — notification toggle per member~~ | ✅ Done | "Feed reminders" toggle saves correctly to Supabase. Root cause: missing RLS UPDATE policy on `user_households` — silent 0-row update, no error returned. Fixed by adding policy allowing members to update their own row (scoped via `users.auth_user_id = auth.uid()`). `SettingsScreen.tsx` v3.12.0. Verified 10 Mar. |
| 6 | ~~T&C~~ | ✅ Done | `LegalModal.tsx` v2.2.0 (NEW). `react-native-webview` installed. Privacy Policy + Terms of Service load from live URLs in a pageSheet modal. iOS `onLoadStart` multi-fire bug fixed. `react-native-webview` confirmed working in Expo Go — no native build required. Verified iOS + Android, 12–13 Mar. |
| 7 | How to section | 🔴 Major | Needs to be updated. |
| 8 | ~~Support on Settings~~ | ✅ Done | "Give your feedback" tappable mailto link. `SettingsScreen.tsx` v3.10.0. |
| 9 | Supabase RLS | 🔴 Major | Must fix before go live — unrestricted DB access via anon key currently. |
| 10 | ~~View History screen~~ | ✅ Done | Feed History modal redesigned to match Dan's Figma. iOS shadow fixed. `StatusScreen.tsx` v3.10.3. |
| I11 | Adding a new household | 🟡 Medium | Household island button to add a new household via invitation code (e.g. pet sitter scenario). |
| 11 | New one | 🔴 Major | Pro mode does not have the upgrade to pro over the feed events on the status screen |
| 12 | Time Zone | 🔴 Major | need to do this still |
| 13 | Sounds alerts to all when it should only go to the receiver, when asked |
| 14 | ~~Feed Reminders Big change~~ | ✅ Done | Admin-only create/delete/toggle. Per-reminder `enabled` toggle (household-wide mute). Non-admins see read-only view. `reminders.enabled` column in Supabase. RLS UPDATE policy (admin only). Custom animated Switch. `FeedRemindersModal.tsx` v2.1.0, `SettingsScreen.tsx` v3.15.0, `database.ts` v4.4.0, `types.ts` v1.4.0, `process-reminders` v1.1.0, `globalStyles.ts` v1.1.0. Verified 13 Mar. |

---

## 3. WHAT'S BROKEN?

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 9 | Invite email link leads to blank page | 🟡 Minor | Deep linking not implemented — expected. Fix in Phase B before production build. |

All previously logged bugs (1–8, 10–18) resolved. See Compass for full resolution history.

---

## 4. ENHANCEMENTS & IMPROVEMENTS

| # | Improvement | Severity | Notes |
|---|-------------|----------|-------|
| I4 | Self-notification on household creation | 🟠 Medium | Creator sees their own notification. Filter where `requested_by` = current user, or suppress on insert. |
| I5 | Account Name font size in Settings | 🟡 Minor | Account name font smaller than Household name — should match. |
| I7 | Invite Member modal doesn't push up on keyboard (iPhone) | 🟡 Minor | Keyboard covers modal on iPhone. Check Android too. |
| I12 | Notifications 30-day cleanup | 🟡 Medium | Confirm auto-cleanup function is actively wired and running. |
| I14 | Defaults back to "Our Pet" on free tier downgrade | 🟡 Medium | When main member downgrades, remove extra pets and restore default "Our Pet". |
| I15 | Rate our app | 🟡 Minor | Opens App Store rating prompt. |
| I16 | Notification per member set only for the member | 
---

## 5. WHAT'S NEXT?

*Work through App Store Priority List in order. Do not skip ahead.*

- [x] **#1** — Feed button flicker fix. `suppressUntilRef`. `StatusScreen.tsx` v3.10.7. Verified 9 Mar.
- [x] **#3** — Ask to feed: target specific member. `types.ts` v1.2.0, `database.ts` v4.2.0, `SettingsScreen.tsx` v3.9.0. 5 Mar.
- [x] **#4 + #5 (UI + persistence)** — Feed reminders modal + toggle. `FeedRemindersModal.tsx` v1.0.0, `database.ts` v4.3.0, `SettingsScreen.tsx` v3.12.0, `types.ts` v1.3.0. 10 Mar.
- [x] **#4 — Reminders notifications** — `process-reminders` Edge Function deployed. pg_cron scheduled every minute with service role JWT in Authorization header. Verified: notifications fire on device via Expo Go. 10 Mar.
- [x] **#8** — Feedback link in Settings. `SettingsScreen.tsx` v3.10.0. 8 Mar.
- [x] **#10** — Feed History modal redesign + iOS shadow fix. `StatusScreen.tsx` v3.10.3. 8 Mar.
- [x] **#5** — Reminders toggle persists to Supabase. RLS UPDATE policy added to `user_households`. Verified 10 Mar.
- [x] **Enhancement** — Global modal header style. `globalStyles.ts` v1.0.0 (new). `SettingsScreen.tsx` v3.13.0. `FeedRemindersModal.tsx` v1.1.0. X right-aligned, title centred. Verified iOS + Android ✅. 11–13 Mar.
- [x] **#6** — T&C and Privacy Policy. `LegalModal.tsx` v2.2.0 (new). `react-native-webview` installed and confirmed working in Expo Go. WebView loads live URLs. iOS `onLoadStart` bug fixed. 12–13 Mar.
- [x] **#14** — Feed Reminders redesign: admin-only write, per-reminder enabled toggle (household-wide mute), `receives_reminders` removed from Settings. `FeedRemindersModal.tsx` v2.1.0, `SettingsScreen.tsx` v3.15.0, `database.ts` v4.4.0, `types.ts` v1.4.0, `process-reminders` v1.1.0. Verified 13 Mar.
- [x] **Enhancement** — Custom animated Switch in `FeedRemindersModal`. `globalStyles.ts` v1.1.0 (re-exports Switch). Verified 13 Mar.
- [x] **UI Polish** — StatusCard side padding reduced, `maxWidth` cap removed from all StatusScreen cards, shadow tightened on `statusCard` + `petCheckboxContainer`. `StatusScreen.tsx` v3.10.8. 13 Mar.
- [ ] **#2** — Native push notifications (EAS Build setup session) ← START HERE
- [ ] **#7** — How to section update
- [ ] **#9** — Supabase RLS
- [ ] **Phase B:** OS-level reminder scheduling (`expo-notifications`), Apple/Google OAuth, React Navigation, production build prep

---

## 6. KNOWN TECHNICAL DEBT (TOP PRIORITIES ONLY)

| # | Item | When to Fix |
|---|------|-------------|
| D1 | RLS policies disabled — unrestricted DB access via anon key | Before launch (#9 in priority list) |
| D2 | Email verification disabled in Supabase dashboard | Before launch |
| D3 | Expo Go deep linking limitations — invite email link leads to blank page | Before production build |
| D4 | Optimistic UI has no offline queue — failed syncs roll back silently | Post-MVP |
| D5 | Any table using real-time subscriptions must be enabled in Supabase Replication | Before adding new subscriptions |
| D6 | Rotate Supabase service role key — was briefly exposed as anon key in `.env` | Before launch |
| D7 | Invite email does not include household name — `{{ .Household }}` not a valid Supabase template variable | Phase B |
| D8 | `sendMemberRemovedEmail()` is now a no-op log — no email sent when member is removed | Phase B |
| D9 | Remove Developer Testing section from Settings view | Before launch |
| D10 | Self-deletion / account deletion — required by App Store & Play Store policies | Before launch |
| D11 | Native push notifications require EAS Build — cannot be tested in Expo Go. Use Expo EAS Build (cloud-based, works from Windows 11). Test iOS via TestFlight, Android via Google Play Internal Testing. Also needed for OS-level reminder scheduling (`expo-notifications`). | Before #2 can be built |
| D12 | Reminder times stored as `HH:mm` text matched in UTC — users in non-UTC timezones will see reminders fire at wrong local time | Before launch |
| D13 | pg_cron service role JWT hardcoded in cron job SQL command — rotate this when rotating the service role key (D6) | Before launch |
| D14 | `receives_reminders` column on `user_households` is now unused — all reminder muting uses `reminders.enabled` instead | Before launch |
| D15 | RLS INSERT and DELETE policies on `reminders` table still allow any household member — should be admin-only (`is_main_member = true`) | Before launch |

---

## 7. PROJECT CONTEXT (FOR AI ONBOARDING)

**App:** I Fed The Pet — React Native / Expo mobile app for pet feeding coordination across shared households.

**Stack:** React Native, Expo, TypeScript, Supabase (auth + real-time DB + Edge Functions), AsyncStorage (cache + session tokens only), expo-av (notification sound), @react-native-community/datetimepicker (reminders time picker), react-native-webview (legal document viewer — confirmed working in Expo Go).

**Architecture patterns to know:**
- Cache-first loading → silent background Supabase refresh
- Optimistic UI on feed button → background sync → rollback on failure
- `suppressUntilRef` → timestamp-based own-device echo suppression (3s window). Set to `Date.now() + 3000` before any Supabase write in `handleFeedClick` / `handleUndo`. Subscription callback skips `loadData()` while `Date.now() < suppressUntilRef.current`. Cleared to `0` on rollback.
- `suppressNotificationSoundRef` ref → lifted to `App.tsx`, shared via props → prevents sender hearing own notification bell
- Two-phase user creation → minimal record on signup, full profile during onboarding
- Pessimistic UI on Pro toggle and reminders toggle → awaits DB confirmation before UI change
- Household-scoped subscriptions → all real-time listeners filter by `householdId`
- `getCurrentUserId()` is self-healing → falls back to Supabase session if AsyncStorage is empty
- Lifted state pattern → `unreadCount` and `currentHouseholdId` owned by `App.tsx`, shared across screens via props
- Prop-driven household switching → `App.tsx` is the single source of truth for `currentHouseholdId`; all screens receive it as a prop
- Prop-driven Settings→StatusScreen push → `overrideHouseholdName` and `overridePets` owned by `App.tsx`; SettingsScreen calls callbacks after successful DB writes; StatusScreen patches local state instantly via `useEffect`. Device B sees changes on next natural load.
- Merged real-time useEffect → household changes (pets/feeding_events) and notification inserts share one useEffect keyed on `[activeHouseholdId]` only
- Edge Function pattern → sensitive server-side operations go through Supabase Edge Functions using the service role key, never the app bundle
- Invited user claim flow → `handleSignUp` in `AuthScreen` calls `getUserByEmail` first; if pending user found, calls `claim-invite` Edge Function to set password on ghost auth user, then `signInWithEmail`
- Invited user onboarding guard → mount-time `useEffect` in `OnboardingFlow` detects `InvitationStatus === 'Pending'` and hard-routes to `invite-code` before welcome screen renders. `checkingInvite` spinner prevents flash.
- `createUserHousehold` is idempotent — checks for existing link before inserting
- Join-date filter rule → any function querying `notifications` on behalf of a user must apply `.gte('created_at', joinDate)`. Both `getAllNotifications` and `getUnreadNotificationsCount` must always use the same filter.
- Loading guard rule → any async submit handler must have an `isLoading` guard preventing re-entry on both button `disabled` prop and `onSubmitEditing`
- Member sort order → `sortMembers()` in `SettingsScreen`: main member first, then active, then pending. Within each tier: oldest joined first.
- Eventual consistency rule → for non-time-critical data (household name, pet names, member names), Device A updates instantly; Device B sees changes on next natural load. Real-time subscriptions reserved for feeding events and notifications only.
- Safe area rule → `useSafeAreaInsets()` hook used in `StatusScreen.tsx`, not `SafeAreaView`. `SafeAreaProvider` must remain as outermost wrapper in `App.tsx`.
- Bug classification → three tiers: Blocker Bug (stops the process), Bug (wrong but not blocking), Enhancement (improvement to correctly working feature).
- Targeted notification visibility rule → `feed_request` type: both `getAllNotifications` and `getUnreadNotificationsCount` must apply the same visibility filter (sender or target only). If one is updated, the other must be too.
- Supabase channel naming rule → channels scoped by household: `status:pets:${householdId}`, `status:feeding_events:${householdId}`. Prevents channel object reuse across household switches.
- Reminder mute rule → `reminders.enabled` boolean (Supabase) is the sole mute mechanism — toggling off disables the reminder for the whole household. Only admins (`is_main_member = true`) can update it, enforced by RLS UPDATE policy. `receives_reminders` on `user_households` is now unused (D14). OS-level scheduling via `expo-notifications` deferred to EAS Build phase.
- Reminder notification architecture → server-side only. `process-reminders` Edge Function called by `pg_cron` every minute. Queries `reminders` table for rows where `time = HH:mm UTC` and `enabled = true`. For each match, inserts a `reminder` type notification per household member (all active members — `receives_reminders` filter removed in v1.1.0), with `target_user_id` set to that member's user_id. Real-time subscription on `notifications` handles bell badge + chime client-side — no polling. `target_user_id` is set, so the existing visibility filter in `getAllNotifications` and `getUnreadNotificationsCount` handles `reminder` type correctly without type-specific changes. Forward-compatible with native push (Phase B) — push call slots into the same Edge Function alongside the DB insert.
- pg_cron auth pattern → the cron job SQL passes the service role JWT as a hardcoded Bearer token in the `net.http_post` headers. `current_setting('app.service_role_key')` does NOT work — Supabase does not support that database parameter. Always hardcode the JWT directly in the cron schedule command. Remember to rotate this when rotating D6.

**Key naming to know:**
- `StatusScreen.tsx` uses `activeHouseholdId` (state) — renamed from `currentHouseholdId` in v3.2.0 to resolve naming collision with DB import
- `unreadCount` lives in `App.tsx` (v3.6.0), not StatusScreen
- `currentHouseholdId` lives in `App.tsx` (v3.7.0), passed as `householdId` prop to `StatusScreen` and `NotificationsPanel`
- `suppressNotificationSoundRef` lives in `App.tsx` (v3.8.0), passed to `StatusScreen` and `SettingsScreen`
- `overrideHouseholdName` and `overridePets` live in `App.tsx` (v3.9.0), passed to `StatusScreen` as props
- `suppressUntilRef` lives in `StatusScreen.tsx` (v3.10.7) — own-device echo suppression timestamp

**Current file versions:**
- `App.tsx` v3.10.0
- `StatusScreen.tsx` v3.10.8 (UI polish — reduced side padding, removed maxWidth cap on all cards, tighter shadow on statusCard + petCheckboxContainer)
- `SettingsScreen.tsx` v3.15.0 (receives_reminders toggle removed from Notifications card; isAdmin passed to FeedRemindersModal)
- `FeedRemindersModal.tsx` v2.1.0 (admin-only write; per-reminder enabled toggle; custom animated Switch)
- `globalStyles.ts` v1.1.0 (shared `modalHeaderStyles`; re-exports `Switch` from `src/components/Switch.tsx`)
- `NotificationsPanel.tsx` v2.3.0
- `AuthScreen.tsx` v1.2.0
- `OnboardingFlow.tsx` v5.1.0 (mount-time invited user guard, step reorder)
- `types.ts` v1.4.0 (`FeedReminder.Enabled` added; `remindersEnabled` removed from `NotificationPreferences`; `'reminder'` in Notification type union)
- `database.ts` v4.4.0 — `setReminderEnabled` added; `setReceivesReminders` and `getReceivesReminders` removed; `mapFeedReminder` maps `enabled` field
- `LegalModal.tsx` v2.2.0 (NEW) — Privacy Policy + Terms of Service pageSheet modal; WebView loads live URLs; no custom loading/error states; confirmed working in Expo Go

**Supabase:**
- Project ID: `dswbgtbrorhxxnargbdw`
- Tables with real-time enabled: `pets`, `feeding_events`, `households`, `user_households`, `notifications`
- Tables without real-time (not needed): `reminders`, `users`
- Extensions enabled: `pg_cron`, `pg_net`
- Edge Functions deployed: `send-invite-email`, `claim-invite`, `process-reminders` (v1.1.0 — `enabled` filter added, `receives_reminders` filter removed, 13 Mar)
- pg_cron job: `process-reminders-every-minute` — schedule `* * * * *` — status confirmed `succeeded`
- From address: `noreply@ifedthepet.app`

---

*End of Handoff — keep this file short, keep it current.*