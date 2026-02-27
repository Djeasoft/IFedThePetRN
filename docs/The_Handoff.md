# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Friday, 27 February 2026, 19:30 GMT
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — Item 6

---

> **HOW TO USE THIS DOCUMENT**
> This is the only document you read when returning to this project.
> Read it in under 60 seconds. Then open your IDE.
> At the end of each session, rewrite this file. Keep it to one page.
> Completed items move to The Compass as a milestone entry. This file never grows.

---

## 1. WHERE AM I?

**Phase A — COMPLETE**

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
- "Ask member to feed" → real Supabase insert → all household members see it ✅ *(wired up this session)*
- Real-time notification subscription → bell badge updates instantly on all devices ✅ *(added this session)*
- Bell chime sound plays on other devices when a notification arrives ✅ *(added this session)*
- `suppressNotificationSoundRef` prevents sender hearing own bell ✅ *(added this session)*
- Email invitations sending via Supabase Edge Function ✅ *(wired up this session)*
- Invite email contains invitation code and join instructions ✅ *(wired up this session)*

What is **not** working:
- Stale notification count for new household members ❌
- Invite email link leads to blank page (deep linking not yet implemented — expected) ❌

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go. Item 5 + real-time notification bell verified by Jarques on iPhone + Android, 27 February 2026. Email invitations verified by Jarques, 27 February 2026.

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
| 7 | ~~Email invitations not sending~~ | ✅ Fixed | Supabase Edge Function `send-invite-email` deployed. `sendInviteEmail()` replaces mock in `database.ts` |
| 8 | New household member inherits stale notification count | 🟡 Minor | Henry joined and saw 12 unread from Daniel's prior activity |
| 9 | Invite email link leads to blank page | 🟡 Minor | Deep linking not implemented yet — expected. Fix in Phase B before production build |
| 10 | Create new User after invite  | 🟠 High |  ERROR  Sign up error: [AuthApiError: User already registered] |
---

## 3. WHAT'S NEXT?

*Work through in order. Do not skip ahead.*

- [x] **1. Fix real-time StatusScreen sync**
- [x] **2. Fix feed button**
- [x] **3. Fix multi-household switching**
- [x] **4. Fix notification bell badge auto-refresh**
- [x] **5. Wire up "Ask member to feed" notification**
- [x] **8. Wire up email invitations** — Edge Function deployed. `SettingsScreen.tsx` v3.5.0. Real invite email sends with invitation code and join instructions.
- [ ] **6. Fix stale notification inheritance for new members** — When a user joins via code, mark all prior notifications as read on join, or filter by join date.
- [ ] **7. Create new User after invite Error** - After the Admin sent an email to the new user, the new user clicks on the sign up free email, but get an error User already registered
- [ ] **8. Plan Phase B** — Once Item 6 is resolved and re-tested with Dan, open Phase B: Apple/Google OAuth, React Navigation, component extraction, MVP prep.

---

## 4. KNOWN TECHNICAL DEBT (TOP PRIORITIES ONLY)

| # | Item | When to Fix |
|---|------|-------------|
| D1 | RLS policies disabled — unrestricted DB access via anon key | Before launch |
| D2 | Email verification disabled in Supabase dashboard | Before launch |
| D3 | Expo Go deep linking limitations — invite email link leads to blank page | Before production build |
| D4 | Optimistic UI has no offline queue — failed syncs roll back silently | Post-MVP |
| D5 | Any table using real-time subscriptions must be enabled in Supabase Replication | Before adding new subscriptions |
| D6 | Rotate Supabase service role key — was briefly exposed as anon key in `.env` | Before launch |
| D7 | Invite email does not include household name — `{{ .Household }}` not a valid Supabase template variable | Phase B |
| D8 | `sendMemberRemovedEmail()` is now a no-op log — removed email sending when member is removed from household | Phase B |

---

## 5. PROJECT CONTEXT (FOR AI ONBOARDING)

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
- Edge Function pattern → sensitive server-side operations (e.g. sending invite emails) go through Supabase Edge Functions using the service role key, never the app bundle

**Key naming to know:**
- `StatusScreen.tsx` uses `activeHouseholdId` (state) — renamed from `currentHouseholdId` in v3.2.0 to resolve naming collision with DB import
- `unreadCount` lives in `App.tsx` (v3.6.0), not StatusScreen
- `currentHouseholdId` lives in `App.tsx` (v3.7.0), passed as `householdId` prop to `StatusScreen` and `NotificationsPanel`
- `suppressNotificationSoundRef` lives in `App.tsx` (v3.8.0), passed to `StatusScreen` and `SettingsScreen`

**Current file versions:**
- `App.tsx` v3.8.0
- `StatusScreen.tsx` v3.7.0
- `SettingsScreen.tsx` v3.5.0
- `NotificationsPanel.tsx` v2.3.0
- `database.ts` — `sendEmail()` mock replaced with `sendInviteEmail()` Edge Function call

**Supabase:**
- Project ID: `dswbgtbrorhxxnargbdw`
- Tables with real-time enabled: `pets`, `feeding_events`, `households`, `user_households`, `notifications`
- Edge Functions deployed: `send-invite-email`
- From address: `noreply@ifedthepet.app`

---

*End of Handoff — keep this file short, keep it current.*