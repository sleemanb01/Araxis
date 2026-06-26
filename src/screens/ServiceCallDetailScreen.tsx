import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { dialPhone, openWhatsapp, openNavigation } from '../utils/contact';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useInventory } from '../context/InventoryContext';
import { subscribeToFinancials, setCallStatus, setFinancials, updateServiceCall } from '../services/serviceCallService';
import { createInventoryItem, adjustQuantity } from '../services/inventoryService';
import { updateProfile } from '../services/userService';
import { PrivateFinancials, ServiceCallStatus } from '../types/serviceCall';
import { Crew } from '../types/crew';
import { WAREHOUSE, crewLocation } from '../types/inventory';
import { Colors, CallStatusColors, CallStatusLabelsHe } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ServiceCallDetail'>;

const NEXT_STATUS: Record<ServiceCallStatus, ServiceCallStatus | null> = {
  pending: 'active',
  active: 'completed',
  completed: null,
};

export function ServiceCallDetailScreen() {
  const route = useRoute<RouteP>();
  const { callId } = route.params;
  const { profile, caps, crews, user } = useUser();
  const { calls } = useLiveMetrics();
  const { items } = useInventory();
  const uid = profile?.uid ?? '';

  const call = calls.find((c) => c.id === callId);

  const [fin, setFin] = useState<PrivateFinancials | null>(null);
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [payout, setPayout] = useState('');
  // add-item modal
  const [manualOpen, setManualOpen] = useState(false);
  const [mName, setMName] = useState('');
  const [mBarcode, setMBarcode] = useState('');
  const [scanForModal, setScanForModal] = useState(false);

  useEffect(() => {
    if (!caps.viewFinancials) return;
    const unsub = subscribeToFinancials(callId, setFin);
    return () => unsub();
  }, [callId, caps.viewFinancials]);

  useEffect(() => {
    if (fin) {
      setPrice(String(fin.overallPrice));
      setPaid(String(fin.paidAmount));
    }
  }, [fin]);

  const callPayout = call?.payouts.totalTechPayout ?? 0;
  useEffect(() => {
    setPayout(String(callPayout));
  }, [callId, callPayout]);

  if (!call) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>הקריאה לא נמצאה</Text>
      </SafeAreaView>
    );
  }

  const canEdit = caps.createCalls || call.teamAssignment.leadTech === uid;
  const next = NEXT_STATUS[call.status];

  const assignedCrew =
    crews.find((c) => c.id === call.crewId) ??
    crews.find((c) => c.manager === call.teamAssignment.leadTech) ??
    null;
  const hasCrew = !!call.crewId || !!call.teamAssignment.leadTech;

  const checked = new Set(call.checkedItems ?? []);
  const reqItems = call.requiredItems ?? [];
  // Can't finish a job until every required item is checked off.
  const allItemsChecked = reqItems.every((id) => checked.has(id));
  const blockFinish = next === 'completed' && reqItems.length > 0 && !allItemsChecked;

  const priceN = Math.max(0, parseFloat(price) || 0);
  const paidN = Math.max(0, parseFloat(paid) || 0);
  const payoutN = Math.max(0, parseFloat(payout) || 0);
  const showFinance = caps.viewTeamPayouts || caps.viewFinancials;

  function advance() {
    if (!next) return;
    setCallStatus(callId, next).catch(() => Alert.alert('שגיאה', 'עדכון הסטטוס נכשל.'));
  }

  async function saveFinancials() {
    try {
      if (caps.viewFinancials) await setFinancials(callId, { overallPrice: priceN, paidAmount: paidN });
      if (caps.viewTeamPayouts && canEdit) {
        await updateServiceCall(callId, { payouts: { totalTechPayout: payoutN, splits: call!.payouts.splits } });
      }
      Alert.alert('נשמר', 'הכספים עודכנו.');
    } catch {
      Alert.alert('שגיאה', 'שמירת הכספים נכשלה.');
    }
  }

  function assignCrew(crew: Crew) {
    updateServiceCall(callId, {
      crewId: crew.id,
      teamAssignment: { leadTech: crew.manager, assistants: crew.memberIds.filter((u) => u !== crew.manager) },
    }).catch(() => Alert.alert('שגיאה', 'הקצאת הצוות נכשלה.'));
  }

  // The crew's manager (lead) or a call manager can pull the crew off the job.
  function withdrawCrew() {
    Alert.alert('הסרת צוות', 'להסיר את הצוות מהקריאה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: () =>
          updateServiceCall(callId, { crewId: '', teamAssignment: { leadTech: '', assistants: [] } }).catch(() =>
            Alert.alert('שגיאה', 'ההסרה נכשלה.')
          ),
      },
    ]);
  }

  // Consume from the crew's stock when an item is used on the job (crew →
  // customer); return it on uncheck. Stock writes need manageInventory.
  function moveStock(itemId: string, delta: number) {
    if (!caps.manageInventory || !call!.crewId) return;
    adjustQuantity(itemId, crewLocation(call!.crewId), delta).catch(() => {});
  }

  function toggleChecked(id: string) {
    const set = new Set(call!.checkedItems ?? []);
    const willCheck = !set.has(id);
    willCheck ? set.add(id) : set.delete(id);
    updateServiceCall(callId, { checkedItems: Array.from(set) }).catch(() => {});
    moveStock(id, willCheck ? -1 : 1);
  }

  function findExistingItem() {
    const bc = mBarcode.trim();
    const nm = mName.trim();
    return items.find((i) => (!!bc && i.barcode === bc) || (!!nm && i.itemName === nm)) ?? null;
  }
  function onModalScan(code: string) {
    setScanForModal(false);
    setMBarcode(code);
    const ex = items.find((i) => i.barcode === code);
    if (ex) setMName(ex.itemName);
  }
  function closeManual() {
    setManualOpen(false);
    setMName('');
    setMBarcode('');
  }
  // Adding an item ensures it's in the checklist AND checks it off (you've got it).
  async function addItemToCall(itemId: string) {
    const reqCur = call!.requiredItems ?? [];
    const chkCur = call!.checkedItems ?? [];
    const wasChecked = chkCur.includes(itemId);
    await updateServiceCall(callId, {
      requiredItems: reqCur.includes(itemId) ? reqCur : [...reqCur, itemId],
      checkedItems: wasChecked ? chkCur : [...chkCur, itemId],
    });
    if (!wasChecked) moveStock(itemId, -1); // newly checked → consume from crew stock
  }
  async function addManualItem() {
    const existing = findExistingItem();
    try {
      if (existing) await addItemToCall(existing.id);
      else {
        if (!mName.trim()) return;
        const id = await createInventoryItem({
          itemName: mName.trim(),
          ...(mBarcode.trim() ? { barcode: mBarcode.trim() } : {}),
          lacks: true,
          locations: { [WAREHOUSE]: 0 },
        });
        await addItemToCall(id);
      }
      closeManual();
    } catch {
      Alert.alert('שגיאה', 'הוספת הפריט נכשלה.');
    }
  }

  const existingItem = findExistingItem();

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.client}>{call.clientName}</Text>
          <View style={[styles.badge, { backgroundColor: CallStatusColors[call.status] }]}>
            <Text style={styles.badgeText}>{CallStatusLabelsHe[call.status]}</Text>
          </View>
        </View>
        <Text style={styles.date}>{new Date(call.scheduledDate).toLocaleDateString('he-IL')}</Text>

        {(call.address || call.contactPhone) && (
          <View style={styles.contactBox}>
            {!!call.address && (
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={[styles.cbtn, styles.cbtnNav]}
                  onPress={() =>
                    openNavigation(call.address!, profile?.navApp, (app) => {
                      if (user) updateProfile(user.uid, { navApp: app }).catch(() => {});
                    })
                  }
                  hitSlop={6}
                >
                  <Ionicons name="navigate" size={15} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.contactText}>{call.address}</Text>
              </View>
            )}
            {!!call.contactPhone && (
              <View style={styles.contactRow}>
                <View style={styles.contactBtns}>
                  <TouchableOpacity style={styles.cbtn} onPress={() => dialPhone(call.contactPhone!)} hitSlop={6}>
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cbtn, styles.cbtnWa]} onPress={() => openWhatsapp(call.contactPhone!)} hitSlop={6}>
                    <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.contactText}>{call.contactPhone}</Text>
              </View>
            )}
          </View>
        )}

        {!!call.notes && (
          <>
            <Text style={styles.section}>הערות</Text>
            <Text style={styles.line}>{call.notes}</Text>
          </>
        )}

        <Text style={styles.section}>צוות</Text>
        {hasCrew ? (
          <View style={styles.crewRow}>
            {canEdit && (
              <TouchableOpacity onPress={withdrawCrew} hitSlop={6}>
                <Text style={styles.withdraw}>הסר צוות</Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.line, styles.flex1]}>
              {assignedCrew?.name ?? 'צוות מוקצה'} · {call.teamAssignment.assistants.length + 1} חברים
            </Text>
          </View>
        ) : canEdit ? (
          <View style={styles.chips}>
            {crews.map((c) => (
              <TouchableOpacity key={c.id} style={styles.chip} onPress={() => assignCrew(c)} activeOpacity={0.8}>
                <Text style={styles.chipText}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            {crews.length === 0 && <Text style={styles.muted}>אין לך צוותים להקצאה.</Text>}
          </View>
        ) : (
          <Text style={styles.muted}>לא הוקצה צוות</Text>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionInline}>פריטים נדרשים</Text>
          {canEdit && (
            <TouchableOpacity style={styles.addBtn} onPress={() => setManualOpen(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
        {reqItems.length ? (
          reqItems.map((id) => {
            const it = items.find((i) => i.id === id);
            const on = checked.has(id);
            return (
              <TouchableOpacity
                key={id}
                style={styles.checkRow}
                onPress={() => canEdit && toggleChecked(id)}
                disabled={!canEdit}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={on ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.checkText, on && styles.checkTextDone]}>
                  {it?.itemName ?? id}
                </Text>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.muted}>אין פריטים</Text>
        )}

        {showFinance && (
          <>
            <Text style={styles.section}>כספים</Text>
            <View style={styles.financeRow}>
              {caps.viewTeamPayouts && (
                <View style={styles.financeCol}>
                  <TextField label="תשלום צוות ₪" value={payout} onChange={setPayout} placeholder="0" keyboardType="numeric" />
                </View>
              )}
              {caps.viewFinancials && (
                <>
                  <View style={styles.financeCol}>
                    <TextField label="מחיר ללקוח ₪" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
                  </View>
                  <View style={styles.financeCol}>
                    <TextField label="שולם ₪" value={paid} onChange={setPaid} placeholder="0" keyboardType="numeric" />
                  </View>
                </>
              )}
            </View>
            <CustomButton label="שמור כספים" variant="secondary" onPress={saveFinancials} style={styles.btnFin} />
          </>
        )}

        {canEdit && next && (
          <>
            {blockFinish && (
              <Text style={styles.blockHint}>יש לסמן את כל הפריטים הנדרשים לפני סיום העבודה.</Text>
            )}
            <CustomButton
              label={`סמן כ"${CallStatusLabelsHe[next]}"`}
              onPress={advance}
              disabled={blockFinish}
              style={styles.btn}
            />
          </>
        )}
      </ScrollView>

      <BarcodeScannerModal visible={scanForModal} onClose={() => setScanForModal(false)} onScanned={onModalScan} />

      <Modal visible={manualOpen} transparent animationType="fade" onRequestClose={closeManual}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הוספת פריט</Text>
            <TextField label="שם הפריט" value={mName} onChange={setMName} placeholder="לדוגמה: מצלמה" />
            <View style={styles.barcodeRow}>
              <View style={styles.barcodeField}>
                <TextField label="ברקוד" value={mBarcode} onChange={setMBarcode} placeholder="סרוק או הזן" />
              </View>
              <TouchableOpacity style={styles.scanBtn} onPress={() => setScanForModal(true)} activeOpacity={0.85}>
                <Ionicons name="barcode-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {existingItem && (
              <Text style={styles.modalSub}>פריט קיים: {existingItem.itemName} — יתווסף הקיים.</Text>
            )}
            <CustomButton
              label="הוסף פריט"
              onPress={addManualItem}
              disabled={!existingItem && !mName.trim()}
              style={styles.btnFin}
            />
            <CustomButton label="ביטול" variant="ghost" onPress={closeManual} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding, gap: 4 },
  missing: { textAlign: 'center', marginTop: 40, color: Colors.textSecondary, fontSize: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  client: { flex: 1, fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  contactBox: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 12, marginTop: 4, gap: 10 },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  contactText: { flex: 1, fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  contactBtns: { flexDirection: 'row', gap: 8 },
  cbtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  cbtnWa: { backgroundColor: '#25D366' },
  cbtnNav: { backgroundColor: '#0F766E' },
  section: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginTop: 18, marginBottom: 6 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  sectionInline: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  line: { fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  muted: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right' },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex1: { flex: 1 },
  withdraw: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  chip: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, color: Colors.textPrimary },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
  },
  checkText: { flex: 1, fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  checkTextDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  financeRow: { flexDirection: 'row', gap: 8 },
  financeCol: { flex: 1 },
  finStatus: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginTop: 2 },
  btn: { marginTop: 28 },
  btnFin: { marginTop: 10 },
  blockHint: { fontSize: 13, color: Colors.danger, textAlign: 'right', marginTop: 24, marginBottom: -16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barcodeField: { flex: 1 },
  scanBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
});
