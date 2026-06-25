import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { FAB } from '../components/FAB';
import { subscribeToUsers, findUserByPhone } from '../services/userService';
import { provisionUser } from '../services/adminService';
import { toE164 } from '../services/authService';
import { UserProfile, UserRole } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const ROLES: { key: UserRole; label: string }[] = [
  { key: 'admin', label: 'מנהל' },
  { key: 'lead_tech', label: 'טכנאי ראשי' },
  { key: 'junior_tech', label: 'טכנאי' },
];

const roleLabel = (r: UserRole) => ROLES.find((x) => x.key === r)?.label ?? r;

export function CrewScreen() {
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

  if (editing) return <CrewEditor user={editing} onDone={() => setEditing(null)} />;
  if (adding) {
    return (
      <AddCrewForm
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
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.uid}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => setEditing(item)} activeOpacity={0.8}>
              <Text style={styles.chev}>‹</Text>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name || '(ללא שם)'}</Text>
                <Text style={styles.meta}>
                  {roleLabel(item.role)} · {item.teamId || 'ללא צוות'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={<Text style={styles.title}>ניהול צוות</Text>}
          ListEmptyComponent={<Text style={styles.empty}>אין משתמשים עדיין.</Text>}
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

  async function search() {
    if (phone.replace(/\D/g, '').length < 9) {
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
        {error && <Text style={styles.err}>{error}</Text>}
        <CustomButton label="חפש ושייך" onPress={search} loading={searching} style={styles.btn} />
        <CustomButton label="ביטול" variant="ghost" onPress={onCancel} />
      </View>
    </SafeAreaView>
  );
}

function CrewEditor({ user, onDone }: { user: UserProfile; onDone: () => void }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [teamId, setTeamId] = useState(user.teamId || 'team_main');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await provisionUser({
        uid: user.uid,
        role,
        teamId: teamId.trim() || 'team_main',
        name: user.name,
      });
      Alert.alert('נשמר', `${user.name || user.uid} עודכן ל-${roleLabel(role)}.`);
      onDone();
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'העדכון נכשל (ודא שפונקציית הענן פרוסה).');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.editor}>
        <Text style={styles.title}>{user.name || user.phone || user.uid}</Text>
        {!!user.phone && <Text style={styles.hint}>{user.phone}</Text>}
        <Text style={styles.label}>תפקיד</Text>
        <View style={styles.roleRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.key}
              style={[styles.roleChip, role === r.key && styles.roleChipActive]}
              onPress={() => setRole(r.key)}
            >
              <Text style={[styles.roleText, role === r.key && styles.roleTextActive]}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextField label="צוות" value={teamId} onChange={setTeamId} placeholder="team_main" />
        <CustomButton label="שמור" onPress={save} loading={saving} style={styles.btn} />
        <CustomButton label="ביטול" variant="ghost" onPress={onDone} />
      </View>
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
  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 18, justifyContent: 'flex-end' },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  roleText: { fontSize: 14, color: Colors.textPrimary },
  roleTextActive: { color: '#FFFFFF', fontWeight: '600' },
  btn: { marginTop: 8, marginBottom: 8 },
});
