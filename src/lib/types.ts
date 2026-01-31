// Data types based on ERD specification
// Version: 1.0.0 - React Native (no changes from web version)

export type InvitationStatus = 'Pending' | 'Active' | 'Declined';

export interface User {
  UserID: string; // Primary key
  UUID: string;
  MemberName: string;
  EmailAddress: string;
  IsMainMember: boolean;
  InvitationStatus: InvitationStatus;
  NotificationPreferences?: NotificationPreferences;
  DateCreated: string; // ISO string
  DateUpdated: string; // ISO string
}

// Notification preferences
export interface NotificationPreferences {
  feedingNotifications: boolean;
  memberJoinedNotifications: boolean;
  petAddedNotifications: boolean;
  memberRemovedNotifications: boolean;
}

export interface Household {
  HouseholdID: string; // Primary key
  UUID: string;
  HouseholdName: string;
  InvitationCode: string;
  MainMemberID: string; // Foreign key to User
  IsSubscriptionPro: boolean;
  DateCreated: string; // ISO string
  DateUpdated: string; // ISO string
}

// Junction table - links users to households
export interface UserHousehold {
  UserHouseholdID: string;
  UserID: string;
  HouseholdID: string;
  DateJoined: string; // ISO string
  ReceivesReminders: boolean; // Whether this member receives feed reminders
}

export interface Pet {
  PetID: string; // Primary key
  UUID: string;
  PetName: string;
  HouseholdID: string; // Foreign key to Household
  LastFedDateTime: string | null; // ISO string or null
  LastFedByUserID: string | null; // Foreign key to User or null
  UndoDeadline: string | null; // ISO string or null
  DateCreated: string; // ISO string
  DateUpdated: string; // ISO string
}

// Notification type for in-app notifications
export interface Notification {
  id: string;
  type: 'feeding' | 'member_joined' | 'pet_added' | 'member_removed' | 'feed_request';
  message: string;
  timestamp: string;
  read: boolean;
  petName?: string;
  memberName?: string;
  requestedBy?: string; // Name of the person who requested the feeding
}

// Feeding event - tracks when pets are fed (for grouped history)
export interface FeedingEvent {
  EventID: string;
  HouseholdID: string;
  UserID: string; // Who fed the pets
  PetIDs: string[]; // Array of pet IDs that were fed
  Timestamp: string; // ISO string
  UndoDeadline: string | null; // ISO string or null
}

// Feed Reminder - scheduled reminders to feed pets
export interface FeedReminder {
  ReminderID: string;
  HouseholdID: string;
  Title: string; // e.g., "Feed the dogs"
  Time: string; // HH:mm format (e.g., "06:00", "18:30")
  IsActive: boolean;
  DateCreated: string; // ISO string
  DateUpdated: string; // ISO string
}

// Business tier limits
export const TIER_LIMITS = {
  FREE: {
    households: 1,
    membersPerHousehold: 2,
    petsPerHousehold: 1,
    visibleHistory: 1, // Only show 1 feeding record
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
