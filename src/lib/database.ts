// Database layer using AsyncStorage for React Native
// Version: 1.0.0 - React Native
// Converted from localStorage (web) to AsyncStorage (mobile)
// In production, this would interface with Supabase

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Household, UserHousehold, Pet, Notification, FeedingEvent, FeedReminder, UNDO_WINDOW_MS } from './types';

// Re-export types for convenience
export type { Notification } from './types';
export type { FeedingEvent } from './types';

const STORAGE_KEYS = {
  USERS: 'users',
  HOUSEHOLDS: 'households',
  USER_HOUSEHOLDS: 'userHouseholds',
  PETS: 'pets',
  CURRENT_USER_ID: 'currentUserId',
  NOTIFICATIONS: 'notifications',
  FEEDING_EVENTS: 'feedingEvents',
  FEED_REMINDERS: 'feedReminders',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
};

// ===== UTILITY FUNCTIONS =====

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateInvitationCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ===== USER FUNCTIONS =====

export async function getAllUsers(): Promise<User[]> {
  try {
    const usersJson = await AsyncStorage.getItem(STORAGE_KEYS.USERS);
    return usersJson ? JSON.parse(usersJson) : [];
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

export async function saveAllUsers(users: User[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
    throw error;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find((u) => u.UserID === userId) || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const users = await getAllUsers();
    return users.find((u) => u.EmailAddress.toLowerCase() === email.toLowerCase()) || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function createUser(
  name: string,
  email: string,
  isMainMember: boolean,
  status: 'Pending' | 'Active' = 'Active'
): Promise<User> {
  try {
    const users = await getAllUsers();
    const now = new Date().toISOString();
    const newUser: User = {
      UserID: generateUUID(),
      UUID: generateUUID(),
      MemberName: name,
      EmailAddress: email,
      IsMainMember: isMainMember,
      InvitationStatus: status,
      NotificationPreferences: {
        feedingNotifications: true,
        memberJoinedNotifications: true,
        petAddedNotifications: true,
        memberRemovedNotifications: true,
      },
      DateCreated: now,
      DateUpdated: now,
    };
    users.push(newUser);
    await saveAllUsers(users);
    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const users = await getAllUsers();
    const index = users.findIndex((u) => u.UserID === userId);
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...updates,
      DateUpdated: new Date().toISOString(),
    };
    await saveAllUsers(users);
    return users[index];
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// ===== HOUSEHOLD FUNCTIONS =====

export async function getAllHouseholds(): Promise<Household[]> {
  try {
    const householdsJson = await AsyncStorage.getItem(STORAGE_KEYS.HOUSEHOLDS);
    return householdsJson ? JSON.parse(householdsJson) : [];
  } catch (error) {
    console.error('Error reading households:', error);
    return [];
  }
}

export async function saveAllHouseholds(households: Household[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));
  } catch (error) {
    console.error('Error saving households:', error);
    throw error;
  }
}

export async function getHouseholdById(householdId: string): Promise<Household | null> {
  try {
    const households = await getAllHouseholds();
    return households.find((h) => h.HouseholdID === householdId) || null;
  } catch (error) {
    console.error('Error getting household by ID:', error);
    return null;
  }
}

export async function getHouseholdByInvitationCode(code: string): Promise<Household | null> {
  try {
    const households = await getAllHouseholds();
    return households.find((h) => h.InvitationCode === code) || null;
  } catch (error) {
    console.error('Error getting household by invitation code:', error);
    return null;
  }
}

export async function createHousehold(name: string, mainMemberId: string, isPro: boolean = false): Promise<Household> {
  try {
    const households = await getAllHouseholds();
    const now = new Date().toISOString();
    const newHousehold: Household = {
      HouseholdID: generateUUID(),
      UUID: generateUUID(),
      HouseholdName: name,
      InvitationCode: generateInvitationCode(),
      MainMemberID: mainMemberId,
      IsSubscriptionPro: isPro,
      DateCreated: now,
      DateUpdated: now,
    };
    households.push(newHousehold);
    await saveAllHouseholds(households);
    return newHousehold;
  } catch (error) {
    console.error('Error creating household:', error);
    throw error;
  }
}

export async function updateHousehold(householdId: string, updates: Partial<Household>): Promise<Household | null> {
  try {
    const households = await getAllHouseholds();
    const index = households.findIndex((h) => h.HouseholdID === householdId);
    if (index === -1) return null;
    
    households[index] = {
      ...households[index],
      ...updates,
      DateUpdated: new Date().toISOString(),
    };
    await saveAllHouseholds(households);
    return households[index];
  } catch (error) {
    console.error('Error updating household:', error);
    throw error;
  }
}

// ===== USER_HOUSEHOLD FUNCTIONS =====

export async function getAllUserHouseholds(): Promise<UserHousehold[]> {
  try {
    const userHouseholdsJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_HOUSEHOLDS);
    return userHouseholdsJson ? JSON.parse(userHouseholdsJson) : [];
  } catch (error) {
    console.error('Error reading user households:', error);
    return [];
  }
}

export async function saveAllUserHouseholds(userHouseholds: UserHousehold[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_HOUSEHOLDS, JSON.stringify(userHouseholds));
  } catch (error) {
    console.error('Error saving user households:', error);
    throw error;
  }
}

export async function getUserHouseholdsByUserId(userId: string): Promise<UserHousehold[]> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    return userHouseholds.filter((uh) => uh.UserID === userId);
  } catch (error) {
    console.error('Error getting user households by user ID:', error);
    return [];
  }
}

export async function getUserHouseholdsByHouseholdId(householdId: string): Promise<UserHousehold[]> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    return userHouseholds.filter((uh) => uh.HouseholdID === householdId);
  } catch (error) {
    console.error('Error getting user households by household ID:', error);
    return [];
  }
}

// Create a UserHousehold link (when a user joins a household)
export async function createUserHousehold(userId: string, householdId: string, receivesReminders = false): Promise<UserHousehold> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    const newUserHousehold: UserHousehold = {
      UserHouseholdID: generateUUID(),
      UserID: userId,
      HouseholdID: householdId,
      DateJoined: new Date().toISOString(),
      ReceivesReminders: receivesReminders,
    };
    userHouseholds.push(newUserHousehold);
    await saveAllUserHouseholds(userHouseholds);
    return newUserHousehold;
  } catch (error) {
    console.error('Error creating user household:', error);
    throw error;
  }
}

export async function removeUserFromHousehold(userId: string, householdId: string): Promise<boolean> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    const filtered = userHouseholds.filter(
      (uh) => !(uh.UserID === userId && uh.HouseholdID === householdId)
    );
    if (filtered.length === userHouseholds.length) return false;
    
    await saveAllUserHouseholds(filtered);
    return true;
  } catch (error) {
    console.error('Error removing user from household:', error);
    throw error;
  }
}

// Update reminder preference for a user in a household
export async function updateUserHouseholdReminderPref(
  userId: string,
  householdId: string,
  receivesReminders: boolean
): Promise<UserHousehold | null> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    const index = userHouseholds.findIndex(
      (uh) => uh.UserID === userId && uh.HouseholdID === householdId
    );
    if (index === -1) return null;
    
    userHouseholds[index] = {
      ...userHouseholds[index],
      ReceivesReminders: receivesReminders,
    };
    await saveAllUserHouseholds(userHouseholds);
    return userHouseholds[index];
  } catch (error) {
    console.error('Error updating reminder preference:', error);
    throw error;
  }
}

// Get UserHousehold entry for a specific user in a household
export async function getUserHousehold(userId: string, householdId: string): Promise<UserHousehold | null> {
  try {
    const userHouseholds = await getAllUserHouseholds();
    return userHouseholds.find((uh) => uh.UserID === userId && uh.HouseholdID === householdId) || null;
  } catch (error) {
    console.error('Error getting user household:', error);
    return null;
  }
}

// ===== PET FUNCTIONS =====

export async function getAllPets(): Promise<Pet[]> {
  try {
    const petsJson = await AsyncStorage.getItem(STORAGE_KEYS.PETS);
    return petsJson ? JSON.parse(petsJson) : [];
  } catch (error) {
    console.error('Error reading pets:', error);
    return [];
  }
}

export async function saveAllPets(pets: Pet[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PETS, JSON.stringify(pets));
  } catch (error) {
    console.error('Error saving pets:', error);
    throw error;
  }
}

export async function getPetsByHouseholdId(householdId: string): Promise<Pet[]> {
  try {
    const pets = await getAllPets();
    return pets.filter((p) => p.HouseholdID === householdId);
  } catch (error) {
    console.error('Error getting pets by household ID:', error);
    return [];
  }
}

export async function getPetById(petId: string): Promise<Pet | null> {
  try {
    const pets = await getAllPets();
    return pets.find((p) => p.PetID === petId) || null;
  } catch (error) {
    console.error('Error getting pet by ID:', error);
    return null;
  }
}

export async function createPet(name: string, householdId: string): Promise<Pet> {
  try {
    const pets = await getAllPets();
    const now = new Date().toISOString();
    const newPet: Pet = {
      PetID: generateUUID(),
      UUID: generateUUID(),
      PetName: name,
      HouseholdID: householdId,
      LastFedDateTime: null,
      LastFedByUserID: null,
      UndoDeadline: null,
      DateCreated: now,
      DateUpdated: now,
    };
    pets.push(newPet);
    await saveAllPets(pets);
    return newPet;
  } catch (error) {
    console.error('Error creating pet:', error);
    throw error;
  }
}

export async function updatePet(petId: string, updates: Partial<Pet>): Promise<Pet | null> {
  try {
    const pets = await getAllPets();
    const index = pets.findIndex((p) => p.PetID === petId);
    if (index === -1) return null;
    
    pets[index] = {
      ...pets[index],
      ...updates,
      DateUpdated: new Date().toISOString(),
    };
    await saveAllPets(pets);
    return pets[index];
  } catch (error) {
    console.error('Error updating pet:', error);
    throw error;
  }
}

export async function deletePet(petId: string): Promise<boolean> {
  try {
    const pets = await getAllPets();
    const filtered = pets.filter((p) => p.PetID !== petId);
    if (filtered.length === pets.length) return false;
    await saveAllPets(filtered);
    return true;
  } catch (error) {
    console.error('Error deleting pet:', error);
    throw error;
  }
}

export async function feedPet(petId: string, userId: string): Promise<Pet | null> {
  try {
    const now = new Date();
    const undoDeadline = new Date(now.getTime() + UNDO_WINDOW_MS);
    
    return await updatePet(petId, {
      LastFedDateTime: now.toISOString(),
      LastFedByUserID: userId,
      UndoDeadline: undoDeadline.toISOString(),
    });
  } catch (error) {
    console.error('Error feeding pet:', error);
    throw error;
  }
}

export async function undoFeedPet(petId: string): Promise<Pet | null> {
  try {
    return await updatePet(petId, {
      LastFedDateTime: null,
      LastFedByUserID: null,
      UndoDeadline: null,
    });
  } catch (error) {
    console.error('Error undoing feed pet:', error);
    throw error;
  }
}

// ===== CURRENT USER =====

export async function getCurrentUserId(): Promise<string | null> {
  try {
    const userId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    return userId;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

export async function setCurrentUserId(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  } catch (error) {
    console.error('Error setting current user ID:', error);
    throw error;
  }
}

export async function clearCurrentUserId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  } catch (error) {
    console.error('Error clearing current user ID:', error);
    throw error;
  }
}

// ===== NOTIFICATIONS =====

export async function getAllNotifications(): Promise<Notification[]> {
  try {
    const notificationsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return notificationsJson ? JSON.parse(notificationsJson) : [];
  } catch (error) {
    console.error('Error reading notifications:', error);
    return [];
  }
}

export async function saveAllNotifications(notifications: Notification[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  } catch (error) {
    console.error('Error saving notifications:', error);
    throw error;
  }
}

export async function addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): Promise<Notification> {
  try {
    const notifications = await getAllNotifications();
    const newNotification: Notification = {
      ...notification,
      id: generateUUID(),
      timestamp: new Date().toISOString(),
    };
    notifications.unshift(newNotification);
    
    // Keep only last 50 notifications
    const trimmedNotifications = notifications.slice(0, 50);
    await saveAllNotifications(trimmedNotifications);
    
    return newNotification;
  } catch (error) {
    console.error('Error adding notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const notifications = await getAllNotifications();
    const index = notifications.findIndex((n) => n.id === notificationId);
    if (index === -1) return false;
    
    notifications[index] = { ...notifications[index], read: true };
    await saveAllNotifications(notifications);
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  try {
    const notifications = await getAllNotifications();
    const updatedNotifications = notifications.map((n) => ({ ...n, read: true }));
    await saveAllNotifications(updatedNotifications);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const notifications = await getAllNotifications();
    return notifications.filter((n) => !n.read).length;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const notifications = await getAllNotifications();
    const filtered = notifications.filter((n) => n.id !== notificationId);
    if (filtered.length === notifications.length) return false;
    await saveAllNotifications(filtered);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

export async function clearAllNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    throw error;
  }
}

// ===== FEEDING EVENTS =====

export async function getAllFeedingEvents(): Promise<FeedingEvent[]> {
  try {
    const feedingEventsJson = await AsyncStorage.getItem(STORAGE_KEYS.FEEDING_EVENTS);
    return feedingEventsJson ? JSON.parse(feedingEventsJson) : [];
  } catch (error) {
    console.error('Error reading feeding events:', error);
    return [];
  }
}

export async function saveAllFeedingEvents(feedingEvents: FeedingEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FEEDING_EVENTS, JSON.stringify(feedingEvents));
  } catch (error) {
    console.error('Error saving feeding events:', error);
    throw error;
  }
}

export async function addFeedingEvent(event: Omit<FeedingEvent, 'EventID'>): Promise<FeedingEvent> {
  try {
    const feedingEvents = await getAllFeedingEvents();
    const now = new Date();
    const undoDeadline = new Date(now.getTime() + UNDO_WINDOW_MS);
    
    const newEvent: FeedingEvent = {
      ...event,
      EventID: generateUUID(),
      Timestamp: event.Timestamp || now.toISOString(),
      UndoDeadline: event.UndoDeadline || undoDeadline.toISOString(),
    };
    feedingEvents.unshift(newEvent);
    
    // Clean up events older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const filteredEvents = feedingEvents.filter((event) => {
      const eventDate = new Date(event.Timestamp);
      return eventDate >= thirtyDaysAgo;
    });
    
    await saveAllFeedingEvents(filteredEvents);
    return newEvent;
  } catch (error) {
    console.error('Error adding feeding event:', error);
    throw error;
  }
}

export async function getFeedingEventsByHouseholdId(householdId: string): Promise<FeedingEvent[]> {
  try {
    const feedingEvents = await getAllFeedingEvents();
    return feedingEvents
      .filter((e) => e.HouseholdID === householdId)
      .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
  } catch (error) {
    console.error('Error getting feeding events by household ID:', error);
    return [];
  }
}

export async function undoFeedingEvent(eventId: string): Promise<boolean> {
  try {
    const feedingEvents = await getAllFeedingEvents();
    const event = feedingEvents.find((e) => e.EventID === eventId);
    if (!event) return false;
    
    // Check if undo is still allowed
    if (!event.UndoDeadline) return false;
    const now = new Date();
    const deadline = new Date(event.UndoDeadline);
    if (now > deadline) return false; // Undo window expired
    
    // Undo all pets in this feeding event
    for (const petId of event.PetIDs) {
      await undoFeedPet(petId);
    }
    
    // Remove the feeding event
    const filtered = feedingEvents.filter((e) => e.EventID !== eventId);
    await saveAllFeedingEvents(filtered);
    
    return true;
  } catch (error) {
    console.error('Error undoing feeding event:', error);
    throw error;
  }
}

// ===== FEED REMINDERS =====

export async function getAllFeedReminders(): Promise<FeedReminder[]> {
  try {
    const feedRemindersJson = await AsyncStorage.getItem(STORAGE_KEYS.FEED_REMINDERS);
    return feedRemindersJson ? JSON.parse(feedRemindersJson) : [];
  } catch (error) {
    console.error('Error reading feed reminders:', error);
    return [];
  }
}

export async function saveAllFeedReminders(feedReminders: FeedReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FEED_REMINDERS, JSON.stringify(feedReminders));
  } catch (error) {
    console.error('Error saving feed reminders:', error);
    throw error;
  }
}

export async function addFeedReminder(reminder: Omit<FeedReminder, 'ReminderID' | 'DateCreated' | 'DateUpdated'>): Promise<FeedReminder> {
  try {
    const feedReminders = await getAllFeedReminders();
    const now = new Date().toISOString();
    
    const newReminder: FeedReminder = {
      ...reminder,
      ReminderID: generateUUID(),
      DateCreated: now,
      DateUpdated: now,
    };
    feedReminders.push(newReminder);
    await saveAllFeedReminders(feedReminders);
    return newReminder;
  } catch (error) {
    console.error('Error adding feed reminder:', error);
    throw error;
  }
}

export async function getFeedRemindersByHouseholdId(householdId: string): Promise<FeedReminder[]> {
  try {
    const feedReminders = await getAllFeedReminders();
    return feedReminders
      .filter((r) => r.HouseholdID === householdId && r.IsActive)
      .sort((a, b) => a.Time.localeCompare(b.Time)); // Sort by time
  } catch (error) {
    console.error('Error getting feed reminders by household ID:', error);
    return [];
  }
}

export async function updateFeedReminder(reminderId: string, updates: Partial<FeedReminder>): Promise<FeedReminder | null> {
  try {
    const feedReminders = await getAllFeedReminders();
    const index = feedReminders.findIndex((r) => r.ReminderID === reminderId);
    if (index === -1) return null;
    
    feedReminders[index] = {
      ...feedReminders[index],
      ...updates,
      DateUpdated: new Date().toISOString(),
    };
    await saveAllFeedReminders(feedReminders);
    return feedReminders[index];
  } catch (error) {
    console.error('Error updating feed reminder:', error);
    throw error;
  }
}

export async function deleteFeedReminder(reminderId: string): Promise<boolean> {
  try {
    const feedReminders = await getAllFeedReminders();
    const filtered = feedReminders.filter((r) => r.ReminderID !== reminderId);
    if (filtered.length === feedReminders.length) return false;
    await saveAllFeedReminders(filtered);
    return true;
  } catch (error) {
    console.error('Error deleting feed reminder:', error);
    throw error;
  }
}

// ===== ONBOARDING =====

export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return completed === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
  } catch (error) {
    console.error('Error setting onboarding completed:', error);
    throw error;
  }
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    throw error;
  }
}

// ===== HELPER FUNCTIONS =====

// Get all households for a user
export async function getHouseholdsForUser(userId: string): Promise<Household[]> {
  try {
    const userHouseholds = await getUserHouseholdsByUserId(userId);
    const households = await getAllHouseholds();
    return userHouseholds
      .map((uh) => households.find((h) => h.HouseholdID === uh.HouseholdID))
      .filter((h): h is Household => h !== undefined);
  } catch (error) {
    console.error('Error getting households for user:', error);
    return [];
  }
}

// Get all members of a household
export async function getMembersOfHousehold(householdId: string): Promise<User[]> {
  try {
    const userHouseholds = await getUserHouseholdsByHouseholdId(householdId);
    const users = await getAllUsers();
    return userHouseholds
      .map((uh) => users.find((u) => u.UserID === uh.UserID))
      .filter((u): u is User => u !== undefined && (u.InvitationStatus === 'Active' || u.InvitationStatus === 'Pending'));
  } catch (error) {
    console.error('Error getting members of household:', error);
    return [];
  }
}

// Check if user can perform action based on tier limits
export async function canAddHousehold(userId: string): Promise<boolean> {
  try {
    const user = await getUserById(userId);
    if (!user || !user.IsMainMember) return false;
    
    const households = await getHouseholdsForUser(userId);
    const ownedHouseholds = households.filter((h) => h.MainMemberID === userId);
    
    // Check if any owned household is Pro
    const hasPro = ownedHouseholds.some((h) => h.IsSubscriptionPro);
    
    if (hasPro) return true; // Pro can add unlimited
    return ownedHouseholds.length < 1; // Free can only have 1
  } catch (error) {
    console.error('Error checking if can add household:', error);
    return false;
  }
}

export async function canAddMember(householdId: string): Promise<boolean> {
  try {
    const household = await getHouseholdById(householdId);
    if (!household) return false;
    
    const members = await getMembersOfHousehold(householdId);
    
    if (household.IsSubscriptionPro) return true; // Pro can add unlimited
    return members.length < 2; // Free can only have 2 members
  } catch (error) {
    console.error('Error checking if can add member:', error);
    return false;
  }
}

export async function canAddPet(householdId: string): Promise<boolean> {
  try {
    const household = await getHouseholdById(householdId);
    if (!household) return false;
    
    const pets = await getPetsByHouseholdId(householdId);
    
    if (household.IsSubscriptionPro) return true; // Pro can add unlimited
    return pets.length < 1; // Free can only have 1 pet
  } catch (error) {
    console.error('Error checking if can add pet:', error);
    return false;
  }
}

// Initialize demo data for testing
export async function initializeDemoData(): Promise<void> {
  try {
    // Clear existing data
    await AsyncStorage.clear();
    
    // Create main member
    const mainUser = await createUser('Daniel', 'daniel@example.com', true, 'Active');
    await setCurrentUserId(mainUser.UserID);
    
    // Create household
    const household = await createHousehold('Newman Home', mainUser.UserID, false);
    
    // Link main member to household
    await createUserHousehold(mainUser.UserID, household.HouseholdID);
    
    // Create default pet
    await createPet('Our Pet', household.HouseholdID);
    
    await setOnboardingCompleted();
  } catch (error) {
    console.error('Error initializing demo data:', error);
    throw error;
  }
}

// ===== EMAIL NOTIFICATIONS =====

// Mock email sending function
// In production, this would send actual emails via an API
export function sendEmail(to: string, subject: string, message: string): boolean {
  console.log('📧 Email sent to:', to);
  console.log('📧 Subject:', subject);
  console.log('📧 Message:', message);
  console.log('---');
  
  // In production, this would call an email API (e.g., SendGrid, AWS SES, etc.)
  // For now, we'll just log it to console
  return true;
}

// Send member removed notification email
export function sendMemberRemovedEmail(
  memberEmail: string,
  memberName: string,
  householdName: string,
  removedByName: string
): boolean {
  const subject = `You've been removed from ${householdName}`;
  const message = `
Hi ${memberName},

${removedByName} has removed you from the "${householdName}" household in I Fed the Pet.

You no longer have access to this household's pets and feeding history.

If you believe this was a mistake, please contact ${removedByName} directly.

Best regards,
I Fed the Pet Team
  `.trim();
  
  return sendEmail(memberEmail, subject, message);
}
