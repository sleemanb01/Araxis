import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ServiceCall } from '../types/serviceCall';
import { Colors, CallStatusColors, CallStatusLabelsHe } from '../constants/colors';

interface Props {
  call: ServiceCall;
  subtitle?: string; // role-specific line, e.g. the viewer's payout
  onPress: (call: ServiceCall) => void;
}

/** A service-call row with a status-colored edge bar. */
export function ServiceCallCard({ call, subtitle, onPress }: Props) {
  const color = CallStatusColors[call.status];
  const date = new Date(call.scheduledDate).toLocaleDateString('he-IL');

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(call)} activeOpacity={0.8}>
      <View style={[styles.edge, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.client} numberOfLines={1}>{call.clientName}</Text>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{CallStatusLabelsHe[call.status]}</Text>
          </View>
        </View>
        <Text style={styles.date}>{date}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  edge: { width: 5 },
  body: { flex: 1, padding: 14, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  client: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  subtitle: { fontSize: 14, fontWeight: '600', color: Colors.primary, textAlign: 'right' },
});
