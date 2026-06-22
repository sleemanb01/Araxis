import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '../types/job';
import { StatusColors, Colors } from '../constants/colors';
import { StatusBadge } from './StatusBadge';
import { Layout } from '../constants/layout';
import { navigateToAddress } from '../utils/navigation';

interface Props {
  job: Job;
  onPress: (job: Job) => void;
  /** Provider screens pass true to show a "call customer" button on same-day jobs. */
  canCall?: boolean;
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function JobCard({ job, onPress, canCall = false }: Props) {
  const color = StatusColors[job.status];
  const showCall = canCall && isToday(job.scheduledAt) && !!job.phone;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(job)} activeOpacity={0.85}>
      {/* Status-colored edge on the info side */}
      <View style={[styles.edge, { backgroundColor: color }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {job.customerName}
          </Text>
          <StatusBadge status={job.status} />
        </View>

        {!!job.description && (
          <Text style={styles.description} numberOfLines={2}>
            {job.description}
          </Text>
        )}

        {/* Tap the address to navigate (Waze / Google Maps) */}
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigateToAddress(job.address)}
          activeOpacity={0.6}
        >
          <Ionicons name="location-outline" size={15} color={Colors.primary} />
          <Text style={styles.address} numberOfLines={1}>
            {job.address}
          </Text>
        </TouchableOpacity>

        {!!job.scheduledAt && (
          <View style={styles.row}>
            <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.meta}>
              {new Date(job.scheduledAt).toLocaleString('he-IL', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </Text>
          </View>
        )}

        {showCall && (
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${job.phone}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
            <Text style={styles.callText}>התקשר ללקוח</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardBorderRadius,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  edge: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: Layout.cardPadding,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginEnd: 8,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  address: {
    fontSize: 13,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    backgroundColor: '#16A34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    marginTop: 12,
  },
  callText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
