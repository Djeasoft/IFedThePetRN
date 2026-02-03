// Button Component - Reusable themed button
// Version: 1.0.0 - React Native
// Supports multiple variants and sizes

import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  GestureResponderEvent,
} from 'react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onPress: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const theme = useThemeColors();

  // Size configurations
  const sizeConfig = {
    sm: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.base,
      fontSize: fontSize.sm,
    },
    md: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      fontSize: fontSize.base,
    },
    lg: {
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.xl,
      fontSize: fontSize.lg,
    },
  };

  const config = sizeConfig[size];

  // Variant styles
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: theme.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: theme.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.textInverse;
      case 'outline':
        return theme.primary;
      default:
        return theme.text;
    }
  };

  const buttonStyle: ViewStyle = {
    ...getVariantStyle(),
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  const textStyleCombined: TextStyle = {
    color: getTextColor(),
    fontSize: config.fontSize,
    fontWeight: fontWeight.semibold,
    ...textStyle,
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={textStyleCombined}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // No static styles needed
});
