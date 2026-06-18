import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Props {
  onPress: () => void;
  label?: string;
}

export function FAB({ onPress, label = '+' }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { bottom: Math.max(insets.bottom, Layout.fabBottom) + Layout.tabBarHeight },
      ]}
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
    end: Layout.fabEnd,
    width: Layout.fabSize,
    height: Layout.fabSize,
    borderRadius: Layout.fabSize / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    fontSize: 28,
    color: '#FFFFFF',
    lineHeight: 32,
  },
});
