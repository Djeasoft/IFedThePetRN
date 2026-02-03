// Logo Component - Reusable app logo
// Version: 1.0.0 - React Native
// Supports light and dark themes

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const LOGO_SIZES = {
  small: {
    width: 150,
    height: 40,
  },
  medium: {
    width: 200,
    height: 50,
  },
  large: {
    width: 300,
    height: 60,
  },
};

export function Logo({ size = 'large', style }: LogoProps) {
  const { isDark } = useTheme();
  
  // Use different logo for light vs dark theme
  const logoSource = isDark
    ? require('../../assets/IFTP_Logo_White_text.png') // You'll need to create this
    : require('../../assets/IFTP_Logo_Black_text.png');

  const dimensions = LOGO_SIZES[size];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={logoSource}
        style={[styles.logo, dimensions]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logo: {
    // Dimensions set dynamically by size prop
  },
});
