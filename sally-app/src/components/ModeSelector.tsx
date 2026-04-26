import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { TransportMode } from '../types';

interface Props {
  mode: TransportMode;
  loading: boolean;
  onSelect: (mode: TransportMode) => void;
  bottomOffset: number;
  /** Modes blocked by authorities for the user’s current zone (from incident restrictions). */
  restrictedModes?: TransportMode[];
}

const RESTRICTED_ALERT: Record<TransportMode, string> = {
  walk: 'Pedestrian travel is not permitted in the restricted zone.',
  car: 'Motor vehicles are not permitted in the restricted zone.',
  bike: 'Cycling is not permitted in the restricted zone.',
  transit: 'Public transportation is not permitted in the restricted zone.',
};

const MODES: { key: TransportMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'car',     label: 'Car',  icon: 'car' },
  { key: 'bike',    label: 'Bike', icon: 'bicycle' },
  { key: 'walk',    label: 'Walk', icon: 'walk' },
  { key: 'transit', label: 'Bus',  icon: 'bus' },
];

export const MODE_ICONS: Record<TransportMode, keyof typeof Ionicons.glyphMap> = {
  car: 'car',
  bike: 'bicycle',
  walk: 'walk',
  transit: 'bus',
};

export default function ModeSelector({
  mode,
  loading,
  onSelect,
  bottomOffset,
  restrictedModes = [],
}: Props) {
  const restricted = new Set(restrictedModes);
  return (
    <View style={[styles.container, { bottom: bottomOffset + 10 }]}>
      {MODES.map(({ key, label, icon }) => {
        const active = key === mode;
        const disabledByAuthorities = restricted.has(key);
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.tab, 
              active && styles.tabActive,
              disabledByAuthorities && styles.tabDisabled
            ]}
            onPress={() => {
              if (disabledByAuthorities) {
                Alert.alert('Restricted', RESTRICTED_ALERT[key]);
              } else {
                onSelect(key);
              }
            }}
            activeOpacity={0.8}
            disabled={loading && !disabledByAuthorities}
          >
            <Ionicons
              name={icon}
              size={20}
              color={active ? '#FFFFFF' : (disabledByAuthorities ? '#DC2626' : '#6B7280')}
            />
            <Text style={[
              styles.tabLabel, 
              active && styles.tabLabelActive,
              disabledByAuthorities && { color: '#DC2626' }
            ]}>
              {label}
            </Text>
            {loading && active && (
              <View style={styles.loadingDot} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    left: 60,
    right: 60,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 2,
  },
  tabActive: {
    backgroundColor: '#1E3A8A',
  },
  tabDisabled: {
    backgroundColor: '#FEE2E2',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  loadingDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#93C5FD',
  },
});
