import { useRouter } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEventsRange } from '../hooks/queries';
import { colors, iconStroke, radius, textCenterFix } from '../theme';
import { addDaysStr, ddayLabel, todayStr } from '../utils/calendar';

/** 홈 상단 한 줄 일정 배너 — 다가오는 일정(30일)이 있을 때만 나타난다. 연회색 바탕에 검정 글자, D-day 만 검정 칩으로 강조 */
export function EventBanner() {
  const router = useRouter();
  const from = todayStr();
  const events = useEventsRange(from, addDaysStr(from, 30));

  const upcoming = events.data ?? [];
  if (upcoming.length === 0) return null;
  const first = upcoming[0];
  const rest = upcoming.length - 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="가족 일정 보기"
      style={styles.banner}
      // 배너의 그 일정 날짜로 바로 이동 — 일정 화면이 이전에 보던 달에 머물지 않게
      onPress={() => router.push({ pathname: '/schedule', params: { date: first.date, ts: String(Date.now()) } })}
    >
      <CalendarDays size={15} color={colors.text} strokeWidth={iconStroke} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {first.title}
        </Text>
        <View style={styles.chip}>
          <Text style={styles.chipText}>{ddayLabel(first.date)}</Text>
        </View>
        {rest > 0 ? <Text style={styles.rest}>· 외 {rest}건</Text> : null}
      </View>
      <ChevronRight size={14} color={colors.neutral600} strokeWidth={iconStroke} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: colors.text,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.bg,
    fontVariant: ['tabular-nums'],
    ...textCenterFix,
  },
  rest: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
