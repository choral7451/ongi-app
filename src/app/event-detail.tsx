import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Calendar, ChevronLeft, RotateCw } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDeleteEvent, useMembers } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke, radius } from '../theme';
import type { FamilyEvent } from '../types';
import { REPEAT_LABELS, ddayLabel, daysUntil, formatKoreanDate, formatKoreanTime } from '../utils/calendar';

/** 3b — 일정 상세: 정보 + 수정·삭제 (만든 사람·관리자만) */
export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ event: string }>();
  const deleteEvent = useDeleteEvent();
  const members = useMembers();
  const currentUserId = useSession((s) => s.currentUserId);

  const event = useMemo<FamilyEvent | null>(() => {
    try {
      return JSON.parse(String(params.event)) as FamilyEvent;
    } catch {
      return null;
    }
  }, [params.event]);

  if (!event) {
    router.back();
    return null;
  }

  const me = members.data?.find((m) => m.isMe);
  const canEdit = event.creatorUserId === currentUserId || me?.role === 'admin';

  const notifyNames = (event.notifyUserIds ?? [])
    .map((userId) => members.data?.find((m) => m.userId === userId)?.name)
    .filter((name): name is string => name != null);

  const upcoming = daysUntil(event.date) >= 0;

  const confirmDelete = () => {
    Alert.alert('일정 삭제', `'${event.title}' 일정을 삭제할까요?\n남은 알림도 함께 취소돼요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deleteEvent.mutate(event.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
          }),
      },
    ]);
  };

  const openEdit = () =>
    router.push({
      pathname: '/event-form',
      params: {
        eventId: event.id,
        title: event.title,
        sourceDate: event.sourceDate,
        time: event.time ?? '',
        calendarType: event.calendarType,
        repeatType: event.repeatType,
        memo: event.memo ?? '',
        notifyUserIds: (event.notifyUserIds ?? []).join(','),
      },
    });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로" hitSlop={10} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.text} strokeWidth={iconStroke} />
        </Pressable>
        <Text style={styles.headerTitle}>일정</Text>
        {canEdit ? (
          <Pressable accessibilityLabel="일정 수정" style={styles.editButton} onPress={openEdit}>
            <Text style={styles.editButtonText}>수정</Text>
          </Pressable>
        ) : (
          <View style={styles.editButtonGhost} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{upcoming ? `다가오는 일정 · ${ddayLabel(event.date)}` : '지난 일정'}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <View style={styles.rule} />

        <View style={styles.row}>
          <Calendar size={16} color={colors.neutral600} strokeWidth={iconStroke} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowMain}>{formatKoreanDate(event.date)}</Text>
            <Text style={styles.rowSub}>
              {[event.lunarLabel, event.time ? formatKoreanTime(event.time) : '하루 종일'].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {event.repeatType !== 'none' ? (
          <View style={styles.row}>
            <RotateCw size={16} color={colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowMain}>{REPEAT_LABELS[event.repeatType]} 반복</Text>
            {event.calendarType === 'lunar' ? <Text style={styles.rowRight}>음력 기준</Text> : null}
          </View>
        ) : null}

        <View style={styles.row}>
          <Bell size={16} color={colors.neutral600} strokeWidth={iconStroke} />
          <View style={styles.rowInfo}>
            <Text style={styles.rowMain}>{event.time ? '하루 전 · 1시간 전 알림' : '하루 전 알림'}</Text>
            <Text style={styles.rowSub}>
              {notifyNames.length > 0 ? `${notifyNames.join(' · ')}에게 알려드려요` : '알림 받는 사람이 없어요'}
            </Text>
          </View>
        </View>

        {event.memo ? (
          <View style={styles.memoBlock}>
            <Text style={styles.memoLabel}>메모</Text>
            <View style={styles.memoBox}>
              <Text style={styles.memoText}>{event.memo}</Text>
            </View>
          </View>
        ) : null}

        {event.creatorName ? <Text style={styles.creator}>{event.creatorName}님이 만든 일정</Text> : null}
      </ScrollView>

      {canEdit ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.deleteButton, { marginBottom: Math.max(insets.bottom, 16) + 12 }]}
          onPress={confirmDelete}
          disabled={deleteEvent.isPending}
        >
          <Text style={styles.deleteText}>{deleteEvent.isPending ? '삭제 중…' : '일정 삭제하기'}</Text>
        </Pressable>
      ) : null}
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
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
  },
  editButtonText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: colors.accent,
  },
  editButtonGhost: {
    width: 20,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    paddingTop: 6,
  },
  rule: {
    height: 1,
    backgroundColor: colors.accent300,
    marginTop: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowInfo: {
    flex: 1,
    gap: 1,
  },
  rowMain: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  rowRight: {
    fontSize: 12,
    color: colors.textMuted,
  },
  memoBlock: {
    gap: 6,
    paddingTop: 16,
  },
  memoLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
  memoBox: {
    padding: 13,
    backgroundColor: colors.neutral100,
    borderRadius: radius.md,
  },
  memoText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
  },
  creator: {
    fontSize: 12,
    color: colors.textMuted,
    paddingTop: 18,
  },
  deleteButton: {
    alignSelf: 'center',
  },
  deleteText: {
    fontSize: 13,
    color: colors.danger,
    textDecorationLine: 'underline',
  },
});
