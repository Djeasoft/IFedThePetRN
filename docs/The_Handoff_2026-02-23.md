# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Thursday, 27 February 2026, 13:45 GMT
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — Item 5

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
- Multi-household switching propagates to all screens ✅ *(fixed this session)*
- Settings screen shows current user name + email at top ✅ *(added this session)*

What is **not** working:
- "Ask member to feed" — UI stub only, no server-side trigger ❌
- Stale notification count for new household members ❌
- Email invitations not sending ❌

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go. Multi-household switch fix manually applied by Jarques and verified on iPhone + Android, 27 February 2026.

---

## 2. WHAT'S BROKEN?

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 1 | ~~Real-time sync not firing~~ | ✅ Fixed | `getCurrentUserId()` self-heals from Supabase session when AsyncStorage is empty |
| 2 | ~~Feed button did nothing on press~~ | ✅ Fixed | Naming collision in `StatusScreen.tsx` — renamed state to `activeHouseholdId` |
| 3 | ~~Multi-household switching does not update StatusScreen~~ | ✅ Fixed | `App.tsx` is now source of truth for `currentHouseholdId`. Prop-driven flow: SettingsScreen → `onHouseholdSwitch` → App.tsx → StatusScreen + NotificationsPanel |
| 4 | ~~Notification bell badge count does not reset after marking all read~~ | ✅ Fixed | `unreadCount` lifted to App.tsx shared state |
| 5 | "Ask member to feed" notification not received by other user | 🟠 High | Feature stubbed — UI fires local Alert only, no server-side trigger |
| 6 | New household member inherits stale notification count | 🟡 Minor | Henry joined and saw 12 unread from Daniel's prior activity |
| 7 | Email invitations not sending | 🟠 High | `sendEmail()` in `database.ts` is a mock (console.log only). Fix requires Supabase Edge Function + SMTP |

---

## 3. WHAT'S NEXT?

*Work through in order. Do not skip ahead.*

- [x] **1. Fix real-time StatusScreen sync**
- [x] **2. Fix feed button**
- [x] **3. Fix multi-household switching**
- [x] **4. Fix notification bell badge auto-refresh**
- [ ] **5. Wire up "Ask member to feed" notification** — Replace `Alert.alert('Request Sent')` stub in `SettingsScreen.tsx` with a real insert into the Supabase `notifications` table. Target: the selected household member receives it in their NotificationsPanel.
- [ ] **6. Fix stale notification inheritance for new members** — When a user joins via code, mark all prior notifications as read on join, or filter by join date.
- [ ] **7. Plan Phase B** — Once Items 5 and 6 are resolved and re-tested with Dan, open Phase B: Apple/Google OAuth, React Navigation, component extraction, MVP prep.
- [ ] **8. Wire up email invitations** — `handleInviteMember` in `SettingsScreen.tsx` creates the pending user correctly but never sends an email. Plan: Supabase Edge Function (`send-invite-email`) + SMTP.
  - Install Supabase CLI (Windows installer only): https://github.com/supabase/cli#install-the-cli
  - Configure SMTP: Supabase dashboard → Authentication → Settings → SMTP Settings
  - Supabase Project ID: `dswbgtbrorhxxnargbdw`
  - From address: `noreply@ifedthepet.app`

---

## 4. KNOWN TECHNICAL DEBT (TOP PRIORITIES ONLY)

| # | Item | When to Fix |
|---|------|-------------|
| D1 | RLS policies disabled — unrestricted DB access via anon key | Before launch |
| D2 | Email verification disabled in Supabase dashboard | Before launch |
| D3 | Expo Go deep linking limitations — custom URL scheme not supported | Before production build |
| D4 | Optimistic UI has no offline queue — failed syncs roll back silently | Post-MVP |

---

## 5. PROJECT CONTEXT (FOR AI ONBOARDING)

**App:** I Fed The Pet — React Native / Expo mobile app for pet feeding coordination across shared households.

**Stack:** React Native, Expo, TypeScript, Supabase (auth + real-time DB), AsyncStorage (cache + session tokens only).

**Architecture patterns to know:**
- Cache-first loading → silent background Supabase refresh
- Optimistic UI on feed button → background sync → rollback on failure
- `suppressNextRealtimeLoad` ref → prevents own-device update echo
- Two-phase user creation → minimal record on signup, full profile during onboarding
- Pessimistic UI on Pro toggle → awaits DB confirmation before UI change
- Household-scoped subscriptions → all real-time listeners filter by `householdId`
- `getCurrentUserId()` is self-healing → falls back to Supabase session if AsyncStorage is empty
- Lifted state pattern → `unreadCount` and `currentHouseholdId` owned by `App.tsx`, shared across screens via props
- Prop-driven household switching → `App.tsx` is the single source of truth for `currentHouseholdId`; all screens receive it as a prop

**Key naming to know:**
- `StatusScreen.tsx` uses `activeHouseholdId` (state) — renamed from `currentHouseholdId` in v3.2.0 to resolve naming collision with DB import
- `unreadCount` lives in `App.tsx` (v3.6.0), not StatusScreen
- `currentHouseholdId` lives in `App.tsx` (v3.7.0), passed as `householdId` prop to `StatusScreen` and `NotificationsPanel`

**Current file versions:**
- `App.tsx` v3.7.0
- `StatusScreen.tsx` v3.4.0
- `SettingsScreen.tsx` v3.2.0
- `NotificationsPanel.tsx` v2.3.0

---

*End of Handoff — keep this file short, keep it current.*
