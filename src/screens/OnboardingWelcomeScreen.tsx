// OnboardingFlow - Step 1: Welcome Screen (Theme-Aware)
// Version: 2.0.0 - React Native with Theme Support
// Uses reusable themed components

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../contexts/ThemeContext';
import { Logo } from '../components/Logo';
import { Card } from '../components/Card';
import { spacing, fontSize, fontWeight } from '../styles/theme';

interface OnboardingWelcomeScreenProps {
  onCreateHousehold: () => void;
  onJoinHousehold: () => void;
}

export function OnboardingWelcomeScreen({
  onCreateHousehold,
  onJoinHousehold,
}: OnboardingWelcomeScreenProps) {
  const theme = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <Logo size="large" />
        </View>

        {/* Welcome Heading */}
        <View style={styles.headingSection}>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Welcome!
          </Text>
          <Text style={[styles.subtitleText, { color: theme.textSecondary }]}>
            How would you like to get started?
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.cardsContainer}>
          {/* Create a Household Card */}
          <Card
            onPress={onCreateHousehold}
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
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.textTertiary}
              />
            </View>
          </Card>

          {/* Join a Household Card */}
          <Card
            onPress={onJoinHousehold}
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
              <Ionicons
                name="chevron-forward"
                size={24}
                color={theme.textTertiary}
              />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.massive,
    alignItems: 'center',
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.massive,
  },
  
  // Welcome Heading
  headingSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  welcomeText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  subtitleText: {
    fontSize: fontSize.md,
    textAlign: 'center',
  },
  
  // Cards Container
  cardsContainer: {
    width: '100%',
    maxWidth: 400,
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
});
