// Card Component - Reusable card with theme support
// Version: 1.0.0 - React Native
// Used for interactive cards, content containers, etc.

import React, { ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { borderRadius, shadows, elevation as elevationLevels } from '../styles/theme';

interface CardProps {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: ViewStyle;
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padding?: number;
  margin?: number;
  disabled?: boolean;
}

export function Card({
  children,
  onPress,
  style,
  elevation = 'md',
  padding = 20,
  margin = 0,
  disabled = false,
}: CardProps) {
  const theme = useThemeColors();

  const cardStyle: ViewStyle = {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.xl,
    padding,
    margin,
    ...shadows[elevation],
    elevation: elevationLevels[elevation],
  };

  // If there's an onPress handler, make it touchable
  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {children}
      </TouchableOpacity>
    );
  }

  // Otherwise, just a view
  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  // No static styles needed - all dynamic based on theme
});
