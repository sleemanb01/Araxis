import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, capsLabel } from '../types/user';
import { dialPhone, openWhatsapp } from '../utils/contact';
import { Colors } from '../constants/colors';

/** A crew member row: name + role label, with quick call/WhatsApp buttons and a
 *  tappable area (onPress) to open the member. Shared by the Crew and Profile
 *  screens. */
export function CrewMemberRow({
  member,
  onPress,
  subtitle,
}: {
  member: UserProfile;
  onPress: () => void;
  subtitle?: string; // defaults to the member's global caps label
}) {
  return (
    <View style={styles.row}>
      {!!member.phone && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, styles.call]}
            onPress={() => dialPhone(member.phone!)}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={15} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, styles.wa]}
            onPress={() => openWhatsapp(member.phone!)}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.info}>
          <Text style={styles.name}>{member.name || '(ללא שם)'}</Text>
          <Text style={styles.meta}>
            {subtitle ?? `${capsLabel(member.caps)} · ${member.teamId || 'ללא צוות'}`}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, alignItems: 'flex-end' },
  name: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  meta: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginEnd: 12 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  call: { backgroundColor: Colors.primary },
  wa: { backgroundColor: '#25D366' },
});
