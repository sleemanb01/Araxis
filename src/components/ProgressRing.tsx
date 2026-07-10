import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  size: number;
  strokeWidth: number;
  /** 0..1 (clamped). */
  progress: number;
  color: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/** A circular progress ring (arc starts at 12 o'clock, sweeps clockwise). */
export function ProgressRing({ size, strokeWidth, progress, color, trackColor = '#E5E7EB', children }: Props) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const offset = circ * (1 - p);
  const c = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${c} ${c})`}
        />
      </Svg>
      <View style={{ alignItems: 'center', paddingHorizontal: strokeWidth }}>{children}</View>
    </View>
  );
}
