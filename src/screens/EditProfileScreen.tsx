import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../components/CustomButton';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile, deleteUserDoc, uploadLogo } from '../services/userService';
import { signOutUser } from '../services/authService';
import { SERVICE_CATEGORIES } from '../constants/services';
import { DateStrip } from '../components/DateStrip';
import { HE_WEEKDAYS_SHORT, DEFAULT_WORKING_DAYS } from '../utils/availability';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { ProviderProfile } from '../types/user';

const THEME_COLORS = ['#2563EB', '#EF4444', '#F97316', '#22C55E', '#A855F7', '#0EA5E9'];

export function EditProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);

  const isProvider = profile?.role === 'provider';
  const p = isProvider ? (profile as ProviderProfile) : null;

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [location, setLocation] = useState(p?.location ?? '');
  const [services, setServices] = useState<string[]>(p?.services ?? []);
  const [themeColor, setThemeColor] = useState(p?.themeColor ?? THEME_COLORS[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>(p?.logoUrl ?? null);
  const [newLogoUri, setNewLogoUri] = useState<string | null>(null);
  const [instagram, setInstagram] = useState(p?.links?.instagram ?? '');
  const [facebook, setFacebook] = useState(p?.links?.facebook ?? '');
  const [tiktok, setTiktok] = useState(p?.links?.tiktok ?? '');
  const [whatsapp, setWhatsapp] = useState(p?.links?.whatsapp ?? '');
  const [workingDays, setWorkingDays] = useState<number[]>(p?.workingDays ?? DEFAULT_WORKING_DAYS);
  const [nextAvailable, setNextAvailable] = useState<string | null>(p?.nextAvailable ?? null);
  const [saving, setSaving] = useState(false);

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleWorkingDay(d: number) {
    setWorkingDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לתמונות.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setNewLogoUri(result.assets[0].uri);
      setLogoUrl(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!user || !profile) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם פרטי ושם משפחה.');
      return;
    }
    setSaving(true);
    try {
      const base = { firstName: firstName.trim(), lastName: lastName.trim() };

      if (isProvider) {
        if (!location.trim()) { Alert.alert('שגיאה', 'יש למלא מיקום.'); setSaving(false); return; }
        if (services.length === 0) { Alert.alert('שגיאה', 'יש לבחור לפחות שירות אחד.'); setSaving(false); return; }

        let finalLogoUrl = logoUrl;
        if (newLogoUri) finalLogoUrl = await uploadLogo(user.uid, newLogoUri);

        const links: Record<string, string> = {};
        if (instagram.trim()) links.instagram = instagram.trim();
        if (facebook.trim()) links.facebook = facebook.trim();
        if (tiktok.trim()) links.tiktok = tiktok.trim();
        if (whatsapp.trim()) links.whatsapp = whatsapp.trim();

        const updated: ProviderProfile = {
          ...(profile as ProviderProfile),
          ...base,
          location: location.trim(),
          services,
          themeColor,
          logoUrl: finalLogoUrl,
          links,
          workingDays,
          nextAvailable,
        };
        await updateProfile(user.uid, updated);
        setProfile(updated);
      } else {
        const updated = { ...profile, ...base };
        await updateProfile(user.uid, base);
        setProfile(updated);
      }
      navigation.goBack();
    } catch (e: any) {
      console.warn('[editProfile] save failed:', e);
      Alert.alert('שגיאה', 'שמירת השינויים נכשלה.');
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!user) return;
    Alert.alert(
      'מחיקת חשבון',
      'פעולה זו תמחק את החשבון שלך לצמיתות. אי אפשר לבטל. להמשיך?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק חשבון',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUserDoc(user.uid);
              await user.delete(); // remove the auth account → routes to login
            } catch (e: any) {
              if (e?.code === 'auth/requires-recent-login') {
                Alert.alert('נדרשת התחברות מחדש', 'התנתק והתחבר שוב כדי למחוק את החשבון.');
                await signOutUser();
              } else {
                console.warn('[deleteAccount] failed:', e);
                Alert.alert('שגיאה', 'מחיקת החשבון נכשלה. נסה שוב.');
              }
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isProvider && (
          <>
            <Text style={styles.label}>לוגו</Text>
            <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoPreview} />
              ) : (
                <Text style={styles.logoPlaceholder}>+ בחר לוגו</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <Field label="שם פרטי" value={firstName} onChange={setFirstName} />
        <Field label="שם משפחה" value={lastName} onChange={setLastName} />

        {isProvider && (
          <>
            <Field label="מיקום" value={location} onChange={setLocation} />

            <Text style={styles.label}>השירותים שאני מספק</Text>
            <View style={styles.chipRow}>
              {SERVICE_CATEGORIES.map((s) => {
                const selected = services.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, selected && { backgroundColor: themeColor, borderColor: themeColor }]}
                    onPress={() => toggleService(s)}
                  >
                    <Text style={[styles.chipText, selected && { color: '#FFF' }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>צבע ערכת נושא</Text>
            <View style={styles.swatchRow}>
              {THEME_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.swatch, { backgroundColor: c }, themeColor === c && styles.swatchSelected]}
                  onPress={() => setThemeColor(c)}
                />
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 8 }]}>קישורים (לא חובה)</Text>
            <Field label="אינסטגרם" value={instagram} onChange={setInstagram} placeholder="@username או קישור" />
            <Field label="פייסבוק" value={facebook} onChange={setFacebook} placeholder="@username או קישור" />
            <Field label="טיקטוק" value={tiktok} onChange={setTiktok} placeholder="@username או קישור" />
            <Field label="וואטסאפ" value={whatsapp} onChange={setWhatsapp} placeholder="מספר טלפון" />

            <Text style={[styles.label, { marginTop: 8 }]}>ימי עבודה</Text>
            <View style={styles.daysRow}>
              {HE_WEEKDAYS_SHORT.map((w, idx) => {
                const on = workingDays.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.dayChip, on && { backgroundColor: themeColor, borderColor: themeColor }]}
                    onPress={() => toggleWorkingDay(idx)}
                  >
                    <Text style={[styles.dayChipText, on && { color: '#FFF' }]}>{w}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.nextAvailRow}>
              <Text style={styles.label}>התור הפנוי הבא</Text>
              {nextAvailable && (
                <TouchableOpacity onPress={() => setNextAvailable(null)}>
                  <Text style={[styles.autoLink, { color: themeColor }]}>אוטומטי</Text>
                </TouchableOpacity>
              )}
            </View>
            <DateStrip value={nextAvailable} onChange={setNextAvailable} workingDays={workingDays} />
            <View style={{ height: 16 }} />
          </>
        )}

        <CustomButton
          label="שמור שינויים"
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 16, backgroundColor: isProvider ? themeColor : Colors.primary }}
        />

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>מחק חשבון</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'right', marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1,
    borderColor: Colors.border, padding: 12, fontSize: 15, color: Colors.textPrimary,
  },
  logoPicker: {
    alignSelf: 'center', width: 100, height: 100, borderRadius: 16, borderWidth: 2,
    borderStyle: 'dashed', borderColor: Colors.border, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden',
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 16,
  },
  chip: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.surface,
  },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  daysRow: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginBottom: 16 },
  dayChip: {
    width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  nextAvailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  autoLink: { fontSize: 13, fontWeight: '600' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end', marginBottom: 8 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: Colors.textPrimary },
  deleteBtn: {
    marginTop: 28, paddingVertical: 14, alignItems: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: Colors.danger,
  },
  deleteText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
});
