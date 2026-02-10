# I Fed The Pet - ACTION PLAN 
**Week of:** Tuesday, 10 February - Friday, 14 February 2026  
**Owner:** Jarques (technical lead) + Dan (design)  
**Status:** READY TO EXECUTE

---

## THIS WEEK'S MISSION

**Primary Goal:** Validate Phase A completion through comprehensive testing, then decide on Phase B kickoff.

**Success Criteria:**
- ✅ All Phase A code verified working on real devices
- ✅ Multi-device sync tested and working
- ✅ No critical bugs found
- ✅ Phase B roadmap finalized
- ✅ Single source of truth document established

---

## DAY-BY-DAY BREAKDOWN

---

## TUESDAY, 10 FEBRUARY (TODAY) - ALIGNMENT SESSION

### Morning (NOW - This Conversation)

**Deliverable:** Consolidated project documentation
- [x] Read IFTP_CONSOLIDATED_PROJECT_STATE_2026-02-10.md
- [x] Read IFTP_GAP_ANALYSIS_2026-02-10.md
- [x] Identify any inaccuracies or gaps
- [ ] Signal go/no-go for testing

**Time Estimate:** 30 minutes reading + 15 minutes feedback

**Deliverable:** Project alignment checkpoint
- [ ] Verify all information aligns with your actual codebase
- [ ] Identify any discrepancies
- [ ] Ask clarifying questions if needed

### Afternoon - BASELINE TESTING SETUP

**Objective:** Prepare for multi-device testing

**Task 1: Verify current app builds and runs**
- [ ] Pull latest code from GitHub
- [ ] Run `npx expo start` in terminal
- [ ] Open app in Expo Go on iPhone
- [ ] Navigate through all 4 screens (Onboarding → Status → Settings → Notifications)
- [ ] Verify no console errors
- [ ] Take screenshot of StatusScreen for baseline

**Task 2: Prepare second iPhone for testing**
- [ ] Clear Expo Go cache on second phone (if using second phone)
- [ ] Or prepare to use simulator if running locally
- [ ] Ensure both devices can reach same Supabase instance

**Task 3: Document baseline behavior**
- [ ] Screenshot 1: StatusScreen with pets list
- [ ] Screenshot 2: SettingsScreen with household info
- [ ] Note app version, OS version, device model
- [ ] Save baseline for comparison after testing

**Time Estimate:** 1 hour setup + 30 min documentation

---

## WEDNESDAY, 11 FEBRUARY - CRITICAL TESTING

### Morning Session (90 minutes)

**Objective:** Validate cache-first behavior

#### Test 1: Cache Miss on First Launch
**Setup:**
- [ ] Stop Expo Go app completely (swipe from app switcher)
- [ ] Clear AsyncStorage: In dev console, run `AsyncStorage.clear()`
- [ ] Restart app completely (kill & reopen)

**Steps:**
- [ ] Tap to navigate to StatusScreen
- [ ] **Observe:** Should see loading spinner initially
- [ ] **Observe:** After ~2-3 seconds, data should appear
- [ ] **Record:** Screenshot of loading state
- [ ] **Record:** Screenshot of loaded data

**Success Criteria:**
- ✅ Loading spinner appears initially
- ✅ Data appears after ~2-3 seconds (fresh from Supabase)
- ✅ No crashes or errors

**Result:** _______________

---

#### Test 2: Cache Hit on Second Launch
**Setup:**
- [ ] App is still running from Test 1 with data displayed
- [ ] Leave app for 10 seconds (let network requests settle)

**Steps:**
- [ ] Stop app completely (swipe from app switcher)
- [ ] Wait 3 seconds
- [ ] Reopen app
- [ ] Tap to navigate to StatusScreen

**Observe & Record:**
- [ ] **Timing:** Does data appear instantly (0ms) or does spinner show?
- [ ] **Timing:** Start stopwatch when app opens, stop when data is visible
- [ ] **Screenshot:** Capture the instant-load moment if possible
- [ ] **Background refresh:** Wait 10 seconds, watch for silent data refresh

**Success Criteria:**
- ✅ Data appears instantly (no loading spinner)
- ✅ Load time <100ms
- ✅ After 5-10 seconds, data silently refreshes from Supabase

**Result:** _______________

---

#### Test 3: Settings Screen Cache
**Setup:**
- [ ] App is running, navigate to SettingsScreen
- [ ] Wait 5 seconds (let initial load complete)

**Steps:**
- [ ] Close app completely
- [ ] Reopen app
- [ ] Tap Settings button

**Observe & Record:**
- [ ] Should see cached household/members/pets instantly
- [ ] Should see silent refresh after ~2 seconds
- [ ] No loading spinner on revisit

**Success Criteria:**
- ✅ Instant data display
- ✅ Background refresh occurs
- ✅ No visible loading state on second visit

**Result:** _______________

---

### Afternoon Session (120 minutes)

**Objective:** Test multi-device real-time synchronization

#### Multi-Device Setup
**Prerequisite:** Two iOS devices on same WiFi network

**Device A:** Your primary iPhone  
**Device B:** Second iPhone or simulator

Both must:
- [ ] Be logged in as different users (or same user, different households)
- [ ] Connected to same WiFi
- [ ] Running same version of app
- [ ] Connected to same Supabase project

---

#### Test 4: Multi-Device StatusScreen Sync
**Scenario:** Device A feeds pet → Device B sees update in real-time

**Setup:**
- [ ] Device A: Open StatusScreen, view pets list
- [ ] Device B: Open StatusScreen, view same pets list
- [ ] Both show identical pet list

**Steps:**
- [ ] Device A: Tap "I FED THE PET" button for Dog
- [ ] Device A: **Observe:** Dog's LastFedDateTime updates instantly (0ms)
- [ ] Device A: **Record:** Screenshot showing updated timestamp

- [ ] Device B: **Watch screen** for real-time update
- [ ] Device B: **Record timing** - when does Device B show the update?
- [ ] Device B: **Record:** Screenshot showing updated timestamp on Device B

**Success Criteria:**
- ✅ Device A: Instant UI update (0ms)
- ✅ Device B: Real-time update appears within 2-3 seconds
- ✅ Both devices show same LastFedDateTime
- ✅ No errors or crashes

**Result:** Device B sync timing: _____ seconds

---

#### Test 5: Multi-Device SettingsScreen Sync
**Scenario:** Device A edits household name → Device B sees update

**Setup:**
- [ ] Device A: Open SettingsScreen, tap "Edit" on household name
- [ ] Device B: Viewing SettingsScreen with same household info

**Steps:**
- [ ] Device A: Change household name from "Dog House" to "Dog House v2"
- [ ] Device A: Tap "Save"
- [ ] Device A: **Observe:** Name updates instantly in UI
- [ ] Device A: **Record:** Screenshot showing updated name

- [ ] Device B: **Watch screen** for real-time update
- [ ] Device B: Does household name change on Device B?
- [ ] Device B: **Record:** Screenshot showing updated name
- [ ] Device B: **Check console:** Should NOT see "realtime: households updated" message (suppression working)

**Success Criteria:**
- ✅ Device A: Instant UI update (0ms)
- ✅ Device B: Real-time update within 2-3 seconds
- ✅ Both devices show same household name
- ✅ Device A console: NO "realtime" message (suppression worked)

**Result:** Device B sync timing: _____ seconds, Suppression working: ___

---

#### Test 6: Multi-Device Pet Addition
**Scenario:** Device A adds pet → Device B sees it appear

**Setup:**
- [ ] Device A: SettingsScreen open, Pets section visible
- [ ] Device B: SettingsScreen open, Pets section visible
- [ ] Both show same pet list (e.g., 1 pet: "Dog")

**Steps:**
- [ ] Device A: Tap "Add Pet"
- [ ] Device A: Enter pet name "Cat"
- [ ] Device A: Tap "Save"
- [ ] Device A: **Observe:** "Cat" appears in pets list
- [ ] Device A: **Record:** Screenshot showing new pet

- [ ] Device B: **Watch screen** - does "Cat" appear in pets list?
- [ ] Device B: **Record:** Screenshot showing new pet
- [ ] Device B: **Timing:** How long did it take to appear?

**Success Criteria:**
- ✅ Device A: Instant UI update (0ms)
- ✅ Device B: New pet appears within 2-3 seconds
- ✅ Both devices show "Dog" and "Cat"
- ✅ No errors

**Result:** Device B sync timing: _____ seconds

---

### Afternoon Wrap-Up (30 minutes)

**Task:** Compile results
- [ ] Save all screenshots with labels (test-4-device-b-before.png, etc.)
- [ ] Create summary table of sync timings
- [ ] Note any unexpected behavior
- [ ] Identify any bugs or issues

**Expected Outcome:** Multi-device sync is working and all real-time updates propagate correctly.

---

## THURSDAY, 12 FEBRUARY - SUPPRESSION & POLISH TESTING

### Morning Session (90 minutes)

**Objective:** Verify suppression mechanism prevents double-loads

#### Test 7: Suppression Mechanism (SettingsScreen)
**Scenario:** When Device A makes a change, it should NOT trigger a double-load

**Setup:**
- [ ] Open browser DevTools on Desktop
- [ ] Connect Device A to DevTools (chrome://inspect or Expo DevTools)
- [ ] Enable console logging

**Steps:**
- [ ] Device A: SettingsScreen open, household name visible
- [ ] Device A: Tap "Edit", change name to "Updated House v3"
- [ ] Device A: Tap "Save"
- [ ] Device A: **Watch console** during and after save

**Expected Console Behavior:**
```
(should see):
✅ "Saving household..." 
✅ "Household updated successfully"
✅ "Reloading with skipCache:true"

(should NOT see):
❌ "realtime: households updated" (twice or more)
❌ "loadData called from realtime subscription" (multiple times)
```

**Success Criteria:**
- ✅ Suppression flag works: `suppressNextRealtimeLoad.current = true`
- ✅ Only ONE reload happens (manual, not from realtime)
- ✅ No "realtime: X updated" message in console

**Result:** Console shows suppression working: _____ (Yes/No)

---

#### Test 8: Same Operation on Device B
**Setup:**
- [ ] Device B: SettingsScreen open, viewing same household

**Steps:**
- [ ] Device A: Tap "Edit" household name again, change to "Final Update"
- [ ] Device A: Tap "Save"
- [ ] Device B: **Watch screen** - does name update appear?
- [ ] Device A: **Check console** - does "realtime" message appear? (It SHOULD on Device A's realtime subscription)
- [ ] Device B: **Check console** - does "realtime" message appear? (It SHOULD on Device B)

**Expected Console Behavior:**
- **Device A:** `suppressNextRealtimeLoad = true` → NO realtime message (suppressed)
- **Device B:** NO suppression → YES "realtime: households updated" message

**Success Criteria:**
- ✅ Device A: No double-load (suppression worked)
- ✅ Device B: Receives realtime message correctly
- ✅ Device B updates UI from realtime (not suppressed)

**Result:** Device B received realtime message: _____ (Yes/No)

---

### Afternoon Session (60 minutes)

**Objective:** Verify core functionality still works perfectly post-Phase A

#### Test 9: Core Feeding Loop (Optimistic UI)
**Setup:**
- [ ] Device A: StatusScreen open, pets list visible

**Steps:**
- [ ] Device A: Tap "I FED THE PET" for Dog
- [ ] Device A: **Timing:** Start stopwatch, stop when UI updates
- [ ] Device A: **Observe:** Dog's LastFedDateTime changes instantly
- [ ] Device A: **Record:** Screenshot showing new timestamp
- [ ] Device A: Undo countdown timer should appear and count down
- [ ] Device A: Wait 5 seconds, watch background sync complete

**Success Criteria:**
- ✅ UI updates instantly (0-100ms)
- ✅ Undo countdown appears
- ✅ After 5-10 seconds, data persists (synced to Supabase)

**Result:** UI update timing: ______ ms

---

#### Test 10: Undo Functionality
**Setup:**
- [ ] Device A: StatusScreen showing recent feed with active undo countdown

**Steps:**
- [ ] Device A: Tap "Undo" button while countdown active (<2 min)
- [ ] Device A: **Observe:** LastFedDateTime reverts to previous value
- [ ] Device A: **Timing:** How fast does UI revert?
- [ ] Device A: **Record:** Screenshot showing reverted state

**Success Criteria:**
- ✅ Undo UI updates instantly (0-100ms)
- ✅ Data persists after undo (synced to Supabase)
- ✅ Undo countdown disappears

**Result:** Undo timing: ______ ms

---

#### Test 11: App Performance Check
**General observation while running tests:**

- [ ] **Memory usage:** Does app slow down after multiple operations?
- [ ] **Battery:** Any excessive battery drain?
- [ ] **Responsiveness:** UI responsive throughout tests?
- [ ] **Crashes:** Any unexpected crashes or freezes?
- [ ] **Console errors:** Any critical errors in console?

**Record:**
```
Memory usage: ______ MB
App feels (snappy / sluggish / normal)
Crashes encountered: (Yes / No) - If yes, describe: ______
Critical console errors: (Yes / No) - If yes, describe: ______
```

---

### Afternoon Wrap-Up (30 minutes)

**Task:** Consolidate all test results
- [ ] Create master test result spreadsheet
- [ ] Highlight any failures or unexpected behavior
- [ ] Identify any bugs for Phase B
- [ ] Note any performance concerns

---

## FRIDAY, 13 FEBRUARY - REVIEW & PHASE B PLANNING

### Morning Session (90 minutes)

**Objective:** Analyze test results and identify findings

#### Review Complete Test Results
- [ ] Review all screenshots and timings
- [ ] Identify patterns (sync timing consistent? Suppression working?)
- [ ] Note any anomalies or failures
- [ ] Categorize findings as:
  - ✅ Working as expected
  - ⚠️ Working but slower than ideal
  - ❌ Bug found, needs fixing

**Expected Findings:**
- Multi-device sync: 2-3 second latency (expected)
- Cache-first: Instant on revisit (expected)
- Suppression: No double-loads (expected)
- Optimistic UI: 0-100ms response (expected)

**If bugs found:**
- Document exact steps to reproduce
- Take screenshots/videos if possible
- Note severity (critical/high/medium/low)
- Add to Phase B Bug Fix list

---

#### Decision Point: Is Code Ready for Phase B?

**Go/No-Go Criteria:**

**GO if:**
- ✅ All core tests pass
- ✅ Multi-device sync working
- ✅ Suppression mechanism working
- ✅ No critical bugs found
- ✅ Performance is acceptable

**NO-GO if:**
- ❌ Critical bugs found (crashes, data loss, sync failures)
- ❌ >5 second sync latency (unacceptable UX)
- ❌ Suppression not working (double-loads)

**Current Expected Status:** GO ✅

---

### Afternoon Session (120 minutes)

**Objective:** Plan Phase B implementation roadmap

#### Phase B Priority Sequencing

Based on current status, Phase B has 6 major items:

1. **Supabase Auth** (Security critical)
2. **React Navigation** (Architecture critical)
3. **Component Extraction** (Maintainability critical)
4. **Push Notifications** (Feature critical)
5. **Feed Reminders UI** (Feature)
6. **Pro Subscription** (Feature)

**Task 1: Prioritize Phase B items**

As Jarques, decide the order. Suggested approach:

**Week 1 (Priority 1 & 2):** Auth + Navigation
- **Why:** Blocking items for subsequent features
- **Effort:** 2 full sessions (1 per item)
- **Output:** App with proper routing and security foundation

**Week 2 (Priority 3):** Component Extraction
- **Why:** StatusScreen/SettingsScreen are too large
- **Effort:** 1.5 sessions
- **Output:** Smaller, testable components

**Week 3 (Priority 4):** Push Notifications
- **Why:** Core feature, relatively contained scope
- **Effort:** 1 session
- **Output:** Real notifications working

**Week 4 (Priority 5 & 6):** Feed Reminders + Subscription UI
- **Effort:** 1 session each (2 total)
- **Output:** Complete feature set for MVP

---

#### Consensus with Dan

**Task 2: Coordinate with Dan on Phase B design work**

- [ ] Which screens will be affected by React Navigation?
- [ ] Are new screens needed (Auth screens)?
- [ ] Design changes needed for component extraction?
- [ ] Any design changes needed for push notifications?
- [ ] Timeline - when can Dan have designs ready?

**Recommended:** Weekly sync with Dan to ensure design stays ahead of development by 1-2 weeks.

---

#### Create Phase B Detailed Spec

**Task 3: For each Phase B item, create detailed implementation spec**

Example for "Supabase Auth":

```markdown
## Phase B Item 1: Supabase Auth Integration

### Goal
Replace email/ID identity with Supabase Auth (Magic Links)

### Files to Modify
- src/lib/supabaseClient.ts - Add Auth config
- src/screens/OnboardingFlow.tsx - Add Auth sign-up/sign-in
- src/lib/database.ts - Update session handling
- Supabase Dashboard - Update RLS policies

### Acceptance Criteria
- User can sign up with email (Magic Link)
- User can sign in with email (Magic Link)
- Session persists across app restarts
- RLS policies check auth.uid() correctly
- Old users can migrate to Auth
- No data loss during migration

### Estimated Effort
- Research: 1 hour (Supabase Auth docs)
- Implementation: 3-4 hours
- Testing: 1-2 hours
- Total: 1 full session (6-8 hours)

### Testing Plan
- [ ] Sign up with new email
- [ ] Receive magic link
- [ ] Click link, sign in
- [ ] Create household
- [ ] Close app, reopen
- [ ] Still signed in
- [ ] Test with 2 accounts, same household
```

**Task 4:** Create similar specs for other 5 Phase B items

---

### End of Week Wrap-Up (30 minutes)

**Deliverables by End of Friday:**

- [ ] Complete test results (all 11 tests) with findings
- [ ] Phase B priority order decided
- [ ] Phase B detailed specs created (1 per item)
- [ ] Dan coordinated on design timeline
- [ ] Weekly sync scheduled for next week

---

## NEXT WEEK (17-21 FEB) - PHASE B KICKOFF

**If all tests pass:**

**Week 1 Target:** Auth + Navigation

- Session 1: Supabase Auth integration
- Session 2: React Navigation setup
- Session 3: Testing + bug fixes
- Session 4: Component extraction begins

---

## DECISION TREE

```
START: Phase A Testing Complete?
  │
  ├─ YES: All 11 tests pass ✅
  │  └─ RESULT: Proceed to Phase B
  │
  ├─ SOME FAIL: Non-critical bugs only ⚠️
  │  └─ RESULT: Fix bugs (1-2 hours), then Phase B
  │
  └─ CRITICAL BUG: Data loss, crashes ❌
     └─ RESULT: Debug & fix before Phase B
```

---

## SUCCESS METRICS

### Testing Success
- [ ] 10+ of 11 tests pass
- [ ] Multi-device sync latency <3 seconds
- [ ] Suppression mechanism working perfectly
- [ ] Optimistic UI <100ms response time
- [ ] No data loss observed
- [ ] No unexpected crashes

### Documentation Success
- [ ] Consolidated document accepted as source of truth
- [ ] Gap analysis completed and reviewed
- [ ] Phase B specs written and reviewed
- [ ] Team is aligned on next steps

### Project Health Success
- [ ] Code is stable and ready for Phase B
- [ ] No critical security gaps (Auth can wait for Phase B)
- [ ] No critical functionality gaps
- [ ] Team morale is high

---

## QUESTIONS FOR JARQUES

**Before you execute this plan:**

1. **Do you have access to 2 iPhones** for multi-device testing, or should we use simulator + real device?

2. **Can you block 5 hours Wednesday + Thursday** for focused testing, or do you need a different schedule?

3. **What's the absolute deadline for Phase A completion?** (Should be this Friday 2/14, or do you need more time?)

4. **On Phase B priorities - does Auth need to come first, or would you prefer Navigation first?**

5. **How often can you sync with Dan** during Phase B? (Weekly is recommended)

---

## GO / NO-GO DECISION

**Current Status:** READY TO EXECUTE ✅

Once you review the consolidated documents and confirm no major inaccuracies, we execute this action plan starting immediately.

**Estimated Timeline:**
- Testing: 2 days (Wed-Thu)
- Planning: 1 day (Fri morning)
- Phase B kickoff: Following Monday

---

**Status: PLAN APPROVED & READY**

You've built something excellent in Phase A. This testing will validate the work, and Phase B will take it to production-ready status.

Let's do this. 🚀

