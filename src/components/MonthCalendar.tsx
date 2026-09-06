import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, iconStroke } from '../theme';
import { addMonths, monthMatrix, todayStr } from '../utils/calendar';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface MonthCalendarProps {
  /** 'YYYY-MM' */
  month: string;
  selected?: string;
  /** 점 표시할 날짜들 (일정 있는 날) */
  marked?: Set<string>;
  onSelect: (date: string) => void;
  onChangeMonth: (month: string) => void;
}

/** 월 달력 — 일정 화면과 일정 폼의 날짜 선택에 공용 */
export const MonthCalendar = memo(function MonthCalendar({ month, selected, marked, onSelect, onChangeMonth }: MonthCalendarProps) {
  const [year, monthNo] = month.split('-').map(Number);
  const today = todayStr();
  const weeks = monthMatrix(month);

  return (
    <View>
      <View style={styles.header}>
        <Pressable accessibilityLabel="이전 달" hitSlop={10} onPress={() => onChangeMonth(addMonths(month, -1))}>
          <ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.title}>
          {year}년 {monthNo}월
        </Text>
        <Pressable accessibilityLabel="다음 달" hitSlop={10} onPress={() => onChangeMonth(addMonths(month, 1))}>
          <ChevronRight size={18} color={colors.text} strokeWidth={iconStroke} />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((day, index) => (
          <Text key={day} style={[styles.weekday, index === 0 && styles.sunday]}>
            {day}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((date, dayIndex) =>
            date == null ? (
              <View key={`empty-${dayIndex}`} style={styles.cell} />
            ) : (
              <Pressable key={date} style={styles.cell} onPress={() => onSelect(date)} accessibilityRole="button">
                <View style={[styles.dayCircle, date === today && styles.todayCircle, date === selected && styles.selectedCircle]}>
                  <Text
                    style={[
                      styles.dayText,
                      dayIndex === 0 && styles.sunday,
                      date === selected && styles.selectedText,
                    ]}
                  >
                    {Number(date.slice(8))}
                  </Text>
                </View>
                <View style={[styles.dot, marked?.has(date) && date !== selected && styles.dotVisible]} />
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  weekdays: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
  },
  sunday: {
    color: colors.danger,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: colors.accent100,
  },
  selectedCircle: {
    backgroundColor: colors.accent,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  selectedText: {
    color: colors.white,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  dotVisible: {
    backgroundColor: colors.accent,
  },
});
