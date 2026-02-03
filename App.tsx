// App.tsx
// Version: 1.0.0 - For testing Step 1 conversion
// Version: 1.0.1 - Theme Context Integration

import React from 'react';
import { Alert } from 'react-native';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { OnboardingWelcomeScreen } from './src/screens/OnboardingWelcomeScreen';

export default function App() {
  const handleCreateHousehold = () => {
    Alert.alert('Navigation', 'Would navigate to Create Household form');
    console.log('Create Household clicked');
  };

  const handleJoinHousehold = () => {
    Alert.alert('Navigation', 'Would navigate to Join Household form');
    console.log('Join Household clicked');
  };

  return (
    <ThemeProvider>
      <OnboardingWelcomeScreen
        onCreateHousehold={handleCreateHousehold}
        onJoinHousehold={handleJoinHousehold}
      />
    </ThemeProvider>
  );
}
