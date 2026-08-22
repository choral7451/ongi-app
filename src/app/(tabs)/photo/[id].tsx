import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, Share as ShareIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { Button, IconButton } from '../../../components/ui/Button';
import { Plate } from '../../../components/ui/Plate';
import { Tag } from '../../../components/ui/Tag';
import {
  useAddComment,
  useAlbumPhotos,
  useAlbums,
  useComments,
  useFeed,
  useMembers,
  usePeople,
  usePersonPhotos,
  usePhoto,
  useToggleLike,
  useUnfiledPhotos,
} from '../../../hooks/queries';
import { useActiveGroupId, useSession } from '../../../store/session';
import { colors, fonts, iconStroke } from '../../../theme';
import { formatFullDateTime, formatTime } from '../../../utils/format';

/** 1e — 사진 상세: 반응 · 댓글. ctx(feed | album:<id> | unfiled | person:<id>)가 있으면 좌우 스와이프로 목록을 넘겨본다 */
export default function PhotoDetailScreen() {
  const { id, ctx } = useLocalSearchParams<{ id: string; ctx?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();

  // 스와이프로 현재 사진이 바뀌므로 화면의 기준 id 는 상태로 든다
  const [currentId, setCurrentId] = useState(id);

  // 진입한 목록 컨텍스트의 사진들 — 스와이프 페이지 목록
  const activeGroupId = useActiveGroupId();
  const ctxAlbumId = ctx?.startsWith('album:') ? ctx.slice('album:'.length) : '';
  const ctxPersonId = ctx?.startsWith('person:') ? ctx.slice('person:'.length) : '';
  const feedQuery = useFeed();
  const ctxAlbumPhotos = useAlbumPhotos(ctxAlbumId);
  const ctxPersonPhotos = usePersonPhotos(ctxPersonId);
  const ctxUnfiledPhotos = useUnfiledPhotos(ctx === 'unfiled' ? activeGroupId : '');
  const ctxPhotos =
    ctx === 'feed' || ctx === 'all'
      ? feedQuery.data
      : ctxAlbumId
        ? ctxAlbumPhotos.data
        : ctxPersonId
          ? ctxPersonPhotos.data
          : ctx === 'unfiled'
            ? ctxUnfiledPhotos.data
            : undefined;

  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - 40; // content 좌우 패딩 20씩 제외

  const photo = usePhoto(currentId);
  const comments = useComments(currentId);
  const members = useMembers();
  const albums = useAlbums();
  const people = usePeople();
  const toggleLike = useToggleLike();
  const addComment = useAddComment(currentId);

  const [draft, setDraft] = useState('');

  const author = members.data?.find((m) => m.id === photo.data?.authorId);
  const album = albums.data?.find((a) => a.id === photo.data?.albumId);
  const positionInList =
    ctxPhotos && ctxPhotos.length > 1
      ? `${ctxPhotos.findIndex((p) => p.id === currentId) + 1} / ${ctxPhotos.length}`
      : null;
  const taggedPeople =
    photo.data?.personIds
      .map((pid) => people.data?.find((p) => p.id === pid))
      .filter((p): p is NonNullable<typeof p> => p != null) ?? [];

  const likers = members.data?.filter((m) => m.id !== photo.data?.authorId) ?? [];
  const likeSummary =
    photo.data && photo.data.likeCount > 0
      ? `${likers
          .slice(0, 3)
          .map((m) => m.name)
          .join(', ')}${photo.data.likeCount > 3 ? ` 외 ${photo.data.likeCount - 3}명` : ''}이 따뜻해했어요`
      : '가장 먼저 따뜻함을 전해보세요';

  // 탭 전환은 히스토리에 안 쌓여 back() 이 홈으로 떨어짐 — 들어온 컨텍스트로 명시 복귀
  const goBack = () => {
    if (ctxAlbumId) return router.replace({ pathname: '/album/[id]', params: { id: ctxAlbumId } });
    if (ctx === 'all') return router.replace({ pathname: '/album/[id]', params: { id: 'all' } });
    if (ctx === 'unfiled') return router.replace({ pathname: '/album/[id]', params: { id: 'unfiled' } });
    if (ctxPersonId) return router.replace({ pathname: '/person/[id]', params: { id: ctxPersonId } });
    return router.replace('/');
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    addComment.mutate(
      { authorId: session.currentUserId, text },
      { onSuccess: () => setDraft('') },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={goBack}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{album?.title ?? '사진'}</Text>
          {positionInList ? <Text style={styles.headerMeta}>{positionInList}</Text> : null}
        </View>
        <IconButton
          accessibilityLabel="공유"
          onPress={() =>
            photo.data && Share.share({ message: photo.data.caption ?? photo.data.url })
          }
          icon={<ShareIcon size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {ctxPhotos && ctxPhotos.length > 1 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: Math.max(ctxPhotos.findIndex((p) => p.id === id), 0) * pageWidth, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
              const next = ctxPhotos[page];
              if (next && next.id !== currentId) setCurrentId(next.id);
            }}
          >
            {ctxPhotos.map((item) => (
              <View key={item.id} style={{ width: pageWidth }}>
                <Plate uri={item.url} height={340} />
              </View>
            ))}
          </ScrollView>
        ) : photo.data ? (
          <Plate uri={photo.data.url} height={340} />
        ) : null}
        {photo.data ? (
          <>

            <View style={styles.authorRow}>
              <Avatar name={author?.name ?? '?'} />
              <View style={styles.authorInfo}>
                <Text style={styles.authorName}>{author?.name}</Text>
                <Text style={styles.authorMeta}>
                  {formatFullDateTime(photo.data.createdAt)}
                  {photo.data.location ? ` · ${photo.data.location}` : ''}
                </Text>
              </View>
              <View style={styles.tags}>
                {taggedPeople.map((p) => (
                  <Tag key={p.id} label={p.name} variant="accent" />
                ))}
              </View>
            </View>

            {photo.data.caption ? (
              <Text style={styles.quote}>{`"${photo.data.caption}"`}</Text>
            ) : null}

            <View style={styles.likeRow}>
              <Pressable
                style={styles.likeButton}
                onPress={() => toggleLike.mutate(photo.data!.id)}
                accessibilityLabel="따뜻해요"
              >
                <Heart
                  size={18}
                  color={colors.accent700}
                  fill={photo.data.likedByMe ? colors.accent700 : 'transparent'}
                  strokeWidth={iconStroke}
                />
                <Text style={styles.likeCount}>{photo.data.likeCount}</Text>
              </Pressable>
              <Text style={styles.likeSummary}>{likeSummary}</Text>
            </View>

            <View style={styles.comments}>
              {comments.data?.map((comment) => {
                const commentAuthor = members.data?.find((m) => m.id === comment.authorId);
                return (
                  <View key={comment.id} style={styles.comment}>
                    <Avatar name={commentAuthor?.name ?? '?'} size={30} />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentHead}>
                        <Text style={styles.commentAuthor}>{commentAuthor?.name}</Text>
                        <Text style={styles.commentTime}>
                          {'  '}
                          {formatTime(comment.createdAt)}
                        </Text>
                      </Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="따뜻한 한마디를 남겨보세요"
          placeholderTextColor={colors.neutral500}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Button
          label="보내기"
          onPress={send}
          disabled={draft.trim().length === 0 || addComment.isPending}
        />
      </View>
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
    paddingBottom: 10,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  headerMeta: {
    fontSize: 10,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    color: colors.text,
  },
  authorMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  quote: {
    fontFamily: fonts.headingRegular,
    fontSize: 19,
    lineHeight: 32,
    color: colors.text,
    marginVertical: 14,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  likeCount: {
    fontSize: 13,
    color: colors.accent700,
    fontVariant: ['tabular-nums'],
  },
  likeSummary: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  comments: {
    paddingTop: 14,
    gap: 14,
  },
  comment: {
    flexDirection: 'row',
    gap: 10,
  },
  commentBody: {
    flex: 1,
  },
  commentHead: {
    fontSize: 12,
  },
  commentAuthor: {
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  commentText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  input: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 4,
  },
});
