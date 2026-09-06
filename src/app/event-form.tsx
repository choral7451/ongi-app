import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Calendar, Check, ChevronRight, Clock, RotateCw, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonthCalendar } from '../components/MonthCalendar';
import { useCreateEvent, useMembers, useUpdateEvent } from '../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../theme';
import { REPEAT_LABELS, formatKoreanTime, formatShortDate, monthOf, todayStr } from '../utils/calendar';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 10, 20, 30, 40, 50];
const pad2 = (n: number) => String(n).padStart(2, '0');

type SheetMode = null | 'repeat' | 'time' | 'notify';

/** 3a — 일정 만들기·수정 폼 (모달) */
export default function EventFormScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    eventId?: string;
    date?: string;
    title?: string;
    sourceDate?: string;
    time?: string;
    calendarType?: string;
    repeatType?: string;
    memo?: string;
    notifyUserIds?: string;
  }>();
  const editing = !!params.eventId;
  const members = useMembers();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [title, setTitle] = useState(params.title ?? '');
  const [date, setDate] = useState(params.sourceDate ?? params.date ?? todayStr());
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>(params.calendarType === 'lunar' ? 'lunar' : 'solar');
  const [allDay, setAllDay] = useState(editing ? !params.time : true);
  const [time, setTime] = useState(params.time || '12:00');
  const [repeatType, setRepeatType] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>(
    params.repeatType === 'weekly' || params.repeatType === 'monthly' || params.repeatType === 'yearly' ? params.repeatType : 'none',
  );
  const [memo, setMemo] = useState(params.memo ?? '');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(params.sourceDate ?? params.date ?? todayStr()));
  const [sheet, setSheet] = useState<SheetMode>(null);

  // 알림 받을 사람 — 기본값 모두. 사용자가 손대기 전엔 null 로 두고 구성원이 로드되면 전체로 간주
  const [pickedNotify, setPickedNotify] = useState<string[] | null>(
    params.notifyUserIds != null ? String(params.notifyUserIds).split(',').filter(Boolean) : null,
  );
  const allUserIds = useMemo(() => (members.data ?? []).map((m) => m.userId), [members.data]);
  const notifyUserIds = pickedNotify ?? allUserIds;
  const notifyAll = notifyUserIds.length === allUserIds.length && allUserIds.length > 0;

  const saving = createEvent.isPending || updateEvent.isPending;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      Alert.alert('제목을 입력해 주세요', '무슨 일정인지 적어주세요.');
      return;
    }
    if (notifyUserIds.length === 0) {
      Alert.alert('알림 받을 사람이 없어요', '알림 없이 저장할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '저장', onPress: () => save(trimmed) },
      ]);
      return;
    }
    save(trimmed);
  };

  const save = (trimmedTitle: string) => {
    const payload = {
      title: trimmedTitle,
      date,
      time: allDay ? null : time,
      calendarType,
      repeatType,
      memo: memo.trim() || null,
      notifyUserIds,
    };
    const options = {
      onSuccess: () => router.back(),
      onError: (e: unknown) => Alert.alert('저장 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
    };
    if (editing) updateEvent.mutate({ eventId: String(params.eventId), payload }, options);
    else createEvent.mutate(payload, options);
  };

  const toggleNotify = (userId: string) => {
    const base = pickedNotify ?? allUserIds;
    setPickedNotify(base.includes(userId) ? base.filter((id) => id !== userId) : [...base, userId]);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <Pressable accessibilityLabel="닫기" hitSlop={10} onPress={() => router.back()}>
          <X size={18} color={colors.text} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? '일정 수정' : '일정 만들기'}</Text>
        <Pressable accessibilityLabel="저장" style={styles.saveButton} onPress={submit} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? '저장 중…' : '저장'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>무슨 일정인가요?</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="예: 아버님 생신"
            placeholderTextColor={colors.neutral500}
            maxLength={80}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>언제인가요?</Text>

          <Pressable style={[styles.rowBox, calendarOpen && styles.rowBoxActive]} onPress={() => setCalendarOpen((v) => !v)}>
            <Calendar size={15} color={calendarOpen ? colors.accent : colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowMain}>{formatShortDate(date)}</Text>
            <View style={styles.segment}>
              {(['solar', 'lunar'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.segmentItem, calendarType === type && styles.segmentItemActive]}
                  onPress={() => setCalendarType(type)}
                >
                  <Text style={calendarType === type ? styles.segmentTextActive : styles.segmentText}>
                    {type === 'solar' ? '양력' : '음력'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
          {calendarOpen ? (
            <View style={styles.calendarBox}>
              <MonthCalendar
                month={month}
                selected={date}
                onSelect={(picked) => {
                  setDate(picked);
                  setCalendarOpen(false);
                }}
                onChangeMonth={setMonth}
              />
            </View>
          ) : null}
          {calendarType === 'lunar' ? <Text style={styles.hint}>고른 월·일을 음력으로 저장해요 · 양력 날짜는 자동 변환</Text> : null}

          <View style={styles.rowBox}>
            <Clock size={15} color={colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowMain}>하루 종일</Text>
            <Switch value={allDay} onValueChange={setAllDay} trackColor={{ true: colors.accent }} />
          </View>
          {!allDay ? (
            <Pressable style={styles.rowBox} onPress={() => setSheet('time')}>
              <Clock size={15} color={colors.neutral600} strokeWidth={iconStroke} />
              <Text style={styles.rowMain}>시간</Text>
              <Text style={styles.rowValue}>{formatKoreanTime(time)}</Text>
              <ChevronRight size={15} color={colors.neutral400} strokeWidth={iconStroke} />
            </Pressable>
          ) : null}

          <Pressable style={styles.rowBox} onPress={() => setSheet('repeat')}>
            <RotateCw size={15} color={colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowMain}>반복</Text>
            <Text style={styles.rowValue}>{repeatType === 'none' ? '없음' : REPEAT_LABELS[repeatType]}</Text>
            <ChevronRight size={15} color={colors.neutral400} strokeWidth={iconStroke} />
          </Pressable>

          <Pressable style={styles.rowBox} onPress={() => setSheet('notify')}>
            <Bell size={15} color={colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowMain}>알림 받을 사람</Text>
            <Text style={styles.rowValue}>{notifyAll ? '모두' : `${notifyUserIds.length}명`}</Text>
            <ChevronRight size={15} color={colors.neutral400} strokeWidth={iconStroke} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>
            메모 <Text style={styles.fieldLabelMuted}>(선택)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.memoInput]}
            value={memo}
            onChangeText={setMemo}
            placeholder="예: 저녁 7시까지 본가로 모여요"
            placeholderTextColor={colors.neutral500}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.notice}>
          <Bell size={15} color={colors.neutral600} strokeWidth={iconStroke} />
          <Text style={styles.noticeText}>저장하면 바로 알림이 가고, 하루 전 오전 9시 · 시간이 있는 일정은 1시간 전에도 알려드려요</Text>
        </View>
      </ScrollView>

      {/* 반복 / 시간 / 알림 대상 선택 시트 */}
      <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />

            {sheet === 'repeat' ? (
              <>
                <Text style={styles.sheetTitle}>얼마나 자주 반복할까요?</Text>
                {(['none', 'weekly', 'monthly', 'yearly'] as const).map((type) => (
                  <Pressable
                    key={type}
                    style={styles.sheetRow}
                    onPress={() => {
                      setRepeatType(type);
                      setSheet(null);
                    }}
                  >
                    <View style={[styles.radio, repeatType === type && styles.radioSelected]} />
                    <Text style={[styles.sheetRowText, repeatType === type && styles.sheetRowTextSelected]}>
                      {type === 'none' ? '반복하지 않기' : REPEAT_LABELS[type]}
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}

            {sheet === 'time' ? (
              <>
                <Text style={styles.sheetTitle}>몇 시인가요?</Text>
                <View style={styles.timeColumns}>
                  <ScrollView style={styles.timeColumn} bounces={false}>
                    {HOURS.map((hour) => {
                      const picked = Number(time.split(':')[0]) === hour;
                      return (
                        <Pressable key={hour} style={[styles.timeCell, picked && styles.timeCellPicked]} onPress={() => setTime(`${pad2(hour)}:${time.split(':')[1]}`)}>
                          <Text style={picked ? styles.timeCellTextPicked : styles.timeCellText}>
                            {hour < 12 ? '오전' : '오후'} {hour % 12 === 0 ? 12 : hour % 12}시
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  <ScrollView style={styles.timeColumn} bounces={false}>
                    {MINUTES.map((minute) => {
                      const picked = Number(time.split(':')[1]) === minute;
                      return (
                        <Pressable key={minute} style={[styles.timeCell, picked && styles.timeCellPicked]} onPress={() => setTime(`${time.split(':')[0]}:${pad2(minute)}`)}>
                          <Text style={picked ? styles.timeCellTextPicked : styles.timeCellText}>{minute}분</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
                <Pressable style={styles.sheetButton} onPress={() => setSheet(null)}>
                  <Text style={styles.sheetButtonText}>{formatKoreanTime(time)}로 정하기</Text>
                </Pressable>
              </>
            ) : null}

            {sheet === 'notify' ? (
              <>
                <View style={styles.sheetTitleRow}>
                  <Text style={styles.sheetTitle}>누가 알림을 받을까요?</Text>
                  <Pressable hitSlop={8} onPress={() => setPickedNotify(allUserIds)}>
                    <Text style={styles.sheetLink}>모두 선택</Text>
                  </Pressable>
                </View>
                <Text style={styles.sheetSub}>등록 알림과 리마인드를 받아요</Text>
                <ScrollView style={styles.notifyList} bounces={false}>
                  {(members.data ?? []).map((member) => {
                    const picked = notifyUserIds.includes(member.userId);
                    return (
                      <Pressable key={member.id} style={styles.notifyRow} onPress={() => toggleNotify(member.userId)}>
                        <View style={[styles.avatar, picked && styles.avatarPicked]}>
                          <Text style={[styles.avatarText, picked && styles.avatarTextPicked]}>{member.name.slice(0, 1)}</Text>
                        </View>
                        <Text style={[styles.notifyName, picked && styles.notifyNamePicked]}>
                          {member.name}
                          {member.isMe ? <Text style={styles.notifyMe}> (나)</Text> : null}
                        </Text>
                        {picked ? (
                          <View style={styles.checkCircle}>
                            <Check size={13} color={colors.white} strokeWidth={2.5} />
                          </View>
                        ) : (
                          <View style={styles.checkCircleEmpty} />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Pressable style={styles.sheetButton} onPress={() => setSheet(null)}>
                  <Text style={styles.sheetButtonText}>{notifyAll ? '모두에게 알림 · 완료' : `${notifyUserIds.length}명에게 알림 · 완료`}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingBottom: 14,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.accent,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 22,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
  fieldLabelMuted: {
    color: colors.textMuted,
    letterSpacing: 0,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  memoInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  rowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  rowBoxActive: {
    borderColor: colors.accent,
  },
  rowMain: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  rowValue: {
    fontSize: 13,
    color: colors.accent,
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segmentItem: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  segmentItemActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: 12,
    color: colors.neutral600,
  },
  segmentTextActive: {
    fontSize: 12,
    color: colors.white,
  },
  calendarBox: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.neutral100,
    borderRadius: radius.md,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.neutral700,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16,17,20,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,17,20,0.18)',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetLink: {
    fontSize: 13,
    color: colors.accent,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetRowText: {
    fontSize: 14,
    color: colors.text,
  },
  sheetRowTextSelected: {
    color: colors.accent,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(16,17,20,0.3)',
  },
  radioSelected: {
    borderWidth: 6,
    borderColor: colors.accent,
  },
  timeColumns: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  timeColumn: {
    flex: 1,
    maxHeight: 220,
  },
  timeCell: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  timeCellPicked: {
    backgroundColor: colors.accent100,
  },
  timeCellText: {
    fontSize: 14,
    color: colors.text,
  },
  timeCellTextPicked: {
    fontSize: 14,
    color: colors.accent,
  },
  sheetButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  sheetButtonText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.white,
  },
  notifyList: {
    maxHeight: 300,
    marginTop: 6,
  },
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPicked: {
    backgroundColor: colors.accent100,
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.neutral700,
  },
  avatarTextPicked: {
    color: colors.accent800,
  },
  notifyName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  notifyNamePicked: {
    color: colors.accent,
  },
  notifyMe: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(16,17,20,0.3)',
  },
});
