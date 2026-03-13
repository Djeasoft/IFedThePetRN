// StatusScreen.tsx
// Version: 1.0.0 - React Native with Theme Support
// Version: 2.0.0 - React Web to React Native
// Version: 3.0.0 - Multi-Household Switcher Implementation
// Version: 3.1.0 - Fix: onStatusReady callback, one-time legacy cleanup
// Version: 3.2.0 - Fix: naming collision between state setter and DB import for currentHouseholdId
// Version: 3.3.0 - Fix: unreadCount lifted to App.tsx — now received and updated via props
// Version: 3.4.0 - Fix: householdId prop from App.tsx drives reload on household switch
// Version: 3.5.0 - Real-time notification subscription + bell sound on new notifications from other devices
// Version: 3.6.0 - Add suppressNotificationSoundRef prop from App.tsx for cross-screen bell suppression
// Version: 3.7.0 - Fix: merge household + notification subscriptions into one useEffect (same [activeHouseholdId] dep)
// Version: 3.8.0 - Fix: pet checkboxes render in horizontal row with flexWrap (I1)
// Version: 3.9.0 - Bug 18: React to household name + pet list changes pushed from SettingsScreen via App.tsx props so the notification subscription is never torn down by loadData() re-renders, ensuring feed_request and other standalone notifications also update the bell badge in real-time
// Version: 3.10.0 - Fix: Android safe area top inset applied to header (I6)
// Version: 3.10.1 - Logo on StatusScreen: Centered and increased size
// Version: 3.10.2 - Priority #10: Redesign history modal cards to match Dan's Figma — single-column card layout, pet names wrap freely, time+timeago on top row
// Version: 3.10.3 - iOS card shadow fix: stronger shadowOpacity/shadowRadius + iOS-only hairline border for card definition
// Version: 3.10.4 - Fix: move suppressNextRealtimeLoad + suppressNextNotificationSound refs before Supabase write in handleFeedClick and handleUndo to eliminate own-device flicker/revert race condition
// Version: 3.10.5 - Fix: suppressNextRealtimeLoad changed from boolean to counter — each feed/undo generates N+1 broadcasts (N pets + 1 feeding_events), boolean was cleared on first broadcast leaving the rest unsuppressed
// Version: 3.10.6 - Fix: remove premature finally counter reset; add 5s safety timeout; unique Supabase channel names in database.ts
// Version: 3.10.7 - Fix: replace counter-based suppression with timestamp window (suppressUntilRef) — eliminates broadcast-count dependency, no timer infrastructure needed, cross-device updates always pass through after 3s window
// Version: 3.10.6 - Fix: remove premature finally counter reset (broadcasts arrive after finally on high-latency networks); add 5s safety timeout instead. Fix non-unique Supabase channel names in database.ts (status:pets/feeding_events scoped by householdId)
// Version: 3.10.8 - UI: reduce contentContainer paddingHorizontal 24→16; remove maxWidth 320 cap from statusCard, petCheckboxContainer, historySection, upgradeSection; tighten statusCard shadow (radius 8→4, opacity 0.1→0.08, offset height 2→1, elevation 4→2)

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getCurrentUserId,
  getHouseholdsForUser,
  getPetsByHouseholdId,
  feedPet,
  getUserById,
  addNotification,
  getUnreadNotificationsCount,
  clearLegacyNotificationData,
  addFeedingEvent,
  getFeedingEventsByHouseholdId,
  undoFeedingEvent,
  getPetById,
  subscribeToHouseholdChanges,
  subscribeToNotificationChanges,
  getCachedScreenData,
  setCachedScreenData,
  CACHE_KEYS,
  setCurrentHouseholdId,    // DB function: persists to AsyncStorage
  getCurrentHouseholdId,    // DB function: reads from AsyncStorage
} from '../lib/database';
import { Pet, FeedingEvent, User, Household, UNDO_WINDOW_MS } from '../lib/types';
import { formatTime, getTimeAgo, formatDateHeader } from '../lib/time';
import { useTheme } from '../contexts/ThemeContext';
import { Audio } from 'expo-av';

interface StyledStatusScreenProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onStatusReady?: (userId: string, householdId: string) => void;
  // FIX v3.3.0: Lifted to App.tsx — badge count is now shared with NotificationsPanel
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
  // FIX v3.4.0: App.tsx passes the active household ID as prop so switches propagate here
  householdId?: string;
  // FIX v3.6.0: Shared ref from App.tsx — when SettingsScreen creates a notification,
  // this ref is set to true so we skip the bell sound for that event
  suppressNotificationSoundRef?: React.MutableRefObject<boolean>;
  // FIX v3.9.0 (Bug 18): Pushed from App.tsx when SettingsScreen changes household name or pets.
  // Avoids a full reload — just patches local state instantly on Device A.
  overrideHouseholdName?: string;
  overridePets?: Pet[];
}

interface HistoryEventDetails {
  event: FeedingEvent;
  petNames: string[];
  userName: string;
}

interface StatusScreenCache {
  pets: Pet[];
  household: Household | null;
  currentUser: User | null;
  isPro: boolean;
  currentHouseholdId: string | null;
  latestEvent: FeedingEvent | null;
  latestEventDetails: { petNames: string[]; userName: string } | null;
  historyEvents: HistoryEventDetails[];
  unreadCount: number;
}

export function StyledStatusScreen({
  onOpenSettings,
  onOpenNotifications,
  onStatusReady,
  unreadCount,
  onUnreadCountChange,
  householdId,
  suppressNotificationSoundRef,
  overrideHouseholdName,
  overridePets,
}: StyledStatusScreenProps) {
  const { isDark, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [feedAllSelected, setFeedAllSelected] = useState(true);
  // REMOVED: const [unreadCount, setUnreadCount] = useState(0);
  // FIX v3.3.0: unreadCount is now a prop from App.tsx
  // FIX v3.2.0: Renamed from currentHouseholdId/setCurrentHouseholdId to avoid collision
  // with the identically-named functions imported from ../lib/database above.
  // The collision caused the DB import to be shadowed, meaning the household ID was
  // never persisted to AsyncStorage and the state value remained null — silently
  // blocking the feed button guard on every press.
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  // State for async data
  const [latestEvent, setLatestEvent] = useState<FeedingEvent | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ canUndo: boolean; eventId?: string }>({ canUndo: false });

  // New state for enhanced features
  const [latestEventDetails, setLatestEventDetails] = useState<{
    petNames: string[];
    userName: string;
  } | null>(null);
  const [historyEvents, setHistoryEvents] = useState<HistoryEventDetails[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isOperationInFlight, setIsOperationInFlight] = useState(false);
  // Timestamp-based suppression: ignore own-device broadcasts until this time has passed.
  // Set to Date.now() + 3000 on feed/undo. Any broadcast arriving before that time is an
  // own-device echo and is skipped. Broadcasts from other devices arrive after the window.
  const suppressUntilRef = useRef<number>(0);

  // Ref to suppress bell sound for own-device notification actions
  const suppressNextNotificationSound = useRef(false);

  // Play notification bell sound
  const playNotificationBell = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/notification_bell.wav'),
        { shouldPlay: true, volume: 0.6 }
      );
      // Unload after playback to free memory
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      // Non-critical — don't let sound errors break the app
      console.warn('Could not play notification sound:', error);
    }
  };

  const legacyCleanupDone = useRef(false);

  // Helper function to resolve event details
  const resolveEventDetails = async (event: FeedingEvent): Promise<{
    petNames: string[];
    userName: string;
  }> => {
    // Use the new PetNames field from the event if it exists,
    // or fall back to looking them up for older records
    const petNames = event.PetNames ? event.PetNames.split(', ') : await Promise.all(
      event.PetIDs.map(async (petId) => {
        const pet = await getPetById(petId);
        return pet?.PetName || 'Unknown Pet';
      })
    );

    // Use the new FedByMemberName field or look up the user
    const userName = event.FedByMemberName || (await getUserById(event.FedByUserID))?.MemberName || 'Unknown';

    return { petNames: Array.isArray(petNames) ? petNames : [petNames], userName };
  };

  // Load data
  // 1. Unified Loading Function (with cache-first pattern)
  const loadData = async (options?: { skipCache?: boolean }) => {
    try {
      // One-time: clear legacy AsyncStorage notifications and stale cache
      if (!legacyCleanupDone.current) {
        legacyCleanupDone.current = true;
        await clearLegacyNotificationData();
      }

      const skipCache = options?.skipCache ?? false;

      // Step 1: Try cache first for instant display
      if (!skipCache) {
        const cached = await getCachedScreenData<StatusScreenCache>(CACHE_KEYS.STATUS_SCREEN);
        console.log('📦 Cache result:', cached ? 'HIT' : 'MISS', cached?.currentHouseholdId, cached?.currentUser?.MemberName);

        if (cached) {
          setPets(cached.pets);
          setHousehold(cached.household);
          setCurrentUser(cached.currentUser);
          setIsPro(cached.isPro);
          setActiveHouseholdId(cached.currentHouseholdId);  // FIX: was setCurrentHouseholdId
          setLatestEvent(cached.latestEvent);
          setLatestEventDetails(cached.latestEventDetails);
          setHistoryEvents(cached.historyEvents);
          onUnreadCountChange(cached.unreadCount);  // FIX v3.3.0: was setUnreadCount
          setLoading(false);
          // Continue with background fetch below (don't return)
        }
      }

      // Step 2: Always fetch fresh from Supabase
      const userId = await getCurrentUserId();
      console.log('👤 getCurrentUserId result:', userId);
      if (!userId) return;

      const user = await getUserById(userId);
      console.log('👤 getUserById result:', user?.MemberName, user?.UserID);
      setCurrentUser(user);

      // Get ALL households for this user
      const households = await getHouseholdsForUser(userId);
      console.log('🏠 households:', households.length, households.map(h => h.HouseholdName));
      if (households.length === 0) {
        setLoading(false);
        return;
      }

      // Get current household ID from AsyncStorage (with fallback)
      let savedHouseholdId = await getCurrentHouseholdId();  // DB function — unambiguous now
      if (!savedHouseholdId) {
        // No saved household, use first one
        savedHouseholdId = households[0].HouseholdID;
        await setCurrentHouseholdId(savedHouseholdId);       // DB function — unambiguous now
      }

      // Find the current household in the list
      const currentHousehold = households.find(h => h.HouseholdID === savedHouseholdId);
      if (!currentHousehold) {
        // Saved household is invalid (deleted?), fallback to first
        const fallback = households[0];
        await setCurrentHouseholdId(fallback.HouseholdID);   // DB function — persists to AsyncStorage
        setActiveHouseholdId(fallback.HouseholdID);          // State — updates UI
        // Recursively load with corrected household
        await loadData(options);
        return;
      }

      setHousehold(currentHousehold);
      setActiveHouseholdId(currentHousehold.HouseholdID);    // FIX: was setCurrentHouseholdId
      setIsPro(currentHousehold.IsSubscriptionPro);

      // Notify App.tsx that IDs are ready (for NotificationsPanel)
      onStatusReady?.(userId, currentHousehold.HouseholdID);

      // Fetch Pets and History for CURRENT household only
      const [householdPets, events, count] = await Promise.all([
        getPetsByHouseholdId(currentHousehold.HouseholdID),
        getFeedingEventsByHouseholdId(currentHousehold.HouseholdID),
        getUnreadNotificationsCount(currentHousehold.HouseholdID, userId)
      ]);

      setPets(householdPets);
      onUnreadCountChange(count);  // FIX v3.3.0: was setUnreadCount

      // Update the Latest Event and History list
      let resolvedLatestDetails: { petNames: string[]; userName: string } | null = null;
      let resolvedHistory: HistoryEventDetails[] = [];

      if (events.length > 0) {
        const latest = events[0];
        setLatestEvent(latest);

        // Resolve names for the latest event
        resolvedLatestDetails = await resolveEventDetails(latest);
        setLatestEventDetails(resolvedLatestDetails);

        // Resolve names for the history list (up to 30)
        resolvedHistory = await Promise.all(
          events.slice(0, 30).map(async (evt) => {
            const details = await resolveEventDetails(evt);
            return { event: evt, ...details };
          })
        );
        setHistoryEvents(resolvedHistory);
      } else {
        setLatestEvent(null);
        setLatestEventDetails(null);
        setHistoryEvents([]);
      }

      // Step 3: Write fresh data to cache
      await setCachedScreenData<StatusScreenCache>(CACHE_KEYS.STATUS_SCREEN, {
        pets: householdPets,
        household: currentHousehold,
        currentUser: user,
        isPro: currentHousehold.IsSubscriptionPro,
        currentHouseholdId: currentHousehold.HouseholdID,
        latestEvent: events.length > 0 ? events[0] : null,
        latestEventDetails: resolvedLatestDetails,
        historyEvents: resolvedHistory,
        unreadCount: count,
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lifecycle: initial load + local-only undo timer (zero network calls)
  useEffect(() => {
    loadData();

    // Timer checks undo deadline using LOCAL state only
    const interval = setInterval(() => {
      setLatestEvent((currentLatestEvent) => {
        if (!currentLatestEvent || !currentLatestEvent.UndoDeadline) {
          setUndoInfo({ canUndo: false });
          return currentLatestEvent;
        }

        const now = new Date();
        const deadline = new Date(currentLatestEvent.UndoDeadline);
        if (now <= deadline) {
          setUndoInfo({ canUndo: true, eventId: currentLatestEvent.EventID });
        } else {
          setUndoInfo({ canUndo: false });
        }

        return currentLatestEvent; // Return unchanged — we're only reading
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Real-time listeners: household data changes + new notifications.
  // FIX v3.7.0: Both subscriptions share ONE useEffect with [activeHouseholdId] only.
  // Previously, the notification subscription lived in its own useEffect that also
  // depended on currentUser?.UserID. Every time loadData() refreshed currentUser
  // (triggered by any pet/feeding_event change), the notification subscription was
  // torn down and briefly recreated — creating a window where standalone notifications
  // (e.g. feed_request) could arrive and be missed, leaving the bell badge stale.
  // Merging them here ensures the notification subscription is never disrupted by
  // incidental state updates from loadData().
  useEffect(() => {
    if (!activeHouseholdId) return;

    // Subscription 1: pets + feeding_events changes → full data reload
    const unsubscribeHousehold = subscribeToHouseholdChanges(activeHouseholdId, () => {
      if (Date.now() < suppressUntilRef.current) {
        // Own-device echo — still within suppression window, skip
        return;
      }
      loadData();
    });

    // Subscription 2: notification inserts → bell badge + sound only (no full reload)
    // Uses getCurrentUserId() inside the callback (reads AsyncStorage fresh each time)
    // so no closure dependency on currentUser state.
    const unsubscribeNotifications = subscribeToNotificationChanges(activeHouseholdId, async () => {
      if (suppressNextNotificationSound.current || suppressNotificationSoundRef?.current) {
        suppressNextNotificationSound.current = false;
        if (suppressNotificationSoundRef) suppressNotificationSoundRef.current = false;
      } else {
        playNotificationBell();
      }

      try {
        const userId = await getCurrentUserId();
        if (userId && activeHouseholdId) {
          const count = await getUnreadNotificationsCount(activeHouseholdId, userId);
          onUnreadCountChange(count);
        }
      } catch (error) {
        console.error('Error refreshing notification count:', error);
      }
    });

    return () => {
      unsubscribeHousehold();
      unsubscribeNotifications();
    };
  }, [activeHouseholdId]);

  // FIX v3.4.0: React to household switches driven by App.tsx.
  // When App.tsx changes the householdId prop (after SettingsScreen reports a switch),
  // reload the screen for the new household.
  //
  // The ref prevents a double-load on initial boot:
  //   null → id_A  (App.tsx gets the ID from onStatusReady; initial loadData already ran — skip)
  //   id_A → id_B  (actual switch — reload) ✅
  const prevHouseholdIdPropRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevHouseholdIdPropRef.current;
    prevHouseholdIdPropRef.current = householdId ?? null;

    if (householdId && prev && householdId !== prev) {
      loadData({ skipCache: true });
    }
  }, [householdId]);

  // FIX v3.9.0 (Bug 18): When SettingsScreen saves a new household name, App.tsx pushes
  // it here via the overrideHouseholdName prop. Patch local state instantly — no reload needed.
  useEffect(() => {
    if (overrideHouseholdName === undefined) return;
    setHousehold((prev) => prev ? { ...prev, HouseholdName: overrideHouseholdName } : prev);
  }, [overrideHouseholdName]);

  // FIX v3.9.0 (Bug 18): When SettingsScreen adds or deletes a pet, App.tsx pushes the
  // updated pet list here. Patch local state and reset selection to avoid stale checkbox state.
  useEffect(() => {
    if (overridePets === undefined) return;
    setPets(overridePets);
    // Reset selection — previously selected pet IDs may no longer be valid
    setSelectedPetIds([]);
    setFeedAllSelected(true);
  }, [overridePets]);

  // Handle pet selection
  const handlePetToggle = (petId: string) => {
    setFeedAllSelected(false);
    setSelectedPetIds((prev) => {
      if (prev.includes(petId)) {
        return prev.filter((id) => id !== petId);
      } else {
        return [...prev, petId];
      }
    });
  };

  const handleFeedAllToggle = () => {
    if (feedAllSelected) {
      setFeedAllSelected(false);
    } else {
      setFeedAllSelected(true);
      setSelectedPetIds([]);
    }
  };

  // Feed logic — Optimistic Update Pattern
  const handleFeedClick = async () => {
    console.log('🔴 Feed button pressed', { currentUser: currentUser?.MemberName, activeHouseholdId });

    if (!currentUser || !activeHouseholdId) return;  // FIX: was currentHouseholdId
    if (isOperationInFlight) return; // Prevent double-tap

    const petsToFeed = feedAllSelected
      ? pets
      : pets.filter((p) => selectedPetIds.includes(p.PetID));

    if (petsToFeed.length === 0) return;

    // --- SNAPSHOT: Capture current state for rollback ---
    const previousPets = [...pets];
    const previousLatestEvent = latestEvent;
    const previousLatestEventDetails = latestEventDetails;
    const previousHistoryEvents = [...historyEvents];
    const previousUndoInfo = { ...undoInfo };

    // --- BUILD: Optimistic state ---
    const now = new Date();
    const nowISO = now.toISOString();
    const undoDeadline = new Date(now.getTime() + UNDO_WINDOW_MS).toISOString();
    const petNames = petsToFeed.map((p) => p.PetName).join(', ');
    const tempEventId = `temp-${Date.now()}`;

    const optimisticEvent: FeedingEvent = {
      EventID: tempEventId,
      HouseholdID: activeHouseholdId,              // FIX: was currentHouseholdId
      FedByUserID: currentUser.UserID,
      FedByMemberName: currentUser.MemberName,
      PetIDs: petsToFeed.map((p) => p.PetID),
      PetNames: petNames,
      Timestamp: nowISO,
      UndoDeadline: undoDeadline,
    };

    const optimisticPets = pets.map((pet) => {
      if (petsToFeed.some((p) => p.PetID === pet.PetID)) {
        return {
          ...pet,
          LastFedDateTime: nowISO,
          LastFedByUserID: currentUser.UserID,
          UndoDeadline: undoDeadline,
        };
      }
      return pet;
    });

    const optimisticDetails = {
      petNames: petsToFeed.map((p) => p.PetName),
      userName: currentUser.MemberName,
    };

    const optimisticHistoryEntry: HistoryEventDetails = {
      event: optimisticEvent,
      ...optimisticDetails,
    };

    // --- APPLY: Update UI instantly ---
    // Suppress own-device real-time echo for 3 seconds. Any broadcast arriving
    // within this window is our own write reflecting back — skip it.
    // Broadcasts from other devices arrive after this window and call loadData() normally.
    suppressUntilRef.current = Date.now() + 3000;
    suppressNextNotificationSound.current = true;
    setIsOperationInFlight(true);
    setPets(optimisticPets);
    setLatestEvent(optimisticEvent);
    setLatestEventDetails(optimisticDetails);
    setHistoryEvents([optimisticHistoryEntry, ...previousHistoryEvents].slice(0, 30));
    setUndoInfo({ canUndo: true, eventId: tempEventId });

    // --- SYNC: Push to Supabase in background ---
    try {
      // Feed all pets in parallel (not sequential!)
      await Promise.all(petsToFeed.map((pet) => feedPet(pet.PetID, currentUser.UserID)));

      // Create the feeding event (with proper UndoDeadline)
      const createdEvent = await addFeedingEvent({
        HouseholdID: activeHouseholdId,             // FIX: was currentHouseholdId
        FedByUserID: currentUser.UserID,
        FedByMemberName: currentUser.MemberName,
        PetIDs: petsToFeed.map((p) => p.PetID),
        PetNames: petNames,
        Timestamp: nowISO,
        UndoDeadline: undoDeadline,
      });

      // Fire-and-forget notification
      addNotification({
        householdId: household!.HouseholdID,
        type: 'feeding',
        message: `${currentUser.MemberName} fed...\n${petNames}`,
        petName: petNames,
      });

      // Replace temp EventID with real Supabase ID
      setLatestEvent((prev) =>
        prev && prev.EventID === tempEventId ? { ...prev, EventID: createdEvent.EventID } : prev
      );
      setHistoryEvents((prev) =>
        prev.map((item) =>
          item.event.EventID === tempEventId
            ? { ...item, event: { ...item.event, EventID: createdEvent.EventID } }
            : item
        )
      );
      setUndoInfo((prev) =>
        prev.eventId === tempEventId ? { ...prev, eventId: createdEvent.EventID } : prev
      );
    } catch (error) {
      // --- ROLLBACK: Restore previous state on failure ---
      console.error('Error feeding pets:', error);
      setPets(previousPets);
      setLatestEvent(previousLatestEvent);
      setLatestEventDetails(previousLatestEventDetails);
      setHistoryEvents(previousHistoryEvents);
      setUndoInfo(previousUndoInfo);
      suppressUntilRef.current = 0; // Write failed — no broadcasts will arrive, open immediately
      Alert.alert('Error', 'Failed to feed pets. Please try again.');
    } finally {
      setIsOperationInFlight(false);
    }
  };

  // Undo logic — Optimistic Update Pattern
  const handleUndo = async (eventId: string) => {
    if (isOperationInFlight) return; // Prevent double-tap

    // Don't allow undo on temp events that haven't synced yet
    if (eventId.startsWith('temp-')) {
      Alert.alert('Please wait', 'Still syncing with server. Try again in a moment.');
      return;
    }

    // --- SNAPSHOT: Capture current state for rollback ---
    const previousPets = [...pets];
    const previousLatestEvent = latestEvent;
    const previousLatestEventDetails = latestEventDetails;
    const previousHistoryEvents = [...historyEvents];
    const previousUndoInfo = { ...undoInfo };

    // --- BUILD: Find event and compute optimistic state ---
    const eventToUndo = historyEvents.find((item) => item.event.EventID === eventId);
    if (!eventToUndo) return;

    const petIdsToUndo = eventToUndo.event.PetIDs;

    const optimisticPets = pets.map((pet) => {
      if (petIdsToUndo.includes(pet.PetID)) {
        return { ...pet, LastFedDateTime: null, LastFedByUserID: null, UndoDeadline: null };
      }
      return pet;
    });

    const optimisticHistory = historyEvents.filter((item) => item.event.EventID !== eventId);
    const newLatest = optimisticHistory.length > 0 ? optimisticHistory[0] : null;

    // --- APPLY: Update UI instantly ---
    // Suppress own-device echo for 3 seconds — same pattern as handleFeedClick.
    suppressUntilRef.current = Date.now() + 3000;
    setIsOperationInFlight(true);
    setPets(optimisticPets);
    setLatestEvent(newLatest ? newLatest.event : null);
    setLatestEventDetails(newLatest ? { petNames: newLatest.petNames, userName: newLatest.userName } : null);
    setHistoryEvents(optimisticHistory);
    setUndoInfo({ canUndo: false });

    // --- SYNC: Push to Supabase in background ---
    try {
      await undoFeedingEvent(eventId);
    } catch (error) {
      // --- ROLLBACK: Restore previous state on failure ---
      console.error('Error undoing feeding:', error);
      setPets(previousPets);
      setLatestEvent(previousLatestEvent);
      setLatestEventDetails(previousLatestEventDetails);
      setHistoryEvents(previousHistoryEvents);
      setUndoInfo(previousUndoInfo);
      suppressUntilRef.current = 0; // Write failed — no broadcasts will arrive, open immediately
      Alert.alert('Error', 'Failed to undo feeding. Please try again.');
    } finally {
      setIsOperationInFlight(false);
    }
  };

  // (getLatestFeedingEvent and canUndoLatest removed — undo timer now uses local state)

  // Determine visible history based on tier
  const visibleHistory = isPro ? historyEvents.slice(0, 5) : historyEvents.slice(0, 1);
  const hasMoreHistory = isPro && historyEvents.length > 5;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onOpenSettings}
            style={styles.menuButton}
            activeOpacity={0.6}
          >
            <Ionicons name="menu" size={28} color={theme.text} />
          </TouchableOpacity>

          {/* Logo - Theme-aware */}
          <View style={styles.logoContainer}>
            <Image
              source={isDark
                ? require('../../assets/IFTP_Logo_White_text.png')
                : require('../../assets/IFTP_Logo_Black_text.png')
              }
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Notifications */}
          <TouchableOpacity
            onPress={onOpenNotifications}
            style={styles.notificationButton}
            activeOpacity={0.6}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.notificationBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Household Name */}
        {household && (
          <Text style={[styles.householdName, { color: theme.textTertiary }]}>
            {household.HouseholdName}
          </Text>
        )}

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: theme.surface }]}>
          {latestEvent ? (
            <>
              <Text style={[styles.statusLabel, { color: theme.primary }]}>LAST FED</Text>
              <View style={styles.timeDisplay}>
                <Text style={[styles.timeText, { color: theme.text }]}>
                  {formatTime(new Date(latestEvent.Timestamp).getTime())}
                </Text>
              </View>
              {latestEventDetails && (
                <>
                  <Text style={[styles.petNamesText, { color: theme.text }]}>
                    {latestEventDetails.petNames.join(', ')}
                  </Text>
                  <Text style={[styles.fedByText, { color: theme.textSecondary }]}>
                    Fed by {latestEventDetails.userName}
                  </Text>
                </>
              )}
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>
                {getTimeAgo(new Date(latestEvent.Timestamp).getTime())}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.statusLabel, { color: theme.primary }]}>LAST FED</Text>
              <View style={styles.timeDisplay}>
                <Text style={[styles.timeText, { color: theme.text }]}>- - : - -</Text>
              </View>
              <Text style={[styles.timeAgo, { color: theme.textTertiary }]}>Never fed</Text>
            </>
          )}
        </View>

        {/* Pet Checkboxes (Pro only, multiple pets) */}
        {isPro && pets.length > 1 && (
          <View style={[styles.petCheckboxContainer, { backgroundColor: theme.surface }]}>
            {/* Feed All checkbox — full width row */}
            <TouchableOpacity
              onPress={handleFeedAllToggle}
              style={styles.checkboxRow}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                { borderColor: theme.border },
                feedAllSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}>
                {feedAllSelected && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxLabel, { color: theme.text }]}>Feed all</Text>
            </TouchableOpacity>

            {/* Individual pet checkboxes — horizontal row with wrap */}
            {/* FIX v3.8.0: Wrapped in petCheckboxRow (flexDirection: row, flexWrap: wrap) */}
            <View style={styles.petCheckboxRow}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.PetID}
                  onPress={() => handlePetToggle(pet.PetID)}
                  style={styles.checkboxRowInline}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    { borderColor: theme.border },
                    !feedAllSelected && selectedPetIds.includes(pet.PetID) && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary
                    }
                  ]}>
                    {!feedAllSelected && selectedPetIds.includes(pet.PetID) && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text style={[styles.checkboxLabel, { color: theme.text }]}>{pet.PetName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Feed Button */}
        <View style={styles.feedButtonContainer}>
          <TouchableOpacity
            onPress={handleFeedClick}
            style={[
              styles.feedButton,
              { backgroundColor: theme.primary },
              isOperationInFlight && { opacity: 0.5 },
            ]}
            activeOpacity={0.8}
            disabled={isOperationInFlight}
          >
            <Text style={styles.feedButtonText}>I FED THE PET</Text>
          </TouchableOpacity>

          {undoInfo.canUndo && (
            <TouchableOpacity
              onPress={() => undoInfo.eventId && handleUndo(undoInfo.eventId)}
              style={[styles.undoButton, isOperationInFlight && { opacity: 0.5 }]}
              activeOpacity={0.7}
              disabled={isOperationInFlight}
            >
              <Text style={[styles.undoButtonText, { color: theme.textTertiary }]}>
                Undo (available for 2 minutes)
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Feeding History Section */}
        {historyEvents.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.historyHeader, { color: theme.textTertiary }]}>RECENT</Text>

            {/* Visible history entries */}
            {visibleHistory.map((item) => (
              <View
                key={item.event.EventID}
                style={[styles.historyEntry, { backgroundColor: theme.surface }]}
              >
                <View style={styles.historyEntryLeft}>
                  <Text style={[styles.historyEntryTime, { color: theme.text }]}>
                    {formatTime(new Date(item.event.Timestamp).getTime())}
                  </Text>
                  <Text style={[styles.historyEntryFedBy, { color: theme.textSecondary }]}>
                    {item.userName} fed...
                  </Text>
                  <Text style={[styles.historyEntryPets, { color: theme.textSecondary }]}>
                    {item.petNames.join(', ')}
                  </Text>
                </View>
                <Text style={[styles.historyEntryTimeAgo, { color: theme.textTertiary }]}>
                  {getTimeAgo(new Date(item.event.Timestamp).getTime())}
                </Text>
              </View>
            ))}

            {/* Pro: VIEW ALL button */}
            {hasMoreHistory && (
              <TouchableOpacity
                onPress={() => setShowHistoryModal(true)}
                style={[styles.viewAllButton, { backgroundColor: theme.surface }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllText, { color: theme.primary }]}>VIEW ALL</Text>
              </TouchableOpacity>
            )}

            {/* Free: Blurred entries with upgrade overlay */}
            {!isPro && historyEvents.length > 1 && (
              <View style={styles.blurredHistoryContainer}>
                {/* Blurred preview entries */}
                {historyEvents.slice(1, 3).map((item) => (
                  <View
                    key={`blurred-${item.event.EventID}`}
                    style={[styles.historyEntry, styles.blurredEntry, { backgroundColor: theme.surface }]}
                  >
                    <View style={styles.historyEntryLeft}>
                      <Text style={[styles.historyEntryTime, { color: theme.text }]}>
                        {formatTime(new Date(item.event.Timestamp).getTime())}
                      </Text>
                      <Text style={[styles.historyEntryFedBy, { color: theme.textSecondary }]}>
                        {item.userName} fed...
                      </Text>
                    </View>
                    <Text style={[styles.historyEntryTimeAgo, { color: theme.textTertiary }]}>
                      {getTimeAgo(new Date(item.event.Timestamp).getTime())}
                    </Text>
                  </View>
                ))}

                {/* Upgrade overlay */}
                <View style={[styles.upgradeOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)' }]}>
                  <TouchableOpacity
                    onPress={onOpenSettings}
                    style={[styles.upgradeOverlayButton, { backgroundColor: theme.primary }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.upgradeOverlayButtonText}>
                      Upgrade to see 30 days history
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Advertisement and Upgrade (Free tier only) */}
        {!isPro && (
          <View style={styles.upgradeSection}>
            <View style={[styles.adBanner, { backgroundColor: theme.surface }]}>
              <Text style={[styles.adText, { color: theme.textTertiary }]}>Advertisement</Text>
            </View>
            <TouchableOpacity
              onPress={onOpenSettings}
              style={styles.upgradeLinkButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.upgradeLinkText, { color: theme.textTertiary }]}>
                Upgrade to Pro
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Full History Modal - Pro users only */}
      {isPro && (
        <Modal
          visible={showHistoryModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={[styles.modalContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Feed History</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textTertiary }]}>Last 30 days</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Content */}
            <ScrollView style={styles.modalScrollView}>
              {historyEvents.map((item, index) => {
                const eventDate = new Date(item.event.Timestamp);
                const prevEventDate = index > 0
                  ? new Date(historyEvents[index - 1].event.Timestamp)
                  : null;
                const isNewDay = !prevEventDate ||
                  eventDate.toDateString() !== prevEventDate.toDateString();

                return (
                  <View key={item.event.EventID}>
                    {isNewDay && (
                      <Text style={[styles.modalDateHeader, { color: theme.textSecondary }]}>
                        {formatDateHeader(eventDate)}
                      </Text>
                    )}
                    <View style={[styles.modalHistoryCard, { backgroundColor: theme.surface }]}>
                      {/* Top row: time + time ago */}
                      <View style={styles.modalHistoryCardTopRow}>
                        <Text style={[styles.modalHistoryTime, { color: theme.text }]}>
                          {formatTime(eventDate.getTime())}
                        </Text>
                        <Text style={[styles.modalHistoryTimeAgo, { color: theme.textTertiary }]}>
                          {getTimeAgo(eventDate.getTime())}
                        </Text>
                      </View>
                      {/* Pet names — wraps freely */}
                      <Text style={[styles.modalHistoryPets, { color: theme.text }]}>
                        {item.petNames.join(', ')}
                      </Text>
                      {/* Fed by */}
                      <Text style={[styles.modalHistoryFedBy, { color: theme.textSecondary }]}>
                        Fed by {item.userName}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Header
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuButton: {
    padding: 8,
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    height: 26.4,
    width: 165,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },

  // Household Name
  householdName: {
    fontSize: 14,
    marginBottom: 32,
  },

  // Status Card
  statusCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 16,
  },
  timeDisplay: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '600',
    textAlign: 'center',
  },
  petNamesText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  fedByText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  timeAgo: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // Pet Checkboxes
  petCheckboxContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    width: '100%',
  },
  // Full-width row for "Feed all"
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  // FIX v3.8.0: Horizontal wrapping row for individual pet checkboxes
  petCheckboxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  // FIX v3.8.0: Inline style for each individual pet checkbox item
  checkboxRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginRight: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Feed Button
  feedButtonContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  feedButton: {
    width: 192,
    height: 192,
    borderRadius: 96,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fb314a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  feedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  undoButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  undoButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // History Section
  historySection: {
    width: '100%',
    marginBottom: 24,
  },
  historyHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 12,
  },
  historyEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyEntryLeft: {
    flex: 1,
  },
  historyEntryTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyEntryFedBy: {
    fontSize: 12,
    marginTop: 2,
  },
  historyEntryPets: {
    fontSize: 12,
    marginTop: 2,
  },
  historyEntryTimeAgo: {
    fontSize: 12,
    marginLeft: 12,
  },
  blurredEntry: {
    opacity: 0.4,
  },
  blurredHistoryContainer: {
    position: 'relative',
  },
  upgradeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  upgradeOverlayButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  upgradeOverlayButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  viewAllButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },

  // Upgrade Section
  upgradeSection: {
    width: '100%',
    alignItems: 'center',
  },
  adBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
  },
  adText: {
    fontSize: 12,
  },
  upgradeLinkButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeLinkText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalDateHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalHistoryCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
    ...Platform.select({
      ios: {
        borderWidth: 0.4,
        borderColor: 'rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  modalHistoryCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  modalHistoryTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalHistoryPets: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  modalHistoryFedBy: {
    fontSize: 12,
  },
  modalHistoryTimeAgo: {
    fontSize: 12,
  },
});