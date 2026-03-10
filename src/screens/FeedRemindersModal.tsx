// FeedRemindersModal.tsx
// Version: 1.0.0 - Feed reminders modal: list, add, delete. Household-scoped, Supabase-backed.
//
// Flows supported:
//   Flow 1 — Empty state → "Create your first reminder" → form → time picker → saved list
//   Flow 2 — List state → "+ Add Reminder" → form → time picker → updated list
//   Flow 3 — Delete → native Alert confirmation → removed from list
//
// Time picker: native platform picker via @react-native-community/datetimepicker
// Any household member can create and delete reminders.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import {
  getFeedRemindersByHouseholdId,
  addFeedReminder,
  deleteFeedReminder,
} from '../lib/database';
import { FeedReminder } from '../lib/types';
import { useTheme } from '../contexts/ThemeContext';
import { spacing, fontSize, fontWeight, borderRadius } from '../styles/theme';

interface FeedRemindersModalProps {
  visible: boolean;
  onClose: () => void;
  householdId: string;
}

// Helper: parse "HH:mm" string into a Date object for the picker
function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// Helper: format a Date into "HH:mm"
function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

type ModalView = 'list' | 'form';

export function FeedRemindersModal({ visible, onClose, householdId }: FeedRemindersModalProps) {
  const { theme } = useTheme();

  // Data
  const [reminders, setReminders] = useState<FeedReminder[]>([]);
  const [loading, setLoading] = useState(true);

  // View state
  const [view, setView] = useState<ModalView>('list');

  // Form state
  const [labelInput, setLabelInput] = useState('');
  const [selectedTime, setSelectedTime] = useState<Date>(timeStringToDate('09:00'));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load reminders from Supabase
  const loadReminders = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const data = await getFeedRemindersByHouseholdId(householdId);
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    if (visible) {
      loadReminders();
      setView('list');
    }
  }, [visible, loadReminders]);

  // Reset form fields when switching to form view
  const openForm = () => {
    setLabelInput('');
    setSelectedTime(timeStringToDate('09:00'));
    setShowTimePicker(false);
    setView('form');
  };

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    // On Android the picker closes after selection — on iOS it stays open
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleAdd = async () => {
    if (!labelInput.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const newReminder = await addFeedReminder(
        householdId,
        labelInput.trim(),
        dateToTimeString(selectedTime)
      );
      setReminders((prev) =>
        [...prev, newReminder].sort((a, b) => a.Time.localeCompare(b.Time))
      );
      setView('list');
    } catch (error) {
      Alert.alert('Error', 'Failed to save reminder. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (reminder: FeedReminder) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${reminder.Title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFeedReminder(reminder.ReminderID);
              setReminders((prev) =>
                prev.filter((r) => r.ReminderID !== reminder.ReminderID)
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder.');
            }
          },
        },
      ]
    );
  };

  const canAdd = labelInput.trim().length > 0;

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
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Feed Reminders</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* ── Subtitle ── */}
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          To change who receives these reminders click on the Reminders toggle switch on the Members list.
        </Text>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {loading ? (
              <View style={styles.centreContainer}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : reminders.length === 0 ? (
              /* Empty state */
              <View style={styles.centreContainer}>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No reminders yet
                </Text>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: theme.primary }]}
                  onPress={openForm}
                  activeOpacity={0.8}
                >
                  <Text style={styles.createButtonText}>Create your first reminder</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Reminder list */
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {reminders.map((reminder) => (
                  <View
                    key={reminder.ReminderID}
                    style={[styles.reminderCard, { backgroundColor: theme.surface }]}
                  >
                    <View style={styles.reminderCardLeft}>
                      <Text style={[styles.reminderLabel, { color: theme.text }]}>
                        {reminder.Title}
                      </Text>
                      <Text style={[styles.reminderTime, { color: theme.textSecondary }]}>
                        {reminder.Time}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(reminder)}
                      style={styles.deleteButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add reminder button */}
                <TouchableOpacity
                  style={styles.addReminderRow}
                  onPress={openForm}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={theme.primary} />
                  <Text style={[styles.addReminderText, { color: theme.primary }]}>
                    Add Reminder
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </>
        )}

        {/* ── FORM VIEW ── */}
        {view === 'form' && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Label input */}
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              placeholder="e.g. Feed the dogs"
              placeholderTextColor={theme.textTertiary}
              value={labelInput}
              onChangeText={setLabelInput}
              autoFocus
              returnKeyType="done"
            />

            {/* Time field — tapping opens the picker */}
            <TouchableOpacity
              style={[
                styles.timeField,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeFieldText, { color: theme.text }]}>
                {dateToTimeString(selectedTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Native time picker */}
            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  is24Hour={true}
                  style={styles.picker}
                />
                {/* iOS: picker stays open — show Cancel + Apply buttons */}
                {Platform.OS === 'ios' && (
                  <View style={styles.pickerButtons}>
                    <TouchableOpacity
                      style={styles.pickerCancelButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={[styles.pickerCancelText, { color: theme.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pickerApplyButton, { backgroundColor: theme.primary }]}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.pickerApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Add / Cancel */}
            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: theme.primary },
                  (!canAdd || isSaving) && { opacity: 0.4 },
                ]}
                onPress={handleAdd}
                disabled={!canAdd || isSaving}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.addButtonText}>Add</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.hover }]}
                onPress={() => setView('list')}
                disabled={isSaving}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  closeButton: {
    padding: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
  },
  centreContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.massive,
  },
  emptyText: {
    fontSize: fontSize.base,
    marginBottom: spacing.xl,
  },
  createButton: {
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.round,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.huge,
  },

  // Reminder card
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reminderCardLeft: {
    flex: 1,
  },
  reminderLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: fontSize.sm,
  },
  deleteButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
  },
  addReminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  addReminderText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },

  // Form
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeFieldText: {
    fontSize: fontSize.base,
  },
  pickerContainer: {
    marginBottom: spacing.md,
  },
  picker: {
    width: '100%',
  },
  pickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  pickerCancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  pickerCancelText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  pickerApplyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
  },
  pickerApplyText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  formButtons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
