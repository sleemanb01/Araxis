import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const HE_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const HE_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sun..Sat

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Month calendar. Past days are disabled; `availableWeekdays` (0=Sun..6=Sat) get
 * a green dot to flag when the team is available. Selecting a day returns it at 09:00.
 */
export function Calendar({
  selected,
  onSelect,
  availableWeekdays,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
  availableWeekdays?: number[];
}) {
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{HE_MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => setView(new Date(year, month + 1, 1))} hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {HE_WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>{w}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d == null) return <View key={i} style={styles.cell} />;
          const cellDate = new Date(year, month, d);
          const isPast = cellDate < today;
          const isSel = sameDay(cellDate, selected);
          const isAvail = availableWeekdays ? availableWeekdays.includes(cellDate.getDay()) : false;
          return (
            <TouchableOpacity
              key={i}
              style={styles.cell}
              disabled={isPast}
              onPress={() => onSelect(new Date(year, month, d, 9, 0, 0, 0))}
              activeOpacity={0.7}
            >
              <View style={[styles.day, isSel && styles.daySel]}>
                <Text style={[styles.dayText, isSel && styles.dayTextSel, isPast && styles.dayTextPast]}>
                  {d}
                </Text>
                {isAvail && !isSel && !isPast && <View style={styles.dot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 7,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 5 },
  monthLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: 2 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 10, color: Colors.textSecondary, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 1 },
  day: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: Colors.primary },
  dayText: { fontSize: 12, color: Colors.textPrimary },
  dayTextSel: { color: '#FFFFFF', fontWeight: '700' },
  dayTextPast: { color: Colors.border },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#1E9E5A', position: 'absolute', bottom: 2 },
});
