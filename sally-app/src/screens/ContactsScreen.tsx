import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Keyboard,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useContacts } from '../context/ContactsContext';
import type { Contact, ContactRelationship } from '../types';

const RELATIONSHIP_LABELS: Record<ContactRelationship, { label: string; icon: string; color: string }> = {
  family: { label: 'Family', icon: '❤️', color: '#E11D48' },
  friend: { label: 'Friend', icon: '👋', color: '#2563EB' },
  colleague: { label: 'Colleague', icon: '💼', color: '#7C3AED' },
  other: { label: 'Other', icon: '👤', color: '#6B7280' },
};

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const { contacts, followers, userCode, addContactByCode, removeContact, removeFollower } = useContacts();
  const [codeInput, setCodeInput] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const handleAdd = () => {
    Keyboard.dismiss();
    if (!codeInput.trim()) return;

    const result = addContactByCode(codeInput);
    if (result.success) {
      setCodeInput('');
      Alert.alert('Added!', result.message);
    } else {
      // Shake the input
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      Alert.alert('Oops', result.message);
    }
  };

  const handleRemove = (contact: Contact, type: 'contact' | 'follower') => {
    Alert.alert(
      type === 'contact' ? 'Remove Contact' : 'Remove Follower',
      type === 'contact' 
        ? `Remove ${contact.name} from your contacts?`
        : `Remove ${contact.name} from your followers? They will no longer see your location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => type === 'contact' ? removeContact(contact.id) : removeFollower(contact.id)
        },
      ],
    );
  };

  const renderContact = ({ item }: { item: Contact }, type: 'contact' | 'follower') => {
    const rel = RELATIONSHIP_LABELS[item.relationship];
    return (
      <View style={styles.contactCard}>
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>
            {item.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <View style={styles.contactMeta}>
            <Text style={styles.contactRelEmoji}>{rel.icon}</Text>
            <Text style={[styles.contactRelLabel, { color: rel.color }]}>{rel.label}</Text>
            {item.phone && (
              <Text style={styles.contactPhone}>{item.phone}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemove(item, type)}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends & Family</Text>
        <Text style={styles.headerSubtitle}>Keep track of your loved ones during emergencies</Text>
      </View>

      {/* Your Code Card */}
      <View style={styles.codeCard}>
        <View style={styles.codeCardLeft}>
          <Text style={styles.codeLabel}>Your Personal Code</Text>
          <Text style={styles.codeValue}>{userCode}</Text>
        </View>
        <View style={styles.codeCardIcon}>
          <Ionicons name="qr-code" size={28} color="#16A34A" />
        </View>
      </View>

      {/* Add Contact */}
      <View style={styles.addSection}>
        <Text style={styles.addTitle}>Add a Contact</Text>
        <Animated.View style={[styles.addRow, { transform: [{ translateX: shakeAnim }] }]}>
          <TextInput
            style={styles.addInput}
            placeholder="Enter their code (e.g. SALLY-A2BF)"
            placeholderTextColor="#9CA3AF"
            value={codeInput}
            onChangeText={setCodeInput}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity
            style={[styles.addButton, !codeInput.trim() && styles.addButtonDisabled]}
            onPress={handleAdd}
            activeOpacity={0.85}
            disabled={!codeInput.trim()}
          >
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Lists Container */}
      <FlatList
        data={[]}
        keyExtractor={() => 'dummy'}
        renderItem={null}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Contacts Section */}
            <View style={styles.listSection}>
              <Text style={styles.listTitle}>
                Your Contacts{' '}
                <Text style={styles.listCount}>({contacts.length})</Text>
              </Text>
              {contacts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No contacts yet</Text>
                  <Text style={styles.emptySubtext}>Add friends & family using their code</Text>
                </View>
              ) : (
                contacts.map((contact) => (
                  <React.Fragment key={contact.id}>
                    {renderContact({ item: contact }, 'contact')}
                  </React.Fragment>
                ))
              )}
            </View>

            {/* Followers Section */}
            <View style={styles.listSection}>
              <Text style={styles.listTitle}>
                Who Added You{' '}
                <Text style={styles.listCount}>({followers.length})</Text>
              </Text>
              {followers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No one has added you</Text>
                  <Text style={styles.emptySubtext}>Share your code so they can see your location</Text>
                </View>
              ) : (
                followers.map((follower) => (
                  <React.Fragment key={follower.id}>
                    {renderContact({ item: follower }, 'follower')}
                  </React.Fragment>
                ))
              )}
            </View>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ─── Header ───
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },

  // ─── Code Card ───
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  codeCardLeft: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  codeValue: {
    fontSize: 22,
    color: '#15803D',
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
  codeCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Add Section ───
  addSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    letterSpacing: 1,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },

  // ─── Lists ───
  listContainer: {
    paddingBottom: 40,
  },
  listSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  listCount: {
    fontWeight: '500',
    color: '#9CA3AF',
  },

  // ─── Contact Card ───
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  contactInfo: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  contactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactRelEmoji: {
    fontSize: 13,
  },
  contactRelLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  removeButton: {
    padding: 4,
  },

  // ─── Empty State ───
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#D1D5DB',
    fontWeight: '500',
  },
});
