import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function CircleSwatch({ fill, stroke }: { fill: string; stroke: string }) {
  return (
    <View style={[styles.circleIcon, { borderColor: stroke }]}>
      <View style={[styles.circleFill, { backgroundColor: fill }]} />
    </View>
  );
}

function DotSwatch({ color }: { color: string }) {
  return <View style={[styles.dotSwatch, { backgroundColor: color }]} />;
}

function LineIconLegend() {
  return (
    <View style={styles.lineIcon}>
      <View style={styles.lineDash} />
      <View style={styles.lineGap} />
      <View style={styles.lineDash} />
    </View>
  );
}

function GovernmentLineIconLegend() {
  return (
    <View style={styles.lineIcon}>
      <View style={styles.govLineDash} />
      <View style={styles.lineGap} />
      <View style={styles.govLineDash} />
    </View>
  );
}

function UserDotLegend() {
  return (
    <View style={styles.userDotOuter}>
      <View style={styles.userDotInner} />
    </View>
  );
}

const ITEMS = [
  { key: 'incident',   label: 'Active Incident',   icon: () => <CircleSwatch fill="#EF444440" stroke="#EF4444" /> },
  { key: 'projected',  label: '1h projection',     icon: () => (
    <View style={[styles.circleIcon, { borderColor: '#EF444480', borderStyle: 'dashed' }]}>
      <View style={[styles.circleFill, { backgroundColor: '#EF444410' }]} />
    </View>
  )},
  { key: 'safe',       label: 'Safe zone',         icon: () => <CircleSwatch fill="#22C55E28" stroke="#16A34A" /> },
  { key: 'aid',        label: 'Aid zone',          icon: () => <CircleSwatch fill="#2563EB28" stroke="#2563EB" /> },
  { key: 'contact',    label: 'Friend / Family',   icon: () => <View style={styles.contactLegend} /> },
  { key: 'route',      label: 'Route',             icon: () => <LineIconLegend /> },
  { key: 'govRoute',   label: 'Government route',  icon: () => <GovernmentLineIconLegend /> },
  { key: 'you',        label: 'Your location',     icon: () => <UserDotLegend /> },
];

interface Props {
  bottomOffset?: number;
}

export default function Legend({ bottomOffset = 110 }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={[styles.wrapper, { bottom: bottomOffset }]}>
      {visible && (
        <View style={styles.card}>
          <Text style={styles.title}>MAP LEGEND</Text>
          {ITEMS.map((item) => (
            <View key={item.key} style={styles.row}>
              <View style={styles.iconSlot}>{item.icon()}</View>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setVisible((v) => !v)}
        activeOpacity={0.85}
      >
        <Ionicons name={visible ? 'close' : 'information'} size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    minWidth: 170,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 1,
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },

  // ─── Circle swatch ───
  circleIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ─── Dot swatch ───
  dotSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  contactLegend: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16A34A',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },

  // ─── Line icon ───
  lineIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 20,
  },
  lineDash: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#2563EB',
  },
  govLineDash: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: '#0F766E',
  },
  lineGap: {
    width: 3,
  },

  // ─── User dot ───
  userDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2563EB30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // ─── Toggle button ───
  toggleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E3A8A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
