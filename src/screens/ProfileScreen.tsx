import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { createCrew } from '../services/adminService';
import { getAllCalls, getFinancials } from '../services/serviceCallService';
import { aggregateTotals } from '../utils/finance';
import { capsLabel } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, caps, crews, signOut } = useUser();
  const { items } = useInventory();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [revenue, setRevenue] = useState<number | null>(null);

  useEffect(() => {
    if (!caps.viewFinancials) return;
    let cancelled = false;
    (async () => {
      try {
        const calls = await getAllCalls();
        const fins = await Promise.all(calls.map((c) => getFinancials(c.id).catch(() => null)));
        if (!cancelled) setRevenue(aggregateTotals(calls, fins, items).profit);
      } catch {
        /* leave as — */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caps.viewFinancials, items]);

  if (!profile) return null;

  async function doCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const crewId = await createCrew(name);
      setSaving(false);
      setCreating(false);
      setNewName('');
      if (crewId) navigation.navigate('CrewDetail', { crewId });
    } catch (e: any) {
      setSaving(false);
      Alert.alert('שגיאה', e?.message ?? 'יצירת הצוות נכשלה (ודא שפונקציית הענן פרוסה).');
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{capsLabel(caps)}</Text>

        <View style={styles.card}>
          <Row label="צוות" value={profile.teamId || '—'} />
        </View>

        {caps.viewFinancials && (
          <TouchableOpacity
            style={[styles.revBtn, revenue != null && revenue < 0 && styles.revBtnNeg]}
            onPress={() => navigation.navigate('FinancialDashboard')}
            activeOpacity={0.85}
          >
            <Text style={styles.revLabel}>רווח</Text>
            <Text style={styles.revValue}>{revenue == null ? '…' : ils(revenue)}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.crewSection}>
          <View style={styles.crewHeader}>
            {caps.manageCrew && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreating(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addText}>צוות חדש</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.crewTitle}>הצוותים שלי</Text>
          </View>
          <FlatList
            data={crews}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.crewRow}
                onPress={() => navigation.navigate('CrewDetail', { crewId: item.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.chev}>‹</Text>
                <View style={styles.crewInfo}>
                  <Text style={styles.crewName}>{item.name}</Text>
                  <Text style={styles.crewMeta}>
                    {item.memberIds.length} חברים
                    {item.manager === profile.uid ? ' · אתה המנהל' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.crewEmpty}>אינך חבר באף צוות עדיין.</Text>}
            style={styles.crewList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <CustomButton label="התנתק" variant="danger" onPress={signOut} style={styles.btn} />
      </View>

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>צוות חדש</Text>
            <TextField label="שם הצוות" value={newName} onChange={setNewName} placeholder="לדוגמה: צוות צפון" />
            <CustomButton label="צור" onPress={doCreate} loading={saving} disabled={!newName.trim()} style={styles.btn} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setCreating(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowValue}>{value}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', padding: Layout.screenPadding, paddingTop: 32 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 6,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  rowLabel: { fontSize: 14, color: Colors.textSecondary },
  rowValue: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  revBtn: {
    alignSelf: 'center',
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: '#1E9E5A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1E9E5A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  revBtnNeg: { backgroundColor: Colors.danger, shadowColor: Colors.danger },
  revLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  revValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 8, writingDirection: 'ltr' },
  crewSection: { alignSelf: 'stretch', flex: 1, marginTop: 24 },
  crewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  crewTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  crewList: { flex: 1, alignSelf: 'stretch' },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  crewInfo: { flex: 1, alignItems: 'flex-end' },
  crewName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  crewMeta: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  chev: { fontSize: 24, color: Colors.textSecondary },
  crewEmpty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  btn: { alignSelf: 'stretch', marginTop: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
});
