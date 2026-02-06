// database.ts
// Version: 1.0.0 - React Native
// Version: 2.0.0 - Converted from localStorage (web) to AsyncStorage (mobile)
// Version: 3.0.0 - Supabase integration

import { supabase } from './supabaseClient';
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

// ===== Translators - Cloud names into App names =====
const mapUser = (data: any): User => ({
  UserID: data.id,
  UUID: data.id,
  MemberName: data.member_name,
  EmailAddress: data.email_address,
  IsMainMember: data.is_main_member,
  InvitationStatus: data.invitation_status,
  NotificationPreferences: data.notification_prefs,
  DateCreated: data.created_at,
  DateUpdated: data.updated_at,
});

const mapHousehold = (data: any): Household => ({
  HouseholdID: data.id,
  UUID: data.id,
  HouseholdName: data.household_name,
  InvitationCode: data.invitation_code,
  MainMemberID: data.main_member_id,
  IsSubscriptionPro: data.is_pro,
  DateCreated: data.created_at,
  DateUpdated: data.updated_at,
});

const mapPet = (data: any): Pet => ({
  PetID: data.id,
  UUID: data.id,
  PetName: data.pet_name,
  HouseholdID: data.household_id,
  LastFedDateTime: data.last_fed_at,
  LastFedByUserID: data.last_fed_by_id,
  UndoDeadline: data.undo_deadline,
  DateCreated: data.created_at,
  DateUpdated: data.updated_at,
});

const mapFeedingEvent = (data: any): FeedingEvent => ({
  EventID: data.id,
  HouseholdID: data.household_id,
  PetIDs: data.pet_ids,
  FedByUserID: data.fed_by_user_id,
  FedByMemberName: data.fed_by_name,
  PetNames: data.pet_names,
  Timestamp: data.created_at,
  UndoDeadline: data.undo_deadline,
});


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
    // 1. Look in Supabase instead of the phone's memory
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user from Supabase:', error.message);
      return null;
    }

    if (!data) return null;

    // 2. Use our mapUser translator to turn Cloud data into App data
    return mapUser(data);
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_address', email.toLowerCase())
      .maybeSingle(); 

    if (error) {
      console.error('Error getting user by email:', error.message);
      return null;
    }

    // If no user is found, just return null
    if (!data) return null;

    // Use our translator to turn Cloud data into App data
    return mapUser(data);
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
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
    // 1. FIRST: Check if this email already exists in the cloud
    const existingUser = await getUserByEmail(email);
    
    // 2. If the user IS found, just return that user instead of creating a new one
    if (existingUser) {
      console.log("✅ User already exists, using existing record.");
      return existingUser;
    }

    // 3. If the user is NOT found, then create them fresh
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          member_name: name,
          email_address: email.toLowerCase(),
          is_main_member: isMainMember,
          invitation_status: status,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error.message);
      throw error;
    }

    return mapUser(data);
  } catch (error) {
    console.error('Error in createUser logic:', error);
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
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('invitation_code', code.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error getting household by code:', error.message);
      return null;
    }

    if (!data) return null;

    return mapHousehold(data);
  } catch (error) {
    console.error('Error in getHouseholdByInvitationCode:', error);
    return null;
  }
}

export async function createHousehold(name: string, mainMemberId: string, isPro: boolean = false): Promise<Household> {
  try {
    const { data, error } = await supabase
      .from('households')
      .insert([
        {
          household_name: name,
          invitation_code: generateInvitationCode(),
          main_member_id: mainMemberId,
          is_pro: isPro,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating household:', error.message);
      throw error;
    }

    // Use our translator here
    return mapHousehold(data);
  } catch (error) {
    console.error('Error in createHousehold:', error);
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
    const { data, error } = await supabase
      .from('user_households')
      .insert([
        {
          user_id: userId,
          household_id: householdId,
          receives_reminders: receivesReminders,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user household link:', error.message);
      throw error;
    }

    // Return the link data (mapping the cloud ID to the App's UserHouseholdID)
    return {
      UserHouseholdID: data.id,
      UserID: data.user_id,
      HouseholdID: data.household_id,
      DateJoined: data.created_at,
      ReceivesReminders: data.receives_reminders,
    };
  } catch (error) {
    console.error('Error in createUserHousehold:', error);
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
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('household_id', householdId);

    if (error) {
      console.error('Error getting pets:', error.message);
      return [];
    }

    return (data || []).map(mapPet);
  } catch (error) {
    console.error('Error in getPetsByHouseholdId:', error);
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
    const { data, error } = await supabase
      .from('pets')
      .insert([
        {
          pet_name: name,
          household_id: householdId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating pet:', error.message);
      throw error;
    }

    return mapPet(data);
  } catch (error) {
    console.error('Error in createPet:', error);
    throw error;
  }
}

export async function updatePet(petId: string, updates: Partial<Pet>): Promise<Pet | null> {
  try {
    // Translate App names to Cloud names for the update
    const cloudUpdates: any = {};
    if (updates.PetName) cloudUpdates.pet_name = updates.PetName;
    if (updates.LastFedDateTime) cloudUpdates.last_fed_at = updates.LastFedDateTime;
    if (updates.LastFedByUserID) cloudUpdates.last_fed_by_id = updates.LastFedByUserID;
    if (updates.UndoDeadline) cloudUpdates.undo_deadline = updates.UndoDeadline;

    const { data, error } = await supabase
      .from('pets')
      .update(cloudUpdates)
      .eq('id', petId)
      .select()
      .single();

    if (error) {
      console.error('Error updating pet:', error.message);
      return null;
    }

    return mapPet(data);
  } catch (error) {
    console.error('Error in updatePet:', error);
    return null;
  }
}

export async function deletePet(petId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pets')
      .delete()
      .eq('id', petId);

    if (error) {
      console.error('Error deleting pet:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePet:', error);
    return false;
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
    const { data, error } = await supabase
      .from('feeding_events')
      .insert([
        {
          household_id: event.HouseholdID,
          pet_ids: event.PetIDs,
          fed_by_user_id: event.FedByUserID,
          fed_by_name: event.FedByMemberName,
          pet_names: event.PetNames,
          undo_deadline: event.UndoDeadline,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding feeding event:', error.message);
      throw error;
    }

    return mapFeedingEvent(data);
  } catch (error) {
    console.error('Error in addFeedingEvent:', error);
    throw error;
  }
}

export async function getFeedingEventsByHouseholdId(householdId: string): Promise<FeedingEvent[]> {
  try {
    const { data, error } = await supabase
      .from('feeding_events')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false }) // Newest first
      .limit(30); // Keep history manageable

    if (error) {
      console.error('Error getting feeding events:', error.message);
      return [];
    }

    return (data || []).map(mapFeedingEvent);
  } catch (error) {
    console.error('Error in getFeedingEventsByHouseholdId:', error);
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
    // 1. Find all links for this user in the cloud
    const { data: links, error: linkError } = await supabase
      .from('user_households')
      .select('household_id')
      .eq('user_id', userId);

    if (linkError || !links || links.length === 0) return [];

    // 2. Get the actual Household details for those links
    const householdIds = links.map(l => l.household_id);
    const { data: households, error: hhError } = await supabase
      .from('households')
      .select('*')
      .in('id', householdIds);

    if (hhError || !households) return [];

    // 3. Translate the cloud data into app data
    return households.map(mapHousehold);
  } catch (error) {
    console.error('Error in getHouseholdsForUser:', error);
    return [];
  }
}

// Get all members of a household
export async function getMembersOfHousehold(householdId: string): Promise<User[]> {
  try {
    // 1. Find all user IDs linked to this home
    const { data: links, error: linkError } = await supabase
      .from('user_households')
      .select('user_id')
      .eq('household_id', householdId);

    if (linkError || !links || links.length === 0) return [];

    // 2. Get the actual profile details (names/emails) for those users
    const userIds = links.map(l => l.user_id);
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (userError || !users) return [];

    // 3. Translate them and return the list
    return users.map(mapUser);
  } catch (error) {
    console.error('Error in getMembersOfHousehold:', error);
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

/**
 * Listens for any changes to pets or feeding events in a specific household
 * @param householdId The household to watch
 * @param onUpdate A function to run whenever a change is detected
 */
export function subscribeToHouseholdChanges(
  householdId: string, 
  onUpdate: () => void
) {
  // 1. Setup the listener for the 'pets' table
  const petSubscription = supabase
    .channel('public:pets')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pets', filter: `household_id=eq.${householdId}` },
      () => {
        console.log('🔔 Realtime: Pet updated!');
        onUpdate();
      }
    )
    .subscribe();

  // 2. Setup the listener for the 'feeding_events' table
  const feedingSubscription = supabase
    .channel('public:feeding_events')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'feeding_events', filter: `household_id=eq.${householdId}` },
      () => {
        console.log('🔔 Realtime: New feeding recorded!');
        onUpdate();
      }
    )
    .subscribe();

  // Return a function to "turn off" the listeners when we leave the screen
  return () => {
    supabase.removeChannel(petSubscription);
    supabase.removeChannel(feedingSubscription);
  };
}