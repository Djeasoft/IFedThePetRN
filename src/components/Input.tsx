// Input Component - Themed text input
// Version: 1.0.0 - React Native
// For forms and text entry

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...textInputProps
}: InputProps) {
  const theme = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);

  const inputStyle: ViewStyle = {
    backgroundColor: theme.surface,
    borderWidth: 2,
    borderColor: error
      ? theme.error
      : isFocused
      ? theme.primary
      : theme.border,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    color: theme.text,
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? theme.error : theme.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        style={[inputStyle, style]}
        placeholderTextColor={theme.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...textInputProps}
      />
      {error && (
        <Text
          style={[
            styles.error,
            {
              color: theme.error,
              fontSize: fontSize.sm,
            },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.base,
  },
  label: {
    marginBottom: spacing.xs,
  },
  error: {
    marginTop: spacing.xs,
  },
});
