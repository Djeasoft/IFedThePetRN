# Phase A: Complete Migration & Polish — Session Log
**Date:** Saturday, 7 February 2026
**Tool:** Claude Code (VSCode Extension)
**Model:** Claude Opus 4.6

---

## Objective

Complete Phase A of the project roadmap:
1. Migrate remaining ~3-5 AsyncStorage functions to Supabase (user-household relationships)
2. Apply Cache-First pattern to pets, households, and feeding events
3. Add real-time subscriptions to SettingsScreen (currently only on StatusScreen)
4. Clean up dead legacy code

---

## Exploration Phase

### Files Analyzed
- `src/lib/database.ts` — Full read (~1160 lines), all functions categorized
- `src/lib/types.ts` — Full read, all interfaces reviewed
- `src/lib/supabaseClient.ts` — Full read
- `src/screens/StatusScreen.tsx` — loadData, useEffects, subscription patterns
- `src/screens/SettingsScreen.tsx` — loadData, mutation handlers, no subscriptions found
- `src/screens/TestDataScreen.tsx` — Full read, uses dead getAll* functions

### Key Findings
- **6 user_household functions** still on AsyncStorage (lines 357-484)
- **No cache functions existed** — summary mentioned `getCachedCurrentUser()` but it wasn't in code
- **SettingsScreen had zero real-time subscriptions**
- **8 legacy getAll/saveAll functions** were dead code (only TestDataScreen used 3 of them)
- **No `mapUserHousehold` mapper existed** — `createUserHousehold` mapped fields inline

---

## Implementation — 7 Steps

### Step 1: Add `mapUserHousehold` mapper + refactor `createUserHousehold`
**File:** `src/lib/database.ts`

Added mapper after `mapFeedingEvent` (line 71):
```typescript
const mapUserHousehold = (data: any): UserHousehold => ({
  UserHouseholdID: data.id,
  UserID: data.user_id,
  HouseholdID: data.household_id,
  DateJoined: data.created_at,
  ReceivesReminders: data.receives_reminders,
});
```

Refactored `createUserHousehold` to use `mapUserHousehold(data)` instead of inline mapping.

### Step 2: Migrate 6 user_household functions to Supabase
**File:** `src/lib/database.ts`

| Function | Before | After |
|----------|--------|-------|
| `getAllUserHouseholds` | `AsyncStorage.getItem` | `supabase.from('user_households').select('*')` |
| `getUserHouseholdsByUserId` | getAllUserHouseholds + filter | `.select('*').eq('user_id', userId)` |
| `getUserHouseholdsByHouseholdId` | getAllUserHouseholds + filter | `.select('*').eq('household_id', householdId)` |
| `getUserHousehold` | getAllUserHouseholds + find | `.eq('user_id',...).eq('household_id',...).maybeSingle()` |
| `updateUserHouseholdReminderPref` | read/mutate/saveAll AsyncStorage | `.update({receives_reminders}).eq(...).eq(...).select().single()` |
| `saveAllUserHouseholds` | **Deleted** | No longer needed |

Removed `USER_HOUSEHOLDS` from `STORAGE_KEYS`.

### Step 3: Add cache helper functions
**File:** `src/lib/database.ts` (before subscriptions section)

```typescript
export const CACHE_KEYS = {
  STATUS_SCREEN: 'cache:statusScreen',
  SETTINGS_SCREEN: 'cache:settingsScreen',
};

export async function getCachedScreenData<T>(cacheKey: string): Promise<T | null> { ... }
export async function setCachedScreenData<T>(cacheKey: string, data: T): Promise<void> { ... }
```

### Step 4: Add `subscribeToSettingsChanges` function
**File:** `src/lib/database.ts` (after `subscribeToHouseholdChanges`)

Subscribes to 3 channels (using `settings:` prefix to avoid collision with existing `public:` channels):
- `households` table — name/pro changes
- `user_households` table — member joins/leaves
- `pets` table — pet add/delete

Skipped `users` table — no efficient filter for "members of household X", and SettingsScreen reloads on open.

### Step 5: Apply cache-first to StatusScreen
**File:** `src/screens/StatusScreen.tsx`

- Added `StatusScreenCache` interface
- Modified `loadData` to accept `options?: { skipCache?: boolean }`
- On initial load: reads cached data, sets state immediately, `setLoading(false)`
- Always fetches fresh from Supabase regardless of cache hit
- After Supabase fetch: updates state and writes to cache

### Step 6: Apply cache-first + subscriptions to SettingsScreen
**File:** `src/screens/SettingsScreen.tsx`

**Cache-first:**
- Added `SettingsScreenCache` interface
- Same pattern as StatusScreen — cache first, then Supabase refresh

**Real-time subscriptions:**
- Added `useRef` to React import
- Added `suppressNextRealtimeLoad` ref
- Added useEffect subscribing via `subscribeToSettingsChanges`
- Added `suppressNextRealtimeLoad.current = true` before Supabase calls in 5 mutation handlers:
  - `handleSaveHouseholdName`
  - `handleInviteMember`
  - `handleRemoveMember`
  - `handleAddPet`
  - `handleDeletePet`

### Step 7: Clean up dead legacy code
**File:** `src/lib/database.ts`

Removed 8 dead functions:
- `getAllUsers`, `saveAllUsers`
- `getAllHouseholds`, `saveAllHouseholds`
- `getAllPets`, `saveAllPets`
- `getAllFeedingEvents`, `saveAllFeedingEvents`

Removed 4 unused `STORAGE_KEYS`: `USERS`, `HOUSEHOLDS`, `PETS`, `FEEDING_EVENTS`

**File:** `src/screens/TestDataScreen.tsx`

Updated imports and `loadData` to use Supabase-backed queries:
- `getAllHouseholds()` -> `getHouseholdsForUser(userId)`
- `getAllPets()` -> `getPetsByHouseholdId(householdId)`
- `getAllUsers()` -> `getMembersOfHousehold(householdId)`

---

## Verification

**TypeScript compilation:** Clean (only pre-existing error in `Input.tsx` unrelated to our changes)

**Remaining AsyncStorage usage (all intentionally local):**
- Current user session (`CURRENT_USER_ID`)
- Notifications (`NOTIFICATIONS`)
- Feed reminders (`FEED_REMINDERS`)
- Onboarding flags (`ONBOARDING_COMPLETED`)
- Screen cache (`cache:statusScreen`, `cache:settingsScreen`)

---

## Files Modified
| File | Changes |
|------|---------|
| `src/lib/database.ts` | +mapUserHousehold, migrated 6 functions, +cache helpers, +subscribeToSettingsChanges, removed 8 dead functions, cleaned STORAGE_KEYS |
| `src/screens/StatusScreen.tsx` | +StatusScreenCache interface, cache-first loadData |
| `src/screens/SettingsScreen.tsx` | +SettingsScreenCache interface, cache-first loadData, +real-time subscriptions, +suppression in 5 handlers |
| `src/screens/TestDataScreen.tsx` | Updated to use Supabase-backed queries |

---

## Testing Checklist
- [ ] Feed a pet on StatusScreen — verify instant optimistic update still works
- [ ] Open Settings — should load instantly from cache (no spinner on revisit)
- [ ] Change household name in Settings — verify it saves without redundant reload
- [ ] Add/remove a pet in Settings — verify it appears/disappears
- [ ] Two-device test: feed on device A, verify device B updates via real-time
- [ ] Cold start: kill app, reopen — verify cached data shows instantly then refreshes

---

## Migration Status After Phase A
- **Fully migrated to Supabase:** ~30 functions
- **Intentionally local (AsyncStorage):** ~13 functions (notifications, session, onboarding, reminders, cache)
- **Remaining to migrate:** 0 (all cloud-appropriate functions now use Supabase)