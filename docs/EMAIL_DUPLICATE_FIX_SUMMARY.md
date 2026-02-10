# Fix: Email Duplicate Key Constraint Error

**Date:** Tuesday, February 10, 2026  
**Issue:** After "Reset to New User", Dan gets error when re-entering the same email address  
**Error Code:** `23505` (duplicate key violates unique constraint)  
**Root Cause:** `handleMainMemberComplete` was blindly creating users without checking if they exist  

---

## The Problem

### Before Fix (Lines 119-120)
```typescript
// ❌ WRONG: Always creates new user, even if email already exists in Supabase
const user = await createUser(name, email, true, 'Active');
```

### After Reset Scenario
1. Dan completes onboarding with `dan@example.com` → user created in Supabase ✅
2. Dan resets the app (clears local state only)
3. Dan goes through onboarding again with same email `dan@example.com`
4. Line 120 tries to create ANOTHER user with same email
5. Supabase rejects it because emails are unique ❌

---

## The Solution

### After Fix (Lines 115-125)
```typescript
// ✅ CORRECT: Check if user exists first
let user = await getUserByEmail(email);

if (user) {
  // Update existing user
  await updateUser(user.UserID, {
    MemberName: name,
    IsMainMember: true,
    InvitationStatus: 'Active',
  });
} else {
  // Create new user only if doesn't exist
  user = await createUser(name, email, true, 'Active');
}
```

### Why This Works

1. **First Run:** 
   - `getUserByEmail(email)` returns `null` → create new user ✅

2. **After Reset with Same Email:**
   - `getUserByEmail(email)` returns existing user → update it ✅
   - No duplicate key error because we're not creating a new user

3. **New Email:**
   - `getUserByEmail(email)` returns `null` → create new user ✅

---

## Design Pattern: Consistency

This fix makes the **"Create Household"** flow consistent with the **"Join Household"** flow:

### Join Household (handleMemberComplete) - Already Had This Logic ✅
```typescript
// Line 162-173: Smart user handling
let user = await getUserByEmail(email);

if (user) {
  await updateUser(user.UserID, {...});  // Reuse existing user
} else {
  user = await createUser(name, email, false, 'Active');  // Create only if new
}
```

### Create Household (handleMainMemberComplete) - Now Matches It ✅
```typescript
// Line 115-125: Now has same pattern
let user = await getUserByEmail(email);

if (user) {
  await updateUser(user.UserID, {...});  // Reuse existing user
} else {
  user = await createUser(name, email, true, 'Active');  // Create only if new
}
```

**DRY Principle:** Both flows now use the same pattern—less code duplication, fewer bugs.

---

## Testing Checklist

After applying this fix, Dan should be able to:

- [ ] **Fresh Install:** Create household with `dan@example.com` → works ✅
- [ ] **Reset & Retry:** Reset app → enter same email → works ✅
- [ ] **Reset & New Email:** Reset app → enter different email → works ✅
- [ ] **Join Household:** Can join household with same email after reset ✅
- [ ] **Update on Reset:** When reusing email, name/status get updated (not duplicated) ✅

---

## Impact Analysis

### What Changed
- `handleMainMemberComplete()` function (24 lines → 39 lines)
- More robust user handling, no more blindly creating duplicates

### What Stayed the Same
- All imports (both `getUserByEmail` and `updateUser` were already imported)
- All other onboarding flows (Name, Email, InviteCode steps)
- Database schema or Supabase configuration
- All other files untouched

### Backwards Compatibility
✅ Fully backwards compatible—new users still work, existing users now work better

---

## Why This is the Right Fix

1. **User Expectation:** Users expect to be able to use the same email after a reset
2. **DRY Principle:** Mirrors the join household logic—one pattern for both create/join
3. **Minimal Change:** Only 4 lines of additional logic, no new dependencies
4. **Safe:** If user exists, we update it; if new, we create it—no edge cases
5. **Consistent:** Both main member and member flows now work the same way

---

## Files Modified

- **src/screens/OnboardingFlow.tsx**
  - Function: `handleMainMemberComplete()` (Lines 108-145)
  - Change Type: Logic enhancement (check before create)
  - Lines Changed: ~15 lines

---

## Next Steps

1. Copy the updated `OnboardingFlow.tsx` to your project
2. Test the flow locally:
   - Fresh onboarding with email `dan@example.com` ✅
   - Reset app
   - Onboarding again with same email `dan@example.com` ✅
   - Should work without error
3. Publish to `eas update --branch preview`
4. Dan can now reset and test repeatedly with same email

---

## Technical Notes

### Why We Update Instead of Silently Reusing?

When a user exists after reset, we call `updateUser()` to ensure:
- Name is updated to what they entered (they might want to change it)
- `IsMainMember` is set to `true` (in case they were previously a member)
- `InvitationStatus` is set to `'Active'` (ensures they're not in pending state)

This gives us flexibility: Dan could theoretically switch between being a main member and a regular member on resets.

---

**Version:** OnboardingFlow.tsx updated to v1.1.0 (added idempotent user creation logic)
