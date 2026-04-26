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

export type PersonalEmergencyType = 'trapped' | 'medical' | 'unresponsive';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (type: PersonalEmergencyType, description: string) => void | Promise<void>;
}

const EMERGENCY_TYPES: { type: PersonalEmergencyType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'trapped', label: 'Stuck/Trapped', icon: 'lock-closed', color: '#EF4444' },
  { type: 'medical', label: 'Medical', icon: 'medkit', color: '#3B82F6' },
  { type: 'unresponsive', label: 'Unresponsive', icon: 'body', color: '#8B5CF6' },
];

export default function ReportEmergencyModal({ visible, onClose, onSubmit }: Props) {
  const [selectedType, setSelectedType] = useState<PersonalEmergencyType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedType(null);
      setDescription('');
      setSubmitting(false);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Selection Required', 'Please select the type of emergency.');
      return;
    }
    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit(selectedType, description));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setSelectedType(null);
    setDescription('');
    onClose();
  };

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
              <Text style={styles.title}>Report Emergency</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#4B5563" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.subtitle}>What kind of emergency are you reporting?</Text>
            
            <View style={styles.typeGrid}>
              {EMERGENCY_TYPES.map((item) => {
                const isSelected = selectedType === item.type;
                return (
                  <TouchableOpacity
                    key={item.type}
                    style={[
                      styles.typeCard,
                      isSelected && { borderColor: item.color, backgroundColor: item.color + '15' }
                    ]}
                    onPress={() => setSelectedType(item.type)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrapper, { backgroundColor: item.color }]}>
                      <Ionicons name={item.icon} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.typeLabel, isSelected && { color: item.color, fontWeight: '700' }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.subtitle}>Additional Details (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., severity, precise location nuances, required help..."
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
              activeOpacity={0.8}
              disabled={!selectedType || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Submit report</Text>
                  <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 14,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeCard: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: '#F9FAFB',
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeLabel: {
    fontSize: 13,
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
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 28,
  },
  submitButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 18,
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
