import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { CrewMemberRow } from '../components/CrewMemberRow';
import { useUser } from '../context/UserContext';
import { subscribeToUsers } from '../services/userService';
import { UserProfile, capsLabel } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, user, caps, signOut } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!caps.manageCrew) return;
    const unsub = subscribeToUsers(setUsers, () => {});
    return () => unsub();
  }, [caps.manageCrew]);

  if (!profile) return null;

  const crewIds = profile.crew ?? [];
  const crew = users.filter((u) => crewIds.includes(u.uid));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{capsLabel(caps)}</Text>

        <View style={styles.card}>
          <Row label="צוות" value={profile.teamId} />
          <Row label="טלפון" value={user?.phoneNumber ?? '—'} />
        </View>

        {caps.manageCrew && (
          <View style={styles.crewSection}>
            <View style={styles.crewHeader}>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('Crew', { add: true })}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addText}>הוסף</Text>
              </TouchableOpacity>
              <Text style={styles.crewTitle}>הצוות שלי</Text>
            </View>
            <FlatList
              data={crew}
              keyExtractor={(u) => u.uid}
              renderItem={({ item }) => (
                <CrewMemberRow
                  member={item}
                  onPress={() => navigation.navigate('Crew', { openUid: item.uid })}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.crewEmpty}>אין חברי צוות עדיין. הוסף עם הכפתור.</Text>
              }
              style={styles.crewList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        <CustomButton label="התנתק" variant="danger" onPress={signOut} style={styles.btn} />
      </View>
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
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#FFFFFF' },
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
  crewEmpty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  btn: { alignSelf: 'stretch', marginTop: 12 },
});
