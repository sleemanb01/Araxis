import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { FAB } from '../components/FAB';
import { AddByPhoneForm } from '../components/AddByPhoneForm';
import { CrewMemberRow } from '../components/CrewMemberRow';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { subscribeToUsers } from '../services/userService';
import { setCrewMemberCaps, removeCrewFromMember } from '../services/adminService';
import { qtyAt, crewLocation } from '../types/inventory';
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
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers(setUsers, () => {});
    return () => unsub();
  }, []);

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
            <Text style={styles.label}>מלאי הצוות</Text>
            {crewStock.length === 0 ? (
              <Text style={styles.stockEmpty}>אין ציוד בצוות. משוך מהמחסן.</Text>
            ) : (
              crewStock.map((i) => (
                <View key={i.id} style={styles.stockRow}>
                  <Text style={styles.stockQty}>{qtyAt(i, crewLoc)}</Text>
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
          </View>
        }
        contentContainerStyle={styles.list}
      />
      {isManager && <FAB onPress={() => setAdding(true)} />}
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
  stockQty: { fontSize: 16, fontWeight: '700', color: Colors.primary, minWidth: 26, textAlign: 'center' },
});

