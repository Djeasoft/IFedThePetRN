// OnboardingFlow.tsx
// Version: 1.0.0 - React Native with Theme Support
// Version: 2.0.0 - Added resetToNewUser() for dev/testing, new method getUserByEmail
// Version: 3.0.0 - Supabase Auth integration, removed email step (email from auth)
// Version: 4.0.0 - New set onloading for new users
// Version: 5.0.0 - I13 + Bug 11: Reordered steps (household intent first, name last).
//                  Invited users auto-detected and hard-routed to invite-code step,
//                  bypassing the welcome choice screen entirely.
// Version: 5.1.0 - Bug 11 fix: Move invited user detection to mount-time useEffect so
//                  Gmail-style users never see the welcome screen after AuthScreen sign-up.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { spacing, fontSize, fontWeight } from '../styles/theme';
import {
  createUser,
  createHousehold,
  createUserHousehold,
  createPet,
  setCurrentUserId,
  setOnboardingCompleted,
  getHouseholdByInvitationCode,
  getHouseholdsForUser,
  getUserByEmail,
  updateUser,
  addNotification,
} from '../lib/database';

type OnboardingMode = 'main' | 'member';
// Step order (v5.0.0):
//   main:   welcome → household → name
//   member: welcome → invite-code → name
//   invited user skips welcome entirely: invite-code → name
type OnboardingStep = 'welcome' | 'household' | 'invite-code' | 'name';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const theme = useThemeColors();
  const { user: authUser } = useAuth();

  const [mode, setMode] = useState<OnboardingMode | null>(null);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState({
    name: '',
    householdName: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // v5.0.0: Stores the invited household name for the personalised subtitle on invite-code screen.
  // Only populated when an invited (Pending) user is detected.
  const [invitedHouseholdName, setInvitedHouseholdName] = useState<string | null>(null);

  // v5.1.0: True while the on-mount invited user check is running.
  // Prevents the welcome screen flashing before the redirect fires.
  const [checkingInvite, setCheckingInvite] = useState(true);

  // Email comes from Supabase Auth
  const email = authUser?.email ?? '';

  // v5.1.0: On mount, check immediately whether this is a pending invited user.
  // If so, skip the welcome screen and go straight to invite-code.
  // This covers the case where an invited user completes AuthScreen sign-up and
  // OnboardingFlow renders before they've had a chance to tap anything.
  useEffect(() => {
    const checkForInvitedUser = async () => {
      if (!email) {
        setCheckingInvite(false);
        return;
      }
      try {
        const existingUser = await getUserByEmail(email);
        if (existingUser?.InvitationStatus === 'Pending') {
          const households = await getHouseholdsForUser(existingUser.UserID);
          const householdName = households[0]?.HouseholdName ?? null;
          setInvitedHouseholdName(householdName);
          setMode('member');
          setStep('invite-code');
        }
      } catch (err) {
        // Non-fatal — if the check fails, show the welcome screen normally
        console.warn('⚠️ OnboardingFlow: mount-time invited user check failed', err);
      } finally {
        setCheckingInvite(false);
      }
    };
    checkForInvitedUser();
  }, [email]);

  // ─── Mode selection ───────────────────────────────────────────────────────────
  // v5.0.0: On selecting a mode, go to household/invite-code FIRST (not name).
  // Also checks if the user is a pending invited user and hard-routes them to
  // invite-code, skipping the welcome choice entirely.
  const handleModeSelection = async (selectedMode: OnboardingMode) => {
    setIsLoading(true);
    setError('');
    try {
      // Check if this email belongs to a pending invited user
      const existingUser = await getUserByEmail(email);
      if (existingUser?.InvitationStatus === 'Pending') {
        // Fetch the household they've been invited to for the personalised message
        const households = await getHouseholdsForUser(existingUser.UserID);
        const householdName = households[0]?.HouseholdName ?? null;
        setInvitedHouseholdName(householdName);
        setMode('member');
        setStep('invite-code');
        return;
      }
    } catch (err) {
      // Non-fatal — if the check fails, continue with the normal flow
      console.warn('⚠️ OnboardingFlow: invited user check failed, continuing normally', err);
    } finally {
      setIsLoading(false);
    }

    // Normal path — go to household intent step first
    setMode(selectedMode);
    setStep(selectedMode === 'main' ? 'household' : 'invite-code');
  };

  // ─── Back navigation ──────────────────────────────────────────────────────────
  // v5.0.0 step order: welcome → household/invite-code → name
  const handleBack = () => {
    setError('');
    if (step === 'name') {
      // Name is always the last step — go back to household intent
      setStep(mode === 'main' ? 'household' : 'invite-code');
    } else if (step === 'household' || step === 'invite-code') {
      // If the user was hard-routed (invited user), clear the invited state too
      setInvitedHouseholdName(null);
      setStep('welcome');
      setMode(null);
    }
  };

  // ─── Household / invite-code → name ──────────────────────────────────────────
  // v5.0.0: After the household intent step, advance to the name step.
  // For main: validates household name is filled.
  // For member: validates invite code is filled (actual lookup happens on final submit).
  const handleHouseholdStepContinue = () => {
    if (mode === 'main' && !formData.householdName.trim()) {
      setError('Please enter a household name');
      return;
    }
    if (mode === 'member' && !formData.inviteCode.trim()) {
      setError('Please enter an invitation code');
      return;
    }
    setError('');
    setStep('name');
  };

  // ─── Final completion handlers ────────────────────────────────────────────────
  // Called from the name step (the final step in both paths).

  const handleMainMemberComplete = async () => {
    const name = formData.name.trim();
    const householdName = formData.householdName.trim();

    if (!name) {
      setError('Please enter your name');
      return;
    }
    if (!householdName) {
      setError('Please enter a household name');
      return;
    }

    setIsLoading(true);
    try {
      // Check if user already exists (e.g. after a reset)
      let user = await getUserByEmail(email);

      if (user) {
        await updateUser(user.UserID, {
          MemberName: name,
          IsMainMember: true,
          InvitationStatus: 'Active',
          AuthUserID: authUser?.id,
        });
      } else {
        user = await createUser(name, email, true, 'Active', authUser?.id);
      }

      const household = await createHousehold(householdName, user.UserID, false);
      await createUserHousehold(user.UserID, household.HouseholdID);
      await createPet('Our Pet', household.HouseholdID);
      await setCurrentUserId(user.UserID);

      console.log('📝 OnboardingFlow.handleMainMemberComplete - About to call setOnboardingCompleted()');
      await setOnboardingCompleted(user.UserID);
      console.log('✅ OnboardingFlow.handleMainMemberComplete - setOnboardingCompleted() completed successfully');

      console.log('📝 OnboardingFlow.handleMainMemberComplete - About to call onComplete()');
      onComplete();
      console.log('✅ OnboardingFlow.handleMainMemberComplete - onComplete() called');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Main member creation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberComplete = async () => {
    if (isLoading) return;
    const name = formData.name.trim();
    const inviteCode = formData.inviteCode.trim().toUpperCase();

    if (!name) {
      setError('Please enter your name');
      return;
    }
    if (!inviteCode) {
      setError('Please enter an invitation code');
      return;
    }

    setIsLoading(true);
    try {
      const household = await getHouseholdByInvitationCode(inviteCode);
      if (!household) {
        // Send the user back to the invite-code step with the error
        setStep('invite-code');
        setError('Invalid invitation code. Please check and try again.');
        return;
      }

      let user = await getUserByEmail(email);

      if (user) {
        await updateUser(user.UserID, {
          MemberName: name,
          InvitationStatus: 'Active',
          AuthUserID: authUser?.id,
        });
      } else {
        user = await createUser(name, email, false, 'Active', authUser?.id);
      }

      await createUserHousehold(user.UserID, household.HouseholdID);

      await addNotification({
        householdId: household.HouseholdID,
        type: 'member_joined',
        message: `${name} joined ${household.HouseholdName}`,
        memberName: name,
      });

      await setCurrentUserId(user.UserID);

      console.log('📝 OnboardingFlow.handleMemberComplete - About to call setOnboardingCompleted()');
      await setOnboardingCompleted(user.UserID);
      console.log('✅ OnboardingFlow.handleMemberComplete - setOnboardingCompleted() completed successfully');

      console.log('📝 OnboardingFlow.handleMemberComplete - About to call onComplete()');
      onComplete();
      console.log('✅ OnboardingFlow.handleMemberComplete - onComplete() called');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Member join error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── canContinue ──────────────────────────────────────────────────────────────
  const canContinue = () => {
    switch (step) {
      case 'household':
        return !!formData.householdName.trim();
      case 'invite-code':
        return !!formData.inviteCode.trim();
      case 'name':
        return !!formData.name.trim();
      default:
        return false;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  // v5.1.0: Show a spinner while the mount-time invite check runs.
  // Prevents the welcome screen flashing before a pending invited user is
  // redirected to the invite-code step.
  if (checkingInvite) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fb314a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Logo size="large" />
            </View>

            {/* ── STEP 1: Welcome ── */}
            {step === 'welcome' && (
              <View style={styles.stepContainer}>
                <View style={styles.headingSection}>
                  <Text style={[styles.heading, { color: theme.text }]}>
                    Welcome!
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    How would you like to get started?
                  </Text>
                </View>

                <View style={styles.cardsContainer}>
                  <Card
                    onPress={() => handleModeSelection('main')}
                    elevation="md"
                    padding={spacing.lg}
                    margin={spacing.sm}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardTextContainer}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>
                          Create a Household
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                          Start fresh and invite others
                        </Text>
                      </View>
                      {isLoading
                        ? <ActivityIndicator size="small" color={theme.textTertiary} />
                        : <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
                      }
                    </View>
                  </Card>

                  <Card
                    onPress={() => handleModeSelection('member')}
                    elevation="md"
                    padding={spacing.lg}
                    margin={spacing.sm}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardTextContainer}>
                        <Text style={[styles.cardTitle, { color: theme.text }]}>
                          Join a Household
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
                          Use an invitation code
                        </Text>
                      </View>
                      {isLoading
                        ? <ActivityIndicator size="small" color={theme.textTertiary} />
                        : <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
                      }
                    </View>
                  </Card>
                </View>
              </View>
            )}

            {/* ── STEP 2a: Household Name (main path) ── */}
            {step === 'household' && (
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headingSection}>
                  <Text style={[styles.heading, { color: theme.text }]}>
                    Name your household
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Something everyone will recognise
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    value={formData.householdName}
                    onChangeText={(text) => {
                      setFormData({ ...formData, householdName: text });
                      setError('');
                    }}
                    placeholder="e.g. Smith Family"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => canContinue() && handleHouseholdStepContinue()}
                    error={error}
                  />

                  <Button
                    onPress={handleHouseholdStepContinue}
                    disabled={!canContinue()}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Continue
                  </Button>
                </View>
              </View>
            )}

            {/* ── STEP 2b: Invitation Code (member path) ── */}
            {step === 'invite-code' && (
              <View style={styles.stepContainer}>
                {/* Only show Back if NOT a hard-routed invited user */}
                {!invitedHouseholdName && (
                  <TouchableOpacity
                    onPress={handleBack}
                    style={styles.backButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                    <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.headingSection}>
                  <Text style={[styles.heading, { color: theme.text }]}>
                    Enter invitation code
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {invitedHouseholdName
                      ? `You've been invited to join ${invitedHouseholdName} — enter your code to continue`
                      : 'You should have received this via email'
                    }
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    value={formData.inviteCode}
                    onChangeText={(text) => {
                      setFormData({ ...formData, inviteCode: text.toUpperCase() });
                      setError('');
                    }}
                    placeholder="ABC123"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={() => canContinue() && !isLoading && handleHouseholdStepContinue()}
                    error={error}
                    style={styles.inviteCodeInput}
                  />

                  <Button
                    onPress={handleHouseholdStepContinue}
                    disabled={!canContinue() || isLoading}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Continue
                  </Button>
                </View>
              </View>
            )}

            {/* ── STEP 3: Name (final step, both paths) ── */}
            {step === 'name' && (
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
                  <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>

                <View style={styles.headingSection}>
                  <Text style={[styles.heading, { color: theme.text }]}>
                    What's your first name?
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    This is how you'll appear to others
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      setError('');
                    }}
                    placeholder="Your name"
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      if (!canContinue() || isLoading) return;
                      mode === 'main' ? handleMainMemberComplete() : handleMemberComplete();
                    }}
                    error={error}
                  />

                  <Button
                    onPress={mode === 'main' ? handleMainMemberComplete : handleMemberComplete}
                    disabled={!canContinue() || isLoading}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    {isLoading
                      ? (mode === 'main' ? 'Creating...' : 'Joining...')
                      : (mode === 'main' ? 'Create Household' : 'Join Household')
                    }
                  </Button>
                </View>
              </View>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.huge,
  },
  stepContainer: {
    width: '100%',
    maxWidth: 400,
  },

  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  backText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },

  // Headings
  headingSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  heading: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    paddingHorizontal: spacing.base,
  },

  // Cards (Welcome screen)
  cardsContainer: {
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: fontSize.base,
  },

  // Form section
  formSection: {
    width: '100%',
    gap: spacing.lg,
  },

  // Special styling for invite code
  inviteCodeInput: {
    textAlign: 'center',
    fontSize: fontSize.xl,
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});