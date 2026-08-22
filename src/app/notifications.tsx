import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, Heart, MessageCircle } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../components/ui/Button';
import { useMarkNotificationsRead, useNotifications } from '../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../theme';
import type { Notification } from '../types';
import { formatTimeAgo } from '../utils/format';

function TypeIcon({ type }: { type: Notification['type'] }) {
  if (type === 'PHOTO_LIKED') return <Heart size={14} color={colors.accent} strokeWidth={iconStroke} />;
  if (type === 'COMMENT_ADDED') return <MessageCircle size={14} color={colors.accent} strokeWidth={iconStroke} />;
  return <Bell size={14} color={colors.accent} strokeWidth={iconStroke} />;
}

/** 알림 목록 — 진입하면 모두 읽음 처리 */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();

  // 화면에 들어오면 한 번만 읽음 처리 (목록의 안읽음 표시는 이번 조회분 기준 유지)
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !notifications.isSuccess) return;
    marked.current = true;
    if (notifications.data.some((n) => !n.read)) markRead.mutate();
  }, [notifications.isSuccess, notifications.data, markRead]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.headerTitle}>알림</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={notifications.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        ListEmptyComponent={
          notifications.isLoading ? null : (
            <View style={styles.empty}>
              <Bell size={26} color={colors.neutral500} strokeWidth={iconStroke} />
              <Text style={styles.emptyText}>아직 알림이 없어요</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              item.photoId
                ? router.push({ pathname: '/photo/[id]', params: { id: item.photoId } })
                : undefined
            }
          >
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbEmpty]}>
                <TypeIcon type={item.type} />
              </View>
            )}
            <View style={styles.body}>
              <Text style={[styles.message, !item.read && styles.messageUnread]} numberOfLines={2}>
                {item.message}
              </Text>
              <View style={styles.metaRow}>
                <TypeIcon type={item.type} />
                <Text style={styles.time}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </View>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </Pressable>
        )}
      />
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
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  list: {
    paddingHorizontal: 20,
    gap: 4,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.neutral200,
  },
  thumbEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  message: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
  messageUnread: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
