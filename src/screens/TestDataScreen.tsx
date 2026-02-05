// Test screen to verify AsyncStorage foundation
// Version: 1.0.0 - React Native
// Use this to test database operations before building UI

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  initializeDemoData,
  getCurrentUserId,
  getUserById,
  getAllHouseholds,
  getAllPets,
  getAllUsers,
  feedPet,
  undoFeedPet,
  resetOnboarding,
} from '../lib/database';
import type { User, Household, Pet } from '../lib/types';

export default function TestDataScreen() {
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [lastAction, setLastAction] = useState<string>('');

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setLastAction('Loading data...');
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const user = await getUserById(userId);
        setCurrentUser(user);
      }

      const allHouseholds = await getAllHouseholds();
      const allPets = await getAllPets();
      const allUsers = await getAllUsers();

      setHouseholds(allHouseholds);
      setPets(allPets);
      setUsers(allUsers);

      setLastAction('✅ Data loaded successfully');
    } catch (error) {
      setLastAction(`❌ Error loading data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize demo data
  const handleInitializeDemoData = async () => {
    setLoading(true);
    setLastAction('Creating demo data...');
    try {
      await initializeDemoData();
      await loadData();
      setLastAction('✅ Demo data created');
    } catch (error) {
      setLastAction(`❌ Error: ${error}`);
      setLoading(false);
    }
  };

  // Feed the first pet
  const handleFeedPet = async () => {
    if (!currentUser || pets.length === 0) {
      setLastAction('❌ No user or pets available');
      return;
    }

    setLoading(true);
    setLastAction('Feeding pet...');
    try {
      await feedPet(pets[0].PetID, currentUser.UserID);
      await loadData();
      setLastAction(`✅ Fed ${pets[0].PetName}`);
    } catch (error) {
      setLastAction(`❌ Error: ${error}`);
      setLoading(false);
    }
  };

  // Undo feeding
  const handleUndoFeed = async () => {
    if (pets.length === 0) {
      setLastAction('❌ No pets available');
      return;
    }

    setLoading(true);
    setLastAction('Undoing feed...');
    try {
      await undoFeedPet(pets[0].PetID);
      await loadData();
      setLastAction('✅ Feed undone');
    } catch (error) {
      setLastAction(`❌ Error: ${error}`);
      setLoading(false);
    }
  };

  // Reset onboarding
  const handleResetOnboarding = async () => {
    setLoading(true);
    setLastAction('Resetting onboarding...');
    try {
      await resetOnboarding();
      setLastAction('✅ Onboarding reset - restart app to see onboarding flow');
    } catch (error) {
      setLastAction(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AsyncStorage Test Screen</Text>
        <Text style={styles.subtitle}>Foundation Testing</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={handleInitializeDemoData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Initialize Demo Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={loadData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Reload Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.feedButton]}
          onPress={handleFeedPet}
          disabled={loading || !currentUser || pets.length === 0}
        >
          <Text style={styles.buttonText}>Feed Pet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.undoButton]}
          onPress={handleUndoFeed}
          disabled={loading || pets.length === 0}
        >
          <Text style={styles.buttonText}>Undo Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={handleResetOnboarding}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Reset Onboarding</Text>
        </TouchableOpacity>
      </View>

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last Action</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Text style={styles.statusText}>{lastAction || 'No action yet'}</Text>
        )}
      </View>

      {/* Current User */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current User</Text>
        {currentUser ? (
          <View style={styles.dataBox}>
            <Text style={styles.dataText}>Name: {currentUser.MemberName}</Text>
            <Text style={styles.dataText}>Email: {currentUser.EmailAddress}</Text>
            <Text style={styles.dataText}>
              Role: {currentUser.IsMainMember ? 'Main Member' : 'Member'}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No current user</Text>
        )}
      </View>

      {/* Households */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Households ({households.length})</Text>
        {households.map((household) => (
          <View key={household.HouseholdID} style={styles.dataBox}>
            <Text style={styles.dataText}>Name: {household.HouseholdName}</Text>
            <Text style={styles.dataText}>
              Tier: {household.IsSubscriptionPro ? 'Pro' : 'Free'}
            </Text>
            <Text style={styles.dataText}>Code: {household.InvitationCode}</Text>
          </View>
        ))}
        {households.length === 0 && (
          <Text style={styles.emptyText}>No households</Text>
        )}
      </View>

      {/* Pets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pets ({pets.length})</Text>
        {pets.map((pet) => (
          <View key={pet.PetID} style={styles.dataBox}>
            <Text style={styles.dataText}>Name: {pet.PetName}</Text>
            <Text style={styles.dataText}>
              Last Fed: {pet.LastFedDateTime || 'Never'}
            </Text>
            <Text style={styles.dataText}>
              Undo Available: {pet.UndoDeadline ? 'Yes' : 'No'}
            </Text>
          </View>
        ))}
        {pets.length === 0 && <Text style={styles.emptyText}>No pets</Text>}
      </View>

      {/* Users */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Users ({users.length})</Text>
        {users.map((user) => (
          <View key={user.UserID} style={styles.dataBox}>
            <Text style={styles.dataText}>{user.MemberName}</Text>
            <Text style={styles.dataText}>{user.EmailAddress}</Text>
          </View>
        ))}
        {users.length === 0 && <Text style={styles.emptyText}>No users</Text>}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Close app and reopen to verify data persists
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 5,
  },
  section: {
    margin: 15,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  feedButton: {
    backgroundColor: '#34C759',
  },
  undoButton: {
    backgroundColor: '#FF9500',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 16,
    color: '#333333',
    padding: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 5,
  },
  dataBox: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  dataText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    padding: 10,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
