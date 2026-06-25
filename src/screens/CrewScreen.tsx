import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { FAB } from '../components/FAB';
import { useUser } from '../context/UserContext';
import {
  subscribeToUsers,
  findUserByPhone,
  addCrewMember,
  removeCrewMember,
} from '../services/userService';
import { setUserCaps } from '../services/adminService';
import { toE164 } from '../services/authService';
import {
  UserProfile,
  Capabilities,
  CAP_KEYS,
  CAP_LABELS_HE,
  NO_CAPS,
  capsLabel,
} from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export function CrewScreen() {
  const { user: me, profile } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers(
      (u) => {
        setUsers(u);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // My crew roster: the users whose uid is in my `crew` array.
  const crewIds = profile?.crew ?? [];
  const crew = users.filter((u) => crewIds.includes(u.uid));

  async function addFound(u: UserProfile) {
    if (!me) return;
    try {
      await addCrewMember(me.uid, u.uid); // adds u.uid to my crew array
      setAdding(false);
      setEditing(u); // open editor to set their capabilities
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'הוספה לצוות נכשלה.');
    }
  }

  if (editing) return <CrewEditor user={editing} onDone={() => setEditing(null)} />;
  if (adding) {
    return <AddCrewForm onFound={addFound} onCancel={() => setAdding(false)} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={crew}
          keyExtractor={(u) => u.uid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => setEditing(item)} activeOpacity={0.8}>
              <Text style={styles.chev}>‹</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name || '(ללא שם)'}</Text>
                <Text style={styles.meta}>
                  {capsLabel(item.caps)} · {item.teamId || 'ללא צוות'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={<Text style={styles.title}>הצוות שלי</Text>}
          ListEmptyComponent={
            <Text style={styles.empty}>אין חברי צוות עדיין. הוסף עם הכפתור +.</Text>
          }
          contentContainerStyle={styles.list}
        />
      )}
      <FAB onPress={() => setAdding(true)} />
    </SafeAreaView>
  );
}

function AddCrewForm({
  onFound,
  onCancel,
}: {
  onFound: (u: UserProfile) => void;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live E.164 preview so the manager can type a local number (0501234567)
  // and see exactly what we'll look up (+972501234567).
  const hasEnoughDigits = phone.replace(/\D/g, '').length >= 9;
  const normalized = hasEnoughDigits ? toE164(phone.trim()) : null;

  async function search() {
    if (!hasEnoughDigits) {
      setError('מספר טלפון לא תקין');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const u = await findUserByPhone(toE164(phone.trim()));
      if (u) onFound(u);
      else setError('לא נמצא משתמש עם מספר זה. בקש ממנו להיכנס לאפליקציה ולהזין שם תחילה.');
    } catch {
      setError('החיפוש נכשל. נסה שוב.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.editor}>
        <Text style={styles.title}>הוספת חבר צוות</Text>
        <Text style={styles.hint}>
          הזן את מספר הטלפון של איש הצוות. אם הוא כבר נכנס לאפליקציה — נשלוף את פרטיו אוטומטית.
        </Text>
        <TextField
          label="מספר טלפון"
          value={phone}
          onChange={setPhone}
          placeholder="050-0000000"
          keyboardType="phone-pad"
        />
        {normalized && <Text style={styles.preview}>יחפש לפי: {normalized}</Text>}
        {error && <Text style={styles.err}>{error}</Text>}
        <CustomButton label="חפש ושייך" onPress={search} loading={searching} style={styles.btn} />
        <CustomButton label="ביטול" variant="ghost" onPress={onCancel} />
      </View>
    </SafeAreaView>
  );
}

function CrewEditor({ user, onDone }: { user: UserProfile; onDone: () => void }) {
  const { user: me } = useUser();
  const isSelf = me?.uid === user.uid;
  const [caps, setCaps] = useState<Capabilities>(user.caps ?? NO_CAPS);
  const [teamId, setTeamId] = useState(user.teamId || 'team_main');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  function toggle(k: keyof Capabilities) {
    setCaps((c) => ({ ...c, [k]: !c[k] }));
  }

  function confirmRemove() {
    Alert.alert(
      'הסרה מהצוות',
      `להסיר את ${user.name || user.phone || user.uid} מהצוות שלך? הוא יוסר מהרשימה בלבד — המשתמש לא יימחק.`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: remove },
      ]
    );
  }

  async function remove() {
    if (!me) return;
    setRemoving(true);
    try {
      await removeCrewMember(me.uid, user.uid); // pull uid from my crew array only
      Alert.alert('הוסר', `${user.name || user.uid} הוסר מהצוות שלך.`);
      onDone();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'ההסרה נכשלה.');
      setRemoving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await setUserCaps({
        uid: user.uid,
        caps,
        teamId: teamId.trim() || 'team_main',
        name: user.name,
      });
      Alert.alert('נשמר', `ההרשאות של ${user.name || user.uid} עודכנו.`);
      onDone();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'העדכון נכשל (ודא שפונקציית הענן פרוסה).');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.editor}>
        <Text style={styles.title}>{user.name || user.phone || user.uid}</Text>
        {!!user.phone && <Text style={styles.hint}>{user.phone}</Text>}
        <Text style={styles.label}>הרשאות</Text>
        {CAP_KEYS.map((k) => (
          <View key={k} style={styles.capRow}>
            <Switch
              value={caps[k]}
              onValueChange={() => toggle(k)}
              disabled={isSelf && k === 'manageCrew'}
            />
            <Text style={styles.capLabel}>{CAP_LABELS_HE[k]}</Text>
          </View>
        ))}
        {isSelf && <Text style={styles.hint}>אינך יכול לבטל לעצמך את הרשאת ניהול הצוות.</Text>}
        <TextField label="צוות" value={teamId} onChange={setTeamId} placeholder="team_main" />
        <CustomButton label="שמור" onPress={save} loading={saving} style={styles.btn} />
        <CustomButton label="ביטול" variant="ghost" onPress={onDone} />
        {!isSelf && (
          <CustomButton
            label="הסר מהצוות"
            variant="danger"
            onPress={confirmRemove}
            loading={removing}
            style={styles.removeBtn}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding, paddingBottom: 96 },
  editor: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  err: { fontSize: 13, color: Colors.danger, textAlign: 'right', marginBottom: 10 },
  preview: { fontSize: 13, color: Colors.primary, textAlign: 'right', writingDirection: 'ltr', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  rowInfo: { flex: 1, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  meta: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  chev: { fontSize: 24, color: Colors.textSecondary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
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
  btn: { marginTop: 12, marginBottom: 8 },
  removeBtn: { marginTop: 24 },
});
