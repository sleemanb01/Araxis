import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { useAuthStore } from '../store/useAuthStore';
import { signOutUser } from '../services/authService';
import { subscribeToReviews, summarize } from '../services/reviewService';
import { StarRating } from '../components/StarRating';
import { Review } from '../types/review';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const isProvider = profile?.role === 'provider';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  const accent = isProvider ? profile.themeColor : Colors.primary;

  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (!isProvider || !user) return;
    const unsub = subscribeToReviews(user.uid, setReviews);
    return unsub;
  }, [isProvider, user]);

  const { avg, count } = summarize(reviews);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>פרופיל</Text>

        {/* Avatar / logo */}
        {isProvider && profile.logoUrl ? (
          <Image source={{ uri: profile.logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.avatarCircle, { backgroundColor: accent }]}>
            <Text style={styles.avatarText}>{fullName.charAt(0) || '?'}</Text>
          </View>
        )}

        <Text style={styles.name}>{fullName || 'משתמש'}</Text>
        <Text style={[styles.role, { color: accent }]}>
          {isProvider ? 'נותן שירות' : 'לקוח'}
        </Text>
        {isProvider && !!profile.location && (
          <Text style={styles.location}>{profile.location}</Text>
        )}
        <Text style={styles.phone}>{user?.phoneNumber ?? ''}</Text>

        {/* Provider rating */}
        {isProvider && (
          <View style={styles.ratingBox}>
            <StarRating rating={avg} size={24} />
            <Text style={styles.ratingText}>
              {count > 0 ? `${avg.toFixed(1)} (${count} ביקורות)` : 'אין ביקורות עדיין'}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Reviews list (providers) */}
        {isProvider && (
          <View style={styles.reviews}>
            <View style={styles.reviewsHeader}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AddReview', {
                    providerId: user!.uid,
                    providerName: fullName,
                  })
                }
              >
                <Text style={[styles.addReview, { color: accent }]}>+ הוסף ביקורת</Text>
              </TouchableOpacity>
              <Text style={styles.reviewsTitle}>ביקורות</Text>
            </View>

            {reviews.length === 0 ? (
              <Text style={styles.empty}>עדיין אין ביקורות</Text>
            ) : (
              reviews.map((r) => (
                <View key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewTop}>
                    <StarRating rating={r.rating} size={14} />
                    <Text style={styles.reviewer}>{r.customerName}</Text>
                  </View>
                  {!!r.comment && <Text style={styles.comment}>{r.comment}</Text>}
                </View>
              ))
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOutUser()}>
          <Text style={styles.logoutText}>התנתק</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { alignItems: 'center', paddingBottom: Layout.tabBarHeight + 24 },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    paddingHorizontal: Layout.screenPadding, paddingTop: 10, paddingBottom: 20,
    width: '100%', textAlign: 'right',
  },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 12 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  role: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  location: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  phone: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
  ratingBox: { alignItems: 'center', gap: 4, marginBottom: 8 },
  ratingText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: 12 },
  reviews: { width: '100%', paddingHorizontal: Layout.screenPadding },
  reviewsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  reviewsTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  addReview: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  reviewCard: {
    backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  reviewTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  reviewer: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  comment: { fontSize: 14, color: Colors.textPrimary, textAlign: 'right', lineHeight: 19 },
  logoutBtn: {
    marginTop: 32, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.danger,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
