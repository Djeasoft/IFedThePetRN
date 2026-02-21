# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Saturday, 21 February 2026, 19:30 GMT
**Updated By:** Jarques + Claude (session sign-off)
**Next Session:** Pick up from WHAT'S NEXT — Item 3

---

> **HOW TO USE THIS DOCUMENT**
> This is the only document you read when returning to this project.
> Read it in under 60 seconds. Then open your IDE.
> At the end of each session, rewrite this file. Keep it to one page.
> Completed items move to The Compass as a milestone entry. This file never grows.

---

## 1. WHERE AM I?

**Phase A — COMPLETE**

The app is live on Expo preview. Supabase backend is fully operational.

What is verified and working:
- Email authentication (signup, login, session persistence)
- Three-gate routing: AuthScreen → OnboardingFlow → StatusScreen
- Onboarding flow (Create Household and Join Household paths)
- Cache-first loading with real-time subscriptions on StatusScreen and SettingsScreen
- Optimistic UI on feed button (0ms response, background Supabase sync)
- Feed button → Supabase write → feeding history display ✅ *(fixed this session)*
- Real-time sync: Device A feeds pet → Device B StatusScreen auto-updates ✅ *(fixed this session)*
- Cross-device notifications ✅ *(confirmed this session)*
- 2-minute undo window
- Pro tier toggle (pessimistic UI — awaits DB confirmation)
- Multi-device sync suppression (suppressNextRealtimeLoad ref pattern)
- Household-scoped notifications stored in Supabase
- Read/unread notification state persisted per user per household
- 30-day notification auto-cleanup

What is **not** working:
- Multi-household switching via modal in SettingsScreen ❌
- Notification bell badge count does not reset after marking all read ❌

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go. Feed button and real-time sync re-verified by Jarques on 21 February 2026.

---

## 2. WHAT'S BROKEN?

*Source: Dan's Slack feedback, 20 February 2026*

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 1 | ~~Real-time sync not firing — Henry feeds pet, Daniel's StatusScreen does not update automatically~~ | ✅ Fixed | Root cause: `getCurrentUserId()` returned null after cache clear — no fallback to Supabase session. Fix: self-healing fallback added to `database.ts`. |
| 2 | ~~Feed button did nothing on press — no logs fired~~ | ✅ Fixed | Root cause: naming collision in `StatusScreen.tsx` — state `setCurrentHouseholdId` shadowed the DB import. Fix: renamed state to `activeHouseholdId` in `StatusScreen.tsx` v3.2.0. |
| 3 | Multi-household switching — switching households does not update StatusScreen | 🔴 Critical | Switcher modal exists in Settings but selection does not propagate to StatusScreen |
| 4 | Notification bell badge count does not reset after marking all read | 🔴 Critical | Badge remains stale until app reload |
| 5 | "Ask member to feed" notification not received by the other user | 🟠 High | Feature is stubbed — UI fires local Alert only, no server-side trigger |
| 6 | New household member inherits stale notification count from previous sessions | 🟡 Minor | Henry joined and saw 12 unread from Daniel's prior activity |
| 7 | Email invitations not sending | 🟠 High | `handleInviteMember` creates the pending user + household link correctly but never sends an email. `sendEmail()` in `database.ts` is a mock (console.log only). Fix requires Supabase Edge Function + SMTP. See Item 8 in What's Next. |

---

## 3. WHAT'S NEXT?

*Work through in order. Do not skip ahead.*

- [x] **1. Fix real-time StatusScreen sync** — Resolved. `getCurrentUserId()` now self-heals from Supabase session when AsyncStorage is empty.

- [x] **2. Fix feed button** — Resolved. Naming collision in `StatusScreen.tsx` between state setter and DB import. Renamed state to `activeHouseholdId`.

- [ ] **3. Fix multi-household switching** — Switching households via the Settings modal does not update StatusScreen. Investigate how the selected household ID is saved and whether StatusScreen re-loads on change.

- [ ] **4. Fix notification bell badge auto-refresh** — Badge count should return to zero after user marks all notifications as read. Trace the mark-as-read flow and confirm `unreadCount` state in StatusScreen is updated in response.

- [ ] **5. Wire up "Ask member to feed" notification** — Replace the local `Alert.alert('Request Sent')` stub with an actual insert into the Supabase notifications table, triggering a real notification to the target household member.

- [ ] **6. Fix stale notification inheritance for new members** — When a user joins a household via code, only show notifications from their join date onward, or mark all prior notifications as read on join.

- [ ] **7. Plan Phase B** — Once Items 3–5 are resolved and re-tested with Dan, open Phase B planning: Apple/Google OAuth, React Navigation, component extraction, and MVP prep.

- [ ] **8. Wire up email invitations** — `handleInviteMember` in `SettingsScreen.tsx` already creates the pending user and household link correctly. What's missing is the actual email send. Plan agreed: Supabase Edge Function (`send-invite-email`) calling Supabase's built-in SMTP. **Prerequisites before starting:**
  - Install Supabase CLI — `npm install -g supabase` does NOT work on Windows. Use the Windows installer instead: https://github.com/supabase/cli#install-the-cli
  - Configure SMTP in Supabase dashboard → Authentication → Settings → SMTP Settings (retrieve credentials from existing email provider first)
  - Supabase Project ID: `dswbgtbrorhxxnargbdw`
  - From address: `noreply@ifedthepet.app`

---

## 4. KNOWN TECHNICAL DEBT (TOP PRIORITIES ONLY)

*Full debt register lives in The Compass. These are the pre-launch blockers.*

| # | Item | When to Fix |
|---|------|-------------|
| D1 | RLS policies disabled — anyone with anon key has unrestricted DB access | Before launch |
| D2 | Email verification disabled in Supabase dashboard | Before launch |
| D3 | Expo Go deep linking limitations — custom URL scheme not supported | Before production build |
| D4 | Optimistic UI has no offline queue — failed syncs roll back silently | Post-MVP |

---

## 5. PROJECT CONTEXT (FOR AI ONBOARDING)

Paste this section at the start of a new AI session to align quickly.

**App:** I Fed The Pet — React Native / Expo mobile app for pet feeding coordination across shared households.

**Stack:** React Native, Expo, TypeScript, Supabase (auth + real-time DB), AsyncStorage (cache + session tokens only).

**Architecture patterns to know:**
- Cache-first loading → silent background Supabase refresh
- Optimistic UI on feed button → background sync → rollback on failure
- suppressNextRealtimeLoad ref → prevents own-device update echo
- Two-phase user creation → minimal record on signup, full profile during onboarding
- Pessimistic UI on Pro toggle → awaits DB confirmation before UI change
- Household-scoped subscriptions → all real-time listeners filter by householdId
- getCurrentUserId() is self-healing → falls back to Supabase session if AsyncStorage is empty

**Key fix to know:** `StatusScreen.tsx` uses `activeHouseholdId` (state) not `currentHouseholdId` — renamed in v3.2.0 to resolve a naming collision with the DB import of the same name.

**Current status:** Phase A complete. Feed button and real-time sync fixed 21 Feb 2026. Two active bugs: multi-household switching (Bug 3) and notification bell badge not resetting (Bug 4). That is the active work.

**Docs folder:** `/IFedThePetRN/docs/` on GitHub
- `The Compass` — architectural decision log and technical debt register
- `The Spec` — feature requirement docs (delete when feature is verified in code)
- `The Triage` — reactive bug patch reports (delete when bugs are resolved)
- `The Handoff` — this file, always current, rewritten each session

---

*End of Handoff — keep this file short, keep it current.*