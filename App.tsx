// App.tsx - Main Entry Point
// Version: 1.0.0 - For testing Step 1 conversion
// Version: 1.0.1 - Theme Context Integration
// Version: 2.0.0 - Complete Onboarding Flow

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { StyledStatusScreen } from './src/screens/StatusScreen';
import { isOnboardingCompleted, resetOnboarding } from './src/lib/database';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // TODO: Remove this line after testing onboarding
      await resetOnboarding();

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
    console.log('Settings button pressed');
    // TODO: Navigate to settings screen
  };

  const handleOpenNotifications = () => {
    console.log('Notifications button pressed');
    // TODO: Navigate to notifications panel
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
        <StyledStatusScreen
          onOpenSettings={handleOpenSettings}
          onOpenNotifications={handleOpenNotifications}
        />
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