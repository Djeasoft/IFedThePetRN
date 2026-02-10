// SettingsScreen.tsx
// Version: 1.0.0 - React Native with Theme Support
// Version: 2.0.0 - Added resetToNewUser() for dev/testing

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  getCurrentUserId,
  getUserById,
  getHouseholdsForUser,
  getMembersOfHousehold,
  getPetsByHouseholdId,
  updateHousehold,
  updateUser,
  createUser,
  createPet,
  deletePet,
  canAddMember,
  canAddPet,
  removeUserFromHousehold,
  resetOnboarding,
  createUserHousehold,
  addNotification,
  sendMemberRemovedEmail,
  subscribeToSettingsChanges,
  getCachedScreenData,
  setCachedScreenData,
  CACHE_KEYS,
  resetToNewUser,
} from '../lib/database';
import { User, Household, Pet, TIER_LIMITS } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { Switch } from '../components/Switch';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

interface SettingsScreenCache {
  currentUser: User | null;
  household: Household | null;
  members: User[];
  pets: Pet[];
  feedingNotifications: boolean;
  memberJoinedNotifications: boolean;
}

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
  onResetOnboarding?: () => void;
}

export function SettingsScreen({ visible, onClose, onResetOnboarding }: SettingsScreenProps) {
  const { isDark, theme, toggleTheme } = useTheme();

  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editingHouseholdName, setEditingHouseholdName] = useState(false);
  const [householdNameInput, setHouseholdNameInput] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberNameInput, setMemberNameInput] = useState('');

  // Invite member modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  // Add pet modal
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPetName, setNewPetName] = useState('');

  // Notification preferences
  const [feedingNotifications, setFeedingNotifications] = useState(true);
  const [memberJoinedNotifications, setMemberJoinedNotifications] = useState(true);

  // Copy code feedback
  const [codeCopied, setCodeCopied] = useState(false);

  // Accordion state for How to Use section
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

  // Pricing plan selection
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  // Real-time suppression ref
  const suppressNextRealtimeLoad = useRef(false);

  // Computed values
  const isMainMember = currentUser?.IsMainMember ?? false;
  const isPro = household?.IsSubscriptionPro ?? false;
  const memberCount = members.filter((m) => m.InvitationStatus === 'Active').length;
  const pendingCount = members.filter((m) => m.InvitationStatus === 'Pending').length;

  // Load data (with cache-first pattern)
  const loadData = useCallback(async (options?: { skipCache?: boolean }) => {
    try {
      const skipCache = options?.skipCache ?? false;

      // Step 1: Try cache first for instant display
      // FIX: Removed the "loading" check - we want cache on EVERY load unless skipCache is true
      if (!skipCache) {
        const cached = await getCachedScreenData<SettingsScreenCache>(CACHE_KEYS.SETTINGS_SCREEN);
        if (cached) {
          // Apply cached data immediately
          setCurrentUser(cached.currentUser);
          setHousehold(cached.household);
          if (cached.household) {
            setHouseholdNameInput(cached.household.HouseholdName);
          }
          setMembers(cached.members);
          setPets(cached.pets);
          setFeedingNotifications(cached.feedingNotifications);
          setMemberJoinedNotifications(cached.memberJoinedNotifications);
          setLoading(false); // Show cached data instantly
        }
      }

      // Step 2: Always fetch fresh from Supabase (in background)
      setLoading(true);

      const userId = await getCurrentUserId();
      if (!userId) {
        setLoading(false);
        return;
      }

      // FIX: Use Promise.all for parallel fetching (2x faster!)
      const [user, households] = await Promise.all([
        getUserById(userId),
        getHouseholdsForUser(userId)
      ]);

      setCurrentUser(user);

      const feedNotifs = user?.NotificationPreferences?.feedingNotifications ?? true;
      const memberNotifs = user?.NotificationPreferences?.memberJoinedNotifications ?? true;

      if (user?.NotificationPreferences) {
        setFeedingNotifications(feedNotifs);
        setMemberJoinedNotifications(memberNotifs);
      }

      if (households.length > 0) {
        const hh = households[0];
        setHousehold(hh);
        setHouseholdNameInput(hh.HouseholdName);

        // FIX: Parallel fetch of members and pets (2x faster!)
        const [householdMembers, householdPets] = await Promise.all([
          getMembersOfHousehold(hh.HouseholdID),
          getPetsByHouseholdId(hh.HouseholdID)
        ]);

        setMembers(householdMembers);
        setPets(householdPets);

        // Step 3: Write fresh data to cache
        await setCachedScreenData<SettingsScreenCache>(CACHE_KEYS.SETTINGS_SCREEN, {
          currentUser: user,
          household: hh,
          members: householdMembers,
          pets: householdPets,
          feedingNotifications: feedNotifs,
          memberJoinedNotifications: memberNotifs,
        });
      }
    } catch (error) {
      console.error('Error loading settings data:', error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  // Real-time listener for OTHER devices' changes
  useEffect(() => {
    if (!visible || !household?.HouseholdID) return;

    const unsubscribe = subscribeToSettingsChanges(household.HouseholdID, () => {
      if (suppressNextRealtimeLoad.current) {
        suppressNextRealtimeLoad.current = false;
        return;
      }
      loadData({ skipCache: true });
    });

    return () => unsubscribe();
  }, [visible, household?.HouseholdID]);

  // Handlers
  const handleSaveHouseholdName = async () => {
    if (!household || !householdNameInput.trim()) return;

    try {
      suppressNextRealtimeLoad.current = true;
      await updateHousehold(household.HouseholdID, {
        HouseholdName: householdNameInput.trim(),
      });
      setHousehold({ ...household, HouseholdName: householdNameInput.trim() });
      setEditingHouseholdName(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update household name');
    }
  };

  const handleSaveMemberName = async () => {
    if (!editingMemberId || !memberNameInput.trim()) return;

    try {
      await updateUser(editingMemberId, { MemberName: memberNameInput.trim() });
      setMembers((prev) =>
        prev.map((m) =>
          m.UserID === editingMemberId ? { ...m, MemberName: memberNameInput.trim() } : m
        )
      );
      setEditingMemberId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update member name');
    }
  };

  const handleCopyInviteCode = async () => {
    if (!household) return;

    try {
      await Clipboard.setStringAsync(household.InvitationCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy invitation code');
    }
  };

  const handleInviteMember = async () => {
    if (!household || !inviteName.trim() || !inviteEmail.trim()) return;

    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Check member limit
    const canAdd = await canAddMember(household.HouseholdID);
    if (!canAdd) {
      Alert.alert(
        'Member Limit Reached',
        'Upgrade to Pro to add more members to your household.'
      );
      return;
    }

    try {
      suppressNextRealtimeLoad.current = true;
      // Create pending user with the provided name
      const newUser = await createUser(name, email, false, 'Pending');
      await createUserHousehold(newUser.UserID, household.HouseholdID);

      // Add notification
      await addNotification({
        type: 'member_joined',
        message: `Invitation sent to ${name}`,
        memberName: name,
        read: false,
      });

      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (member: User) => {
    if (!household || !currentUser) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.MemberName} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              suppressNextRealtimeLoad.current = true;
              await removeUserFromHousehold(member.UserID, household.HouseholdID);

              // Send email notification
              sendMemberRemovedEmail(
                member.EmailAddress,
                member.MemberName,
                household.HouseholdName,
                currentUser.MemberName
              );

              // Add in-app notification
              await addNotification({
                type: 'member_removed',
                message: `${member.MemberName} was removed from the household`,
                memberName: member.MemberName,
                read: false,
              });

              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleAddPet = async () => {
    if (!household || !newPetName.trim()) return;

    // Check pet limit
    const canAdd = await canAddPet(household.HouseholdID);
    if (!canAdd) {
      Alert.alert(
        'Pet Limit Reached',
        'Upgrade to Pro to add more pets to your household.'
      );
      return;
    }

    try {
      suppressNextRealtimeLoad.current = true;
      await createPet(newPetName.trim(), household.HouseholdID);
      setShowAddPetModal(false);
      setNewPetName('');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to add pet');
    }
  };

  const handleDeletePet = async (pet: Pet) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${pet.PetName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              suppressNextRealtimeLoad.current = true;
              await deletePet(pet.PetID);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete pet');
            }
          },
        },
      ]
    );
  };

  const handleNotificationToggle = async (
    type: 'feeding' | 'memberJoined',
    value: boolean
  ) => {
    if (!currentUser) return;

    const newPrefs = {
      ...currentUser.NotificationPreferences,
      feedingNotifications: type === 'feeding' ? value : feedingNotifications,
      memberJoinedNotifications:
        type === 'memberJoined' ? value : memberJoinedNotifications,
      petAddedNotifications: true,
      memberRemovedNotifications: true,
    };

    if (type === 'feeding') setFeedingNotifications(value);
    if (type === 'memberJoined') setMemberJoinedNotifications(value);

    try {
      await updateUser(currentUser.UserID, { NotificationPreferences: newPrefs });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  };

  const handleTogglePro = async () => {
    if (!household) return;

    try {
      const newProStatus = !household.IsSubscriptionPro;
      await updateHousehold(household.HouseholdID, {
        IsSubscriptionPro: newProStatus,
      });
      setHousehold({ ...household, IsSubscriptionPro: newProStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle Pro status');
    }
  };

  const handleResetToNewUser = async () => {
    Alert.alert(
      'Reset to New User?',
      'This will clear your session and reset the app to onboarding. Useful for testing fresh user flows. Your Supabase data is NOT deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetToNewUser();
              // Close settings and trigger onboarding reset callback
              onClose();
              if (onResetOnboarding) {
                onResetOnboarding();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app state');
            }
          },
        },
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset to Onboarding',
      'This will clear your data and restart the onboarding flow. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetOnboarding();
              onClose();
              onResetOnboarding?.();
            } catch (error) {
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Failed to open link');
    });
  };

  // Render section header
  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>{title}</Text>
  );

  // Render row
  const SettingsRow = ({
    label,
    value,
    onPress,
    rightElement,
    showChevron = false,
    destructive = false,
  }: {
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <Text
        style={[
          styles.rowLabel,
          { color: destructive ? theme.error : theme.text },
        ]}
      >
        {label}
      </Text>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
            {value}
          </Text>
        )}
        {rightElement}
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.textTertiary}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  // Accordion Item component for How to Use section
  const AccordionItem = ({
    id,
    title,
    expanded,
    onToggle,
    theme: itemTheme,
    children,
  }: {
    id: string;
    title: string;
    expanded: boolean;
    onToggle: () => void;
    theme: typeof theme;
    children: React.ReactNode;
  }) => (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.accordionHeader}
        activeOpacity={0.7}
      >
        <Text style={[styles.accordionTitle, { color: itemTheme.text }]}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={itemTheme.textTertiary}
        />
      </TouchableOpacity>
      {expanded && children}
    </View>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <>
              {/* Household Section - Match RW design */}
              <SectionHeader title="Household" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {editingHouseholdName ? (
                  <View style={styles.householdEditContainer}>
                    <TextInput
                      style={[
                        styles.householdEditInput,
                        { color: theme.text, backgroundColor: theme.background },
                      ]}
                      value={householdNameInput}
                      onChangeText={setHouseholdNameInput}
                      placeholder="Household name"
                      placeholderTextColor={theme.textTertiary}
                      autoFocus
                      onSubmitEditing={handleSaveHouseholdName}
                    />
                    <View style={styles.householdEditButtons}>
                      <TouchableOpacity
                        onPress={handleSaveHouseholdName}
                        disabled={!householdNameInput.trim()}
                        style={[
                          styles.householdSaveButton,
                          { backgroundColor: theme.primary },
                          !householdNameInput.trim() && { opacity: 0.4 },
                        ]}
                      >
                        <Text style={styles.householdSaveButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingHouseholdName(false);
                          setHouseholdNameInput(household?.HouseholdName || '');
                        }}
                        style={[styles.householdCancelButton, { backgroundColor: theme.background }]}
                      >
                        <Text style={[styles.householdCancelButtonText, { color: theme.text }]}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.householdInfoRow}>
                    <View style={styles.householdInfoLeft}>
                      <Text style={[styles.householdName, { color: theme.text }]}>
                        {household?.HouseholdName}
                      </Text>
                      <Text style={[styles.householdMeta, { color: theme.textSecondary }]}>
                        {isPro ? 'Pro' : 'Free'} · {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    {isMainMember && (
                      <TouchableOpacity
                        onPress={() => {
                          setEditingHouseholdName(true);
                          setHouseholdNameInput(household?.HouseholdName || '');
                        }}
                        style={[styles.householdEditButton, { backgroundColor: theme.hover }]}
                      >
                        <Ionicons name="pencil" size={20} color={theme.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Members Section */}
              <SectionHeader title="Members" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {members.map((member, index) => (
                  <React.Fragment key={member.UserID}>
                    {index > 0 && (
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    )}
                    {editingMemberId === member.UserID ? (
                      <View style={styles.editRow}>
                        <TextInput
                          style={[
                            styles.editInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          value={memberNameInput}
                          onChangeText={setMemberNameInput}
                          autoFocus
                          onSubmitEditing={handleSaveMemberName}
                        />
                        <TouchableOpacity
                          onPress={handleSaveMemberName}
                          style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEditingMemberId(null)}
                          style={styles.cancelButton}
                        >
                          <Ionicons name="close" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.memberContainer}>
                        <View style={styles.memberRow}>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberNameRow}>
                              <Text style={[styles.memberName, { color: theme.text }]}>
                                {member.MemberName}
                              </Text>
                              {member.IsMainMember && (
                                <View
                                  style={[
                                    styles.adminBadge,
                                    { backgroundColor: theme.primaryLight },
                                  ]}
                                >
                                  <Text style={styles.adminBadgeText}>Admin</Text>
                                </View>
                              )}
                              {member.InvitationStatus === 'Pending' && (
                                <View
                                  style={[
                                    styles.pendingBadge,
                                    { backgroundColor: theme.warning },
                                  ]}
                                >
                                  <Text style={styles.pendingBadgeText}>Pending</Text>
                                </View>
                              )}
                            </View>
                            <Text
                              style={[styles.memberEmail, { color: theme.textSecondary }]}
                            >
                              {member.EmailAddress}
                            </Text>
                          </View>
                          {isMainMember && !member.IsMainMember && (
                            <View style={styles.memberActions}>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingMemberId(member.UserID);
                                  setMemberNameInput(member.MemberName);
                                }}
                                style={styles.memberActionButton}
                              >
                                <Ionicons
                                  name="pencil"
                                  size={18}
                                  color={theme.textSecondary}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleRemoveMember(member)}
                                style={styles.memberActionButton}
                              >
                                <Ionicons name="trash" size={18} color={theme.error} />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>

                        {/* "Ask to feed" button - only for other members */}
                        {currentUser && member.UserID !== currentUser.UserID && (
                          <View style={styles.feedRequestContainer}>
                            <TouchableOpacity
                              style={[
                                styles.feedRequestButton,
                                { backgroundColor: isPro ? theme.primary : theme.border },
                              ]}
                              disabled={!isPro}
                              onPress={() => {
                                Alert.alert(
                                  'Request Sent',
                                  `Asked ${member.MemberName} to feed the pet(s)!`
                                );
                              }}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.feedRequestButtonText,
                                  !isPro && { opacity: 0.5 },
                                ]}
                              >
                                Ask {member.MemberName} to feed the pet(s)
                              </Text>
                            </TouchableOpacity>

                            {/* Upgrade message for Free tier */}
                            {!isPro && (
                              <Text style={[styles.feedRequestUpgradeText, { color: theme.textSecondary }]}>
                                <Text style={[styles.feedRequestUpgradeLink, { color: theme.textSecondary }]}>
                                  Upgrade to Pro
                                </Text>
                                {' '}to notify a member to feed the pet(s).
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Invite Member Button */}
              {isMainMember && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface }]}
                  onPress={() => setShowInviteModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-add" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                    Invite Member
                  </Text>
                </TouchableOpacity>
              )}

              {/* Free tier member limit message */}
              {!isPro && memberCount >= TIER_LIMITS.FREE.membersPerHousehold && (
                <Text style={[styles.limitMessage, { color: theme.textTertiary }]}>
                  Free tier limited to {TIER_LIMITS.FREE.membersPerHousehold} members.
                  Upgrade to Pro for unlimited members.
                </Text>
              )}

              {/* Invitation Code */}
              {isMainMember && household && (
                <View style={[styles.inviteCodeCard, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.inviteCodeLabel, { color: theme.textSecondary }]}>
                    Invitation Code
                  </Text>
                  <View style={styles.inviteCodeRow}>
                    <Text style={[styles.inviteCode, { color: theme.text }]}>
                      {household.InvitationCode}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCopyInviteCode}
                      style={[styles.copyButton, { backgroundColor: theme.primaryLight }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={codeCopied ? 'checkmark' : 'copy'}
                        size={16}
                        color="white"
                      />
                      <Text style={styles.copyButtonText}>
                        {codeCopied ? 'Copied!' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Pets Section */}
              <SectionHeader title="Pets" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {pets.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                    No pets added yet
                  </Text>
                ) : (
                  pets.map((pet, index) => (
                    <React.Fragment key={pet.PetID}>
                      {index > 0 && (
                        <View style={[styles.divider, { backgroundColor: theme.border }]} />
                      )}
                      <View style={styles.petRow}>
                        <Text style={[styles.petName, { color: theme.text }]}>
                          {pet.PetName}
                        </Text>
                        {isMainMember && isPro && (
                          <TouchableOpacity
                            onPress={() => handleDeletePet(pet)}
                            style={styles.petDeleteButton}
                          >
                            <Ionicons name="trash" size={18} color={theme.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </React.Fragment>
                  ))
                )}
              </View>

              {/* Add Pet Button */}
              {isMainMember && isPro && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.surface }]}
                  onPress={() => setShowAddPetModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={20} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>
                    Add Pet
                  </Text>
                </TouchableOpacity>
              )}

              {/* Free tier pet limit message */}
              {!isPro && (
                <Text style={[styles.limitMessage, { color: theme.textTertiary }]}>
                  Free tier limited to {TIER_LIMITS.FREE.petsPerHousehold} pet.
                  Upgrade to Pro for unlimited pets.
                </Text>
              )}

              {/* Notifications Section - Match RW with descriptions */}
              <SectionHeader title="Notifications" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={styles.notificationRow}
                  onPress={() => handleNotificationToggle('feeding', !feedingNotifications)}
                  activeOpacity={0.8}
                >
                  <View style={styles.notificationRowLeft}>
                    <Text style={[styles.notificationRowLabel, { color: theme.text }]}>
                      Feeding notifications
                    </Text>
                    <Text style={[styles.notificationRowDesc, { color: theme.textSecondary }]}>
                      Get notified when pets are fed
                    </Text>
                  </View>
                  <Switch
                    value={feedingNotifications}
                    onValueChange={(v) => handleNotificationToggle('feeding', v)}
                  />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.notificationRow}
                  onPress={() => handleNotificationToggle('memberJoined', !memberJoinedNotifications)}
                  activeOpacity={0.8}
                >
                  <View style={styles.notificationRowLeft}>
                    <Text style={[styles.notificationRowLabel, { color: theme.text }]}>
                      Member notifications
                    </Text>
                    <Text style={[styles.notificationRowDesc, { color: theme.textSecondary }]}>
                      Get notified when members join
                    </Text>
                  </View>
                  <Switch
                    value={memberJoinedNotifications}
                    onValueChange={(v) => handleNotificationToggle('memberJoined', v)}
                  />
                </TouchableOpacity>
              </View>

              {/* Reminders Section - Show for all users with Pro badge */}
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionHeader, { color: theme.textSecondary, marginTop: 0, marginBottom: 0, marginHorizontal: 0 }]}>
                  Reminders
                </Text>
                {!isPro && (
                  <View style={[styles.proBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.proBadgeText}>Pro</Text>
                  </View>
                )}
              </View>
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={[styles.remindersRow, !isPro && { opacity: 0.4 }]}
                  onPress={() => {
                    if (isPro) {
                      Alert.alert('Coming Soon', 'Feed reminders will be available in a future update.');
                    }
                  }}
                  disabled={!isPro}
                  activeOpacity={0.8}
                >
                  <View style={styles.remindersRowLeft}>
                    <View style={styles.remindersLabelRow}>
                      <Text style={[styles.remindersLabel, { color: theme.text }]}>
                        Feed reminders
                      </Text>
                      {!isPro && (
                        <Ionicons name="lock-closed" size={14} color={theme.text} style={{ marginLeft: spacing.sm }} />
                      )}
                    </View>
                    <Text style={[styles.remindersDesc, { color: theme.textSecondary }]}>
                      Get reminded to feed my pet
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Appearance Section - Match RW with icon */}
              <SectionHeader title="Appearance" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <TouchableOpacity
                  style={styles.appearanceRow}
                  onPress={toggleTheme}
                  activeOpacity={0.8}
                >
                  <View style={styles.appearanceRowLeft}>
                    <Ionicons
                      name={isDark ? 'moon' : 'sunny'}
                      size={20}
                      color={theme.text}
                      style={styles.appearanceIcon}
                    />
                    <Text style={[styles.appearanceLabel, { color: theme.text }]}>
                      {isDark ? 'Dark mode' : 'Light mode'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>

              {/* Upgrade Card (Free + Main Member only) */}
              {!isPro && isMainMember && (
                <>
                  <SectionHeader title="Upgrade" />
                  <View style={[styles.upgradeCard, { backgroundColor: theme.primary + '15' }]}>
                    {/* Header */}
                    <View style={styles.upgradeHeader}>
                      <Text style={[styles.upgradeTitle, { color: theme.text }]}>
                        Upgrade to Pro
                      </Text>
                      <Text style={[styles.upgradeTagline, { color: theme.textSecondary }]}>
                        Feeding, without second-guessing
                      </Text>
                    </View>

                    {/* Features List */}
                    <View style={styles.upgradeBenefits}>
                      {['No ads', 'Unlimited members', 'Unlimited pets', 'Feed reminders', '30 day feed history'].map((feature) => (
                        <View key={feature} style={styles.upgradeFeatureRow}>
                          <View style={[styles.upgradeFeatureCheck, { backgroundColor: theme.success }]}>
                            <Ionicons name="checkmark" size={12} color="white" />
                          </View>
                          <Text style={[styles.upgradeFeatureText, { color: theme.text }]}>
                            {feature}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Pricing Tiers */}
                    <View style={styles.pricingContainer}>
                      {/* Yearly Plan */}
                      <TouchableOpacity
                        onPress={() => setSelectedPlan('yearly')}
                        style={[
                          styles.pricingTier,
                          { backgroundColor: theme.surface },
                          selectedPlan === 'yearly' && { borderColor: theme.primary, borderWidth: 2 },
                          selectedPlan !== 'yearly' && { opacity: 0.6 },
                        ]}
                        activeOpacity={0.8}
                      >
                        {selectedPlan === 'yearly' && (
                          <View style={[styles.bestValueBadge, { backgroundColor: theme.primary }]}>
                            <Text style={styles.bestValueText}>Best value</Text>
                          </View>
                        )}
                        <View style={styles.pricingTierContent}>
                          <View>
                            <Text style={[styles.pricingAmount, { color: theme.text }]}>$39.99</Text>
                            <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>per year</Text>
                          </View>
                          <Text style={[styles.pricingSavings, { color: theme.textSecondary }]}>Save 33%</Text>
                        </View>
                      </TouchableOpacity>

                      {/* Monthly Plan */}
                      <TouchableOpacity
                        onPress={() => setSelectedPlan('monthly')}
                        style={[
                          styles.pricingTier,
                          { backgroundColor: theme.surface },
                          selectedPlan === 'monthly' && { borderColor: theme.primary, borderWidth: 2 },
                          selectedPlan !== 'monthly' && { opacity: 0.6 },
                        ]}
                        activeOpacity={0.8}
                      >
                        <View style={styles.pricingTierContent}>
                          <View>
                            <Text style={[styles.pricingAmount, { color: theme.text }]}>$4.99</Text>
                            <Text style={[styles.pricingPeriod, { color: theme.textSecondary }]}>per month</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                      onPress={() => Alert.alert('Coming Soon', 'In-app purchases will be available in a future update.')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text style={[styles.upgradeFooter, { color: theme.textTertiary }]}>
                      Cancel anytime. Designed to stay simple.
                    </Text>
                  </View>
                </>
              )}

              {/* Legal Section */}
              <SectionHeader title="Legal" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <SettingsRow
                  label="Privacy Policy"
                  onPress={() => handleOpenLink('https://ifedthepet.com/privacy')}
                  showChevron
                />
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <SettingsRow
                  label="Terms of Service"
                  onPress={() => handleOpenLink('https://ifedthepet.com/terms')}
                  showChevron
                />
              </View>

              {/* Developer Testing Section (Main Member only) */}
              {isMainMember && (
                <>
                  <SectionHeader title="Developer Testing" />
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <SettingsRow
                      label="Toggle Pro Mode"
                      rightElement={
                        <Switch value={isPro} onValueChange={handleTogglePro} />
                      }
                    />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <SettingsRow
                      label="Reset to Onboarding"
                      onPress={handleResetOnboarding}
                      destructive
                    />
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    <SettingsRow
                      label="Reset to New User"
                      onPress={handleResetToNewUser}
                      destructive
                    />
                  </View>
                </>
              )}

              {/* How to Use Section */}
              <SectionHeader title="How to use I Fed the Pet" />
              <View style={[styles.card, { backgroundColor: theme.surface }]}>
                {/* Getting Started */}
                <AccordionItem
                  id="getting-started"
                  title="Getting Started"
                  expanded={expandedAccordion === 'getting-started'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'getting-started' ? null : 'getting-started')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Creating Your Account</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Download and open I Fed the Pet{'\n'}
                      2. Choose "Create a Household" on the welcome screen{'\n'}
                      3. Enter your name and email address{'\n'}
                      4. Create a name for your household (e.g., "Smith Family"){'\n'}
                      5. Add your first pet's name
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      You'll start on the Free plan with space for 1 household, 2 members, and 1 pet.
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Recording a Feeding */}
                <AccordionItem
                  id="feeding"
                  title="Red I FED THE PET Button"
                  expanded={expandedAccordion === 'feeding'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'feeding' ? null : 'feeding')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Recording a Feeding</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Tap the large red "I FED THE PET" button on the home screen{'\n'}
                      2. If you have multiple pets (Pro), first select which pet(s) you fed using the checkboxes{'\n'}
                      3. The feeding is recorded instantly with the current time{'\n'}
                      4. The status card updates to show when and who fed the pet(s){'\n'}
                      5. All household members receive a notification{'\n'}
                      6. You can tap "Undo" within 2 minutes if you made a mistake
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      The status card shows the last feeding time and who fed which pet(s)!
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Viewing Activity */}
                <AccordionItem
                  id="activity"
                  title="Viewing Activity"
                  expanded={expandedAccordion === 'activity'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'activity' ? null : 'activity')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Checking Feeding History</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. View recent feedings in the "RECENT" section on the home screen{'\n'}
                      2. Tap the bell icon in the top-right corner to see all notifications{'\n'}
                      3. In notifications, see feeding activity, member joins, and household updates{'\n'}
                      4. Pro users can tap "VIEW ALL" to see 30 days of feeding history
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      Free accounts do not keep history. Pro accounts keep 30 days of feeding history.
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Managing Members */}
                <AccordionItem
                  id="members"
                  title="Managing Members"
                  expanded={expandedAccordion === 'members'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'members' ? null : 'members')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Inviting Members (Admin Only)</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Go to Settings → Members section{'\n'}
                      2. Tap "Invite member" and enter their email{'\n'}
                      3. Share the invitation code with them{'\n'}
                      4. They'll receive instructions to join{'\n'}
                      5. Once they join, they appear as an "Active" member
                    </Text>
                    <Text style={[styles.accordionSubtitle, { color: theme.text, marginTop: spacing.md }]}>Editing & Removing Members</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      • Tap the pencil icon to edit a member's name{'\n'}
                      • Tap the trash icon to remove a member from the household
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      Only the Admin can manage members. Free accounts support up to 2 members.
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Managing Pets */}
                <AccordionItem
                  id="pets"
                  title="Managing Pets (Pro)"
                  expanded={expandedAccordion === 'pets'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'pets' ? null : 'pets')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Adding Multiple Pets (Pro Feature)</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Upgrade to Pro to unlock multiple pets{'\n'}
                      2. Go to Settings → Pets section{'\n'}
                      3. Tap "Add pet" and enter the pet's name{'\n'}
                      4. When feeding, use checkboxes to select which pets were fed
                    </Text>
                    <Text style={[styles.accordionSubtitle, { color: theme.text, marginTop: spacing.md }]}>Removing Pets (Admin Only)</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      • In Settings → Pets, tap the trash icon next to the pet's name{'\n'}
                      • Confirm the removal when prompted
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      Free accounts include one default pet. Upgrade to Pro for unlimited pets.
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Notifications */}
                <AccordionItem
                  id="notifications-help"
                  title="Notifications"
                  expanded={expandedAccordion === 'notifications-help'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'notifications-help' ? null : 'notifications-help')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Managing Notification Preferences</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Go to Settings → Notifications{'\n'}
                      2. Toggle "Feeding notifications" to get notified when pets are fed{'\n'}
                      3. Toggle "Member notifications" to get notified when new members join{'\n'}
                      4. Changes are saved automatically
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      All household members can customize their own notification preferences.
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Reminders */}
                <AccordionItem
                  id="reminders-help"
                  title="Setting Up Reminders (Pro)"
                  expanded={expandedAccordion === 'reminders-help'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'reminders-help' ? null : 'reminders-help')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>Creating Feed Reminders</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Go to Settings → Reminders → Feed reminders{'\n'}
                      2. Tap "Add reminder" to create a new reminder{'\n'}
                      3. Enter a title (e.g., "Morning feeding"){'\n'}
                      4. Set the time you want to be reminded{'\n'}
                      5. Tap "Add" to save the reminder
                    </Text>
                    <Text style={[styles.accordionSubtitle, { color: theme.text, marginTop: spacing.md }]}>Controlling Who Gets Reminders</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      • In Settings → Members, you'll see a "Reminders" toggle{'\n'}
                      • Toggle ON for members who should receive reminders{'\n'}
                      • Only the Admin can control these settings
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      Feed reminders are a Pro feature. Create unlimited custom reminders!
                    </Text>
                  </View>
                </AccordionItem>

                <View style={[styles.accordionDivider, { backgroundColor: theme.border }]} />

                {/* Upgrading to Pro */}
                <AccordionItem
                  id="upgrade-help"
                  title="Upgrading to Pro"
                  expanded={expandedAccordion === 'upgrade-help'}
                  onToggle={() => setExpandedAccordion(expandedAccordion === 'upgrade-help' ? null : 'upgrade-help')}
                  theme={theme}
                >
                  <View style={styles.accordionContent}>
                    <Text style={[styles.accordionSubtitle, { color: theme.text }]}>What's Included in Pro</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      • Unlimited households{'\n'}
                      • Unlimited household members{'\n'}
                      • Unlimited pets with individual checkboxes{'\n'}
                      • Custom feed reminders with specific times{'\n'}
                      • 30 days feeding history{'\n'}
                      • Control which members receive reminders
                    </Text>
                    <Text style={[styles.accordionSubtitle, { color: theme.text, marginTop: spacing.md }]}>How to Upgrade</Text>
                    <Text style={[styles.accordionText, { color: theme.textSecondary }]}>
                      1. Scroll to the "Upgrade to Pro" card in Settings{'\n'}
                      2. Review the Pro features{'\n'}
                      3. Tap "Upgrade Now" to start your subscription{'\n'}
                      4. Your Pro features activate immediately
                    </Text>
                    <Text style={[styles.accordionTip, { color: theme.textTertiary }]}>
                      Only the Admin needs to upgrade. All household members get Pro benefits!
                    </Text>
                  </View>
                </AccordionItem>
              </View>

              {/* Version */}
              <View style={styles.versionContainer}>
                <Text style={[styles.versionText, { color: theme.textTertiary }]}>
                  Version 1.0.0
                </Text>
              </View>
            </>
          )}
        </ScrollView>

        {/* Invite Member Modal */}
        <Modal
          visible={showInviteModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowInviteModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              {/* Modal Header with X close button */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Invite Member
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowInviteModal(false);
                    setInviteName('');
                    setInviteEmail('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* First name field */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.textSecondary }]}>
                  First name
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="Member's name"
                  placeholderTextColor={theme.textTertiary}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              {/* Email address field */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.textSecondary }]}>
                  Email address
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
                  ]}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="member@example.com"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalCancelButton,
                    { backgroundColor: theme.border },
                  ]}
                  onPress={() => {
                    setShowInviteModal(false);
                    setInviteName('');
                    setInviteEmail('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: theme.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalSendButton,
                    { backgroundColor: theme.primary },
                    (!inviteName.trim() || !inviteEmail.trim()) && { opacity: 0.5 },
                  ]}
                  onPress={handleInviteMember}
                  disabled={!inviteName.trim() || !inviteEmail.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>
                    Send Invite
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Pet Modal */}
        <Modal
          visible={showAddPetModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAddPetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
              {/* Modal Header with X close button */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add Pet</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddPetModal(false);
                    setNewPetName('');
                  }}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Pet name field */}
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalInputLabel, { color: theme.textSecondary }]}>
                  Pet name
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { color: theme.text, backgroundColor: theme.background },
                  ]}
                  value={newPetName}
                  onChangeText={setNewPetName}
                  placeholder="Enter pet's name"
                  placeholderTextColor={theme.textTertiary}
                  autoFocus
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalCancelButton,
                    { backgroundColor: theme.border },
                  ]}
                  onPress={() => {
                    setShowAddPetModal(false);
                    setNewPetName('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: theme.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalSendButton,
                    { backgroundColor: theme.primary },
                    !newPetName.trim() && { opacity: 0.5 },
                  ]}
                  onPress={handleAddPet}
                  disabled={!newPetName.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>Add Pet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.huge,
  },
  loadingText: {
    fontSize: fontSize.md,
  },

  // Section Header - Match RW: text-lg font-semibold opacity-60
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    opacity: 0.6,
  },

  // Card - Match RW: rounded-2xl shadow-sm
  card: {
    marginHorizontal: spacing.base,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    // Shadow for Android
    elevation: 1,
  },

  // Row - Match RW: px-5 py-4 (20px/16px)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
  },
  rowLabel: {
    fontSize: fontSize.base,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.xs,
  },

  // Divider
  divider: {
    height: 1,
    marginLeft: spacing.base,
  },

  // Edit row
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    marginRight: spacing.sm,
  },
  saveButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  cancelButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Tier badge
  tierBadge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  tierBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  // Household section - Match RW design
  householdInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  householdInfoLeft: {
    flex: 1,
  },
  householdName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  householdMeta: {
    fontSize: fontSize.sm,
  },
  householdEditButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  householdEditContainer: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  householdEditInput: {
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  householdEditButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  householdSaveButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  householdSaveButtonText: {
    color: 'white',
    fontWeight: fontWeight.semibold,
  },
  householdCancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
  },
  householdCancelButtonText: {
    fontWeight: fontWeight.semibold,
  },

  // Member row (padding now handled by memberContainer)
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginRight: spacing.sm,
  },
  memberEmail: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  adminBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  adminBadgeText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  pendingBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
  },
  pendingBadgeText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberActionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },

  // Member container (for row + feed request button)
  memberContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  // Feed request button styles
  feedRequestContainer: {
    marginTop: spacing.md,
  },
  feedRequestButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  feedRequestButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  feedRequestUpgradeText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  feedRequestUpgradeLink: {
    textDecorationLine: 'underline',
  },

  // Action button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.sm,
  },

  // Limit message
  limitMessage: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },

  // Invite code card
  inviteCodeCard: {
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
  },
  inviteCodeLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.sm,
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCode: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  copyButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginLeft: spacing.xs,
  },

  // Pet row
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    minHeight: 52,
  },
  petName: {
    fontSize: fontSize.base,
  },
  petDeleteButton: {
    padding: spacing.sm,
  },

  // Empty text
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  // Notification row - Match RW design with descriptions
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  notificationRowLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  notificationRowLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  notificationRowDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // Appearance row - Match RW design with icon
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  appearanceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appearanceIcon: {
    marginRight: spacing.md,
  },
  appearanceLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },

  // Section header with badge - for Reminders
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  proBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.round,
    marginLeft: spacing.sm,
  },
  proBadgeText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  // Reminders row
  remindersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  remindersRowLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  remindersLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remindersLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  remindersDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // Upgrade card
  upgradeCard: {
    marginHorizontal: spacing.base,
    padding: spacing.lg,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(251, 49, 74, 0.2)',
  },
  upgradeHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  upgradeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  upgradeTagline: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  upgradeBenefits: {
    marginBottom: spacing.lg,
  },
  upgradeFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeFeatureCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  upgradeFeatureText: {
    fontSize: fontSize.base,
  },
  pricingContainer: {
    marginBottom: spacing.lg,
  },
  pricingTier: {
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    position: 'relative',
  },
  pricingTierContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingAmount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
  },
  pricingPeriod: {
    fontSize: fontSize.sm,
  },
  pricingSavings: {
    fontSize: fontSize.sm,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    left: spacing.base,
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
  },
  bestValueText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  upgradeButton: {
    paddingVertical: spacing.base,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  upgradeFooter: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.huge,
  },
  versionText: {
    fontSize: fontSize.sm,
  },

  // Accordion styles
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  accordionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    flex: 1,
  },
  accordionDivider: {
    height: 1,
    marginLeft: spacing.base,
  },
  accordionContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  accordionSubtitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  accordionText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  accordionTip: {
    fontSize: fontSize.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    fontStyle: 'italic',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  modalInputGroup: {
    marginBottom: spacing.base,
  },
  modalInputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  modalInput: {
    borderWidth: 0,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    // Shadow for card-like appearance (matching Input component)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalCancelButton: {
    // Gray background applied inline
  },
  modalSendButton: {
    // Primary background applied inline
  },
  modalButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});