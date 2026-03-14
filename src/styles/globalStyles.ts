// Global Styles — Shared component styles used across multiple screens
// Version: 1.0.0
// Version: 1.1.0 - Re-export Switch component so screens can import shared UI elements from one place
// Version: 1.2.0 - modalHeaderStyles: left-aligned pattern (title left, X right). Remove spacer. Match NotificationsPanel.

import { StyleSheet } from 'react-native';
import { spacing, fontSize, fontWeight } from './theme';

// Re-exported shared components — import from here instead of their individual paths
export { Switch } from '../components/Switch';

// Shared modal header styles.
// Uses a two-column layout — [left-aligned title] [close button] — matching NotificationsPanel.
// Padding and borders are intentionally omitted here; each call site applies its own
// spacing to suit its container (full-screen sheet vs. padded dialog card).
export const modalHeaderStyles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
});
