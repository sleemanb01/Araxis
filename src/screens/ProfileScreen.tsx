import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { useAuthStore } from '../store/useAuthStore';
import { signOutUser } from '../services/authService';
import { subscribeToReviews, summarize } from '../services/reviewService';
import { StarRating } from '../components/StarRating';
import { Review } from '../types/review';
import { SOCIAL_PLATFORMS, SOCIAL_META, socialUrl, SocialPlatform } from '../utils/social';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function SocialLogo({
  platform, value, onAdd,
}: { platform: SocialPlatform; value?: string; onAdd: () => void }) {
  const meta = SOCIAL_META[platform];
  const url = socialUrl(platform, value);

  if (url) {
    return (
      <TouchableOpacity
        style={[styles.logoBtn, { backgroundColor: meta.color }]}
        onPress={() => Linking.openURL(url)}
      >
        <FontAwesome5 name={meta.icon} size={22} color="#FFFFFF" brand />
      </TouchableOpacity>
    );
  }
  // No link yet — muted icon with a + badge to add it.
  return (
    <TouchableOpacity style={[styles.logoBtn, styles.logoEmpty]} onPress={onAdd}>
      <FontAwesome5 name={meta.icon} size={22} color={Colors.textSecondary} brand />
      <View style={styles.plusBadge}>
        <Text style={styles.plusText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

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
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Text style={[styles.editLink, { color: accent }]}>ערוך</Text>
          </TouchableOpacity>
          <Text style={styles.title}>פרופיל</Text>
        </View>

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

        {/* Call button (instead of showing the raw number) */}
        {!!user?.phoneNumber && (
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: accent }]}
            onPress={() => Linking.openURL(`tel:${user.phoneNumber}`)}
          >
            <Text style={styles.callBtnText}>📞 התקשר</Text>
          </TouchableOpacity>
        )}

        {/* Social links — brand logos; "+" badge when missing */}
        {isProvider && (
          <View style={styles.socialRow}>
            {SOCIAL_PLATFORMS.map((pf) => (
              <SocialLogo
                key={pf}
                platform={pf}
                value={profile.links?.[pf]}
                onAdd={() => navigation.navigate('EditLink', { platform: pf })}
              />
            ))}
          </View>
        )}

        {/* Services offered */}
        {isProvider && profile.services?.length > 0 && (
          <View style={styles.serviceChips}>
            {profile.services.map((s) => (
              <View key={s} style={[styles.serviceChip, { borderColor: accent }]}>
                <Text style={[styles.serviceChipText, { color: accent }]}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Provider rating */}
        {isProvider && (
          <View style={styles.ratingBox}>
            <StarRating rating={avg} size={26} />
            <Text style={styles.ratingText}>
              {count > 0 ? `${avg.toFixed(1)} (${count} דירוגים)` : 'אין דירוגים עדיין'}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

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
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingHorizontal: Layout.screenPadding, paddingTop: 10, paddingBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  editLink: { fontSize: 15, fontWeight: '700' },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 12 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  role: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  location: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 28, borderRadius: 22, marginBottom: 14,
  },
  callBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  socialRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  logoBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  plusBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },
  plusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  serviceChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', paddingHorizontal: Layout.screenPadding, marginBottom: 14,
  },
  serviceChip: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4,
  },
  serviceChipText: { fontSize: 12, fontWeight: '600' },
  ratingBox: { alignItems: 'center', gap: 4, marginBottom: 8 },
  ratingText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border, width: '100%', marginVertical: 12 },
  logoutBtn: {
    marginTop: 32, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.danger,
  },
  logoutText: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
});
