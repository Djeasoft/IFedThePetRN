// database.ts
// Version: 1.0.0 - React Native
// Version: 2.0.0 - Converted from localStorage (web) to AsyncStorage (mobile)
// Version: 3.0.0 - Supabase integration
// Version: 3.1.0 - Added resetToNewUser() for dev/testing
// Version: 4.0.0 - Multi-Household Switcher Implementation

import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Household, UserHousehold, Pet, Notification, FeedingEvent, FeedReminder, UNDO_WINDOW_MS } from './types';

// Re-export types for convenience
export type { Notification } from './types';
export type { FeedingEvent } from './types';

const STORAGE_KEYS = {
  CURRENT_USER_ID: 'currentUserId',
  CURRENT_HOUSEHOLD_ID: 'currentHouseholdId',
  NOTIFICATIONS: 'notifications',
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

const mapUserHousehold = (data: any): UserHousehold => ({
  UserHouseholdID: data.id,
  UserID: data.user_id,
  HouseholdID: data.household_id,
  DateJoined: data.created_at,
  ReceivesReminders: data.receives_reminders,
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

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error getting user by ID:', error.message);
      return null;
    }

    return data ? mapUser(data) : null;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('getUserByEmail Method - Start');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email_address', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error getting user by email:', error.message);
      return null;
    }
    console.log('getUserByEmail No error');
    return data ? mapUser(data) : null;
  } catch (error) {
    console.error('Error in getUserByEmail:', error);
    return null;
  }
}

export async function createUser(
  memberName: string,
  emailAddress: string,
  isMainMember: boolean,
  invitationStatus: 'Active' | 'Pending' = 'Active'
): Promise<User> {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          member_name: memberName,
          email_address: emailAddress.toLowerCase(),
          is_main_member: isMainMember,
          invitation_status: invitationStatus,
          notification_prefs: {
            feedingNotifications: true,
            memberJoinedNotifications: true,
          },
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
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    // Map from app field names to cloud field names
    const cloudUpdates: Record<string, any> = {};

    if (updates.MemberName !== undefined) cloudUpdates.member_name = updates.MemberName;
    if (updates.EmailAddress !== undefined) cloudUpdates.email_address = updates.EmailAddress;
    if (updates.IsMainMember !== undefined) cloudUpdates.is_main_member = updates.IsMainMember;
    if (updates.InvitationStatus !== undefined) cloudUpdates.invitation_status = updates.InvitationStatus;
    if (updates.NotificationPreferences !== undefined) cloudUpdates.notification_prefs = updates.NotificationPreferences;

    if (Object.keys(cloudUpdates).length === 0) {
      // No updates provided
      return await getUserById(userId);
    }

    const { data, error } = await supabase
      .from('users')
      .update(cloudUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error.message);
      return null;
    }

    return mapUser(data);
  } catch (error) {
    console.error('Error in updateUser:', error);
    return null;
  }
}

// ===== HOUSEHOLD FUNCTIONS =====

export async function getHouseholdById(householdId: string): Promise<Household | null> {
  try {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('id', householdId)
      .maybeSingle();

    if (error) {
      console.error('Error getting household by ID:', error.message);
      return null;
    }

    return data ? mapHousehold(data) : null;
  } catch (error) {
    console.error('Error in getHouseholdById:', error);
    return null;
  }
}

export async function getHouseholdByInvitationCode(invitationCode: string): Promise<Household | null> {
  try {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('invitation_code', invitationCode.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Error getting household by invitation code:', error.message);
      return null;
    }

    return data ? mapHousehold(data) : null;
  } catch (error) {
    console.error('Error in getHouseholdByInvitationCode:', error);
    return null;
  }
}

export async function createHousehold(householdName: string, mainMemberId: string, isPro: boolean = false): Promise<Household> {
  try {
    const { data, error } = await supabase
      .from('households')
      .insert([
        {
          household_name: householdName,
          main_member_id: mainMemberId,
          is_pro: isPro,
          invitation_code: generateInvitationCode(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating household:', error.message);
      throw error;
    }

    return mapHousehold(data);
  } catch (error) {
    console.error('Error in createHousehold:', error);
    throw error;
  }
}

export async function updateHousehold(householdId: string, updates: Partial<Household>): Promise<Household | null> {
  try {
    // Map from app field names to cloud field names
    const cloudUpdates: Record<string, any> = {};

    if (updates.HouseholdName !== undefined) cloudUpdates.household_name = updates.HouseholdName;
    if (updates.IsSubscriptionPro !== undefined) cloudUpdates.is_pro = updates.IsSubscriptionPro;

    if (Object.keys(cloudUpdates).length === 0) {
      return await getHouseholdById(householdId);
    }

    const { data, error } = await supabase
      .from('households')
      .update(cloudUpdates)
      .eq('id', householdId)
      .select()
      .single();

    if (error) {
      console.error('Error updating household:', error.message);
      return null;
    }

    return mapHousehold(data);
  } catch (error) {
    console.error('Error in updateHousehold:', error);
    return null;
  }
}

/**
 * Get the currently selected household ID from AsyncStorage
 */
export async function getCurrentHouseholdId(): Promise<string | null> {
  try {
    const householdId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_HOUSEHOLD_ID);
    return householdId;
  } catch (error) {
    console.error('Error getting current household ID:', error);
    return null;
  }
}

/**
 * Set the currently selected household ID in AsyncStorage
 * Call this when user switches households
 */
export async function setCurrentHouseholdId(householdId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_HOUSEHOLD_ID, householdId);
  } catch (error) {
    console.error('Error setting current household ID:', error);
    throw error;
  }
}

/**
 * Clear the current household ID (when user logs out or resets)
 */
export async function clearCurrentHouseholdId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_HOUSEHOLD_ID);
  } catch (error) {
    console.error('Error clearing current household ID:', error);
    throw error;
  }
}

/**
 * Get the current household with fallback logic
 * 1. Try to load saved currentHouseholdId
 * 2. If not found, get first household for user
 * 3. Save whichever we loaded
 */
export async function getCurrentHousehold(): Promise<Household | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    // Step 1: Try to get saved household ID
    let householdId = await getCurrentHouseholdId();

    // Step 2: If not saved, get first household and save it
    if (!householdId) {
      const households = await getHouseholdsForUser(userId);
      if (households.length === 0) return null;

      householdId = households[0].HouseholdID;
      await setCurrentHouseholdId(householdId);
    }

    // Step 3: Load and return the household
    return await getHouseholdById(householdId);
  } catch (error) {
    console.error('Error getting current household:', error);
    return null;
  }
}

// ===== USER HOUSEHOLD FUNCTIONS =====

export async function createUserHousehold(userId: string, householdId: string, receivesReminders: boolean = true): Promise<UserHousehold> {
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

    return mapUserHousehold(data);
  } catch (error) {
    console.error('Error in createUserHousehold:', error);
    throw error;
  }
}

export async function removeUserFromHousehold(userId: string, householdId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_households')
      .delete()
      .eq('user_id', userId)
      .eq('household_id', householdId);

    if (error) {
      console.error('Error removing user from household:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeUserFromHousehold:', error);
    return false;
  }
}

// ===== PET FUNCTIONS =====

export async function getPetById(petId: string): Promise<Pet | null> {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', petId)
      .maybeSingle();

    if (error) {
      console.error('Error getting pet by ID:', error.message);
      return null;
    }

    return data ? mapPet(data) : null;
  } catch (error) {
    console.error('Error in getPetById:', error);
    return null;
  }
}

export async function getPetsByHouseholdId(householdId: string): Promise<Pet[]> {
  try {
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true }); // Oldest first (natural order)

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

export async function createPet(petName: string, householdId: string): Promise<Pet> {
  try {
    const { data, error } = await supabase
      .from('pets')
      .insert([
        {
          pet_name: petName,
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
    // Map from app field names to cloud field names
    const cloudUpdates: Record<string, any> = {};

    if (updates.PetName !== undefined) cloudUpdates.pet_name = updates.PetName;
    if (updates.LastFedDateTime !== undefined) cloudUpdates.last_fed_at = updates.LastFedDateTime;
    if (updates.LastFedByUserID !== undefined) cloudUpdates.last_fed_by_id = updates.LastFedByUserID;
    if (updates.UndoDeadline !== undefined) cloudUpdates.undo_deadline = updates.UndoDeadline;

    if (Object.keys(cloudUpdates).length === 0) {
      // No updates provided
      return await getPetById(petId);
    }

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

export async function feedPet(
  petId: string,
  userId: string,
  memberName: string
): Promise<Pet | null> {
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
    // 1. Read the event from Supabase
    const { data, error: fetchError } = await supabase
      .from('feeding_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching feeding event:', fetchError.message);
      return false;
    }
    if (!data) return false;

    const event = mapFeedingEvent(data);

    // 2. Check if undo is still allowed
    if (!event.UndoDeadline) return false;
    const now = new Date();
    const deadline = new Date(event.UndoDeadline);
    if (now > deadline) return false; // Undo window expired

    // 3. Undo all pets in this feeding event
    for (const petId of event.PetIDs) {
      await undoFeedPet(petId);
    }

    // 4. Delete the feeding event from Supabase
    const { error: deleteError } = await supabase
      .from('feeding_events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error('Error deleting feeding event:', deleteError.message);
      return false;
    }

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

// ===== RESET TO NEW USER (FOR TESTING/DEV) =====

/**
 * Complete reset to fresh/new user state
 * Clears all session, onboarding, notifications, and caches
 * Does NOT delete any Supabase data - just clears the device's local state
 * Intended for development/testing workflows
 */
export async function resetToNewUser(): Promise<void> {
  try {
    console.log('🔄 Resetting to new user state...');
    
    // Step 1: Clear session
    await clearCurrentUserId();
    await clearCurrentHouseholdId();
    
    // Step 2: Reset onboarding flag
    await resetOnboarding();
    
    // Step 3: Clear all notifications
    await clearAllNotifications();
    
    // Step 4: Clear all feed reminders
    await AsyncStorage.removeItem(STORAGE_KEYS.FEED_REMINDERS);
    
    // Step 5: Clear screen caches
    await AsyncStorage.removeItem(CACHE_KEYS.STATUS_SCREEN);
    await AsyncStorage.removeItem(CACHE_KEYS.SETTINGS_SCREEN);
    
    console.log('✅ Reset complete - app will restart to onboarding');
  } catch (error) {
    console.error('Error in resetToNewUser:', error);
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

// ===== SCREEN CACHE =====

export const CACHE_KEYS = {
  STATUS_SCREEN: 'cache:statusScreen',
  SETTINGS_SCREEN: 'cache:settingsScreen',
};

export async function getCachedScreenData<T>(cacheKey: string): Promise<T | null> {
  try {
    const json = await AsyncStorage.getItem(cacheKey);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function setCachedScreenData<T>(cacheKey: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing cache:', error);
  }
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

/**
 * Listens for changes relevant to the Settings screen:
 * - households table: name, pro status changes
 * - user_households table: member joins/leaves
 * - pets table: pet additions/deletions
 */
export function subscribeToSettingsChanges(
  householdId: string,
  onUpdate: () => void
) {
  const householdSub = supabase
    .channel(`settings:households:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
      () => {
        console.log('Settings realtime: Household updated!');
        onUpdate();
      }
    )
    .subscribe();

  const membershipSub = supabase
    .channel(`settings:user_households:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_households', filter: `household_id=eq.${householdId}` },
      () => {
        console.log('Settings realtime: Membership changed!');
        onUpdate();
      }
    )
    .subscribe();

  const petSub = supabase
    .channel(`settings:pets:${householdId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pets', filter: `household_id=eq.${householdId}` },
      () => {
        console.log('Settings realtime: Pet updated!');
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(householdSub);
    supabase.removeChannel(membershipSub);
    supabase.removeChannel(petSub);
  };
}