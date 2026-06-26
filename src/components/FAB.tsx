import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface Props {
  onPress: () => void;
  label?: string;
}

/** Floating action button, bottom-trailing (RTL-aware), safe-area inset. */
export function FAB({ onPress, label = '+' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: Math.max(insets.bottom, 16) + 16 }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.icon}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    end: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },
});
