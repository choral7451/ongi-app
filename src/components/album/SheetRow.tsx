import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, initialCenterFix } from '../../theme';

interface SheetRowProps {
  /** 왼쪽 원 안 글자 — 없으면 '—' (미분류 등) */
  initial?: string;
  label: string;
  caption?: string;
  selected: boolean;
  onPress: () => void;
  /** 원을 무채색으로 (앨범 목록처럼 사람이 아닌 항목) */
  muted?: boolean;
}

/** 시트 안 고르기 행 — 이니셜 원 · 이름 · 오른쪽 라디오 */
export function SheetRow({ initial, label, caption, selected, onPress, muted = false }: SheetRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.circle, muted && styles.circleMuted]}>
        <Text style={[styles.initial, muted && styles.initialMuted, initialCenterFix(14)]}>{initial ?? '—'}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <Check size={12} color={colors.white} strokeWidth={3} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  pressed: {
    backgroundColor: colors.neutral100,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleMuted: {
    backgroundColor: colors.neutral100,
  },
  initial: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.accent,
  },
  initialMuted: {
    color: colors.neutral600,
  },
  texts: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.text,
  },
  caption: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
});
