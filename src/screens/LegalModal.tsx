// LegalModal.tsx
// Version: 1.0.0 - New file: src/screens/LegalModal.tsx
// Version: 2.0.0 - Content loaded from live URLs via react-native-webview. Replaces v1.0.0 hardcoded text sections.
// Version: 2.1.0 - Fix iOS spinner stuck: remove onLoadStart (fires multiple times on iOS), replace onLoad with onLoadEnd.
// Version: 2.2.0 - Remove custom loading + error states. WebView renders natively with no overlays.
// Version: 2.3.0 - Header: left-aligned to match globalStyles v1.2.0. Remove spacer View.
//
// URLs:
//   Privacy Policy   → https://ifedthepet.app/privacy-policy.html
//   Terms of Service → https://ifedthepet.app/terms-of-service.html

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { spacing } from '../styles/theme';
import { modalHeaderStyles } from '../styles/globalStyles';

// ── Types ─────────────────────────────────────────────────────────────────────

type LegalType = 'privacy' | 'terms';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
  type: LegalType;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TITLES: Record<LegalType, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
};

const URLS: Record<LegalType, string> = {
  privacy: 'https://ifedthepet.app/privacy-policy.html',
  terms: 'https://ifedthepet.app/terms-of-service.html',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function LegalModal({ visible, onClose, type }: LegalModalProps) {
  const { theme } = useTheme();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>

        {/* ── Header ── */}
        <View style={[modalHeaderStyles.modalHeader, styles.headerExtras, { borderBottomColor: theme.border }]}>
          <Text style={[modalHeaderStyles.modalTitle, { color: theme.text }]}>{TITLES[type]}</Text>
          <TouchableOpacity onPress={onClose} style={modalHeaderStyles.modalCloseButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        <WebView
          source={{ uri: URLS[type] }}
          style={styles.webView}
          showsVerticalScrollIndicator={false}
        />

      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerExtras: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  webView: {
    flex: 1,
  },
});
