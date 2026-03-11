// Global Styles — Shared component styles used across multiple screens
// Version: 1.0.0

import { StyleSheet } from 'react-native';
import { spacing, fontSize, fontWeight } from './theme';

// Shared modal header styles.
// Uses a three-column layout — [spacer] [centred title] [close button] — so that
// the title is truly centred across the full modal width regardless of button size.
// Padding and borders are intentionally omitted here; each call site applies its own
// spacing to suit its container (full-screen sheet vs. padded dialog card).
export const modalHeaderStyles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Left spacer — width matches the close button's total touch area (24px icon + 2 × 4px padding)
  modalHeaderSpacer: {
    width: 32,
  },
  modalTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
});
