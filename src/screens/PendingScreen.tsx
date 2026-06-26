import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../components/CustomButton';
import { useUser } from '../context/UserContext';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/** Signed in but not yet provisioned by an admin (no role/profile). */
export function PendingScreen() {
  const { signOut } = useUser();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Ionicons name="time-outline" size={64} color={Colors.primary} />
        <Text style={styles.title}>החשבון ממתין לאישור</Text>
        <Text style={styles.body}>
          נרשמת בהצלחה. מנהל המערכת צריך לשייך אותך לצוות לפני שתוכל להתחיל.
          נסה שוב מאוחר יותר.
        </Text>
        <CustomButton label="התנתק" variant="ghost" onPress={signOut} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.screenPadding * 1.5,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  body: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: { marginTop: 8 },
});
