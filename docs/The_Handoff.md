# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Thursday, 5 March 2026
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — Bug 14 (Android real-time sync) is highest priority.

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
- Multi-device sync suppression (suppressNextRealtimeLoad ref pattern)
- Household-scoped notifications stored in Supabase
- Read/unread notification state persisted per user per household
- 30-day notification auto-cleanup
- Notification bell badge resets to zero after marking all read ✅
- Multi-household switching propagates to all screens ✅
- Settings screen shows current user name + email at top ✅
- "Ask member to feed" → real Supabase insert → all household members see it ✅
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
- Invite modal: name field removed, spinner on Send Invite, `isSendingInvite` guard before `canAddMember` ✅ *(fixed 3 Mar)*
- Spurious invite notification removed — no notification fired on invite send ✅ *(fixed 3 Mar)*
- Members sorted: main member first, then active, then pending (oldest joined first within tier) ✅ *(fixed 3 Mar)*
- Account section: pencil icon lets logged-in user rename themselves inline ✅ *(fixed 3 Mar)*
- Members section: pencil removed — admin can no longer rename other members ✅ *(fixed 3 Mar)*
- `handleSaveMemberName` updates `members` and `currentUser` state instantly on save ✅ *(fixed 3 Mar)*
- Member removal works: RLS policy fixed, member disappears from view instantly ✅ *(fixed 3 Mar)*
- Household name change in Settings updates StatusScreen instantly on Device A ✅ *(fixed 4 Mar)*
- Pet added/deleted in Settings updates StatusScreen checkboxes instantly on Device A ✅ *(fixed 4 Mar)*
- Android safe area fixed — header, logo, and bell clear the status bar correctly ✅ *(fixed 5 Mar)*
- Logo centred precisely in header on all screen widths ✅ *(fixed 5 Mar)*
- Logo size increased (height 22.4 → 26.4, width 140 → 165) ✅ *(fixed 5 Mar)*
- Onboarding step order swapped: household intent first, name last (both paths) ✅ *(fixed 5 Mar)*
- Invited users auto-routed to invite-code screen on OnboardingFlow mount — welcome screen never shown ✅ *(fixed 5 Mar)*
- Personalised subtitle on invite-code screen: "You've been invited to join [HouseholdName]" ✅ *(fixed 5 Mar)*

What is **not** working:
- Invite email link leads to blank page (deep linking not yet implemented — expected) ❌

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go. Real-time bell verified Jarques iPhone + Android, 27 Feb. Email invitations verified 27 Feb. Bug #10, #8, duplicate notification fixes verified by Jarques on device, 28 Feb. Android safe area + logo fixes verified on real Android device, 5 Mar. Bug 11 + I13 verified 5 Mar.

---

## 2. APP STORE PRIORITY LIST

*Dan and Jarques agreed order — do not reorder.*

| # | Item | Severity | Notes |
|---|------|----------|-------|
| 1 | Android real-time sync failure | 🔴 Major | Android fails to reflect state changes from other devices. iOS updates instantly, Android stays stale. Check WebSocket listener and pet sync on Android. |
| 2 | Native phone notifications | 🔴 Major | Setup push notifications for when the phone is locked |
| 3 | Ask to feed — target specific member | 🔴 Major | Currently broadcasts to entire household. Only send to the person being asked |
| 4 | Reminders | 🔴 Major | Add functionality for feeding reminders (e.g. feed pet at 7pm). Reference Dan's Figma general time design |
| 5 | Reminders — notification toggle per member | 🔴 Major | Notification toggle is gone — re-add |
| 6 | T&C | 🔴 Major | Add views for Terms & Conditions and Privacy Policy. Worked in React Web Figma |
| 7 | How to section | 🔴 Major | Needs to be updated |
| 8 | Support on Settings | 🔴 Major | Add "Give your feedback" text under Version, linking to `mailto:feedback@ifedthepet.app` |
| 9 | Supabase RLS | 🔴 Major | Must fix before go live — unrestricted DB access via anon key currently |
| 10 | View History screen | 🔴 Major | Feeding event cards lose time and "fed by" text when there are many pets — padding issue |
| I11 | Adding a new household | 🟡 Medium | Household island button to add a new household via invitation code (e.g. pet sitter scenario) |

---

## 3. WHAT'S BROKEN?

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 1 | ~~Real-time sync not firing~~ | ✅ Fixed | `getCurrentUserId()` self-heals from Supabase session when AsyncStorage is empty |
| 2 | ~~Feed button did nothing on press~~ | ✅ Fixed | Naming collision in `StatusScreen.tsx` — renamed state to `activeHouseholdId` |
| 3 | ~~Multi-household switching does not update StatusScreen~~ | ✅ Fixed | `App.tsx` is now source of truth for `currentHouseholdId`. Prop-driven flow |
| 4 | ~~Notification bell badge count does not reset after marking all read~~ | ✅ Fixed | `unreadCount` lifted to App.tsx shared state |
| 5 | ~~"Ask member to feed" notification not received by other user~~ | ✅ Fixed | Real Supabase insert + real-time subscription on `notifications` table |
| 6 | ~~Bell badge not updating in real time for feed requests~~ | ✅ Fixed | `notifications` table was missing from Supabase Replication |
| 7 | ~~Email invitations not sending~~ | ✅ Fixed | Supabase Edge Function `send-invite-email` deployed |
| 8 | ~~New household member inherits stale notification count~~ | ✅ Fixed | Join-date filter applied to `getAllNotifications` and `getUnreadNotificationsCount` |
| 9 | Invite email link leads to blank page | 🟡 Minor | Deep linking not implemented — expected. Fix in Phase B before production build |
| 10 | ~~Create new user after invite fails~~ | ✅ Fixed | `claim-invite` Edge Function. `AuthScreen.handleSignUp` detects pending user and claims ghost auth account. `createUserHousehold` made idempotent. |
| 11 | ~~Invited user takes "Create Household" path instead of "Join"~~ | ✅ Fixed | Mount-time `useEffect` in `OnboardingFlow` detects `InvitationStatus === 'Pending'` and hard-routes to `invite-code` before welcome screen renders. `checkingInvite` spinner prevents flash. `OnboardingFlow.tsx` v5.1.0 |
| 12 | ~~Invite modal had name field~~ | ✅ Fixed | Name field removed. Email only. Placeholder from email prefix. `SettingsScreen.tsx` v3.7.0 |
| 13 | ~~New pet not appearing in StatusScreen checkboxes after being added in Settings~~ | ✅ Fixed | Resolved as part of Bug 18 fix — `onPetsChange` callback now pushes fresh pet list to StatusScreen instantly via App.tsx props. `StatusScreen.tsx` v3.9.0 |
| 14 | Android real-time sync failure | 🔴 Major | See App Store Priority List #1 |
| 15 | ~~Rename Account/Member name~~ | ✅ Fixed | Pencil in Account section. `handleSaveMemberName` updates `currentUser` immediately. `SettingsScreen.tsx` v3.7.3 |
| 16 | ~~Remove Edit Pencil in members section~~ | ✅ Fixed | Pencil removed from all member rows. Admin no longer renames other members. `SettingsScreen.tsx` v3.7.3 |
| 17 | ~~Unable to Delete User~~ | ✅ Fixed | `suppressNextRealtimeLoad` removed from `handleRemoveMember`. RLS DELETE policy added to `user_households` — main member can remove others. Optimistic state update removes member from view instantly. |
| 18 | ~~StatusScreen not updating after Settings changes~~ | ✅ Fixed | `onHouseholdNameChange` and `onPetsChange` callbacks added to SettingsScreen. App.tsx holds override state and passes it as props to StatusScreen. StatusScreen patches local state instantly via `useEffect`. Eventual consistency for Device B — by design. `App.tsx` v3.9.0, `StatusScreen.tsx` v3.9.0, `SettingsScreen.tsx` v3.8.0 |

---

## 4. ENHANCEMENTS & IMPROVEMENTS

| # | Improvement | Severity | Notes |
|---|-------------|----------|-------|
| I1 | ~~Pet checkboxes rendering in vertical column instead of horizontal row~~ | ✅ Fixed | `petCheckboxRow` wrapper with `flexDirection: row` and `flexWrap: wrap`. `StatusScreen.tsx` v3.8.0 |
| I2 | ~~Progress spinner on Invite Member modal~~ | ✅ Fixed | `isSendingInvite` guard before `canAddMember` for instant spinner. `SettingsScreen.tsx` v3.7.0 |
| I3 | Move Invitation Code into Household card | 🟡 Minor | On Settings screen, invitation code sits outside the household container. Move it inside. |
| I4 | Self-notification on household creation | 🟠 Medium | Creator sees their own notification — filter out where `requested_by` = current user, or suppress on insert. |
| I5 | Account Name font size in Settings | 🟡 Minor | Account name font smaller than Household name — should match. |
| I6 | ~~Android safe area on StatusScreen~~ | ✅ Fixed | `useSafeAreaInsets` applied. `SafeAreaProvider` added to `App.tsx`. `App.tsx` v3.10.0, `StatusScreen.tsx` v3.10.0. |
| I7 | Invite Member modal doesn't push up on keyboard (iPhone) | 🟡 Minor | Keyboard covers modal on iPhone. Check Android too. |
| I9 | ~~Household name not updating on StatusScreen~~ | ✅ Fixed | Resolved as part of Bug 18 fix. |
| I10 | ~~Logo size and centring on StatusScreen~~ | ✅ Fixed | Logo absolute-positioned. Size increased. `StatusScreen.tsx` v3.10.1. |
| I11 | Adding a new household | 🟡 Medium | See App Store Priority List |
| I12 | Notifications 30 days | 🟡 Medium | Delete notifications from DB after 30 days |
| I13 | ~~Onboarding flow step order~~ | ✅ Fixed | Household intent first, name last — both paths. Combined with Bug 11 fix. `OnboardingFlow.tsx` v5.1.0 |
| I14 | Defaults back to "Our Pet" on free tier | 🟡 Medium | When main member downgrades, remove extra pets and restore default "Our Pet" |
| I15 | Rate our app | 🟡 Minor | Opens App Store rating prompt |

---

## 5. WHAT'S NEXT?

*Work through App Store Priority List in order. Do not skip ahead.*

- [x] **Bug 11 + I13** — Onboarding guard + step reorder. `OnboardingFlow.tsx` v5.1.0. Verified 5 Mar.
- [ ] **#1** — Bug 14: Android real-time sync failure
- [ ] **#2** — Native push notifications (locked screen)
- [ ] **#3** — Ask to feed: target specific member only
- [ ] **#4** — Reminders (feeding time alerts)
- [ ] **#5** — Notification toggle per member — re-add
- [ ] **#6** — T&C and Privacy Policy views
- [ ] **#7** — How to section update
- [ ] **#8** — Feedback link in Settings
- [ ] **#9** — Supabase RLS
- [ ] **#10** — View History screen padding fix
- [ ] **Phase B:** Apple/Google OAuth, React Navigation, component extraction, production build prep

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

---

## 7. PROJECT CONTEXT (FOR AI ONBOARDING)

**App:** I Fed The Pet — React Native / Expo mobile app for pet feeding coordination across shared households.

**Stack:** React Native, Expo, TypeScript, Supabase (auth + real-time DB + Edge Functions), AsyncStorage (cache + session tokens only), expo-av (notification sound).

**Architecture patterns to know:**
- Cache-first loading → silent background Supabase refresh
- Optimistic UI on feed button → background sync → rollback on failure
- `suppressNextRealtimeLoad` ref → prevents own-device update echo
- `suppressNotificationSoundRef` ref → lifted to `App.tsx`, shared via props → prevents sender hearing own notification bell
- Two-phase user creation → minimal record on signup, full profile during onboarding
- Pessimistic UI on Pro toggle → awaits DB confirmation before UI change
- Household-scoped subscriptions → all real-time listeners filter by `householdId`
- `getCurrentUserId()` is self-healing → falls back to Supabase session if AsyncStorage is empty
- Lifted state pattern → `unreadCount` and `currentHouseholdId` owned by `App.tsx`, shared across screens via props
- Prop-driven household switching → `App.tsx` is the single source of truth for `currentHouseholdId`; all screens receive it as a prop
- Prop-driven Settings→StatusScreen push (Bug 18) → `overrideHouseholdName` and `overridePets` owned by `App.tsx`; SettingsScreen calls `onHouseholdNameChange` / `onPetsChange` callbacks after successful DB writes; StatusScreen patches local state instantly via `useEffect`. Device B sees changes on next natural load — eventual consistency by design for non-time-critical data.
- Merged real-time useEffect → household changes (pets/feeding_events) and notification inserts share one useEffect keyed on `[activeHouseholdId]` only, preventing subscription teardown during `loadData()` re-renders
- Edge Function pattern → sensitive server-side operations go through Supabase Edge Functions using the service role key, never the app bundle
- Invited user claim flow → `handleSignUp` in `AuthScreen` calls `getUserByEmail` first; if pending user found, calls `claim-invite` Edge Function to set password on ghost auth user, then `signInWithEmail` — no new auth record needed
- Invited user onboarding guard → `OnboardingFlow` runs a mount-time `useEffect` that calls `getUserByEmail`; if `InvitationStatus === 'Pending'`, fetches household name via `getHouseholdsForUser` and hard-routes to `invite-code` step before welcome screen renders. `checkingInvite` spinner prevents flash.
- `createUserHousehold` is idempotent — checks for existing link before inserting; safe to call for users pre-linked by invite flow
- Join-date filter rule → any function querying `notifications` on behalf of a user must fetch `user_households.created_at` and apply `.gte('created_at', joinDate)`. Both `getAllNotifications` and `getUnreadNotificationsCount` must always use the same filter.
- Loading guard rule → any async submit handler in an onboarding or join flow must have an `isLoading` guard (state or ref) preventing re-entry. Both the button's `disabled` prop and any keyboard `onSubmitEditing` handler must check the same guard.
- Member sort order → `sortMembers()` in `SettingsScreen`: main member first, then active, then pending. Within each tier: oldest joined first.
- Name edit rule → only the logged-in user can rename themselves (pencil in Account section). `handleSaveMemberName` updates Supabase, `members` state, and `currentUser` state — no `loadData()` needed.
- Eventual consistency rule → for non-time-critical data (household name, pet names, member names), Device A updates instantly via local state; Device B sees changes on next natural load. Real-time subscriptions are reserved for feeding events and notifications only.
- Safe area rule → `SafeAreaView` is not used in `StatusScreen.tsx`. All safe area handling done via `useSafeAreaInsets()`, with `paddingTop: insets.top` on outer `View` wrappers. `SafeAreaProvider` must remain as outermost wrapper in `App.tsx`.
- Logo centring rule → logo uses `position: 'absolute'` with `left: 0, right: 0` so it centres on true screen width.
- Onboarding step order (v5.1.0) → both paths: household intent first, name last. Invited users skip welcome entirely via mount-time check.
- Bug classification → three tiers: Blocker Bug (stops the process), Bug (wrong but not blocking), Enhancement (improvement to correctly working feature).

**Key naming to know:**
- `StatusScreen.tsx` uses `activeHouseholdId` (state) — renamed from `currentHouseholdId` in v3.2.0 to resolve naming collision with DB import
- `unreadCount` lives in `App.tsx` (v3.6.0), not StatusScreen
- `currentHouseholdId` lives in `App.tsx` (v3.7.0), passed as `householdId` prop to `StatusScreen` and `NotificationsPanel`
- `suppressNotificationSoundRef` lives in `App.tsx` (v3.8.0), passed to `StatusScreen` and `SettingsScreen`
- `overrideHouseholdName` and `overridePets` live in `App.tsx` (v3.9.0), passed to `StatusScreen` as props

**Current file versions:**
- `App.tsx` v3.10.0
- `StatusScreen.tsx` v3.10.1
- `SettingsScreen.tsx` v3.8.0
- `NotificationsPanel.tsx` v2.3.0
- `AuthScreen.tsx` v1.2.0
- `OnboardingFlow.tsx` v5.1.0 (Bug 11 + I13: mount-time invited user guard, step reorder)
- `database.ts` — `getMembersOfHousehold` orders by `user_households.created_at` ASC; `sendInviteEmail()` returns ghost auth user ID; `claimInvite()` added; `createUserHousehold()` idempotent; `getAllNotifications()` and `getUnreadNotificationsCount()` apply join-date filter

**Supabase:**
- Project ID: `dswbgtbrorhxxnargbdw`
- Tables with real-time enabled: `pets`, `feeding_events`, `households`, `user_households`, `notifications`
- Edge Functions deployed: `send-invite-email`, `claim-invite`
- From address: `noreply@ifedthepet.app`

---

*End of Handoff — keep this file short, keep it current.*