import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ImagePlus, Menu, Send } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportsApi } from '../../api';
import { PhotoZoomViewer } from '../../components/PhotoZoomViewer';
import { IconButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useChatMessages, useChatRoom, useLeaveChat, useMarkChatRead, useSendChatPhoto, useSendChatText } from '../../hooks/queries';
import { setActiveChatRoom } from '../../store/chat';
import { colors, fonts, iconStroke } from '../../theme';
import type { ChatMessage } from '../../types';
import { alertError, confirm, promptReason, REPORT_DONE_MESSAGE, showActions } from '../../utils/dialogs';
import { formatFeedDate, formatTime } from '../../utils/format';

const PHOTO_WIDTH = 200;
const PHOTO_MAX_HEIGHT = 280;
const dayKey = (iso: string) => new Date(iso).toDateString();
const minuteKey = (iso: string) => Math.floor(new Date(iso).getTime() / 60_000);

/** 이어지는 메시지 묶음 — 같은 사람이 같은 날 연달아 보내면 이름·사진은 처음 한 번, 시각은 같은 분의 마지막에만 */
function layoutOf(messages: ChatMessage[], index: number) {
  const message = messages[index];
  const older = messages[index + 1];
  const newer = messages[index - 1];
  const sameSender = (a?: ChatMessage, b?: ChatMessage) =>
    !!a && !!b && a.type !== 'system' && b.type !== 'system' && a.sender?.id === b.sender?.id && dayKey(a.createdAt) === dayKey(b.createdAt);
  return {
    showDay: !older || dayKey(older.createdAt) !== dayKey(message.createdAt),
    showSender: !sameSender(older, message),
    showTime: !sameSender(message, newer) || minuteKey(newer!.createdAt) !== minuteKey(message.createdAt),
  };
}

/** 대화방 — 최신 메시지가 아래, 위로 올리면 이전 메시지. 메시지 옆 숫자는 아직 안 읽은 사람 수 */
export default function ChatRoomScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const roomId = id ?? '';
  const room = useChatRoom(roomId);
  const messages = useChatMessages(roomId);
  const sendText = useSendChatText(roomId);
  const sendPhoto = useSendChatPhoto(roomId);
  const markRead = useMarkChatRead(roomId);
  const leave = useLeaveChat();

  const [text, setText] = useState('');
  const [zoomUri, setZoomUri] = useState<string | null>(null);
  const focused = useRef(false);
  const lastReadSent = useRef('');

  const list = useMemo(() => messages.data ?? [], [messages.data]);
  const newestId = list[0]?.id ?? '';

  const sendRead = useCallback(() => {
    if (!focused.current || !newestId || newestId === lastReadSent.current) return;
    lastReadSent.current = newestId;
    markRead.mutate(newestId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestId]);

  // 보고 있는 동안: 이 방의 푸시 배너는 띄우지 않고, 새 메시지는 바로 읽음 처리
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      setActiveChatRoom(roomId);
      sendRead();
      return () => {
        focused.current = false;
        setActiveChatRoom(null);
      };
    }, [roomId, sendRead]),
  );
  useEffect(() => sendRead(), [sendRead]);

  const onSend = () => {
    const content = text.trim();
    if (!content || sendText.isPending) return;
    setText('');
    sendText.mutate(content, {
      onError: (e) => {
        setText(content);
        alertError('보내지 못했어요')(e);
      },
    });
  };

  const onPickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    sendPhoto.mutate({ uri: asset.uri, width: asset.width, height: asset.height }, { onError: alertError('사진을 보내지 못했어요') });
  };

  const onMessageMenu = (message: ChatMessage) => {
    const actions = [];
    if (message.type === 'text') actions.push({ label: '복사', onPress: () => void Clipboard.setStringAsync(message.content) });
    if (!message.isMine && message.type !== 'system') {
      actions.push({
        label: '신고',
        destructive: true,
        onPress: () =>
          promptReason('이 메시지를 신고할까요?', (reason) =>
            reportsApi
              .report({ targetType: 'chat_message', targetId: message.id, reason })
              .then(() => Alert.alert('신고 완료', REPORT_DONE_MESSAGE))
              .catch(alertError('신고하지 못했어요')),
          ),
      });
    }
    showActions('메시지', actions);
  };

  const onRoomMenu = () => {
    const data = room.data;
    if (!data) return;
    const isGroup = data.type === 'group';
    const names = data.participants.map((p) => (p.isMe ? `${p.name} (나)` : p.name)).join('\n');
    showActions(data.title, [
      { label: `참여자 ${data.participants.length}명`, onPress: () => Alert.alert('참여자', names) },
      ...(isGroup ? [{ label: '초대하기', onPress: () => router.push({ pathname: '/chat/new', params: { roomId } }) }] : []),
      {
        label: isGroup ? '대화방 나가기' : '대화 삭제',
        destructive: true,
        onPress: () =>
          confirm(
            isGroup ? '대화방을 나갈까요?' : '대화를 삭제할까요?',
            isGroup ? '나가면 이 대화방의 메시지를 더 볼 수 없어요. 다른 참여자가 다시 초대할 수 있어요.' : '내 목록에서만 지워져요. 상대가 새 메시지를 보내면 다시 나타나요.',
            isGroup ? '나가기' : '삭제',
            () => leave.mutate(roomId, { onSuccess: () => router.back(), onError: alertError(isGroup ? '나가지 못했어요' : '삭제하지 못했어요') }),
          ),
      },
    ]);
  };

  if (room.isError) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.emptyText}>{room.error instanceof Error ? room.error.message : '대화방을 찾을 수 없어요.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.link}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  const canSend = room.data?.canSend ?? true;
  const isGroup = room.data?.type === 'group';

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton accessibilityLabel="뒤로" onPress={() => router.back()} icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />} />
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {room.data?.title ?? ''}
          </Text>
          {isGroup ? <Text style={styles.subtitle}>{room.data?.participants.length}명</Text> : null}
        </View>
        <IconButton accessibilityLabel="대화방 메뉴" onPress={onRoomMenu} icon={<Menu size={18} color={colors.text} strokeWidth={iconStroke} />} />
      </View>

      {messages.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <FlatList
          inverted
          data={list}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.messages}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) void messages.fetchNextPage();
          }}
          ListFooterComponent={messages.isFetchingNextPage ? <ActivityIndicator style={styles.olderLoading} color={colors.accent} /> : null}
          renderItem={({ item: message, index }) => {
            const { showDay, showSender, showTime } = layoutOf(list, index);
            return (
              <View>
                {showDay ? <Text style={styles.day}>{formatFeedDate(new Date(message.createdAt))}</Text> : null}
                {message.type === 'system' ? (
                  <Text style={styles.system}>{message.content}</Text>
                ) : (
                  <MessageRow
                    message={message}
                    showSender={showSender && isGroup && !message.isMine}
                    showAvatar={showSender && !message.isMine}
                    showTime={showTime}
                    onLongPress={() => onMessageMenu(message)}
                    onPressPhoto={() => setZoomUri(message.mediaUrl ?? null)}
                  />
                )}
              </View>
            );
          }}
        />
      )}

      {canSend ? (
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <IconButton
            accessibilityLabel="사진 보내기"
            onPress={() => void onPickPhoto()}
            disabled={sendPhoto.isPending}
            icon={sendPhoto.isPending ? <ActivityIndicator color={colors.accent} /> : <ImagePlus size={20} color={colors.neutral700} strokeWidth={iconStroke} />}
          />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="메시지 보내기"
            placeholderTextColor={colors.neutral500}
            multiline
            maxLength={1000}
            style={styles.input}
            accessibilityLabel="메시지"
          />
          <IconButton
            accessibilityLabel="보내기"
            onPress={onSend}
            disabled={!text.trim() || sendText.isPending}
            icon={<Send size={20} color={text.trim() ? colors.accent : colors.neutral400} strokeWidth={iconStroke} />}
          />
        </View>
      ) : (
        <View style={[styles.blockedBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={styles.blockedText}>메시지를 보낼 수 없는 대화예요.</Text>
        </View>
      )}

      <PhotoZoomViewer uri={zoomUri} onClose={() => setZoomUri(null)} />
    </KeyboardAvoidingView>
  );
}

function MessageRow({
  message,
  showSender,
  showAvatar,
  showTime,
  onLongPress,
  onPressPhoto,
}: {
  message: ChatMessage;
  showSender: boolean;
  showAvatar: boolean;
  showTime: boolean;
  onLongPress: () => void;
  onPressPhoto: () => void;
}) {
  const mine = message.isMine;
  const meta = (
    <View style={[styles.meta, mine && styles.metaMine]}>
      {message.unreadCount > 0 ? <Text style={styles.unread}>{message.unreadCount}</Text> : null}
      {showTime ? <Text style={styles.time}>{formatTime(message.createdAt)}</Text> : null}
    </View>
  );
  const photoHeight = Math.min(PHOTO_MAX_HEIGHT, PHOTO_WIDTH / (message.aspectRatio || 1));
  const body =
    message.type === 'photo' ? (
      <Pressable accessibilityRole="imagebutton" accessibilityLabel="사진 크게 보기" onPress={onPressPhoto} onLongPress={onLongPress}>
        <Image
          source={{ uri: message.thumbUrl ?? message.mediaUrl }}
          style={[styles.photo, { height: photoHeight }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={message.id}
        />
      </Pressable>
    ) : (
      <Pressable onLongPress={onLongPress} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{message.content}</Text>
      </Pressable>
    );

  if (mine) {
    return (
      <View style={[styles.row, styles.rowMine, showAvatar && styles.rowGap]}>
        {meta}
        {body}
      </View>
    );
  }
  return (
    <View style={[styles.row, showAvatar && styles.rowGap]}>
      <View style={styles.avatarSlot}>{showAvatar ? <Avatar name={message.sender?.name ?? '?'} uri={message.sender?.avatarUrl} size={34} /> : null}</View>
      <View style={styles.otherColumn}>
        {showSender ? <Text style={styles.sender}>{message.sender?.name ?? '알 수 없음'}</Text> : null}
        <View style={styles.otherLine}>
          {body}
          {meta}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  loading: {
    flex: 1,
  },
  messages: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  olderLoading: {
    marginVertical: 12,
  },
  day: {
    alignSelf: 'center',
    marginVertical: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: colors.neutral100,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  system: {
    alignSelf: 'center',
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 12,
    color: colors.textMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 3,
  },
  rowGap: {
    marginTop: 12,
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  avatarSlot: {
    width: 34,
    alignSelf: 'flex-start',
  },
  otherColumn: {
    flexShrink: 1,
    gap: 4,
  },
  otherLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  sender: {
    fontSize: 12,
    color: colors.textMuted,
  },
  bubble: {
    maxWidth: 250,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
  },
  bubbleOther: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 4,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
    borderTopRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  bubbleTextMine: {
    color: colors.white,
  },
  photo: {
    width: PHOTO_WIDTH,
    borderRadius: 10,
    backgroundColor: colors.neutral200,
  },
  meta: {
    alignItems: 'flex-start',
    gap: 1,
  },
  metaMine: {
    alignItems: 'flex-end',
  },
  unread: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  time: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 9,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.divider,
    fontSize: 15,
    color: colors.text,
  },
  blockedBar: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  blockedText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  link: {
    fontSize: 14,
    color: colors.accent,
  },
});
