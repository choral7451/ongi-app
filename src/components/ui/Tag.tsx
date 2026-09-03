import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

export type TagVariant = 'accent' | 'neutral' | 'outline';

interface TagProps {
  label: string;
  variant?: TagVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

/** 디자인 시스템 .tag — accent(연파랑 배경) / neutral(회색) / outline(파란 외곽선) */
export function Tag({ label, variant = 'neutral', onPress, style }: TagProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.base, variantStyles[variant], style]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.md * 0.75,
    alignSelf: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.22,
  },
});

const variantStyles: Record<TagVariant, ViewStyle> = {
  accent: { backgroundColor: colors.accent100 },
  neutral: { backgroundColor: colors.neutral200 },
  outline: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 2,
  },
};

const labelStyles = StyleSheet.create({
  accent: { color: colors.accent800 },
  neutral: { color: colors.neutral800 },
  outline: { color: colors.accent },
});
