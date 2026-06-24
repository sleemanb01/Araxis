import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { useUser } from '../context/UserContext';
import { UserRole } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ROLE_HE: Record<UserRole, string> = {
  admin: 'מנהל',
  lead_tech: 'טכנאי ראשי',
  junior_tech: 'טכנאי',
};

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, user, role, signOut } = useUser();
  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{ROLE_HE[profile.role]}</Text>

        <View style={styles.card}>
          <Row label="צוות" value={profile.teamId} />
          <Row label="טלפון" value={user?.phoneNumber ?? '—'} />
        </View>

        {role === 'admin' && (
          <CustomButton
            label="ניהול צוות"
            variant="secondary"
            onPress={() => navigation.navigate('Crew')}
            style={styles.btnSecondary}
          />
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
  btnSecondary: { alignSelf: 'stretch', marginTop: 24 },
  btn: { alignSelf: 'stretch', marginTop: 12 },
});
