import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import type { RegisterStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RegisterStackParamList, 'RoleSelect'>;

export function RoleSelectScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>ברוכים הבאים</Text>
        <Text style={styles.subtitle}>בחר את סוג החשבון שלך</Text>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ProviderRegister')}
        >
          <Text style={styles.cardIcon}>🔧</Text>
          <Text style={styles.cardTitle}>נותן שירות</Text>
          <Text style={styles.cardDesc}>
            טכנאי או עסק — ניהול קריאות, מלאי ולקוחות
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CustomerRegister')}
        >
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>לקוח</Text>
          <Text style={styles.cardDesc}>
            הזמנת שירות ומעקב אחר קריאות
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Layout.screenPadding * 1.5, justifyContent: 'center' },
  title: {
    fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: {
    fontSize: 16, color: Colors.textSecondary, textAlign: 'center', marginBottom: 36,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardBorderRadius,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardIcon: { fontSize: 40, marginBottom: 10 },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
