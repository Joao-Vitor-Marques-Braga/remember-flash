import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export function ThemedTextInput(props: TextInputProps) {
  const textColor = useThemeColor({}, 'text');
  const placeholder = props.placeholderTextColor ?? withOpacity(textColor, 0.5);
  return (
    <TextInput
      {...props}
      placeholderTextColor={placeholder}
      style={[{ color: textColor }, props.style]}
    />
  );
}

function withOpacity(hex: string, opacity: number): string {
  // Accepts #RGB, #RRGGBB, or already rgba/hex-a
  if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex;
  const c = hex.replace('#', '');
  let r = 0, g = 0, b = 0;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else if (c.length >= 6) {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}


