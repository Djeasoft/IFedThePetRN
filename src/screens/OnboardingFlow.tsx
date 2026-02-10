// OnboardingFlow.tsx
// Version: 1.0.0 - React Native with Theme Support
// Version: 2.0.0 - Added resetToNewUser() for dev/testing, new method getUserByEmail

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../contexts/ThemeContext';
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
  getUserByEmail,
  updateUser,
  addNotification,
} from '../lib/database';

type OnboardingMode = 'main' | 'member';
type OnboardingStep = 'welcome' | 'name' | 'email' | 'household' | 'invite-code';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const theme = useThemeColors();
  
  const [mode, setMode] = useState<OnboardingMode | null>(null);
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    householdName: '',
    inviteCode: '',
  });
  const [error, setError] = useState('');

  // Mode selection handlers
  const handleModeSelection = (selectedMode: OnboardingMode) => {
    setMode(selectedMode);
    setStep('name');
  };

  // Back button handler
  const handleBack = () => {
    if (step === 'name') {
      setStep('welcome');
      setMode(null);
    } else if (step === 'email') {
      setStep('name');
    } else if (step === 'household' || step === 'invite-code') {
      setStep('email');
    }
    setError('');
  };

  // Name step handler
  const handleNameContinue = () => {
    if (formData.name.trim()) {
      setStep('email');
      setError('');
    }
  };

  // Email step handler
  const handleEmailContinue = () => {
    const email = formData.email.trim().toLowerCase();
    if (!email) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (mode === 'main') {
      setStep('household');
    } else {
      setStep('invite-code');
    }
    setError('');
  };

  // Main member completion handler
  const handleMainMemberComplete = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const householdName = formData.householdName.trim();

    if (!householdName) {
      setError('Please enter a household name');
      return;
    }

    try {
      // Check if user already exists (e.g., after a reset)
      let user = await getUserByEmail(email);
      
      if (user) {
        // Update existing user with new name and main member status
        await updateUser(user.UserID, {
          MemberName: name,
          IsMainMember: true,
          InvitationStatus: 'Active',
        });
      } else {
        // Create new main member user
        user = await createUser(name, email, true, 'Active');
      }

      // Create household
      const household = await createHousehold(householdName, user.UserID, false);

      // Link user to household
      await createUserHousehold(user.UserID, household.HouseholdID);

      // Create default pet for free tier
      await createPet('Our Pet', household.HouseholdID);

      // Set as current user
      await setCurrentUserId(user.UserID);
      await setOnboardingCompleted();

      onComplete();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Main member creation error:', err);
    }
  };

  // Member completion handler
  const handleMemberComplete = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const inviteCode = formData.inviteCode.trim().toUpperCase();

    if (!inviteCode) {
      setError('Please enter an invitation code');
      return;
    }

    try {
      // Find household by invitation code
      const household = await getHouseholdByInvitationCode(inviteCode);
      if (!household) {
        setError('Invalid invitation code');
        return;
      }

      // Check if user already exists
      let user = await getUserByEmail(email);
      
      if (user) {
        // Update existing user
        await updateUser(user.UserID, {
          MemberName: name,
          InvitationStatus: 'Active',
        });
      } else {
        // Create new user
        user = await createUser(name, email, false, 'Active');
      }

      // Link user to household
      await createUserHousehold(user.UserID, household.HouseholdID);

      // Add notification for main member
      await addNotification({
        type: 'member_joined',
        message: `${name} joined ${household.HouseholdName}`,
        memberName: name,
        read: false,
      });

      // Set as current user
      await setCurrentUserId(user.UserID);
      await setOnboardingCompleted();

      onComplete();
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('Member join error:', err);
    }
  };

  // Check if current step can continue
  const canContinue = () => {
    switch (step) {
      case 'name':
        return formData.name.trim();
      case 'email':
        return formData.email.trim();
      case 'household':
        return formData.householdName.trim();
      case 'invite-code':
        return formData.inviteCode.trim();
      default:
        return false;
    }
  };

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

            {/* STEP 1: Welcome Screen */}
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
                      <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
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
                      <Ionicons name="chevron-forward" size={24} color={theme.textTertiary} />
                    </View>
                  </Card>
                </View>
              </View>
            )}

            {/* STEP 2: Name Input */}
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
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Your name"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => canContinue() && handleNameContinue()}
                  />

                  <Button
                    onPress={handleNameContinue}
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

            {/* STEP 3: Email Input */}
            {step === 'email' && (
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
                    What's your email?
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    {mode === 'main'
                      ? 'Used for inviting others to your household'
                      : 'Make sure this matches your invitation'}
                  </Text>
                </View>

                <View style={styles.formSection}>
                  <Input
                    value={formData.email}
                    onChangeText={(text) => {
                      setFormData({ ...formData, email: text });
                      setError('');
                    }}
                    placeholder="your@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => canContinue() && handleEmailContinue()}
                    error={error}
                  />

                  <Button
                    onPress={handleEmailContinue}
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

            {/* STEP 4: Household Name (Main Member Only) */}
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
                    Something everyone will recognize
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
                    onSubmitEditing={() => canContinue() && handleMainMemberComplete()}
                    error={error}
                  />

                  <Button
                    onPress={handleMainMemberComplete}
                    disabled={!canContinue()}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Create Household
                  </Button>
                </View>
              </View>
            )}

            {/* STEP 5: Invitation Code (Member Only) */}
            {step === 'invite-code' && (
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
                    Enter invitation code
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    You should have received this via email
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
                    onSubmitEditing={() => canContinue() && handleMemberComplete()}
                    error={error}
                    style={styles.inviteCodeInput}
                  />

                  <Button
                    onPress={handleMemberComplete}
                    disabled={!canContinue()}
                    variant="primary"
                    size="lg"
                    fullWidth
                  >
                    Join Household
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
