import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentUserId,
  getHouseholdsForUser,
  getPetsByHouseholdId,
  feedPet,
  getUserById,
  addNotification,
  getUnreadNotificationsCount,
  addFeedingEvent,
  getFeedingEventsByHouseholdId,
  undoFeedingEvent,
  getPetById,
  subscribeToHouseholdChanges,
  getCachedScreenData,
  setCachedScreenData,
  CACHE_KEYS,
} from '../lib/database';
import { Pet, FeedingEvent, User, Household, UNDO_WINDOW_MS } from '../lib/types';
import { formatTime, getTimeAgo, formatDateHeader } from '../lib/time';
import { useTheme } from '../contexts/ThemeContext';

interface StyledStatusScreenProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
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
}: StyledStatusScreenProps) {
  const { isDark, theme } = useTheme();

  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [feedAllSelected, setFeedAllSelected] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
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
  const suppressNextRealtimeLoad = useRef(false);

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
      const skipCache = options?.skipCache ?? false;

      // Step 1: Try cache first for instant display (only on initial load)
      if (!skipCache && loading) {
        const cached = await getCachedScreenData<StatusScreenCache>(CACHE_KEYS.STATUS_SCREEN);
        if (cached) {
          setPets(cached.pets);
          setHousehold(cached.household);
          setCurrentUser(cached.currentUser);
          setIsPro(cached.isPro);
          setCurrentHouseholdId(cached.currentHouseholdId);
          setLatestEvent(cached.latestEvent);
          setLatestEventDetails(cached.latestEventDetails);
          setHistoryEvents(cached.historyEvents);
          setUnreadCount(cached.unreadCount);
          setLoading(false);
        }
      }

      // Step 2: Always fetch fresh from Supabase
      const userId = await getCurrentUserId();
      if (!userId) return;

      const user = await getUserById(userId);
      setCurrentUser(user);

      const households = await getHouseholdsForUser(userId);
      if (households.length === 0) {
        setLoading(false);
        return;
      }

      const currentHousehold = households[0];
      setHousehold(currentHousehold);
      setCurrentHouseholdId(currentHousehold.HouseholdID);
      setIsPro(currentHousehold.IsSubscriptionPro);

      // Fetch Pets and History together
      const [householdPets, events, count] = await Promise.all([
        getPetsByHouseholdId(currentHousehold.HouseholdID),
        getFeedingEventsByHouseholdId(currentHousehold.HouseholdID),
        getUnreadNotificationsCount()
      ]);

      setPets(householdPets);
      setUnreadCount(count);

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

    return () => clearInterval(interval);
  }, []);

  // Real-time listener for OTHER devices' changes
  useEffect(() => {
    if (!currentHouseholdId) return;

    const unsubscribe = subscribeToHouseholdChanges(currentHouseholdId, () => {
      if (suppressNextRealtimeLoad.current) {
        // This was triggered by OUR OWN action — skip the reload
        suppressNextRealtimeLoad.current = false;
        return;
      }
      loadData(); // Another device changed something — reload
    });

    return () => unsubscribe();
  }, [currentHouseholdId]);

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
    if (!currentUser || !currentHouseholdId) return;
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
      HouseholdID: currentHouseholdId,
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
    setIsOperationInFlight(true);
    setPets(optimisticPets);
    setLatestEvent(optimisticEvent);
    setLatestEventDetails(optimisticDetails);
    setHistoryEvents([optimisticHistoryEntry, ...previousHistoryEvents].slice(0, 30));
    setUndoInfo({ canUndo: true, eventId: tempEventId });
    suppressNextRealtimeLoad.current = true;

    // --- SYNC: Push to Supabase in background ---
    try {
      // Feed all pets in parallel (not sequential!)
      await Promise.all(petsToFeed.map((pet) => feedPet(pet.PetID, currentUser.UserID)));

      // Create the feeding event (with proper UndoDeadline)
      const createdEvent = await addFeedingEvent({
        HouseholdID: currentHouseholdId,
        FedByUserID: currentUser.UserID,
        FedByMemberName: currentUser.MemberName,
        PetIDs: petsToFeed.map((p) => p.PetID),
        PetNames: petNames,
        Timestamp: nowISO,
        UndoDeadline: undoDeadline,
      });

      // Fire-and-forget notification (AsyncStorage, very fast)
      addNotification({
        type: 'feeding',
        message: `${currentUser.MemberName} fed...\n${petNames}`,
        petName: petNames,
        read: false,
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
      suppressNextRealtimeLoad.current = false;
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
    setIsOperationInFlight(true);
    setPets(optimisticPets);
    setLatestEvent(newLatest ? newLatest.event : null);
    setLatestEventDetails(newLatest ? { petNames: newLatest.petNames, userName: newLatest.userName } : null);
    setHistoryEvents(optimisticHistory);
    setUndoInfo({ canUndo: false });
    suppressNextRealtimeLoad.current = true;

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
      suppressNextRealtimeLoad.current = false;
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
            {/* Feed All checkbox */}
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

            {/* Individual pet checkboxes */}
            {pets.map((pet) => (
              <TouchableOpacity
                key={pet.PetID}
                onPress={() => handlePetToggle(pet.PetID)}
                style={styles.checkboxRow}
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
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Feeding History</Text>
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
                    <View style={[styles.modalHistoryItem, { borderBottomColor: theme.border }]}>
                      <View style={styles.modalHistoryItemLeft}>
                        <Text style={[styles.modalHistoryTime, { color: theme.text }]}>
                          {formatTime(eventDate.getTime())}
                        </Text>
                        <Text style={[styles.modalHistoryFedBy, { color: theme.textSecondary }]}>
                          Fed by {item.userName}
                        </Text>
                      </View>
                      <View style={styles.modalHistoryItemRight}>
                        <Text style={[styles.modalHistoryPets, { color: theme.text }]}>
                          {item.petNames.join(', ')}
                        </Text>
                        <Text style={[styles.modalHistoryTimeAgo, { color: theme.textTertiary }]}>
                          {getTimeAgo(eventDate.getTime())}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 24,
    paddingTop: 16,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -40,
  },
  logoImage: {
    height: 22.4,
    width: 140,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 320,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 320,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
    maxWidth: 320,
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
    maxWidth: 320,
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
  modalHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalHistoryItemLeft: {
    flex: 1,
  },
  modalHistoryItemRight: {
    alignItems: 'flex-end',
  },
  modalHistoryTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalHistoryFedBy: {
    fontSize: 12,
    marginTop: 2,
  },
  modalHistoryPets: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalHistoryTimeAgo: {
    fontSize: 12,
    marginTop: 2,
  },
});
