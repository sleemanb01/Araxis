import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  rating: number;            // current value (fractional ok for display)
  size?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  color?: string;
}

const STAR_COLOR = '#F59E0B';

export function StarRating({ rating, size = 20, editable = false, onChange, color = STAR_COLOR }: Props) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.row}>
      {stars.map((i) => {
        const filled = i <= Math.round(rating);
        const star = (
          <Text style={{ fontSize: size, color: filled ? color : '#D1D5DB' }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        return editable ? (
          <TouchableOpacity key={i} onPress={() => onChange?.(i)} hitSlop={6}>
            {star}
          </TouchableOpacity>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});
