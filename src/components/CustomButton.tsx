import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../constants/colors';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: Colors.primary },
    text:      { color: '#FFFFFF' },
  },
  secondary: {
    container: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.primary },
    text:      { color: Colors.primary },
  },
  danger: {
    container: { backgroundColor: Colors.danger },
    text:      { color: '#FFFFFF' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text:      { color: Colors.primary },
  },
};

export function CustomButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: Props) {
  const vs = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[styles.base, vs.container, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={vs.text.color as string} />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, vs.text, textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  disabled: {
    opacity: 0.45,
  },
});
