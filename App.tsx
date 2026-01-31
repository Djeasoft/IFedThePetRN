import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Alert } from 'react-native';
import StatusScreen from './src/screens/StatusScreen';

export default function App() {
  // Placeholder handlers for now - we'll replace these with real navigation later
  const handleOpenSettings = () => {
    Alert.alert('Settings', 'Settings screen coming soon!');
  };

  const handleOpenNotifications = () => {
    Alert.alert('Notifications', 'Notifications coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusScreen
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={handleOpenNotifications}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});

