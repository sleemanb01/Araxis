import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { useAuthStore } from '../store/useAuthStore';
import { signOutUser } from '../services/authService';

// Placeholder — will connect to auth store in next phase
const MOCK_USER = {
  name: 'יעקב טכנאי',
  email: 'yaakov@araxis.co.il',
  role: 'טכנאי שטח',
  techId: 'tech_1',
};

export function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>פרופיל</Text>

        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {MOCK_USER.name.charAt(0)}
          </Text>
        </View>

        <Text style={styles.name}>{MOCK_USER.name}</Text>
        <Text style={styles.role}>{MOCK_USER.role}</Text>
        <Text style={styles.email}>{user?.phoneNumber ?? MOCK_USER.email}</Text>

        <View style={styles.divider} />

        {/* Placeholder settings rows */}
        <SettingsRow label="שפה" value="עברית (RTL)" />
        <SettingsRow label="גרסה" value="1.0.0" />

        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOutUser()}>
          <Text style={styles.logoutText}>התנתק</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={settingStyles.row}>
      <Text style={settingStyles.value}>{value}</Text>
      <Text style={settingStyles.label}>{label}</Text>
    </View>
  );
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Layout.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  label: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  value: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    alignSelf: 'flex-end',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
    paddingBottom: 20,
    width: '100%',
    textAlign: 'right',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    width: '100%',
    marginBottom: 4,
  },
  logoutBtn: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  logoutText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '600',
  },
});
