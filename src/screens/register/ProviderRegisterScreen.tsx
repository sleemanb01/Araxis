import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField as Field } from '../../components/TextField';
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../../components/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';
import { createProfile, uploadLogo } from '../../services/userService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { SERVICE_CATEGORIES } from '../../constants/services';

const THEME_COLORS = ['#2563EB', '#EF4444', '#F97316', '#22C55E', '#A855F7', '#0EA5E9'];

export function ProviderRegisterScreen() {
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setProfileLoaded = useAuthStore((s) => s.setProfileLoaded);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0]);
  const [services, setServices] = useState<string[]>([]);
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);

  function toggleService(s: string) {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function pickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('הרשאה נדרשת', 'יש לאשר גישה לתמונות כדי לבחור לוגו.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  }

  function validate(): string | null {
    if (!firstName.trim() || !lastName.trim()) return 'יש למלא שם פרטי ושם משפחה.';
    if (!location.trim()) return 'יש למלא מיקום.';
    if (services.length === 0) return 'יש לבחור לפחות שירות אחד.';
    if (!logoUri) return 'יש לבחור לוגו לעסק.';
    return null;
  }

  async function handleSubmit() {
    if (!user) return;
    const err = validate();
    if (err) {
      Alert.alert('שגיאה', err);
      return;
    }
    setSaving(true);
    try {
      const logoUrl = await uploadLogo(user.uid, logoUri!);
      const links: { instagram?: string; facebook?: string; tiktok?: string; whatsapp?: string } = {};
      if (instagram.trim()) links.instagram = instagram.trim();
      if (facebook.trim()) links.facebook = facebook.trim();
      if (tiktok.trim()) links.tiktok = tiktok.trim();
      if (whatsapp.trim()) links.whatsapp = whatsapp.trim();

      const profile = {
        uid: user.uid,
        phone: user.phoneNumber ?? '',
        role: 'provider' as const,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        location: location.trim(),
        logoUrl,
        themeColor,
        services,
        links,
        createdAt: new Date().toISOString(),
      };
      await createProfile(profile);
      // Switch to the main app immediately (don't depend on the listener).
      setProfile(profile);
      setProfileLoaded(true);
    } catch (e: any) {
      console.warn('[register provider] failed:', e);
      Alert.alert('שגיאה', 'שמירת הפרופיל נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>פרטי נותן שירות</Text>

        {/* Logo */}
        <Text style={styles.label}>לוגו העסק</Text>
        <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoPreview} />
          ) : (
            <Text style={styles.logoPlaceholder}>+ בחר לוגו</Text>
          )}
        </TouchableOpacity>

        <Field label="שם פרטי" value={firstName} onChange={setFirstName} placeholder="ישראל" />
        <Field label="שם משפחה" value={lastName} onChange={setLastName} placeholder="ישראלי" />
        <Field label="מיקום" value={location} onChange={setLocation} placeholder="תל אביב" />

        {/* Services offered */}
        <Text style={styles.label}>השירותים שאני מספק</Text>
        <View style={styles.chipRow}>
          {SERVICE_CATEGORIES.map((s) => {
            const selected = services.includes(s);
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  selected && { backgroundColor: themeColor, borderColor: themeColor },
                ]}
                onPress={() => toggleService(s)}
              >
                <Text style={[styles.chipText, selected && { color: '#FFF' }]}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Theme */}
        <Text style={styles.label}>צבע ערכת נושא</Text>
        <View style={styles.swatchRow}>
          {THEME_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.swatch,
                { backgroundColor: c },
                themeColor === c && styles.swatchSelected,
              ]}
              onPress={() => setThemeColor(c)}
            />
          ))}
        </View>

        {/* Social links (optional) */}
        <Text style={[styles.label, { marginTop: 8 }]}>קישורים (לא חובה)</Text>
        <Field label="אינסטגרם" value={instagram} onChange={setInstagram} placeholder="@username או קישור" />
        <Field label="פייסבוק" value={facebook} onChange={setFacebook} placeholder="@username או קישור" />
        <Field label="טיקטוק" value={tiktok} onChange={setTiktok} placeholder="@username או קישור" />
        <Field label="וואטסאפ" value={whatsapp} onChange={setWhatsapp} placeholder="מספר טלפון" />

        <CustomButton
          label="סיום הרשמה"
          onPress={handleSubmit}
          loading={saving}
          style={{ marginTop: 16, backgroundColor: themeColor }}
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
    textAlign: 'right', marginBottom: 6,
  },
  logoPicker: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  logoPreview: { width: '100%', height: '100%' },
  logoPlaceholder: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
