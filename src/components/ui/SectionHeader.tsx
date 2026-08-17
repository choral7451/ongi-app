import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

interface SectionHeaderProps {
  title: string;
  /** 오른쪽 끝에 붙는 부가 텍스트 (예: "6개", 날짜) */
  meta?: string;
  size?: 'md' | 'sm';
}

/** 세리프 제목 + 연파랑 헤어라인 — Classical DS의 섹션 구분 패턴 */
export function SectionHeader({ title, meta, size = 'md' }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.title, size === 'sm' && styles.titleSm]}>{title}</Text>
      <View style={styles.rule} />
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  titleSm: {
    fontSize: 14,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
