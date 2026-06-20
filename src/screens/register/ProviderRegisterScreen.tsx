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
import * as ImagePicker from 'expo-image-picker';
import { CustomButton } from '../../components/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';
import { createProfile, uploadLogo } from '../../services/userService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

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
  const [saving, setSaving] = useState(false);

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
      const profile = {
        uid: user.uid,
        phone: user.phoneNumber ?? '',
        role: 'provider' as const,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        location: location.trim(),
        logoUrl,
        themeColor,
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
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'right', marginBottom: 20,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'right', marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
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
});
