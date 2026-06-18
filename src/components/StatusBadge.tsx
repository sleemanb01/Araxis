import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { JobStatus } from '../types/job';
import { StatusColors, StatusLabelsHe } from '../constants/colors';

interface Props {
  status: JobStatus;
}

export function StatusBadge({ status }: Props) {
  const color = StatusColors[status];
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{StatusLabelsHe[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
});
