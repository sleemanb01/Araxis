import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { HE_WEEKDAYS_SHORT } from '../utils/availability';
import { setPendingDatePick } from '../utils/datePicker';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  value: string | null;
  onChange: (iso: string) => void;
  days?: number;
  /** If given, days NOT in this set render muted (off days). */
  workingDays?: number[];
}

function isSameDay(iso: string | null, d: Date): boolean {
  if (!iso) return false;
  const a = new Date(iso);
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate();
}

/** Horizontal strip of upcoming days + a button to open the full month calendar. */
export function DateStrip({ value, onChange, days = 21, workingDays }: Props) {
  const navigation = useNavigation<Nav>();
  const base = new Date();
  base.setHours(9, 0, 0, 0);
  const list = Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });

  function openFull() {
    setPendingDatePick(onChange);
    navigation.navigate('FullCalendar', { picker: true, selected: value ?? undefined });
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      <TouchableOpacity style={styles.calBtn} onPress={openFull} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
        <Text style={styles.calBtnText}>יומן</Text>
      </TouchableOpacity>
      {list.map((d) => {
        const selected = isSameDay(value, d);
        const off = workingDays ? !workingDays.includes(d.getDay()) : false;
        return (
          <TouchableOpacity
            key={d.toISOString()}
            style={[styles.cell, selected && styles.cellSel, off && styles.cellOff]}
            onPress={() => onChange(d.toISOString())}
            activeOpacity={0.8}
          >
            <Text style={[styles.wd, selected && styles.selText]}>{HE_WEEKDAYS_SHORT[d.getDay()]}</Text>
            <Text style={[styles.dn, selected && styles.selText]}>
              {d.getDate()}/{d.getMonth() + 1}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2 },
  calBtn: {
    width: 52,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  calBtnText: { fontSize: 11, fontWeight: '600', color: Colors.primary },
  cell: {
    width: 52,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 3,
  },
  cellSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cellOff: { opacity: 0.4 },
  wd: { fontSize: 12, color: Colors.textSecondary },
  dn: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  selText: { color: '#FFFFFF' },
});
