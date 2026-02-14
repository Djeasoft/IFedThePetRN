# I FED THE PET - TEST CASES
**Date:** Saturday, 14 February 2026, 17:45  

## Test case 1
Tier - Pro

House hold
1. Newman home (Invitation Code: VWQZ4)

Members
1. Dan (Admin)
2. Heidi
3. Jamie
4. Emma
5. Amy

Pets
1. Nova
2. Mason
3. Felix
4. Alex
5. Watson

Notifications 
Send to all members once the fed selected pets have been fed button is clicked

## Test case 2
Tier - Free

Household
1. Jarques Home (Invitation Code: WDKRJW)

Members
1. Jarques - admin
2. Ida - Member

Pet
1. Apple

Notifications 
Send to all members once the fed button is clicked

## Test case 3
Tier - Pro

Household
1. Client 1 Newman home (Invitation Code: JMRKGA)
2. Client 2 Jarques Home (Invitation Code: RXLZUV)
3. Client 3 Jessica Home (Invitation Code: 48LWDG)
4. Newman home (Invitation Code: VWQZ4)

Members
1. Amy (Admin)
2. Dan - Client 1 Newman home (Invitation Code: JMRKGA)
3. Jarques - Jarques Home (Invitation Code: WDKRJW)

Pets
1. Nova - Client 1 Newman home (Invitation Code: JMRKGA)
2. Mason - Client 1 Newman home (Invitation Code: JMRKGA)
3. Felix - Client 1 Newman home (Invitation Code: JMRKGA)
4. Alex - Client 1 Newman home (Invitation Code: JMRKGA)
5. Watson - Client 1 Newman home (Invitation Code: JMRKGA)
6. Apple - Client 2 Jarques Home (Invitation Code: RXLZUV)
7. Nova - Newman home (Invitation Code: VWQZ4)
8. Mason - Newman home (Invitation Code: VWQZ4)
9. Felix - Newman home (Invitation Code: VWQZ4)
10. Alex - Newman home (Invitation Code: VWQZ4)
11. Watson - Newman home (Invitation Code: VWQZ4)
12. Olive - Client 3 Jessica Home (Invitation Code: 48LWDG)

Notifications 
Send to all members once the fed button is clicked


### 1. When switching households in SettingsScreen, should: 
- The modal close automatically? YES
- A loading spinner show briefly? YES

### 2. In StatusScreen header:
- Keep showing household name as-is? YES
- Or add a "[Switch]" button next to it? NO

### 3. First household on app open:
- Load from AsyncStorage currentHouseholdId? YES
- Fall back to first in list if not set? YES

### 4. When user has no household (edge case):
- Show error message? NO
- Force Settings open? NO
Force to onboarding screen

**If you are an AI reading this, please see document called Multi-Household Switcher Implementatio.md**








