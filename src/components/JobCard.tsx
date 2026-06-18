import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Job } from '../types/job';
import { StatusColors } from '../constants/colors';
import { StatusBadge } from './StatusBadge';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Props {
  job: Job;
  onPress: (job: Job) => void;
}

export function JobCard({ job, onPress }: Props) {
  const accentColor = StatusColors[job.status];

  return (
    <TouchableOpacity
      style={[styles.card, { borderStartColor: accentColor }]}
      onPress={() => onPress(job)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={styles.customerName}>{job.customerName}</Text>
        <StatusBadge status={job.status} />
      </View>

      <Text style={styles.address} numberOfLines={1}>
        {job.address}
      </Text>

      <Text style={styles.description} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.phone}>{job.phone}</Text>
        {job.scheduledAt && (
          <Text style={styles.date}>
            {new Date(job.scheduledAt).toLocaleDateString('he-IL')}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardBorderRadius,
    padding: Layout.cardPadding,
    marginBottom: 12,
    borderStartWidth: 4,
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    // Shadow — Android
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginEnd: 8,
    textAlign: 'right',
  },
  address: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'right',
  },
  description: {
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 10,
    lineHeight: 20,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
