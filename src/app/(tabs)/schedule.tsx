import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, RotateCw } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonthCalendar } from '../../components/MonthCalendar';
import { useEventsRange } from '../../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../../theme';
import type { FamilyEvent } from '../../types';
import { REPEAT_LABELS, formatKoreanDate, formatKoreanTime, monthOf, todayStr } from '../../utils/calendar';

/** 월 마지막 날 'YYYY-MM-DD' */
function lastDayOf(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}

/** 3 — 가족 일정: 월 달력 + 선택한 날짜의 일정 목록 */
export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [month, setMonth] = useState(monthOf(todayStr()));
  const [selected, setSelected] = useState(todayStr());

  const events = useEventsRange(`${month}-01`, lastDayOf(month));
  const marked = useMemo(() => new Set((events.data ?? []).map((e) => e.date)), [events.data]);
  const dayEvents = useMemo(() => (events.data ?? []).filter((e) => e.date === selected), [events.data, selected]);

  const openDetail = (event: FamilyEvent) =>
    router.push({ pathname: '/event-detail', params: { event: JSON.stringify(event) } });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로" hitSlop={10} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle}>가족 일정</Text>
        <Pressable
          accessibilityLabel="일정 만들기"
          hitSlop={10}
          onPress={() => router.push({ pathname: '/event-form', params: { date: selected } })}
        >
          <Plus size={20} color={colors.accent} strokeWidth={iconStroke} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <MonthCalendar
          month={month}
          selected={selected}
          marked={marked}
          onSelect={setSelected}
          onChangeMonth={(next) => {
            setMonth(next);
            setSelected(`${next}-01`);
          }}
        />

        <View style={styles.rule} />

        <Text style={styles.dateLabel}>{formatKoreanDate(selected)}</Text>

        {dayEvents.length === 0 ? (
          <Text style={styles.empty}>이 날엔 일정이 없어요</Text>
        ) : (
          dayEvents.map((event) => (
            <Pressable key={`${event.id}-${event.date}`} accessibilityRole="button" style={styles.row} onPress={() => openDetail(event)}>
              <View style={styles.rowTime}>
                <Text style={styles.rowTimeText}>{event.time ? formatKoreanTime(event.time) : '하루 종일'}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.rowSub} numberOfLines={1}>
                  {[event.lunarLabel, event.repeatType !== 'none' ? `${REPEAT_LABELS[event.repeatType]} 반복` : null, event.creatorName ? `${event.creatorName} 등록` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              {event.repeatType !== 'none' ? <RotateCw size={13} color={colors.neutral500} strokeWidth={iconStroke} /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  rule: {
    height: 1,
    backgroundColor: colors.accent300,
    marginTop: 12,
    marginBottom: 14,
  },
  dateLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
    marginBottom: 4,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 24,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowTime: {
    minWidth: 64,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.accent100,
    alignItems: 'center',
  },
  rowTimeText: {
    fontSize: 11,
    color: colors.accent800,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14.5,
    color: colors.text,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
