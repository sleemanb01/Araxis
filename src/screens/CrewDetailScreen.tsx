import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Switch, Alert, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { FAB } from '../components/FAB';
import { AddByPhoneForm } from '../components/AddByPhoneForm';
import { CrewMemberRow } from '../components/CrewMemberRow';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { returnToWarehouse } from '../services/inventoryService';
import { getUsersByIds } from '../services/userService';
import { subscribeToCrewWithdrawals } from '../services/withdrawalService';
import { getAllCalls } from '../services/serviceCallService';
import { setCrewMemberCaps, removeCrewFromMember } from '../services/adminService';
import { InventoryItem, qtyAt, crewLocation } from '../types/inventory';
import { ServiceCall } from '../types/serviceCall';
import { Withdrawal } from '../types/withdrawal';
import {
  UserProfile,
  Capabilities,
  CAP_KEYS,
  CAP_LABELS_HE,
  NO_CAPS,
  capsLabel,
} from '../types/user';
import { Crew } from '../types/crew';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'CrewDetail'>;

export function CrewDetailScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user: me, caps: myCaps, crews } = useUser();
  const { items } = useInventory();
  const crew = crews.find((c) => c.id === route.params.crewId) ?? null;
  const isManager = !!me && !!crew && crew.manager === me.uid;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [jobs, setJobs] = useState<ServiceCall[]>([]);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [adding, setAdding] = useState(false);
  const [returnItem, setReturnItem] = useState<InventoryItem | null>(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returning, setReturning] = useState(false);

  // Read only this crew's members (req 1: a member sees only crew mates).
  const memberKey = (crew?.memberIds ?? []).join(',');
  useEffect(() => {
    const ids = crew?.memberIds ?? [];
    if (!ids.length) {
      setUsers([]);
      return;
    }
    getUsersByIds(ids).then(setUsers).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey]);

  // This crew's withdrawal history (for the total + history screen).
  useEffect(() => {
    const id = crew?.id;
    if (!id) return;
    const unsub = subscribeToCrewWithdrawals(id, setWithdrawals, () => {});
    return unsub;
  }, [crew?.id]);

  // This crew's completed jobs (history).
  useEffect(() => {
    const id = crew?.id;
    if (!id || !myCaps.viewAllCalls) return;
    let cancelled = false;
    getAllCalls()
      .then((all) => {
        if (cancelled) return;
        setJobs(
          all
            .filter((c) => c.crewId === id && c.status === 'completed')
            .sort((a, b) => +new Date(b.scheduledDate) - +new Date(a.scheduledDate))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [crew?.id, myCaps.viewAllCalls]);

  if (!crew) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <Text style={styles.empty}>הצוות לא נמצא.</Text>
      </SafeAreaView>
    );
  }

  const members = crew.memberIds
    .map((uid) => users.find((u) => u.uid === uid))
    .filter((u): u is UserProfile => !!u);

  const crewLoc = crewLocation(crew.id);
  const crewStock = items.filter((i) => qtyAt(i, crewLoc) > 0);
  const withdrawCount = withdrawals.filter((w) => w.type !== 'return').length;

  // Live max for the return picker (the item's current qty in this crew's stock).
  const returnMax = returnItem ? qtyAt(items.find((i) => i.id === returnItem.id) ?? returnItem, crewLoc) : 0;

  function openReturn(item: InventoryItem) {
    setReturnItem(item);
    setReturnQty(qtyAt(item, crewLoc)); // default: return all
  }

  async function doReturn() {
    if (!returnItem || !crew || !me) return;
    const qty = Math.min(returnQty, returnMax);
    if (qty <= 0) {
      setReturnItem(null);
      return;
    }
    setReturning(true);
    try {
      await returnToWarehouse(returnItem, qty, crew.id, me.uid);
      setReturning(false);
      setReturnItem(null);
    } catch {
      setReturning(false);
      Alert.alert('שגיאה', 'ההחזרה נכשלה.');
    }
  }

  if (editing) {
    return <MemberCapsEditor crew={crew} member={editing} myCaps={myCaps} onDone={() => setEditing(null)} />;
  }
  if (adding) {
    return (
      <AddByPhoneForm
        title={`הוספה ל${crew.name}`}
        onFound={(u) => {
          setAdding(false);
          setEditing(u);
        }}
        onCancel={() => setAdding(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={members}
        keyExtractor={(u) => u.uid}
        renderItem={({ item }) => (
          <CrewMemberRow
            member={item}
            subtitle={capsLabel(crew.members[item.uid] ?? NO_CAPS)}
            onPress={() => isManager && setEditing(item)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{crew.name}</Text>
            <Text style={styles.sub}>
              {members.length} חברי צוות{isManager ? ' · אתה המנהל' : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין חברים בצוות עדיין.</Text>}
        ListFooterComponent={
          <View style={styles.stock}>
            <TouchableOpacity
              style={styles.statRow}
              onPress={() => navigation.navigate('CrewWithdrawals', { crewId: crew.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.chev}>‹</Text>
              <Text style={styles.statText}>סה״כ משיכות: {withdrawCount}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>מלאי הצוות</Text>
            {crewStock.length === 0 ? (
              <Text style={styles.stockEmpty}>אין ציוד בצוות. משוך מהמחסן.</Text>
            ) : (
              crewStock.map((i) => (
                <View key={i.id} style={styles.stockRow}>
                  <View style={styles.stockLeft}>
                    {myCaps.manageInventory && (
                      <TouchableOpacity
                        style={styles.returnBtn}
                        onPress={() => openReturn(i)}
                        hitSlop={6}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="arrow-undo-outline" size={18} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.stockQty}>{qtyAt(i, crewLoc)}</Text>
                  </View>
                  <Text style={styles.stockName} numberOfLines={1}>{i.itemName}</Text>
                </View>
              ))
            )}
            {myCaps.manageInventory && (
              <CustomButton
                label="משיכה מהמחסן"
                variant="secondary"
                onPress={() => navigation.navigate('Transfer', { crewId: crew.id })}
                style={styles.btn}
              />
            )}

            {myCaps.viewAllCalls && (
              <View style={styles.jobsSection}>
                <Text style={styles.label}>עבודות שבוצעו</Text>
                {jobs.length === 0 ? (
                  <Text style={styles.stockEmpty}>אין עבודות שהושלמו עדיין.</Text>
                ) : (
                  jobs.map((j) => (
                    <TouchableOpacity
                      key={j.id}
                      style={styles.jobRow}
                      onPress={() => navigation.navigate('ServiceCallDetail', { callId: j.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chev}>‹</Text>
                      <View style={styles.jobInfo}>
                        <Text style={styles.jobName} numberOfLines={1}>{j.clientName}</Text>
                        <Text style={styles.jobDate}>{new Date(j.scheduledDate).toLocaleDateString('he-IL')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        }
        contentContainerStyle={styles.list}
      />
      {isManager && <FAB onPress={() => setAdding(true)} />}

      <Modal visible={!!returnItem} transparent animationType="fade" onRequestClose={() => setReturnItem(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>החזרה למחסן</Text>
            <Text style={styles.modalItem} numberOfLines={1}>{returnItem?.itemName}</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setReturnQty((q) => Math.min(returnMax, q + 1))}
              >
                <Ionicons name="add" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{Math.min(returnQty, returnMax)}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setReturnQty((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>מתוך {returnMax} במלאי הצוות</Text>
            <CustomButton
              label={`החזר ${Math.min(returnQty, returnMax)}`}
              onPress={doReturn}
              loading={returning}
              style={styles.btn}
            />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setReturnItem(null)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MemberCapsEditor({
  crew,
  member,
  myCaps,
  onDone,
}: {
  crew: Crew;
  member: UserProfile;
  myCaps: Capabilities;
  onDone: () => void;
}) {
  const isManagerSelf = crew.manager === member.uid;
  const [caps, setCaps] = useState<Capabilities>(crew.members[member.uid] ?? NO_CAPS);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function toggle(k: keyof Capabilities) {
    if (!myCaps[k]) return; // can't grant a capability you don't have
    setCaps((c) => ({ ...c, [k]: !c[k] }));
  }

  async function save() {
    setSaving(true);
    try {
      await setCrewMemberCaps({ crewId: crew.id, uid: member.uid, caps });
      Alert.alert('נשמר', `ההרשאות של ${member.name || member.uid} עודכנו.`);
      onDone();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'העדכון נכשל (ודא שפונקציית הענן פרוסה).');
      setSaving(false);
    }
  }

  function confirmRemove() {
    Alert.alert(
      'הסרה מהצוות',
      `להסיר את ${member.name || member.uid} מ${crew.name}? הוא יוסר מצוות זה בלבד.`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: remove },
      ]
    );
  }

  async function remove() {
    setRemoving(true);
    try {
      await removeCrewFromMember({ crewId: crew.id, uid: member.uid });
      Alert.alert('הוסר', `${member.name || member.uid} הוסר מ${crew.name}.`);
      onDone();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'ההסרה נכשלה.');
      setRemoving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.editor}>
        <Text style={styles.title}>{member.name || member.phone || member.uid}</Text>
        {!!member.phone && <Text style={styles.sub}>{member.phone}</Text>}
        <Text style={styles.label}>הרשאות ב{crew.name}</Text>
        {CAP_KEYS.map((k) => (
          <View key={k} style={styles.capRow}>
            <Switch
              value={caps[k]}
              onValueChange={() => toggle(k)}
              disabled={!myCaps[k] || isManagerSelf}
            />
            <Text style={[styles.capLabel, !myCaps[k] && styles.capLabelOff]}>
              {CAP_LABELS_HE[k]}
            </Text>
          </View>
        ))}
        <Text style={styles.hint}>ניתן להעניק רק הרשאות שיש לך.</Text>
        {isManagerSelf ? (
          <Text style={styles.hint}>זהו מנהל הצוות.</Text>
        ) : (
          <>
            <CustomButton label="שמור" onPress={save} loading={saving} style={styles.btn} />
            <CustomButton label="ביטול" variant="ghost" onPress={onDone} />
            <CustomButton
              label="הסר מהצוות"
              variant="danger"
              onPress={confirmRemove}
              loading={removing}
              style={styles.removeBtn}
            />
          </>
        )}
        {isManagerSelf && <CustomButton label="סגור" variant="ghost" onPress={onDone} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding, paddingBottom: 96 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 12 },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  statText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  chev: { fontSize: 24, color: Colors.textSecondary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
  editor: { padding: Layout.screenPadding },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginTop: 8, marginBottom: 8 },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  capLabel: { flex: 1, fontSize: 15, color: Colors.textPrimary, textAlign: 'right', marginStart: 12 },
  capLabelOff: { color: Colors.textSecondary },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 6, marginBottom: 6 },
  btn: { marginTop: 12, marginBottom: 8 },
  removeBtn: { marginTop: 24 },
  stock: { marginTop: 18 },
  stockEmpty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  jobsSection: { marginTop: 18 },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },
  jobInfo: { flex: 1, alignItems: 'flex-end' },
  jobName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  jobDate: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 8,
  },
  stockName: { flex: 1, fontSize: 15, color: Colors.textPrimary, textAlign: 'right', marginStart: 12 },
  stockLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stockQty: { fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 26, textAlign: 'center' },
  returnBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  modalItem: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginTop: 4, marginBottom: 16 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, minWidth: 44, textAlign: 'center' },
  modalHint: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 10, marginBottom: 6 },
});


