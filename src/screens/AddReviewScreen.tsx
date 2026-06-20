import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StarRating } from '../components/StarRating';
import { CustomButton } from '../components/CustomButton';
import { useAuthStore } from '../store/useAuthStore';
import { addReview } from '../services/reviewService';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'AddReview'>;

export function AddReviewScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { providerId, providerName } = route.params;
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (rating < 1) {
      Alert.alert('שגיאה', 'יש לבחור דירוג של כוכב אחד לפחות.');
      return;
    }
    setSaving(true);
    try {
      const customerName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : 'לקוח';
      await addReview(providerId, {
        customerId: user.uid,
        customerName,
        rating,
      });
      navigation.goBack();
    } catch (e: any) {
      console.warn('[addRating] failed:', e);
      Alert.alert('שגיאה', 'שליחת הדירוג נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>דירוג {providerName}</Text>

        <Text style={styles.label}>הדירוג שלך</Text>
        <View style={styles.starsWrap}>
          <StarRating rating={rating} size={44} editable onChange={setRating} />
        </View>

        <CustomButton
          label="שלח דירוג"
          onPress={handleSubmit}
          loading={saving}
          disabled={rating < 1}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'right', marginBottom: 20,
  },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'right', marginBottom: 8,
  },
  starsWrap: { alignItems: 'center', marginBottom: 20 },
});
