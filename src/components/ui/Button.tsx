import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label?: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 디자인 시스템 .btn — 외곽선 버튼.
 * primary: 파란 외곽선 + 파란 글자 / secondary: 헤어라인 외곽선 / ghost: 테두리 없음
 */
export function Button({
  label,
  icon,
  variant = 'primary',
  onPress,
  disabled,
  style,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon}
      {label ? (
        <Text style={[styles.label, variant !== 'secondary' && styles.accentLabel]}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

interface IconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  /** 진행 중인 동작이 끝날 때까지 연타를 막는다 */
  disabled?: boolean;
}

/** 디자인 시스템 .btn-icon — 36×36 아이콘 버튼 */
export function IconButton({ icon, onPress, accessibilityLabel, style, disabled = false }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed, disabled && styles.iconDisabled, style]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconDisabled: {
    opacity: 0.4,
  },
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.text,
  },
  accentLabel: {
    color: colors.accent,
  },
  disabled: {
    opacity: 0.45,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  iconPressed: {
    backgroundColor: 'rgba(27,28,30,0.07)',
  },
});

const variantStyles = StyleSheet.create({
  primary: { borderColor: colors.accent },
  secondary: { borderColor: colors.divider },
  ghost: { paddingHorizontal: 4 },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: 'rgba(1,100,255,0.12)' },
  secondary: { backgroundColor: 'rgba(27,28,30,0.07)' },
  ghost: { backgroundColor: 'rgba(1,100,255,0.10)' },
});
