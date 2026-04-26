import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Contact } from '../types';
import {
  createEmergencyRequest,
  type EmergencyRequestType,
} from '../services/backend';

const EMERGENCY_TYPES: {
  type: EmergencyRequestType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { type: 'trapped', label: 'Trapped', icon: 'lock-closed', color: '#EF4444' },
  { type: 'medical', label: 'Medical', icon: 'medkit', color: '#3B82F6' },
  {
    type: 'unresponsive',
    label: 'Unresponsive',
    icon: 'body',
    color: '#8B5CF6',
  },
  { type: 'fire', label: 'Fire', icon: 'flame', color: '#F97316' },
  { type: 'flood', label: 'Flood', icon: 'water', color: '#0EA5E9' },
  { type: 'other', label: 'Other', icon: 'warning', color: '#64748B' },
];

const RELATIONSHIP_LABELS: Record<string, string> = {
  family: 'Family',
  friend: 'Friend',
  colleague: 'Colleague',
  other: 'Contact',
};

interface Props {
  visible: boolean;
  contact: Contact | null;
  reporterName?: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ReportFriendEmergencyModal({
  visible,
  contact,
  reporterName,
  onClose,
  onSubmitted,
}: Props) {
  const [selectedType, setSelectedType] = useState<EmergencyRequestType | null>(
    null
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedType(null);
      setDescription('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!contact) return;
    if (!selectedType) {
      Alert.alert(
        'Selection Required',
        'Please pick what kind of emergency this is.'
      );
      return;
    }

    setSubmitting(true);
    try {
      await createEmergencyRequest({
        name: contact.name,
        contactCode: contact.code,
        coordinate: contact.coordinate,
        emergencyType: selectedType,
        description: description.trim(),
        reporterName: reporterName?.trim() || 'Sally user',
      });
      onSubmitted?.();
      onClose();
      setTimeout(() => {
        Alert.alert(
          'Report sent',
          `Authorities have been notified about ${contact.name}. Help is on the way.`,
          [{ text: 'OK' }]
        );
      }, 250);
    } catch (error) {
      console.error('Failed to send emergency report', error);
      Alert.alert(
        'Could not send report',
        'Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle = contact ? `Report emergency · ${contact.name}` : 'Report emergency';
  const relationshipLabel = contact
    ? RELATIONSHIP_LABELS[contact.relationship] ?? 'Contact'
    : '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {headerTitle}
                </Text>
                {contact && (
                  <Text style={styles.subline}>
                    {relationshipLabel}
                    {contact.phone ? ` · ${contact.phone}` : ''}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>What's happening?</Text>

            <View style={styles.typeGrid}>
              {EMERGENCY_TYPES.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeCard,
                      isSelected && {
                        borderColor: item.color,
                        backgroundColor: item.color + '15',
                      },
                    ]}
                    onPress={() => setSelectedType(item.type)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.iconWrapper,
                        { backgroundColor: item.color },
                      ]}
                    >
                      <Ionicons name={item.icon} size={18} color="#FFFFFF" />
                    </View>
                    <Text
                      style={[
                        styles.typeLabel,
                        isSelected && {
                          color: item.color,
                          fontWeight: '700',
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.subtitle}>Additional details (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g. last known floor, injuries, what they need…"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              editable={!submitting}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedType || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!selectedType || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    Notify dispatchers
                  </Text>
                  <Ionicons
                    name="send"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginLeft: 8 }}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subline: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  typeCard: {
    width: '31%',
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: '#F9FAFB',
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    color: '#111827',
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 22,
  },
  submitButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#FCA5A5',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
