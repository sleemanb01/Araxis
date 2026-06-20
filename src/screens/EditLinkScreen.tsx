import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile } from '../services/userService';
import { SOCIAL_META, socialUrl } from '../utils/social';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';
import type { ProviderProfile, SocialLinks } from '../types/user';

type RouteP = RouteProp<RootStackParamList, 'EditLink'>;

export function EditLinkScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { platform } = route.params;
  const meta = SOCIAL_META[platform];

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const p = profile?.role === 'provider' ? (profile as ProviderProfile) : null;

  const [value, setValue] = useState(p?.links?.[platform] ?? '');
  const [saving, setSaving] = useState(false);

  const preview = socialUrl(platform, value);

  function openPreview() {
    if (preview) Linking.openURL(preview);
  }

  async function handleSave() {
    if (!user || !p) return;
    setSaving(true);
    try {
      const links: SocialLinks = { ...(p.links ?? {}) };
      if (value.trim()) links[platform] = value.trim();
      else delete links[platform];

      const updated: ProviderProfile = { ...p, links };
      await updateProfile(user.uid, { links });
      setProfile(updated);
      navigation.goBack();
    } catch (e: any) {
      console.warn('[editLink] failed:', e);
      Alert.alert('שגיאה', 'שמירת הקישור נכשלה.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: meta.color }]}>
          <FontAwesome5 name={meta.icon} size={34} color="#FFFFFF" brand />
        </View>
        <Text style={styles.title}>{meta.label}</Text>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={meta.placeholder}
          placeholderTextColor={Colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={platform === 'whatsapp' ? 'phone-pad' : 'default'}
          textAlign="right"
          autoFocus
        />

        {/* Live URL preview + verify */}
        {preview ? (
          <TouchableOpacity style={styles.previewRow} onPress={openPreview}>
            <Text style={styles.previewOpen}>פתח לבדיקה ↗</Text>
            <Text style={styles.previewUrl} numberOfLines={1}>{preview}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hint}>הזן שם משתמש כדי לראות תצוגה מקדימה של הקישור</Text>
        )}

        <Text style={styles.tip}>
          לחץ "פתח לבדיקה" כדי לוודא שהקישור מוביל לפרופיל הנכון לפני השמירה.
        </Text>

        <CustomButton
          label="שמור"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 20, backgroundColor: meta.color }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Layout.screenPadding * 1.5, alignItems: 'center' },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24 },
  input: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 14, fontSize: 16, color: Colors.textPrimary,
  },
  previewRow: {
    width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingHorizontal: 4,
  },
  previewUrl: { flex: 1, fontSize: 13, color: Colors.textSecondary, textAlign: 'left' },
  previewOpen: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginStart: 8 },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: 12, textAlign: 'center' },
  tip: {
    fontSize: 12, color: Colors.textSecondary, marginTop: 16,
    textAlign: 'center', lineHeight: 18,
  },
});
