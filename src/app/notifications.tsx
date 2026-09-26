import { useRouter } from 'expo-router';
import { Bell, CalendarDays, ChevronLeft, Heart, Images, Mail, MessageCircle, Users } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../components/ui/Button';
import { useMarkNotificationsSeen, useNotifications } from '../hooks/queries';
import { clearDeliveredNotifications } from '../hooks/usePushNotifications';
import { colors, fonts, iconStroke, radius } from '../theme';
import type { AppNotification } from '../types';
import { formatRelativeTime } from '../utils/format';
import { navigateForPushData } from '../utils/pushNavigation';

type Row = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; item: AppNotification; fresh: boolean };

function typeIcon(type: string) {
  const props = { size: 18, color: colors.accent, strokeWidth: iconStroke };
  if (type === 'photo') return <Images {...props} />;
  if (type === 'comment') return <MessageCircle {...props} />;
  if (type === 'like') return <Heart {...props} />;
  if (type.startsWith('event_')) return <CalendarDays {...props} />;
  if (type === 'member_joined') return <Users {...props} />;
  if (type === 'inquiry_answered') return <Mail {...props} />;
  return <Bell {...props} />;
}

/**
 * 알림 목록 — 인스타그램 방식: 화면을 여는 순간 전부 본 것으로 처리하고,
 * 열기 전 마지막으로 봤던 시각 이후 항목은 이번 한 번만 "새로운 알림"으로 위에 묶어 보여준다.
 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notifications = useNotifications();
  const markSeen = useMarkNotificationsSeen();
  // 화면을 열 때의 seenAt 을 고정 — 본 것 처리 뒤에도 이번 화면에서는 "새로운 알림" 구분이 유지된다
  const [seenAtAtOpen, setSeenAtAtOpen] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (seenAtAtOpen !== undefined || !notifications.data) return;
    setSeenAtAtOpen(notifications.data.seenAt);
    markSeen.mutate();
    void clearDeliveredNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.data, seenAtAtOpen]);

  const rows = useMemo<Row[]>(() => {
    const items = notifications.data?.notifications ?? [];
    const threshold = seenAtAtOpen ? new Date(seenAtAtOpen).getTime() : seenAtAtOpen === null ? 0 : Number.POSITIVE_INFINITY;
    const fresh = items.filter((n) => new Date(n.createdAt).getTime() > threshold);
    const earlier = items.filter((n) => new Date(n.createdAt).getTime() <= threshold);
    const out: Row[] = [];
    if (fresh.length > 0) {
      out.push({ kind: 'header', key: 'h-fresh', title: '새로운 알림' });
      fresh.forEach((item) => out.push({ kind: 'item', key: item.id, item, fresh: true }));
    }
    if (earlier.length > 0) {
      out.push({ kind: 'header', key: 'h-earlier', title: fresh.length > 0 ? '이전 알림' : '최근 30일' });
      earlier.forEach((item) => out.push({ kind: 'item', key: item.id, item, fresh: false }));
    }
    return out;
  }, [notifications.data, seenAtAtOpen]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>알림</Text>
        <View style={styles.headerSpacer} />
      </View>

      {notifications.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={notifications.isRefetching} onRefresh={() => void notifications.refetch()} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Bell size={28} color={colors.neutral500} strokeWidth={iconStroke} />
              <Text style={styles.emptyText}>아직 알림이 없어요.{'\n'}가족이 사진을 올리거나 한마디를 남기면 여기에 쌓여요.</Text>
            </View>
          }
          renderItem={({ item: row }) =>
            row.kind === 'header' ? (
              <Text style={styles.sectionTitle}>{row.title}</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateForPushData(router, row.item.data)}
                style={({ pressed }) => [styles.row, row.fresh && styles.rowFresh, pressed && styles.rowPressed]}
              >
                <View style={styles.iconWrap}>{typeIcon(row.item.type)}</View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowText}>{row.item.body}</Text>
                  <Text style={styles.rowTime}>{formatRelativeTime(row.item.createdAt)}</Text>
                </View>
                {row.fresh ? <View style={styles.dot} /> : null}
              </Pressable>
            )
          }
        />
      )}
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  loading: {
    marginTop: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: radius.md,
  },
  rowFresh: {
    backgroundColor: colors.accent100,
  },
  rowPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  rowTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 80,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
