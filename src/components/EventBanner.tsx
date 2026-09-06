import { useRouter } from 'expo-router';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useEventsRange } from '../hooks/queries';
import { colors, iconStroke, radius } from '../theme';
import { addDaysStr, ddayLabel, todayStr } from '../utils/calendar';

/** 홈 상단 한 줄 일정 배너 — 다가오는 일정(30일)이 있을 때만 나타난다 */
export function EventBanner() {
  const router = useRouter();
  const from = todayStr();
  const events = useEventsRange(from, addDaysStr(from, 30));

  const upcoming = events.data ?? [];
  if (upcoming.length === 0) return null;
  const first = upcoming[0];
  const rest = upcoming.length - 1;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="가족 일정 보기" style={styles.banner} onPress={() => router.push('/schedule')}>
      <CalendarDays size={15} color={colors.accent700} strokeWidth={iconStroke} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.title}>{first.title}</Text> {ddayLabel(first.date)}
        {rest > 0 ? ` · 외 ${rest}건` : ''}
      </Text>
      <ChevronRight size={14} color={colors.accent700} strokeWidth={iconStroke} />
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
    backgroundColor: colors.accent100,
    borderRadius: radius.md,
  },
  text: {
    flex: 1,
    fontSize: 12.5,
    color: colors.accent900,
  },
  title: {
    fontWeight: '600',
  },
});
