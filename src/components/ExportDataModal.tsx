import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Alert, Share, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { CustomButton } from './CustomButton';
import { archiveAndErase } from '../services/archiveService';
import { viewerBlocked } from '../services/demoMode';
import { buildProfitCsv } from '../utils/report';
import { monthlyProfit, dayKey } from '../utils/finance';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { InventoryItem } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Props {
  visible: boolean;
  onClose: () => void;
  calls: ServiceCall[];
  fins: (PrivateFinancials | null)[];
  items: InventoryItem[];
  onErased: () => void;
}

export function ExportDataModal({ visible, onClose, calls, fins, items, onErased }: Props) {
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);

  async function download() {
    // The read-only viewer must not take real data out of the app.
    if (viewerBlocked('הורדת נתונים מושבתת במצב צפייה.')) return;
    try {
      setBusy(true);
      const csv = '﻿' + buildProfitCsv(calls, fins, items);
      const uri = FileSystem.cacheDirectory + `araxis-report-${dayKey(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(uri, csv);
      await Share.share(Platform.OS === 'ios' ? { url: uri } : { message: csv }, { dialogTitle: 'דוח רווח יומי' });
      setDownloaded(true);
    } catch {
      Alert.alert('שגיאה', 'יצירת הדוח נכשלה.');
    } finally {
      setBusy(false);
    }
  }

  function confirmErase() {
    Alert.alert(
      'מחיקת נתונים',
      'העבודות שהושלמו יימחקו. עבודות פתוחות (הממתינות לביקור נוסף) יישמרו, וסכומי הרווח החודשיים יישמרו לגרפים. פעולה זו אינה ניתנת לביטול.',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: confirmEraseAgain },
      ]
    );
  }

  // Second safety gate — erasing is final, so ask one more time.
  function confirmEraseAgain() {
    Alert.alert('האם אתה בטוח?', 'המחיקה סופית ולא ניתנת לשחזור.', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'כן, מחק', style: 'destructive', onPress: erase },
    ]);
  }

  async function erase() {
    try {
      setBusy(true);
      // Archive only the profit of the jobs being erased (completed); open
      // jobs stay live and get archived in the cycle where they complete.
      const done = calls
        .map((c, i) => [c, fins[i]] as const)
        .filter(([c]) => c.status === 'completed');
      await archiveAndErase(
        monthlyProfit(done.map(([c]) => c), done.map(([, f]) => f), items)
      );
      setDownloaded(false);
      onErased();
      onClose();
      Alert.alert('הושלם', 'העבודות שהושלמו נמחקו. עבודות פתוחות וסכומי הרווח החודשיים נשמרו.');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'המחיקה נכשלה.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.bg}>
        <View style={styles.card}>
          <Text style={styles.title}>ייצוא ומחיקת נתונים</Text>
          <Text style={styles.text}>
            הורד את דוח הרווח היומי. רק לאחר ההורדה ניתן למחוק את הנתונים. נמחקות רק עבודות שהושלמו —
            עבודות פתוחות (הממתינות לביקור נוסף) וסכומי הרווח החודשיים יישמרו.
          </Text>
          <CustomButton
            label={downloaded ? 'הורד שוב' : 'הורד דוח'}
            onPress={download}
            loading={busy}
            style={styles.btn}
          />
          <CustomButton
            label="מחק ואפס"
            variant="danger"
            onPress={confirmErase}
            disabled={!downloaded || busy}
            style={styles.btn}
          />
          <CustomButton label="סגור" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 8 },
  text: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  btn: { marginBottom: 8 },
});
