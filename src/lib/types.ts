// Data types based on ERD specification
// Version: 1.1.0 - Updated with Supabase history fields
// Version: 1.2.0 - Notification: added targetUserId and senderUserId for targeted feed requests
// Version: 1.3.0 - NotificationPreferences: added remindersEnabled; FeedReminder: migrated to Supabase shape (removed IsActive)
// Version: 1.3.1 - Notification type union: added 'reminder'
// Version: 1.4.0 - FeedReminder: added Enabled field; NotificationPreferences: removed remindersEnabled (moved to per-reminder toggle)

export type InvitationStatus = 'Pending' | 'Active' | 'Declined';

export interface User {
  UserID: string;
  UUID: string;
  AuthUserID?: string;
  MemberName: string;
  EmailAddress: string;
  IsMainMember: boolean;
  IsOnboardingCompleted: boolean;
  InvitationStatus: InvitationStatus;
  NotificationPreferences?: NotificationPreferences;
  DateCreated: string;
  DateUpdated: string;
}

export interface NotificationPreferences {
  feedingNotifications: boolean;
  memberJoinedNotifications: boolean;
  petAddedNotifications: boolean;
  memberRemovedNotifications: boolean;
}

export interface Household {
  HouseholdID: string;
  UUID: string;
  HouseholdName: string;
  InvitationCode: string;
  MainMemberID: string;
  IsSubscriptionPro: boolean;
  DateCreated: string;
  DateUpdated: string;
}

export interface UserHousehold {
  UserHouseholdID: string;
  UserID: string;
  HouseholdID: string;
  DateJoined: string;
  ReceivesReminders: boolean;
}

export interface Pet {
  PetID: string;
  UUID: string;
  PetName: string;
  HouseholdID: string;
  LastFedDateTime: string | null;
  LastFedByUserID: string | null;
  UndoDeadline: string | null;
  DateCreated: string;
  DateUpdated: string;
}

export interface Notification {
  id: string;
  householdId: string;
  type: 'feeding' | 'member_joined' | 'pet_added' | 'member_removed' | 'feed_request' | 'reminder';
  message: string;
  timestamp: string;
  read: boolean; // Computed per-user from notification_reads table
  petName?: string;
  memberName?: string;
  requestedBy?: string;
  // Targeted feed requests — null means household-wide broadcast
  targetUserId?: string;
  senderUserId?: string;
}

// Updated FeedingEvent to match Supabase schema
export interface FeedingEvent {
  EventID: string;
  HouseholdID: string;
  FedByUserID: string;
  FedByMemberName: string;
  PetIDs: string[];
  PetNames: string;
  Timestamp: string;
  UndoDeadline: string | null;
}

export interface FeedReminder {
  ReminderID: string;
  HouseholdID: string;
  Label: string;
  Time: string; // Stored as "HH:mm"
  Enabled: boolean; // false = muted for whole household
  DateCreated: string;
}

export const TIER_LIMITS = {
  FREE: {
    households: 1,
    membersPerHousehold: 2,
    petsPerHousehold: 1,
    visibleHistory: 1,
  },
  PRO: {
    households: Infinity,
    membersPerHousehold: Infinity,
    petsPerHousehold: Infinity,
    visibleHistory: Infinity,
  },
};

// Undo window duration (2 minutes in milliseconds)
export const UNDO_WINDOW_MS = 2 * 60 * 1000;