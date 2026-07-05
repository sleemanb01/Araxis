import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface Props {
  onPress: () => void;
  label?: string;
  /** Extra bottom clearance, e.g. the tab-bar height on tab screens. */
  bottomOffset?: number;
}

/** Floating action button, bottom-right, safe-area aware. On tab screens the
 *  tab bar already covers the safe area, so only a small gap above it is added. */
export function FAB({ onPress, label = '+', bottomOffset = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = bottomOffset > 0 ? bottomOffset + 12 : Math.max(insets.bottom, 16) + 16;
  return (
    <TouchableOpacity
      style={[styles.fab, { bottom }]}
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
    right: 20, // physical right-bottom corner (RTL-independent)
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
