# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Saturday, 28 February 2026, 11:00am GMT
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — Item 7 (Plan Phase B). Bug backlog is clear. Improvements backlog is the priority before Phase B begins.

---

> **HOW TO USE THIS DOCUMENT**
> This is the only document you read when returning to this project.
> Read it in under 60 seconds. Then open your IDE.
> At the end of each session, rewrite this file. Keep it to one page.
> Completed items move to The Compass as a milestone entry. This file never grows.

---

## 1. WHERE AM I?

**Phase A — COMPLETE. Bug backlog clear.**

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

What is **not** working:
- Invite email link leads to blank page (deep linking not yet implemented — expected) ❌

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go. Real-time bell verified Jarques iPhone + Android, 27 Feb. Email invitations verified 27 Feb. Bug #10, #8, duplicate notification fixes verified by Jarques on device, 28 Feb.

---

## 2. WHAT'S BROKEN?

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
| 11 | Invited user takes "Create Household" path instead of "Join" | 🟠 Medium | Invited user ends up with a spurious extra household. Onboarding needs a UX guard to detect pending invited users and steer them to the Join path. Needs brainstorm before code. |

---

## 3. IMPROVEMENTS

| # | Improvement | Severity | Notes |
|---|-------------|----------|-------|
| I1 | Self-notification on household creation | 🟠 Medium | Creator sees their own "Household Created" notification — should they? Filter out notifications where `requested_by` = current user, or suppress on insert. |
| I2 | Progress spinner on Invite Member modal | 🟠 Medium | Visible delay while invite email sends — no loading indicator. Add spinner over modal during `sendInviteEmail` call. |
| I3 | Move Invitation Code into Household card | 🟡 Minor | On Settings screen, invitation code sits outside the household container. Move it inside. |
| I4 | Pet names not horizontally aligned on StatusScreen | 🟡 Minor | Pet name text alignment inconsistent across cards. |
| I5 | Account Name font size in Settings | 🟡 Minor | Account name font smaller than Household name — should match. |
| I6 | Android safe area on StatusScreen | 🟠 Medium | Menu button, logo, and bell need more top margin on Android. |
| I7 | Invite Member modal doesn't push up on keyboard (iPhone) | 🟡 Minor | Keyboard covers modal on iPhone. Check Android too. |

---

## 4. WHAT'S NEXT?

*Work through in order. Do not skip ahead.*

- [x] **1.** Fix real-time StatusScreen sync
- [x] **2.** Fix feed button
- [x] **3.** Fix multi-household switching
- [x] **4.** Fix notification bell badge auto-refresh
- [x] **5.** Wire up "Ask member to feed" notification
- [x] **6.** Fix stale notification inheritance for new members
- [x] **8.** Wire up email invitations
- [x] **10.** Fix invited user signup error
- [ ] **Next:** Work through Improvements backlog (I2 and I6 are highest severity)
- [ ] **Bug 11:** Onboarding guard for invited users who take "Create Household" path
- [ ] **Phase B:** Apple/Google OAuth, React Navigation, component extraction, production build prep

---

## 5. KNOWN TECHNICAL DEBT (TOP PRIORITIES ONLY)

| # | Item | When to Fix |
|---|------|-------------|
| D1 | RLS policies disabled — unrestricted DB access via anon key | Before launch |
| D2 | Email verification disabled in Supabase dashboard | Before launch |
| D3 | Expo Go deep linking limitations — invite email link leads to blank page | Before production build |
| D4 | Optimistic UI has no offline queue — failed syncs roll back silently | Post-MVP |
| D5 | Any table using real-time subscriptions must be enabled in Supabase Replication | Before adding new subscriptions |
| D6 | Rotate Supabase service role key — was briefly exposed as anon key in `.env` | Before launch |
| D7 | Invite email does not include household name — `{{ .Household }}` not a valid Supabase template variable | Phase B |
| D8 | `sendMemberRemovedEmail()` is now a no-op log — no email sent when member is removed | Phase B |
| D9 | Remove Developer Testing section from Settings view | Before launch |

---

## 6. PROJECT CONTEXT (FOR AI ONBOARDING)

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
- Merged real-time useEffect → household changes (pets/feeding_events) and notification inserts share one useEffect keyed on `[activeHouseholdId]` only, preventing subscription teardown during `loadData()` re-renders
- Edge Function pattern → sensitive server-side operations go through Supabase Edge Functions using the service role key, never the app bundle
- Invited user claim flow → `handleSignUp` in `AuthScreen` calls `getUserByEmail` first; if pending user found, calls `claim-invite` Edge Function to set password on ghost auth user, then `signInWithEmail` — no new auth record needed
- `createUserHousehold` is idempotent — checks for existing link before inserting; safe to call for users pre-linked by invite flow
- Join-date filter rule → any function querying `notifications` on behalf of a user must fetch `user_households.created_at` and apply `.gte('created_at', joinDate)`. Both `getAllNotifications` and `getUnreadNotificationsCount` must always use the same filter — if one is updated, the other must be updated too
- Loading guard rule → any async submit handler in an onboarding or join flow must have an `isLoading` guard (state or ref) preventing re-entry. Both the button's `disabled` prop and any keyboard `onSubmitEditing` handler must check the same guard

**Key naming to know:**
- `StatusScreen.tsx` uses `activeHouseholdId` (state) — renamed from `currentHouseholdId` in v3.2.0 to resolve naming collision with DB import
- `unreadCount` lives in `App.tsx` (v3.6.0), not StatusScreen
- `currentHouseholdId` lives in `App.tsx` (v3.7.0), passed as `householdId` prop to `StatusScreen` and `NotificationsPanel`
- `suppressNotificationSoundRef` lives in `App.tsx` (v3.8.0), passed to `StatusScreen` and `SettingsScreen`

**Current file versions:**
- `App.tsx` v3.8.0
- `StatusScreen.tsx` v3.7.0
- `SettingsScreen.tsx` v3.6.0 (stores ghost auth ID after invite send)
- `NotificationsPanel.tsx` v2.3.0
- `AuthScreen.tsx` v1.2.0 (invited user claim flow in handleSignUp)
- `OnboardingFlow.tsx` v3.0.0 + isLoading guard on handleMemberComplete
- `database.ts` — `sendInviteEmail()` returns ghost auth user ID; `claimInvite()` added; `createUserHousehold()` idempotent; `getAllNotifications()` and `getUnreadNotificationsCount()` apply join-date filter

**Supabase:**
- Project ID: `dswbgtbrorhxxnargbdw`
- Tables with real-time enabled: `pets`, `feeding_events`, `households`, `user_households`, `notifications`
- Edge Functions deployed: `send-invite-email`, `claim-invite`
- From address: `noreply@ifedthepet.app`

---

*End of Handoff — keep this file short, keep it current.*
