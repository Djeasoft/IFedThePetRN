// App.tsx - Main Entry Point
// Version: 1.0.0 - For testing Step 1 conversion
// Version: 1.0.1 - Theme Context Integration
// Version: 2.0.0 - Complete Onboarding Flow
// Version: 2.1.0 - Settings Screen Integration
// Version: 2.2.0 - Notifications Panel Integration
// Version: 3.0.0 - Supabase Auth Integration (three-state routing)
// Version: 3.1.0 - Fix new user onboarding detection (check DB, not just AsyncStorage)
// Version: 3.2.0 - Log out orphaned users (authenticated but missing from DB)
// Version: 3.3.0 - Allow new users to proceed to OnboardingFlow (they will be created during onboarding)
// Version: 3.4.0 - Detect orphaned users (completed onboarding but database missing) and log them out
// Version: 3.5.0 - Fix notifications: get IDs from StatusScreen ready callback, not one-time useEffect
// Version: 3.6.0 - Fix: Lift unreadCount to App level so NotificationsPanel mark-as-read updates the bell badge
// Version: 3.7.0 - Fix: App.tsx is now source of truth for currentHouseholdId; passes it as prop to all screens so household switches propagate correctly
// Version: 3.8.0 - Add suppressNotificationSoundRef shared between SettingsScreen and StatusScreen for bell sound suppression
// Version: 3.9.0 - Bug 18: Hold overrideHouseholdName + overridePets state; wire SettingsScreen callbacks to push updates to StatusScreen

import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { supabase } from './src/lib/supabaseClient';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { StyledStatusScreen } from './src/screens/StatusScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NotificationsPanel } from './src/screens/NotificationsPanel';
import { isOnboardingCompleted, resetOnboarding, userExistsInDatabase } from './src/lib/database';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppRouter() {
  const { isAuthenticated, isEmailVerified, user, isLoading: authLoading } = useAuth();

  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // FIX: These are now set by StatusScreen when data is ready, not a one-time useEffect
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentHouseholdId, setCurrentHouseholdId] = useState<string | null>(null);
  // FIX v3.6.0: Lifted from StatusScreen so NotificationsPanel can update it directly
  const [unreadCount, setUnreadCount] = useState(0);

  // FIX v3.8.0: Shared ref — when SettingsScreen (or any sibling) creates a notification,
  // it sets this to true so StatusScreen skips the bell sound for that one event.
  const suppressNotificationSoundRef = useRef(false);

  // FIX v3.9.0 (Bug 18): Owned by App.tsx, pushed to StatusScreen as props.
  // SettingsScreen calls the callbacks below after a successful save.
  // StatusScreen patches its local state instantly via useEffect — no reload needed.
  const [overrideHouseholdName, setOverrideHouseholdName] = useState<string | undefined>(undefined);
  const [overridePets, setOverridePets] = useState<any[] | undefined>(undefined);

  // Check onboarding status when authenticated + verified
  useEffect(() => {
    if (isAuthenticated && isEmailVerified && user?.id) {
      setCheckingOnboarding(true);
      checkOnboardingStatus();
    } else {
      setCheckingOnboarding(false);
      setOnboardingComplete(false);
    }
  }, [isAuthenticated, isEmailVerified, user?.id]);

  const checkOnboardingStatus = async () => {
    try {
      // Check if user exists in our database
      const userExists = await userExistsInDatabase(user?.id);
      console.log('🔍 checkOnboardingStatus - User in DB?', userExists);

      if (!userExists) {
        // User not in DB — either brand new or orphaned
        // Check AsyncStorage as a hint for orphaned user detection
        const wasOnboardingCompleted = await isOnboardingCompleted();
        console.log('🔍 checkOnboardingStatus - Onboarding was completed before?', wasOnboardingCompleted);

        if (wasOnboardingCompleted) {
          // Orphaned user: auth exists but DB records are gone
          console.warn('⚠️ ORPHANED USER DETECTED: Auth exists but database records missing. Logging out.');
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('❌ Error signing out orphaned user:', error);
          }
          await resetOnboarding();
          setOnboardingComplete(false);
        } else {
          // Brand new user — just signed up, hasn't completed onboarding yet
          console.log('✅ New user detected - proceeding to onboarding');
          setOnboardingComplete(false);
        }
      } else {
        // User exists in DB — check is_onboarding_completed field (source of truth)
        const completed = await isOnboardingCompleted(user?.id);
        console.log('✅ User exists in DB - onboarding completed?', completed);
        setOnboardingComplete(completed);
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleResetFromSettings = async () => {
    await resetOnboarding();
    setOnboardingComplete(false);
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  // FIX: Callback from StatusScreen when data is loaded and IDs are known
  // This ensures we always have fresh IDs, even after household switching
  const handleStatusReady = (userId: string, householdId: string) => {
    if (userId !== currentUserId) setCurrentUserId(userId);
    if (householdId !== currentHouseholdId) setCurrentHouseholdId(householdId);
  };

  // FIX v3.7.0: Called by SettingsScreen after a successful household switch.
  // App.tsx updates its own currentHouseholdId state, which propagates to all screens via props.
  const handleHouseholdSwitch = (newHouseholdId: string) => {
    setCurrentHouseholdId(newHouseholdId);
  };

  // FIX v3.9.0 (Bug 18): Called by SettingsScreen after a household name save.
  const handleHouseholdNameChange = (newName: string) => {
    setOverrideHouseholdName(newName);
  };

  // FIX v3.9.0 (Bug 18): Called by SettingsScreen after a pet is added or deleted.
  const handlePetsChange = (pets: any[]) => {
    setOverridePets(pets);
  };

  // Loading state
  if (authLoading || (isAuthenticated && isEmailVerified && checkingOnboarding)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fb314a" />
      </View>
    );
  }

  // Gate 1: Must be authenticated with verified email
  if (!isAuthenticated || !isEmailVerified) {
    return <AuthScreen />;
  }

  // Gate 2: Must complete onboarding
  if (!onboardingComplete) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Gate 3: Main app
  return (
    <>
      <StyledStatusScreen
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={handleOpenNotifications}
        onStatusReady={handleStatusReady}
        unreadCount={unreadCount}
        onUnreadCountChange={setUnreadCount}
        householdId={currentHouseholdId ?? undefined}
        suppressNotificationSoundRef={suppressNotificationSoundRef}
        overrideHouseholdName={overrideHouseholdName}
        overridePets={overridePets}
      />
      <SettingsScreen
        visible={showSettings}
        onClose={handleCloseSettings}
        onResetOnboarding={handleResetFromSettings}
        onHouseholdSwitch={handleHouseholdSwitch}
        suppressNotificationSoundRef={suppressNotificationSoundRef}
        onHouseholdNameChange={handleHouseholdNameChange}
        onPetsChange={handlePetsChange}
      />
      <NotificationsPanel
        visible={showNotifications}
        onClose={handleCloseNotifications}
        userId={currentUserId ?? undefined}
        householdId={currentHouseholdId ?? undefined}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f7fc',
  },
});