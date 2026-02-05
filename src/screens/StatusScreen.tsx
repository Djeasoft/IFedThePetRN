import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentUserId,
  getHouseholdsForUserId,
  getPetsByHouseholdId,
  feedPet,
  getUserById,
  addNotification,
  getUnreadNotificationCount,
  addFeedingEvent,
  getFeedingEventsByHouseholdId,
  undoFeedingEvent,
  getPetById,
  getHouseholdById,
} from '../lib/database';
import { Pet, FeedingEvent, User, Household } from '../lib/types';
import { formatTime, getTimeAgo, canUndo } from '../lib/time';

interface StyledStatusScreenProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
}

export function StyledStatusScreen({
  onOpenSettings,
  onOpenNotifications,
}: StyledStatusScreenProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [feedAllSelected, setFeedAllSelected] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000); // Update every second for undo countdown
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      const user = await getUserById(userId);
      setCurrentUser(user);

      const households = await getHouseholdsForUserId(userId);
      if (households.length === 0) {
        setLoading(false);
        return;
      }

      const currentHousehold = households[0]; // Use first household for now
      setHousehold(currentHousehold);
      setCurrentHouseholdId(currentHousehold.HouseholdID);
      setIsPro(currentHousehold.IsSubscriptionPro);

      const householdPets = await getPetsByHouseholdId(currentHousehold.HouseholdID);
      setPets(householdPets);

      // Update unread notification count
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

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

  // Feed logic
  const handleFeedClick = async () => {
    if (!currentUser || !currentHouseholdId) return;

    const petsToFeed = feedAllSelected
      ? pets
      : pets.filter((p) => selectedPetIds.includes(p.PetID));

    if (petsToFeed.length === 0) return;

    try {
      const now = new Date().toISOString();

      // Feed selected pets
      for (const pet of petsToFeed) {
        await feedPet(pet.PetID, currentUser.UserID);
      }

      // Create ONE feeding event for all pets fed together
      await addFeedingEvent({
        HouseholdID: currentHouseholdId,
        UserID: currentUser.UserID,
        PetIDs: petsToFeed.map((p) => p.PetID),
        Timestamp: now,
        UndoDeadline: null, // Will be set automatically
      });

      // Create notification
      const petNames = petsToFeed.map((p) => p.PetName).join(', ');
      await addNotification({
        type: 'feeding',
        message: `${currentUser.MemberName} fed...\n${petNames}`,
        petName: petNames,
      });

      loadData();
    } catch (error) {
      console.error('Error feeding pets:', error);
      Alert.alert('Error', 'Failed to feed pets. Please try again.');
    }
  };

  // Undo logic
  const handleUndo = async (eventId: string) => {
    try {
      await undoFeedingEvent(eventId);
      loadData();
    } catch (error) {
      console.error('Error undoing feeding:', error);
      Alert.alert('Error', 'Failed to undo feeding. Please try again.');
    }
  };

  // Get the most recent feeding event for the status card
  const getLatestFeedingEvent = async (): Promise<FeedingEvent | null> => {
    if (!currentHouseholdId) return null;
    
    try {
      const events = await getFeedingEventsByHouseholdId(currentHouseholdId);
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      console.error('Error getting latest feeding event:', error);
      return null;
    }
  };

  // Check if latest feeding event can be undone
  const canUndoLatest = async (): Promise<{ canUndo: boolean; eventId?: string }> => {
    if (!currentHouseholdId) return { canUndo: false };
    
    try {
      const events = await getFeedingEventsByHouseholdId(currentHouseholdId);
      if (events.length === 0) return { canUndo: false };
      
      const latestEvent = events[0];
      if (!latestEvent.UndoDeadline) return { canUndo: false };
      
      const now = new Date();
      const deadline = new Date(latestEvent.UndoDeadline);
      return {
        canUndo: now <= deadline,
        eventId: latestEvent.EventID,
      };
    } catch (error) {
      console.error('Error checking undo status:', error);
      return { canUndo: false };
    }
  };

  // State for async data
  const [latestEvent, setLatestEvent] = useState<FeedingEvent | null>(null);
  const [undoInfo, setUndoInfo] = useState<{ canUndo: boolean; eventId?: string }>({ canUndo: false });

  // Load async data
  useEffect(() => {
    const loadAsyncData = async () => {
      const event = await getLatestFeedingEvent();
      setLatestEvent(event);
      
      const undo = await canUndoLatest();
      setUndoInfo(undo);
    };

    if (currentHouseholdId) {
      loadAsyncData();
    }
  }, [currentHouseholdId, pets]); // Reload when pets change (after feeding)

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onOpenSettings}
            style={styles.menuButton}
            activeOpacity={0.6}
          >
            <Ionicons name="menu" size={28} color="#333" />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>ðŸ¾</Text>
            </View>
            <Text style={styles.logoText}>I Fed the Pet</Text>
          </View>

          {/* Notifications */}
          <TouchableOpacity
            onPress={onOpenNotifications}
            style={styles.notificationButton}
            activeOpacity={0.6}
          >
            <Ionicons name="notifications-outline" size={24} color="#333" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Household Name */}
        {household && (
          <Text style={styles.householdName}>{household.HouseholdName}</Text>
        )}

        {/* Status Card */}
        <View style={styles.statusCard}>
          {latestEvent ? (
            <>
              <Text style={styles.statusLabel}>LAST FED</Text>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>
                  {formatTime(new Date(latestEvent.Timestamp).getTime())}
                </Text>
              </View>
              <Text style={styles.timeAgo}>
                {getTimeAgo(new Date(latestEvent.Timestamp).getTime())}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.statusLabel}>LAST FED</Text>
              <View style={styles.timeDisplay}>
                <Text style={styles.timeText}>- - : - -</Text>
              </View>
              <Text style={styles.timeAgo}>Never fed</Text>
            </>
          )}
        </View>

        {/* Pet Checkboxes (Pro only, multiple pets) */}
        {isPro && pets.length > 1 && (
          <View style={styles.petCheckboxContainer}>
            {/* Feed All checkbox */}
            <TouchableOpacity
              onPress={handleFeedAllToggle}
              style={styles.checkboxRow}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, feedAllSelected && styles.checkboxChecked]}>
                {feedAllSelected && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Feed all</Text>
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
                  !feedAllSelected && selectedPetIds.includes(pet.PetID) && styles.checkboxChecked
                ]}>
                  {!feedAllSelected && selectedPetIds.includes(pet.PetID) && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{pet.PetName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Feed Button */}
        <View style={styles.feedButtonContainer}>
          <TouchableOpacity
            onPress={handleFeedClick}
            style={styles.feedButton}
            activeOpacity={0.8}
          >
            <Text style={styles.feedButtonText}>I FED THE PET</Text>
          </TouchableOpacity>

          {undoInfo.canUndo && (
            <TouchableOpacity
              onPress={() => undoInfo.eventId && handleUndo(undoInfo.eventId)}
              style={styles.undoButton}
              activeOpacity={0.7}
            >
              <Text style={styles.undoButtonText}>Undo (available for 2 minutes)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Advertisement and Upgrade (Free tier only) */}
        {!isPro && (
          <View style={styles.upgradeSection}>
            <View style={styles.adBanner}>
              <Text style={styles.adText}>Advertisement</Text>
            </View>
            <TouchableOpacity
              onPress={onOpenSettings}
              style={styles.upgradeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f7fc', // Light purple background like Dan's design
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginLeft: -40, // Compensate for notification button to center logo
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fb314a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  logoEmoji: {
    fontSize: 18,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#fb314a',
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
    color: '#999',
    marginBottom: 32,
  },

  // Status Card
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    maxWidth: 320,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fb314a',
    letterSpacing: 2,
    marginBottom: 16,
  },
  timeDisplay: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  timeAgo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },

  // Pet Checkboxes
  petCheckboxContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#fb314a',
    borderColor: '#fb314a',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
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
    backgroundColor: '#fb314a',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fb314a',
    shadowOffset: {
      width: 0,
      height: 4,
    },
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
    color: '#999',
    textAlign: 'center',
  },

  // Upgrade Section
  upgradeSection: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  adBanner: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: '100%',
    alignItems: 'center',
  },
  adText: {
    fontSize: 12,
    color: '#999',
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeButtonText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});