// App.tsx - Main Entry Point
// Version: 1.0.0 - For testing Step 1 conversion
// Version: 1.0.1 - Theme Context Integration
// Version: 2.0.0 - Complete Onboarding Flow
// Version: 2.1.0 - Settings Screen Integration
// Version: 2.2.0 - Notifications Panel Integration
// Version: 3.0.0 - Supabase Auth Integration (three-state routing)

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { StyledStatusScreen } from './src/screens/StatusScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NotificationsPanel } from './src/screens/NotificationsPanel';
import { isOnboardingCompleted, resetOnboarding } from './src/lib/database';

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
  const { isAuthenticated, isEmailVerified, isLoading: authLoading } = useAuth();

  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check onboarding status when authenticated + verified
  useEffect(() => {
    if (isAuthenticated && isEmailVerified) {
      checkOnboardingStatus();
    } else {
      setCheckingOnboarding(false);
      setOnboardingComplete(false);
    }
  }, [isAuthenticated, isEmailVerified]);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await isOnboardingCompleted();
      setOnboardingComplete(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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
      />
      <SettingsScreen
        visible={showSettings}
        onClose={handleCloseSettings}
        onResetOnboarding={handleResetFromSettings}
      />
      <NotificationsPanel
        visible={showNotifications}
        onClose={handleCloseNotifications}
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
