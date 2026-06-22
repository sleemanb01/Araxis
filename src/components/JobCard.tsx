import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '../types/job';
import { StatusColors, Colors } from '../constants/colors';
import { StatusBadge } from './StatusBadge';
import { Layout } from '../constants/layout';
import { navigateToAddress } from '../utils/navigation';
import { callNumber, openWhatsApp } from '../utils/contact';

interface Props {
  job: Job;
  onPress: (job: Job) => void;
  /** Provider screens pass true to show call + WhatsApp buttons (contacts the customer). */
  canCall?: boolean;
}

export function JobCard({ job, onPress, canCall = false }: Props) {
  const color = StatusColors[job.status];
  const showContact = canCall && !!job.phone;

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

        {job.price != null && (
          <View style={styles.row}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.primary} />
            <Text style={styles.price}>₪{job.price}</Text>
            {job.paymentStatus === 'paid' && <Text style={styles.paid}>· שולם</Text>}
          </View>
        )}

        {showContact && (
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={[styles.contactBtn, styles.callBtn]}
              onPress={() => callNumber(job.phone)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.contactText}>התקשר</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, styles.waBtn]}
              onPress={() => openWhatsApp(job.phone)}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              <Text style={styles.contactText}>וואטסאפ</Text>
            </TouchableOpacity>
          </View>
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
    flexShrink: 1,
    textAlign: 'right',
  },
  meta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  paid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: 999,
  },
  callBtn: { backgroundColor: '#16A34A' },
  waBtn: { backgroundColor: '#25D366' },
  contactText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
