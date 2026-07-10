import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { AddItemModal } from '../components/AddItemModal';
import { Calendar } from '../components/Calendar';
import { dialPhone, openWhatsapp, openNavigation } from '../utils/contact';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useInventory } from '../context/InventoryContext';
import { subscribeToCall, subscribeToFinancials, setFinancials, updateServiceCall } from '../services/serviceCallService';
import { subscribeToPayments, issuePaymentDocument, deletePayment } from '../services/paymentService';
import { invalidateFinancialData } from '../hooks/useFinancialData';
import { AddPaymentModal } from '../components/AddPaymentModal';
import { Payment, PAYMENT_METHOD_HE, PAYMENT_STATUS_HE, DOC_KIND_HE } from '../types/payment';
import { financialStatus, FINANCIAL_STATUS_HE, buyListForCall } from '../utils/finance';
import { ils } from '../utils/format';
import { adjustQuantity } from '../services/inventoryService';
import { updateProfile } from '../services/userService';
import { ServiceCall, PrivateFinancials, ServiceCallStatus } from '../types/serviceCall';
import { Crew } from '../types/crew';
import { crewLocation } from '../types/inventory';
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
  const { callId, readOnly } = route.params;
  const { profile, caps, crews, user } = useUser();
  const { calls } = useLiveMetrics();
  const { items } = useInventory();
  const uid = profile?.uid ?? '';

  // The live list is time-bounded (today onward); a job opened from history may
  // not be there, so also subscribe to the call doc directly.
  const liveCall = calls.find((c) => c.id === callId);
  const [fetchedCall, setFetchedCall] = useState<ServiceCall | null>(null);
  const call = liveCall ?? fetchedCall;

  const [fin, setFin] = useState<PrivateFinancials | null>(null);
  const [price, setPrice] = useState('');
  const [payout, setPayout] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCall(callId, setFetchedCall);
    return () => unsub();
  }, [callId]);

  useEffect(() => {
    if (!caps.viewFinancials) return;
    const unsub = subscribeToFinancials(callId, setFin);
    return () => unsub();
  }, [callId, caps.viewFinancials]);

  useEffect(() => {
    if (!caps.viewFinancials) return;
    return subscribeToPayments(callId, setPayments, () => {});
  }, [callId, caps.viewFinancials]);

  useEffect(() => {
    if (fin) {
      setPrice(String(fin.overallPrice));
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

  // A finished job is locked — no crew/items/financials edits. The only thing
  // still allowed on it is collecting money that wasn't paid yet (payments).
  const isDone = call.status === 'completed';
  const canEdit = !readOnly && !isDone && (caps.createCalls || call.teamAssignment.leadTech === uid);
  const next = NEXT_STATUS[call.status];

  const assignedCrew =
    crews.find((c) => c.id === call.crewId) ??
    crews.find((c) => c.manager === call.teamAssignment.leadTech) ??
    null;
  const hasCrew = !!call.crewId || !!call.teamAssignment.leadTech;

  const checked = new Set(call.checkedItems ?? []);
  const reqItems = call.requiredItems ?? [];
  // Completed jobs use the frozen price snapshot; live jobs use current prices.
  const priceOf = (id: string): number | undefined => call.itemPrices?.[id] ?? items.find((i) => i.id === id)?.price;
  const qtyOf = (id: string): number => call!.itemQuantities?.[id] ?? 1;
  const equipmentCost = reqItems.reduce((s, id) => s + (priceOf(id) ?? 0) * qtyOf(id), 0);

  // THIS job's shopping list (shared shopping-list rules).
  const buyList = buyListForCall(call, items);
  const buyUnits = buyList.reduce((s, n) => s + n.buy, 0);
  const buyCost = buyList.reduce((s, n) => s + n.cost, 0);
  // Can't finish a job until every required item is checked off.
  const allItemsChecked = reqItems.every((id) => checked.has(id));
  const blockFinish = next === 'completed' && reqItems.length > 0 && !allItemsChecked;

  const priceN = Math.max(0, parseFloat(price) || 0);
  const payoutN = Math.max(0, parseFloat(payout) || 0);
  const showFinance = caps.viewTeamPayouts || caps.viewFinancials;

  // Paid money is derived from ISSUED payment records; it is not edited here.
  const paidIssued = payments.reduce((s, p) => s + (p.status === 'issued' ? p.amount : 0), 0);
  const reserved = payments.reduce((s, p) => s + (p.status !== 'failed' ? p.amount : 0), 0);
  // Legacy jobs may hold manually-entered paid money with no records behind it;
  // it shows in the list as one "רישום ידני" line (dated by the job).
  const manualPaid = Math.max(0, (fin?.paidAmount ?? 0) - paidIssued);
  const paidShown = Math.max(paidIssued, fin?.paidAmount ?? 0);
  const balance = Math.max(0, priceN - paidShown);
  // Fully paid (by SAVED money, not the draft being typed) — no more payments.
  const fullyPaid = priceN > 0 && priceN - Math.max(paidIssued, fin?.paidAmount ?? 0) <= 0.005;

  function advance() {
    if (!next) return;
    const patch: Partial<ServiceCall> = { status: next };
    if (next === 'completed') {
      // Freeze item prices so later price edits don't change this finished job.
      const snap: Record<string, number> = {};
      (call!.requiredItems ?? []).forEach((id) => {
        const p = items.find((i) => i.id === id)?.price;
        if (typeof p === 'number') snap[id] = p;
      });
      patch.itemPrices = snap;
    }
    updateServiceCall(callId, patch)
      .then(invalidateFinancialData) // dashboards re-read money data
      .catch(() => Alert.alert('שגיאה', 'עדכון הסטטוס נכשל.'));
  }

  async function saveFinancials() {
    try {
      if (caps.viewFinancials) {
        // Paid money is read-only here — it moves only through the payments
        // list below. Only the client price is edited on this form.
        await setFinancials(callId, { overallPrice: priceN, paidAmount: fin?.paidAmount ?? 0 });
      }
      if (caps.viewTeamPayouts && canEdit) {
        await updateServiceCall(callId, { payouts: { totalTechPayout: payoutN, splits: call!.payouts.splits } });
      }
      invalidateFinancialData();
      Alert.alert('נשמר', 'הכספים עודכנו.');
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'שמירת הכספים נכשלה.');
    }
  }

  // Move the job to another day. An active job goes back to "pending" (it is
  // scheduled again), and the day-before reminder re-arms for the new date.
  function onPickNewDate(d: Date) {
    Alert.alert('קביעת תאריך אחר', `להעביר את העבודה ל-${d.toLocaleDateString('he-IL')}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'אישור',
        onPress: () =>
          updateServiceCall(callId, {
            scheduledDate: d.toISOString(),
            ...(call!.status === 'active' ? { status: 'pending' } : {}),
            reminderSentAt: '',
          })
            .then(() => {
              invalidateFinancialData(); // day/month grouping moved
              setReschedOpen(false);
            })
            .catch(() => Alert.alert('שגיאה', 'עדכון התאריך נכשל.')),
      },
    ]);
  }

  function assignCrew(crew: Crew) {
    updateServiceCall(callId, {
      crewId: crew.id,
      teamAssignment: { leadTech: crew.manager, assistants: crew.memberIds.filter((u) => u !== crew.manager) },
    })
      .then(invalidateFinancialData)
      .catch(() => Alert.alert('שגיאה', 'הקצאת הצוות נכשלה.'));
  }

  // The crew's manager (lead) or a call manager can pull the crew off the job.
  function withdrawCrew() {
    Alert.alert('הסרת צוות', 'להסיר את הצוות מהקריאה?', [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'הסר',
        style: 'destructive',
        onPress: () =>
          updateServiceCall(callId, { crewId: '', teamAssignment: { leadTech: '', assistants: [] } })
            .then(invalidateFinancialData)
            .catch(() => Alert.alert('שגיאה', 'ההסרה נכשלה.')),
      },
    ]);
  }

  // Consume from the crew's stock when an item is used on the job (crew →
  // customer); return it on uncheck. Stock writes need manageInventory.
  function moveStock(itemId: string, delta: number) {
    if (!caps.manageInventory || !call!.crewId) return;
    adjustQuantity(itemId, crewLocation(call!.crewId), delta).catch(() => {});
  }

  function uncheckItem(id: string, returnToStock: boolean) {
    const set = new Set(call!.checkedItems ?? []);
    set.delete(id);
    updateServiceCall(callId, { checkedItems: Array.from(set) }).catch(() => {});
    if (returnToStock) moveStock(id, qtyOf(id)); // return the full quantity
  }

  // You can't manually check an item — you check it by adding it (which consumes
  // it from the crew). Tapping a checked item unchecks it, asking whether to
  // return it to the crew's stock.
  function onItemTap(id: string) {
    if (!canEdit || !checked.has(id)) return;
    Alert.alert('ביטול סימון', 'להחזיר את הפריט למלאי הצוות?', [
      { text: 'לא', onPress: () => uncheckItem(id, false) },
      { text: 'כן', onPress: () => uncheckItem(id, true) },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  // Remove a required item from the job. If it was checked (stock consumed),
  // ask whether to return its quantity to the crew stock first.
  function doRemoveReqItem(id: string, returnToStock: boolean) {
    const req = (call!.requiredItems ?? []).filter((x) => x !== id);
    const chk = (call!.checkedItems ?? []).filter((x) => x !== id);
    const qtys = { ...(call!.itemQuantities ?? {}) };
    delete qtys[id];
    if (returnToStock) moveStock(id, qtyOf(id));
    updateServiceCall(callId, { requiredItems: req, checkedItems: chk, itemQuantities: qtys })
      .then(invalidateFinancialData)
      .catch(() => Alert.alert('שגיאה', 'הסרת הפריט נכשלה.'));
  }

  function removeReqItem(id: string) {
    if (checked.has(id)) {
      Alert.alert('הסרת פריט', 'הפריט מסומן — להחזיר את הכמות למלאי הצוות?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר בלי החזרה', onPress: () => doRemoveReqItem(id, false) },
        { text: 'החזר והסר', onPress: () => doRemoveReqItem(id, true) },
      ]);
    } else {
      Alert.alert('הסרת פריט', 'להסיר את הפריט מהעבודה?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: () => doRemoveReqItem(id, false) },
      ]);
    }
  }

  // Adding an item ensures it's in the checklist AND checks it off (you've got it).
  async function addItemToCall(itemId: string, qty = 1) {
    const reqCur = call!.requiredItems ?? [];
    const chkCur = call!.checkedItems ?? [];
    const qtyCur = call!.itemQuantities ?? {};
    const wasChecked = chkCur.includes(itemId);
    const prevQty = qtyCur[itemId] ?? (reqCur.includes(itemId) ? 1 : 0);
    const newQty = prevQty + qty;
    await updateServiceCall(callId, {
      requiredItems: reqCur.includes(itemId) ? reqCur : [...reqCur, itemId],
      checkedItems: wasChecked ? chkCur : [...chkCur, itemId],
      itemQuantities: { ...qtyCur, [itemId]: newQty },
    });
    // Checked ⇒ its full quantity is consumed from the crew stock: a newly
    // checked item consumes everything, an already-checked one just the delta.
    moveStock(itemId, -(wasChecked ? qty : newQty));
    invalidateFinancialData(); // equipment cost changed
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
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
          <View style={styles.sectionBtns}>
            {caps.viewFinancials && !isDone && buyUnits > 0 && (
              <TouchableOpacity style={styles.buyPill} onPress={() => setBuyOpen(true)} activeOpacity={0.8}>
                <Text style={styles.buyPillText}>לקנייה {buyUnits} · {ils(buyCost)}</Text>
              </TouchableOpacity>
            )}
            {canEdit && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {reqItems.length ? (
          reqItems.map((id) => {
            const it = items.find((i) => i.id === id);
            const itPrice = priceOf(id);
            const on = checked.has(id);
            return (
              <TouchableOpacity
                key={id}
                style={styles.checkRow}
                onPress={() => onItemTap(id)}
                disabled={!canEdit || !on}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={on ? Colors.primary : Colors.textSecondary}
                />
                {caps.viewFinancials && itPrice != null && (
                  <Text style={styles.itemPrice}>₪{(itPrice * qtyOf(id)).toLocaleString('he-IL')}</Text>
                )}
                <Text style={[styles.checkText, on && styles.checkTextDone]}>
                  {it?.itemName ?? id}
                  {qtyOf(id) > 1 ? ` ×${qtyOf(id)}` : ''}
                </Text>
                {canEdit && (
                  <TouchableOpacity onPress={() => removeReqItem(id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.muted}>אין פריטים</Text>
        )}

        {showFinance && (
          <>
            <Text style={styles.section}>כספים</Text>
            {readOnly || isDone ? (
              <>
                {caps.viewTeamPayouts && (
                  <Text style={styles.line}>תשלום צוות: ₪{payoutN.toLocaleString('he-IL')}</Text>
                )}
                {caps.viewFinancials && (
                  <>
                    <Text style={styles.line}>מחיר ללקוח: ₪{priceN.toLocaleString('he-IL')}</Text>
                    <Text style={styles.line}>שולם: {ils(paidShown)}</Text>
                  </>
                )}
              </>
            ) : (
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
                  </>
                )}
              </View>
            )}
            {caps.viewFinancials && (
              <Text style={styles.line}>עלות ציוד: ₪{equipmentCost.toLocaleString('he-IL')}</Text>
            )}
            {!readOnly && !isDone && (
              <CustomButton label="שמור כספים" variant="secondary" onPress={saveFinancials} style={styles.btnFin} />
            )}

            {caps.viewFinancials && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionInline}>תשלומים</Text>
                  {!fullyPaid && (!(readOnly || isDone) || balance > 0) && (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setPayOpen(true)} activeOpacity={0.85}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
                {priceN > 0 && (
                  <Text style={styles.paySummary}>
                    שולם {ils(paidShown)} · יתרה {ils(balance)} ·{' '}
                    {FINANCIAL_STATUS_HE[financialStatus(priceN, paidShown)]}
                  </Text>
                )}
                {payments.length === 0 && manualPaid <= 0.005 ? (
                  <Text style={styles.muted}>אין תשלומים עדיין.</Text>
                ) : (
                  payments.map((p) => (
                    <View key={p.id} style={styles.payRow}>
                      <View style={styles.payActions}>
                        {p.morningPdfUrl && (
                          <TouchableOpacity onPress={() => Linking.openURL(p.morningPdfUrl!)} hitSlop={6}>
                            <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
                          </TouchableOpacity>
                        )}
                        {p.morningPdfUrl && !!call.contactPhone && (
                          <TouchableOpacity
                            onPress={() =>
                              openWhatsapp(
                                call!.contactPhone!,
                                `שלום ${call!.clientName}, מצורף ${DOC_KIND_HE[p.docKind]} על סך ₪${p.amount.toLocaleString('he-IL')}: ${p.morningPdfUrl}`
                              )
                            }
                            hitSlop={6}
                          >
                            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                          </TouchableOpacity>
                        )}
                        {p.status !== 'issued' && !readOnly && (
                          <TouchableOpacity
                            onPress={() =>
                              issuePaymentDocument(callId, p.id).catch((e: any) =>
                                Alert.alert('שגיאה', e?.message ?? 'הפקת המסמך נכשלה.')
                              )
                            }
                            hitSlop={6}
                          >
                            <Ionicons name="refresh" size={20} color={Colors.danger} />
                          </TouchableOpacity>
                        )}
                        {!readOnly && !p.morningDocumentId && (
                          <TouchableOpacity
                            onPress={() =>
                              Alert.alert('מחיקת תשלום', `למחוק תשלום של ₪${p.amount.toLocaleString('he-IL')}?`, [
                                { text: 'ביטול', style: 'cancel' },
                                {
                                  text: 'מחק',
                                  style: 'destructive',
                                  onPress: () =>
                                    deletePayment(callId, p.id)
                                      .then(invalidateFinancialData)
                                      .catch((e: any) => Alert.alert('שגיאה', e?.message ?? 'המחיקה נכשלה.')),
                                },
                              ])
                            }
                            hitSlop={6}
                          >
                            <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={styles.payInfo}>
                        <Text style={styles.payAmount}>
                          ₪{p.amount.toLocaleString('he-IL')} · {PAYMENT_METHOD_HE[p.method]}
                        </Text>
                        <Text style={styles.payMeta}>
                          {new Date((p.date || p.createdAt.slice(0, 10)) + 'T00:00:00').toLocaleDateString('he-IL')}
                          {p.morningDocumentNumber
                            ? ` · ${DOC_KIND_HE[p.docKind]} ${p.morningDocumentNumber}`
                            : p.status === 'issued'
                            ? ' · נרשם'
                            : ` · ${PAYMENT_STATUS_HE[p.status]}`}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
                {manualPaid > 0.005 && (
                  <View style={styles.payRow}>
                    <View style={styles.payActions} />
                    <View style={styles.payInfo}>
                      <Text style={styles.payAmount}>{ils(manualPaid)}</Text>
                      <Text style={styles.payMeta}>
                        {new Date(call.scheduledDate).toLocaleDateString('he-IL')} · רישום ידני
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
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
        {canEdit && call.status !== 'completed' && (
          <CustomButton
            label="קבע תאריך אחר"
            variant="secondary"
            onPress={() => setReschedOpen(true)}
            style={styles.btnFin}
          />
        )}
      </ScrollView>

      <AddItemModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(id, qty) => addItemToCall(id, qty).catch(() => {})}
      />

      <AddPaymentModal
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        callId={callId}
        balance={priceN > 0 ? Math.max(0, priceN - Math.max(reserved, fin?.paidAmount ?? 0)) : undefined}
      />

      <Modal visible={buyOpen} transparent animationType="fade" onRequestClose={() => setBuyOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ציוד לקנייה לעבודה זו</Text>
            <Text style={styles.modalSub}>סה״כ {buyUnits} יחידות · {ils(buyCost)}</Text>
            {buyList.map((n) => (
              <View key={n.id} style={styles.buyRow}>
                <Text style={styles.buyCost}>{ils(n.cost)}</Text>
                <View style={styles.buyInfo}>
                  <Text style={styles.buyName} numberOfLines={1}>{n.name}</Text>
                  <Text style={styles.buyMeta}>
                    לקנייה {n.buy} × {ils(n.price)} · נדרש {n.qty} · במלאי {n.stock}
                  </Text>
                </View>
              </View>
            ))}
            <CustomButton label="סגור" variant="ghost" onPress={() => setBuyOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={reschedOpen} transparent animationType="fade" onRequestClose={() => setReschedOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>קביעת תאריך אחר</Text>
            <Text style={styles.modalSub}>בחר את היום החדש לעבודה.</Text>
            <Calendar selected={new Date(call.scheduledDate)} onSelect={onPickNewDate} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setReschedOpen(false)} />
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
  sectionBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buyPill: {
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#C3D4FA',
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buyPillText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  buyCost: { fontSize: 15, fontWeight: '800', color: '#B91C1C', writingDirection: 'ltr' },
  buyInfo: { flex: 1, alignItems: 'flex-end', marginStart: 10 },
  buyName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  buyMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
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
  itemPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  financeRow: { flexDirection: 'row', gap: 8 },
  financeCol: { flex: 1 },
  paySummary: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right', marginBottom: 8, writingDirection: 'rtl' },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  payActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payInfo: { flex: 1, alignItems: 'flex-end', marginStart: 10 },
  payAmount: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  payMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
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
