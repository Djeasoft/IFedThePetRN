// Theme System - Light and Dark Theme Support
// Version: 1.0.0 - React Native
// Based on Dan's Figma designs

export interface Theme {
  // Background colors
  background: string;
  backgroundSecondary: string;
  
  // Surface colors (cards, modals, etc.)
  surface: string;
  surfaceElevated: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  
  // Brand colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // UI element colors
  border: string;
  borderLight: string;
  divider: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Interactive states
  hover: string;
  pressed: string;
  disabled: string;
  
  // Shadows (for iOS)
  shadowColor: string;
}

// Light Theme - Based on Dan's current designs
export const lightTheme: Theme = {
  // Background colors
  background: '#f8f7fc',        // Light purple/lavender
  backgroundSecondary: '#ffffff',
  
  // Surface colors
  surface: '#ffffff',           // White cards
  surfaceElevated: '#ffffff',
  
  // Text colors
  text: '#000000',              // Primary text (black)
  textSecondary: '#666666',     // Secondary text (gray)
  textTertiary: '#999999',      // Tertiary text (light gray)
  textInverse: '#ffffff',       // White text on dark backgrounds
  
  // Brand colors
  primary: '#fb314a',           // Red (primary action color)
  primaryLight: '#ff5468',      // Lighter red
  primaryDark: '#e01e35',       // Darker red
  
  // UI element colors
  border: '#e0e0e0',            // Light gray border
  borderLight: '#f0f0f0',       // Very light border
  divider: '#e5e5e5',           // Divider lines
  
  // Status colors
  success: '#34c759',           // Green
  warning: '#ff9500',           // Orange
  error: '#ff3b30',             // Red
  info: '#007aff',              // Blue
  
  // Interactive states
  hover: 'rgba(0, 0, 0, 0.05)', // Light hover overlay
  pressed: 'rgba(0, 0, 0, 0.1)', // Pressed state overlay
  disabled: 'rgba(0, 0, 0, 0.3)', // Disabled state
  
  // Shadows
  shadowColor: '#000000',
};

// Dark Theme - Complementary to light theme
export const darkTheme: Theme = {
  // Background colors
  background: '#1a1a1a',        // Dark gray
  backgroundSecondary: '#121212',
  
  // Surface colors
  surface: '#2a2a2a',           // Dark cards
  surfaceElevated: '#333333',
  
  // Text colors
  text: '#ffffff',              // White text
  textSecondary: '#b0b0b0',     // Light gray text
  textTertiary: '#808080',      // Medium gray text
  textInverse: '#000000',       // Black text on light backgrounds
  
  // Brand colors (keep primary red consistent)
  primary: '#fb314a',           // Same red
  primaryLight: '#ff5468',
  primaryDark: '#e01e35',
  
  // UI element colors
  border: '#404040',            // Dark border
  borderLight: '#353535',       // Slightly lighter border
  divider: '#3a3a3a',           // Divider lines
  
  // Status colors (slightly adjusted for dark mode)
  success: '#32d74b',           // Brighter green for dark bg
  warning: '#ff9f0a',           // Brighter orange
  error: '#ff453a',             // Brighter red
  info: '#0a84ff',              // Brighter blue
  
  // Interactive states
  hover: 'rgba(255, 255, 255, 0.1)',
  pressed: 'rgba(255, 255, 255, 0.15)',
  disabled: 'rgba(255, 255, 255, 0.3)',
  
  // Shadows (less visible in dark mode)
  shadowColor: '#000000',
};

// Spacing constants (same for both themes)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
  massive: 60,
};

// Border radius constants
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  round: 9999,
};

// Font sizes
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  xxxl: 24,
  huge: 32,
  massive: 40,
};

// Font weights
export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Shadow presets (iOS)
export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
};

// Elevation presets (Android)
export const elevation = {
  none: 0,
  sm: 1,
  md: 3,
  lg: 5,
  xl: 8,
};

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
};

// Opacity values
export const opacity = {
  disabled: 0.3,
  subtle: 0.5,
  medium: 0.7,
  visible: 0.9,
  full: 1,
};
