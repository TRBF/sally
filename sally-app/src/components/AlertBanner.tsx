import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import type { EmergencyAlert } from '../types';

interface Props {
  alert: EmergencyAlert;
  onDismiss: () => void;
}

const SEVERITY_COLORS: Record<EmergencyAlert['severity'], string> = {
  info: '#2563EB',
  warning: '#F59E0B',
  danger: '#EF4444',
  critical: '#7F1D1D',
};

const SEVERITY_BG: Record<EmergencyAlert['severity'], string> = {
  info: '#EFF6FF',
  warning: '#FFFBEB',
  danger: '#FEF2F2',
  critical: '#450A0A',
};

const SEVERITY_TEXT: Record<EmergencyAlert['severity'], string> = {
  info: '#1E3A8A',
  warning: '#78350F',
  danger: '#7F1D1D',
  critical: '#FECACA',
};

export default function AlertBanner({ alert, onDismiss }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alert.severity === 'critical' || alert.severity === 'danger') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.85, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => pulse.stopAnimation();
  }, [alert.severity]);

  const isCritical = alert.severity === 'critical';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: SEVERITY_BG[alert.severity],
          borderLeftColor: SEVERITY_COLORS[alert.severity],
          opacity: pulse,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: SEVERITY_COLORS[alert.severity] }]} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: SEVERITY_TEXT[alert.severity] }]}>
            {alert.title}
          </Text>
          <Text style={[styles.message, { color: isCritical ? '#FCA5A5' : '#374151' }]}>
            {alert.message}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.dismissText, { color: SEVERITY_TEXT[alert.severity] }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  dismiss: {
    padding: 2,
    marginLeft: 4,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
