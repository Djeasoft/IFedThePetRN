# I Fed The Pet (IFTP) — The Handoff
**Last Updated:** Saturday, 21 February 2026, 15:00 GMT
**Updated By:** Jarques
**Next Session:** Pick up from WHAT'S NEXT — Item 1

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
- Multi-household switching via modal in SettingsScreen
- Household-scoped notifications stored in Supabase
- Read/unread notification state persisted per user per household
- 30-day notification auto-cleanup
- Cache-first loading with real-time subscriptions on StatusScreen and SettingsScreen
- Optimistic UI on feed button (0ms response, background Supabase sync)
- 2-minute undo window
- Pro tier toggle (pessimistic UI — awaits DB confirmation)
- Multi-device sync suppression (suppressNextRealtimeLoad ref pattern)

**Tested by:** Dan + Jamie (Henry) on 20 February 2026 via Expo Go

---

## 2. WHAT'S BROKEN?

*Source: Dan's Slack feedback, 20 February 2026*

| # | Bug | Severity | Notes |
|---|-----|----------|-------|
| 1 | Real-time sync not firing — Henry feeds pet, Daniel's StatusScreen does not update automatically | 🔴 Critical | This is the core feature. Manual refresh works. Auto-refresh broken. |
| 2 | Notification bell badge count does not auto-refresh | 🔴 Critical | Badge is stale until user manually opens notifications panel |
| 3 | "Ask member to feed" notification not received by the other user | 🟠 High | Feature is stubbed — UI fires local Alert only, no server-side trigger |
| 4 | New household member inherits stale notification count from previous sessions | 🟡 Minor | Henry joined and saw 12 unread from Daniel's prior activity |
| 5 | Email invitations not sending | 🟡 Minor | Workaround confirmed: household code join works perfectly |

---

## 3. WHAT'S NEXT?

*Work through in order. Do not skip ahead.*

- [ ] **1. Fix real-time StatusScreen sync** — When any household member feeds a pet, all other members' StatusScreenes must update automatically without manual refresh. Investigate the Supabase WebSocket subscription on StatusScreen. Likely cause: subscription is scoped incorrectly or the suppressNextRealtimeLoad ref is muting external updates, not just own-device updates.

- [ ] **2. Fix notification bell badge auto-refresh** — Badge count should update in real time when new notifications arrive. Tie this to the same real-time subscription fix in Item 1.

- [ ] **3. Wire up "Ask member to feed" notification** — Replace the local `Alert.alert('Request Sent')` stub with an actual insert into the Supabase notifications table, triggering a real notification to the target household member.

- [ ] **4. Fix stale notification inheritance for new members** — When a user joins a household via code, only show notifications from their join date onward, or mark all prior notifications as read on join.

- [ ] **5. Plan Phase B** — Once Items 1–3 are resolved and re-tested with Dan, open Phase B planning: Apple/Google OAuth, React Navigation, component extraction, and MVP prep.

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

**Current status:** Phase A complete. App tested by Dan and Jamie on 20 Feb 2026. Real-time sync between devices is broken. That is the active work.

**Docs folder:** `/IFedThePetRN/docs/` on GitHub
- `The Compass` — architectural decision log and technical debt register
- `The Spec` — feature requirement docs (delete when feature is verified in code)
- `The Triage` — reactive bug patch reports (delete when bugs are resolved)
- `The Handoff` — this file, always current, rewritten each session

---

*End of Handoff — keep this file short, keep it current.*
