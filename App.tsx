// App.tsx - Main Entry Point
// Version: 1.0.0 - For testing Step 1 conversion
// Version: 1.0.1 - Theme Context Integration
// Version: 2.0.0 - Complete Onboarding Flow
// Version: 2.1.0 - Settings Screen Integration
// Version: 2.2.0 - Notifications Panel Integration

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { StyledStatusScreen } from './src/screens/StatusScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { NotificationsPanel } from './src/screens/NotificationsPanel';
import { isOnboardingCompleted } from './src/lib/database';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await isOnboardingCompleted();
      setOnboardingComplete(completed);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setLoading(false);
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

  const handleResetFromSettings = () => {
    setOnboardingComplete(false);
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
  };

  const handleCloseNotifications = () => {
    setShowNotifications(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fb314a" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      {onboardingComplete ? (
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
      ) : (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}
    </ThemeProvider>
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