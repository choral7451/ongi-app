import { useRouter } from 'expo-router';
import { ChevronLeft, Send, SquarePen } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatAvatar } from '../../components/chat/ChatAvatar';
import { Button, IconButton } from '../../components/ui/Button';
import { useChatRooms, useLeaveChat } from '../../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../../theme';
import type { ChatRoomListItem } from '../../types';
import { alertError, confirm, showActions } from '../../utils/dialogs';
import { formatChatListTime } from '../../utils/format';

/** 채팅 목록 — 가족 공간과 상관없이 내 모든 대화방 (마지막 메시지 최신 순) */
export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const rooms = useChatRooms();
  const leave = useLeaveChat();

  const openMenu = (room: ChatRoomListItem) => {
    const isGroup = room.type === 'group';
    showActions(room.title, [
      {
        label: isGroup ? '대화방 나가기' : '대화 삭제',
        destructive: true,
        onPress: () =>
          confirm(
            isGroup ? '대화방을 나갈까요?' : '대화를 삭제할까요?',
            isGroup ? '나가면 이 대화방의 메시지를 더 볼 수 없어요. 다른 참여자가 다시 초대할 수 있어요.' : '내 목록에서만 지워져요. 상대가 새 메시지를 보내면 다시 나타나요.',
            isGroup ? '나가기' : '삭제',
            () => leave.mutate(room.id, { onError: alertError(isGroup ? '나가지 못했어요' : '삭제하지 못했어요') }),
          ),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton accessibilityLabel="뒤로" onPress={() => router.back()} icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />} />
        <Text style={styles.title}>채팅</Text>
        <IconButton
          accessibilityLabel="새 대화"
          onPress={() => router.push('/chat/new')}
          icon={<SquarePen size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
      </View>

      {rooms.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <FlatList
          data={rooms.data ?? []}
          keyExtractor={(room) => room.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={rooms.isRefetching} onRefresh={() => void rooms.refetch()} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Send size={28} color={colors.neutral500} strokeWidth={iconStroke} />
              <Text style={styles.emptyText}>아직 대화가 없어요.{'\n'}가족 공간의 누구와도 1:1 이나 여럿이서 이야기할 수 있어요.</Text>
              <Button label="새 대화 시작" onPress={() => router.push('/chat/new')} />
            </View>
          }
          renderItem={({ item: room }) => {
            const unread = room.unreadCount > 0;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${room.title}${unread ? `, 안 읽은 메시지 ${room.unreadCount}개` : ''}`}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: room.id } })}
                onLongPress={() => openMenu(room)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <ChatAvatar participants={room.participants} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.rowTitle, unread && styles.rowTitleUnread]} numberOfLines={1}>
                      {room.title}
                    </Text>
                    {room.type === 'group' ? <Text style={styles.rowCount}>{room.participants.length}</Text> : null}
                  </View>
                  <Text style={[styles.rowPreview, unread && styles.rowPreviewUnread]} numberOfLines={1}>
                    {room.lastMessage?.preview ?? ''}
                  </Text>
                </View>
                <View style={styles.rowMeta}>
                  <Text style={styles.rowTime}>{room.lastMessage ? formatChatListTime(room.lastMessage.createdAt) : ''}</Text>
                  {unread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{room.unreadCount > 99 ? '99+' : room.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
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
  loading: {
    marginTop: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: -10,
    borderRadius: radius.md,
  },
  rowPressed: {
    backgroundColor: colors.neutral100,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.text,
  },
  rowTitleUnread: {
    fontWeight: '600',
  },
  rowCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowPreview: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rowPreviewUnread: {
    color: colors.text,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rowTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.bg,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingTop: 80,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
