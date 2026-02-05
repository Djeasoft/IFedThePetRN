// NotificationsPanel - Slide-in Notifications View
// Version: 1.0.0 - React Native with Theme Support
// Shows all notifications with mark as read functionality

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../lib/database';
import { Notification } from '../lib/types';
import { formatTime, getTimeAgo } from '../lib/time';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationsPanel({ visible, onClose }: NotificationsPanelProps) {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const allNotifications = await getAllNotifications();
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get icon for notification type
  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'feeding':
        return 'paw';
      case 'member_joined':
        return 'person-add';
      case 'pet_added':
        return 'add-circle';
      case 'member_removed':
        return 'person-remove';
      case 'feed_request':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerTop}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
              <Text style={[styles.markAllText, { color: theme.info }]}>
                Mark all as read
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Loading...
              </Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="notifications-outline"
                size={64}
                color={theme.textTertiary}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No notifications yet
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                onPress={() => !notification.read && handleMarkAsRead(notification.id)}
                style={[
                  styles.notificationCard,
                  { backgroundColor: theme.surface },
                  notification.read && styles.notificationRead,
                ]}
                activeOpacity={notification.read ? 1 : 0.7}
              >
                <View style={styles.notificationContent}>
                  {/* Unread indicator */}
                  {!notification.read && (
                    <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
                  )}

                  {/* Icon */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: theme.primaryLight + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getNotificationIcon(notification.type) as any}
                      size={20}
                      color={theme.primary}
                    />
                  </View>

                  {/* Message and time */}
                  <View style={styles.messageContainer}>
                    <Text
                      style={[
                        styles.message,
                        { color: theme.text },
                        !notification.read && styles.messageBold,
                      ]}
                    >
                      {notification.message}
                    </Text>
                    <View style={styles.timeRow}>
                      <Text style={[styles.timeText, { color: theme.textTertiary }]}>
                        {formatTime(new Date(notification.timestamp).getTime())}
                      </Text>
                      <Text style={[styles.timeDot, { color: theme.textTertiary }]}>
                        •
                      </Text>
                      <Text style={[styles.timeText, { color: theme.textTertiary }]}>
                        {getTimeAgo(new Date(notification.timestamp).getTime())}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  closeButton: {
    padding: spacing.sm,
  },
  markAllButton: {
    marginTop: spacing.sm,
  },
  markAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.massive,
  },
  emptyIcon: {
    marginBottom: spacing.base,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
  notificationCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationRead: {
    opacity: 0.6,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
    marginTop: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: fontSize.base,
    lineHeight: 22,
    marginBottom: spacing.xs,
  },
  messageBold: {
    fontWeight: fontWeight.semibold,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: fontSize.xs,
  },
  timeDot: {
    marginHorizontal: spacing.xs,
    fontSize: fontSize.xs,
  },
});
