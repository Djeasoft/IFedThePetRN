# Claude Code Prompt: Auth & Onboarding Flow Validation

## Context

I Fed The Pet is a React Native (Expo) app using Supabase for auth and database. The app uses a **three-gate routing system** in `App.tsx` (`AppRouter` component) to control navigation:

- **Gate 1:** `isAuthenticated && isEmailVerified` → If false, show `AuthScreen`
- **Gate 2:** `onboardingComplete` → If false, show `OnboardingFlow`
- **Gate 3:** Show main app (`StatusScreen`)

Auth state is managed by `AuthContext` (`src/contexts/AuthContext.tsx`) which wraps Supabase session management. The onboarding completion flag is stored in **AsyncStorage** (not Supabase) via `isOnboardingCompleted()` / `setOnboardingCompleted()` in `src/lib/database.ts`.

---

## Task: Validate that the codebase correctly handles these three user flow scenarios

Review the following files and confirm each scenario's acceptance criteria are met. If any scenario is NOT properly handled, implement the fix.

### Files to review:
- `App.tsx` — Three-gate routing in `AppRouter`
- `src/contexts/AuthContext.tsx` — Auth state provider (`isAuthenticated`, `isEmailVerified`)
- `src/screens/AuthScreen.tsx` — Sign up, login, email verification, password reset
- `src/screens/OnboardingFlow.tsx` — Onboarding steps (welcome, name, household/invite-code)
- `src/lib/database.ts` — `isOnboardingCompleted()`, `setOnboardingCompleted()`, `resetOnboarding()`, `createUser()`, `getUserByEmail()`, `updateUser()`
- `src/lib/auth.ts` — `signUpWithEmail()`, `signInWithEmail()`, `refreshSession()`

---

## Scenario 1: Brand New User

**Flow:**
1. User opens app → no Supabase session exists
2. `AuthScreen` displays (Gate 1 blocks)
3. User taps "Sign up free with email"
4. User enters email + password → taps Continue
5. `signUpWithEmail()` creates Auth user in Supabase `Authentication > Users`
6. A Supabase database trigger (or the signup process) also creates a row in the `users` table
7. User verifies email (or email confirmation is disabled for dev)
8. `AuthContext` detects `isAuthenticated = true` and `isEmailVerified = true`
9. Gate 1 passes → Gate 2 checks `isOnboardingCompleted()` → returns `false`
10. `OnboardingFlow` displays
11. User taps "Create new household"
12. User enters first name → taps Continue
13. User enters household name → taps "Create Household"
14. `handleMainMemberComplete()` runs:
    - Checks `getUserByEmail(email)` first (check-before-create pattern)
    - Creates or updates user in `users` table with `MemberName`, `IsMainMember`, `AuthUserID`
    - Creates household, user_household link, and default pet
    - Calls `setCurrentUserId()` and `setOnboardingCompleted()`
15. `onComplete()` fires → `AppRouter` sets `onboardingComplete = true`
16. Gate 3 → `StatusScreen` displays

**Acceptance Criteria:**
- [ ] Auth user created in Supabase Authentication
- [ ] Database user row created/updated in `users` table
- [ ] `onboardingCompleted` flag is ONLY set after ALL database writes succeed
- [ ] `StatusScreen` renders after onboarding completion

---

## Scenario 2: Interrupted New User (onboarding not completed)

**Flow:**
1. User signed up successfully (Auth user exists, DB user row exists)
2. User started onboarding but closed the app before completing it
3. User reopens app
4. Supabase auto-restores session → `isAuthenticated = true`, `isEmailVerified = true`
5. Gate 1 passes → Gate 2 checks `isOnboardingCompleted()` → returns `false` (AsyncStorage flag was never set)
6. `OnboardingFlow` displays again (NOT `StatusScreen`)
7. User completes onboarding this time
8. `handleMainMemberComplete()` calls `getUserByEmail(email)` → finds existing user → UPDATES instead of creating (prevents duplicate key error `23505`)
9. Onboarding completes normally

**Acceptance Criteria:**
- [ ] App does NOT navigate to `StatusScreen` when onboarding is incomplete
- [ ] App correctly routes back to `OnboardingFlow` on relaunch
- [ ] `getUserByEmail()` check prevents duplicate key constraint error on retry
- [ ] Existing user record is updated (not duplicated) with `MemberName`, `IsMainMember`, `AuthUserID`
- [ ] `setOnboardingCompleted()` is called ONLY at the END of the completion handler (after all DB writes)

---

## Scenario 3: Returning User

**Flow:**
1. User opens app → Supabase session auto-restores
2. `isAuthenticated = true`, `isEmailVerified = true`
3. Gate 1 passes → Gate 2 checks `isOnboardingCompleted()` → returns `true`
4. Gate 3 → `StatusScreen` renders with cache-first loading pattern

**Acceptance Criteria:**
- [ ] Session auto-restores without requiring re-login
- [ ] No flash of `AuthScreen` or `OnboardingFlow`
- [ ] Loading spinner shows while auth + onboarding checks are in progress
- [ ] `StatusScreen` loads with cached data first, then refreshes from Supabase

---

## Cleanup Task: Delete Dead Code

The file `src/screens/OnboardingWelcomeScreen.tsx` is **dead code**. It was the original standalone welcome screen before the onboarding flow was consolidated into `OnboardingFlow.tsx`. It is NOT imported anywhere in the codebase.

- [ ] Verify `OnboardingWelcomeScreen.tsx` has zero imports across the entire project
- [ ] Delete `src/screens/OnboardingWelcomeScreen.tsx`

---

## Key Implementation Patterns to Preserve

### Check-Before-Create (prevents duplicate key errors)
Both `handleMainMemberComplete()` and `handleMemberComplete()` in `OnboardingFlow.tsx` must use this pattern:
```typescript
let user = await getUserByEmail(email);
if (user) {
  await updateUser(user.UserID, { ... }); // Update existing
} else {
  user = await createUser(name, email, ...); // Create only if new
}
```

### Onboarding Flag is Interrupt-Safe
`setOnboardingCompleted()` is the LAST call in both completion handlers. If the app is killed before this line, the user will be routed back to onboarding on next launch. This is correct and intentional.

### Three-Gate Routing Order in AppRouter
```
Loading? → Show spinner
Gate 1: !isAuthenticated || !isEmailVerified → AuthScreen
Gate 2: !onboardingComplete → OnboardingFlow
Gate 3: → StatusScreen + Settings + Notifications
```
This order must be preserved. Gates are evaluated top-to-bottom; earlier gates block later ones.