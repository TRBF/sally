import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Route, Incident } from '../types';
import { MODE_ICONS } from './ModeSelector';

const PANEL_COLLAPSED_HEIGHT = 90;
const PANEL_EXPANDED_HEIGHT = 380;

interface Props {
  route: Route | null;
  nearestIncident: Incident | null;
  onNavigate: () => void;
  bottomInset?: number;
}

const INCIDENT_COLORS: Record<string, string> = {
  fire: '#EF4444',
  flood: '#3B82F6',
  earthquake: '#F59E0B',
  chemical: '#8B5CF6',
  explosion: '#F97316',
};

const INCIDENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fire: 'flame',
  flood: 'water',
  earthquake: 'warning',
  chemical: 'nuclear',
  explosion: 'flash',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#F97316',
  critical: '#EF4444',
};

const MODE_COLORS: Record<string, string> = {
  car: '#1D4ED8',
  bike: '#059669',
  walk: '#7C3AED',
  transit: '#D97706',
};

export default function InfoPanel({ route, nearestIncident, onNavigate, bottomInset = 0 }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const travelRef = useRef(PANEL_EXPANDED_HEIGHT - PANEL_COLLAPSED_HEIGHT);
  const expandedRef = useRef(false);

  useEffect(() => {
    travelRef.current = PANEL_EXPANDED_HEIGHT + bottomInset - PANEL_COLLAPSED_HEIGHT;
  }, [bottomInset]);

  useEffect(() => {
    expandedRef.current = expanded;
  }, [expanded]);

  const toggle = () => {
    const travel = travelRef.current;
    const toValue = expanded ? 0 : -travel;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start(() => setExpanded(!expanded));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => Math.abs(dy) > 5,
      onPanResponderMove: (_, { dy }) => {
        const travel = travelRef.current;
        const base = expandedRef.current ? -travel : 0;
        const next = base + dy;
        const clamped = Math.max(-travel, Math.min(0, next));
        translateY.setValue(clamped);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const travel = travelRef.current;
        const threshold = travel / 3;
        if (expandedRef.current) {
          if (dy > threshold || vy > 0.5) {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start(() => setExpanded(false));
          } else {
            Animated.spring(translateY, { toValue: -travel, useNativeDriver: true, tension: 65, friction: 11 }).start();
          }
        } else {
          if (dy < -threshold || vy < -0.5) {
            Animated.spring(translateY, { toValue: -travel, useNativeDriver: true, tension: 65, friction: 11 }).start(() => setExpanded(true));
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
          }
        }
      },
    })
  ).current;

  const totalHeight = PANEL_EXPANDED_HEIGHT + bottomInset;
  const hiddenOffset = -(totalHeight - PANEL_COLLAPSED_HEIGHT);

  const modeIcon = route ? (MODE_ICONS[route.mode] ?? 'navigate') : 'navigate';
  const modeLabel = route
    ? { car: 'Car', bike: 'Bike', walk: 'Walk', transit: 'Bus' }[route.mode]
    : null;
  const modeDotColor = route
    ? (MODE_COLORS[route.mode] ?? '#6B7280')
    : '#6B7280';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: totalHeight,
          bottom: hiddenOffset,
          paddingBottom: bottomInset,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.handle} />

      {/* ─── Collapsed view ─── */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.9} style={styles.collapsedRow}>
        <View style={styles.routeInfo}>
          <View style={[styles.routeIconCircle, { backgroundColor: modeDotColor + '15' }]}>
            <Ionicons name={modeIcon} size={22} color={modeDotColor} />
          </View>
          <View style={styles.routeTextBlock}>
            <Text style={styles.routeDestination} numberOfLines={1}>
              {route ? route.targetZoneName : 'Calculating...'}
            </Text>
            <Text style={styles.routeSubtext}>
              {modeLabel ? `${modeLabel} route` : 'Please wait'}
            </Text>
          </View>
        </View>
        {route && (
          <View style={styles.metaBadges}>
            <View style={[styles.badge, { backgroundColor: modeDotColor }]}>
              <Text style={styles.badgeText}>{route.estimatedTimeMinutes} min</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>{(route.totalDistanceMeters / 1000).toFixed(1)} km</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* ─── Expanded content ─── */}
      <ScrollView
        style={styles.expandedContent}
        scrollEnabled={expanded}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigate button */}
        <TouchableOpacity
          style={[styles.navigateButton, { backgroundColor: modeDotColor, opacity: route ? 1 : 0.5 }]}
          onPress={onNavigate}
          activeOpacity={0.85}
          disabled={!route}
        >
          <Ionicons name={modeIcon} size={20} color="#FFFFFF" />
          <Text style={styles.navigateButtonText}>
            {route ? `Start Navigation` : 'Calculating...'}
          </Text>
        </TouchableOpacity>

        {/* Nearest incident */}
        {nearestIncident && (
          <View style={styles.incidentCard}>
            <View style={styles.incidentHeader}>
              <View style={styles.incidentIconContainer}>
                <Ionicons
                  name={INCIDENT_ICONS[nearestIncident.type] ?? 'warning'}
                  size={26}
                  color={INCIDENT_COLORS[nearestIncident.type] ?? '#EF4444'}
                />
              </View>
              <View style={styles.incidentMeta}>
                <Text style={styles.incidentTitle}>{nearestIncident.title}</Text>
                <View style={styles.incidentBadgeRow}>
                  <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[nearestIncident.severity] + '20' }]}>
                    <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[nearestIncident.severity] }]} />
                    <Text style={[styles.severityText, { color: SEVERITY_COLORS[nearestIncident.severity] }]}>
                      {nearestIncident.severity.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.incidentRadius}>
                    {Math.round(nearestIncident.radiusMeters)}m radius
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.incidentDescription} numberOfLines={2}>{nearestIncident.description}</Text>
            <View style={styles.growthNote}>
              <Ionicons name="trending-up" size={16} color="#991B1B" />
              <Text style={styles.growthNoteText}>
                Growing {nearestIncident.growthRateMetersPerMinute}m/min — evacuate immediately
              </Text>
            </View>
          </View>
        )}

        {/* Route steps */}
        {route && route.steps.filter((s) => s.instruction).length > 0 && (
          <View style={styles.stepsContainer}>
            <View style={styles.stepsTitleRow}>
              <Ionicons name="list" size={16} color={modeDotColor} />
              <Text style={[styles.stepsTitle, { color: modeDotColor }]}>Route Steps</Text>
            </View>
            {route.steps
              .filter((s) => s.instruction)
              .map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepDot, { backgroundColor: modeDotColor }]} />
                  <Text style={styles.stepText}>{step.instruction}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    paddingHorizontal: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 8,
  },

  // ─── Collapsed row ───
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  routeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextBlock: {
    flex: 1,
    gap: 2,
  },
  routeDestination: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  routeSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaBadges: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeSecondary: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeSecondaryText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },

  // ─── Expanded content ───
  expandedContent: {
    flex: 1,
    marginTop: 6,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  navigateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ─── Incident card ───
  incidentCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  incidentHeader: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  incidentIconContainer: {
    marginTop: 2,
  },
  incidentMeta: {
    flex: 1,
    gap: 4,
  },
  incidentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  incidentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  incidentRadius: {
    fontSize: 11,
    color: '#6B7280',
  },
  incidentDescription: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    marginBottom: 8,
  },
  growthNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  growthNoteText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },

  // ─── Route steps ───
  stepsContainer: {
    marginBottom: 24,
  },
  stepsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  stepText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
    flex: 1,
  },
});
