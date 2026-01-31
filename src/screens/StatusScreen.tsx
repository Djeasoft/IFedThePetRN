import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentUserId,
  getUserById,
  getHouseholdsForUser,
  getPetsByHouseholdId,
  getHouseholdById,
  feedPet,
  addFeedingEvent,
  addNotification,
  getFeedingEventsByHouseholdId,
  undoFeedingEvent,
} from '../lib/database';
import type { Pet, Household, User } from '../lib/types';
import { formatTime, getTimeAgo } from '../lib/time';

interface StatusScreenProps {
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
}

export default function StatusScreen({
  onOpenSettings,
  onOpenNotifications,
}: StatusScreenProps) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadData();
    // Refresh every second for undo countdown
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.log('No current user');
        setLoading(false);
        return;
      }

      const user = await getUserById(userId);
      if (!user) {
        console.log('User not found');
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      const households = await getHouseholdsForUser(userId);
      if (households.length === 0) {
        console.log('No households found');
        setLoading(false);
        return;
      }

      const firstHousehold = households[0];
      setHousehold(firstHousehold);

      const householdPets = await getPetsByHouseholdId(firstHousehold.HouseholdID);
      setPets(householdPets);

      // TODO: Load unread notification count
      setUnreadCount(0);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleFeed = async () => {
    if (!currentUser || !household || pets.length === 0) return;

    try {
      const now = new Date().toISOString();

      // Feed all pets
      for (const pet of pets) {
        await feedPet(pet.PetID, currentUser.UserID);
      }

      // Create feeding event
      await addFeedingEvent({
        HouseholdID: household.HouseholdID,
        UserID: currentUser.UserID,
        PetIDs: pets.map(p => p.PetID),
        Timestamp: now,
        UndoDeadline: null, // Will be set automatically
      });

      // Create notification
      const petNames = pets.map(p => p.PetName).join(', ');
      await addNotification({
        type: 'feeding',
        message: `${currentUser.MemberName} fed ${petNames}`,
        read: false,
      });

      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error feeding pets:', error);
    }
  };

  const handleUndo = async () => {
    if (!household) return;

    try {
      const events = await getFeedingEventsByHouseholdId(household.HouseholdID);
      if (events.length === 0) return;

      const latestEvent = events[0];
      
      // Check if undo is still allowed
      if (!latestEvent.UndoDeadline) return;
      const now = new Date();
      const deadline = new Date(latestEvent.UndoDeadline);
      if (now > deadline) return;

      // Undo the feeding
      await undoFeedingEvent(latestEvent.EventID);
      await loadData();
    } catch (error) {
      console.error('Error undoing feed:', error);
    }
  };

  const getLatestFeedingInfo = () => {
    if (!household || pets.length === 0) return null;

    const latestPet = pets.reduce((latest, pet) => {
      if (!pet.LastFedDateTime) return latest;
      if (!latest || !latest.LastFedDateTime) return pet;
      return new Date(pet.LastFedDateTime) > new Date(latest.LastFedDateTime) ? pet : latest;
    }, pets[0]);

    if (!latestPet.LastFedDateTime) return null;

    return {
      time: new Date(latestPet.LastFedDateTime).getTime(),
      canUndo: latestPet.UndoDeadline && new Date() <= new Date(latestPet.UndoDeadline),
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!currentUser || !household) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No data found</Text>
        <Text style={styles.errorSubtext}>
          Please initialize demo data from the test screen
        </Text>
      </View>
    );
  }

  const feedingInfo = getLatestFeedingInfo();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenSettings} style={styles.menuButton}>
          <Ionicons name="menu" size={28} color="#000" />
        </TouchableOpacity>
        
        <Text style={styles.logo}>I Fed The Pet</Text>
        
        <TouchableOpacity onPress={onOpenNotifications} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#000" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Household Name */}
        <Text style={styles.householdName}>{household.HouseholdName}</Text>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Pet Status</Text>
          
          {feedingInfo ? (
            <>
              <Text style={styles.statusTime}>{getTimeAgo(feedingInfo.time)}</Text>
              <Text style={styles.statusSubtext}>
                {formatTime(feedingInfo.time)}
              </Text>
            </>
          ) : (
            <Text style={styles.statusEmpty}>Not fed yet</Text>
          )}
        </View>

        {/* Pets List */}
        <View style={styles.petsSection}>
          <Text style={styles.sectionTitle}>Pets ({pets.length})</Text>
          {pets.map(pet => (
            <View key={pet.PetID} style={styles.petItem}>
              <Ionicons name="paw" size={20} color="#666" />
              <Text style={styles.petName}>{pet.PetName}</Text>
              {pet.LastFedDateTime && (
                <Text style={styles.petTime}>
                  {getTimeAgo(new Date(pet.LastFedDateTime).getTime())}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Feed Button */}
        <TouchableOpacity
          style={styles.feedButton}
          onPress={handleFeed}
          disabled={pets.length === 0}
        >
          <Text style={styles.feedButtonText}>JUST FED</Text>
        </TouchableOpacity>

        {/* Undo Button */}
        {feedingInfo?.canUndo && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            User: {currentUser.MemberName}
          </Text>
          <Text style={styles.infoText}>
            Tier: {household.IsSubscriptionPro ? 'Pro' : 'Free'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
    marginLeft: -8,
  },
  logo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FB314A',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 24,
  },
  householdName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusTime: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  statusEmpty: {
    fontSize: 18,
    color: '#999',
    fontStyle: 'italic',
  },
  petsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  petItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginLeft: 12,
    flex: 1,
  },
  petTime: {
    fontSize: 14,
    color: '#666',
  },
  feedButton: {
    backgroundColor: '#3C8CE7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  feedButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  undoButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  undoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
});
