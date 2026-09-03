import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Heart, MoreHorizontal, Share as ShareIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../../components/ui/Avatar';
import { Button, IconButton } from '../../../components/ui/Button';
import { PhotoZoomViewer } from '../../../components/PhotoZoomViewer';
import { Plate } from '../../../components/ui/Plate';
import { Tag } from '../../../components/ui/Tag';
import {
  useAddComment,
  useAlbumPhotos,
  useAlbums,
  useComments,
  useDeleteComment,
  useFeed,
  useMembers,
  usePeople,
  usePersonPhotos,
  usePhoto,
  useReport,
  useToggleLike,
  useUnfiledPhotos,
} from '../../../hooks/queries';
import { usePhotoActions } from '../../../hooks/usePhotoActions';
import { alertError, promptReason, REPORT_DONE_MESSAGE, showActions } from '../../../utils/dialogs';
import { useActiveGroupId, useSession } from '../../../store/session';
import { colors, fonts, iconStroke } from '../../../theme';
import type { Comment } from '../../../types';
import { formatFullDateTime, formatTime } from '../../../utils/format';

/** 1e — 사진 상세: 반응 · 댓글. 앨범 계열 ctx(all | album:<id> | unfiled | person:<id>)로 들어오면 좌우 스와이프로 그 목록을 넘겨본다. 홈 피드(feed)에서는 단건만 */
export default function PhotoDetailScreen() {
  const { id, ctx } = useLocalSearchParams<{ id: string; ctx?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();

  // 스와이프로 현재 사진이 바뀌므로 화면의 기준 id 는 상태로 든다
  const [currentId, setCurrentId] = useState(id);

  // 탭 안에 있어 화면이 언마운트되지 않는다 — 다른 사진으로 다시 들어오면 상태·스크롤을 재동기화
  const pagerRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  // 상세에 들어올 때 입력창에 포커스가 남아 키보드가 올라오지 않도록
  useEffect(() => {
    Keyboard.dismiss();
  }, [id]);

  useEffect(() => {
    setCurrentId(id);
    const index = ctxPhotos?.findIndex((p) => p.id === id) ?? -1;
    if (index >= 0) pagerRef.current?.scrollTo({ x: index * pageWidth, animated: false });
    // ctxPhotos 는 의존성에서 제외 — 목록 갱신(좋아요 등)마다 스크롤이 튀지 않게, 재진입 시에만 위치를 맞춘다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ctx]);

  // 진입한 목록 컨텍스트의 사진들 — 스와이프 페이지 목록
  const activeGroupId = useActiveGroupId();
  const ctxAlbumId = ctx?.startsWith('album:') ? ctx.slice('album:'.length) : '';
  const ctxPersonId = ctx?.startsWith('person:') ? ctx.slice('person:'.length) : '';
  const feedQuery = useFeed();
  const ctxAlbumPhotos = useAlbumPhotos(ctxAlbumId);
  const ctxPersonPhotos = usePersonPhotos(ctxPersonId);
  const ctxUnfiledPhotos = useUnfiledPhotos(ctx === 'unfiled' ? activeGroupId : '');
  // 홈 피드에서 들어온 경우(ctx=feed)는 넘김 없이 그 사진만 본다
  const ctxQuery =
    ctx === 'all'
      ? feedQuery
      : ctxAlbumId
        ? ctxAlbumPhotos
        : ctxPersonId
          ? ctxPersonPhotos
          : ctx === 'unfiled'
            ? ctxUnfiledPhotos
            : undefined;
  const ctxPhotos = ctxQuery?.data;

  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - 40; // content 좌우 패딩 20씩 제외

  const photo = usePhoto(currentId);
  const comments = useComments(currentId);
  const members = useMembers();
  const albums = useAlbums();
  const people = usePeople();
  const toggleLike = useToggleLike();
  const addComment = useAddComment(currentId);
  const deleteComment = useDeleteComment(currentId);
  const report = useReport();
  const me = members.data?.find((m) => m.isMe);

  const [draft, setDraft] = useState('');
  const [zoomUri, setZoomUri] = useState<string | null>(null);

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

  // 탭 전환은 히스토리에 안 쌓여 back() 이 홈으로 떨어짐 — 들어온 컨텍스트로 명시 복귀
  const goBack = () => {
    if (ctxAlbumId) return router.replace({ pathname: '/album/[id]', params: { id: ctxAlbumId } });
    if (ctx === 'all') return router.replace({ pathname: '/album/[id]', params: { id: 'all' } });
    if (ctx === 'unfiled') return router.replace({ pathname: '/album/[id]', params: { id: 'unfiled' } });
    if (ctxPersonId) return router.replace({ pathname: '/person/[id]', params: { id: ctxPersonId } });
    return router.replace('/');
  };

  // 사진 삭제·작성자 차단 후에는 이 화면에 남을 이유가 없다 — 들어온 목록으로 복귀
  const openPhotoActions = usePhotoActions(() => goBack());

  /** 댓글 ⋯ 버튼(또는 길게 누르기) — 삭제(댓글·사진 작성자·관리자) · 신고 */
  const openCommentActions = (comment: Comment) => {
    if (!members.data) {
      Alert.alert('잠시만요', '구성원 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const isMine = me?.id === comment.authorId;
    const canDelete = isMine || me?.id === photo.data?.authorId || me?.role === 'admin';
    showActions('댓글', [
      ...(canDelete
        ? [
            {
              label: '댓글 삭제',
              destructive: true,
              onPress: () => deleteComment.mutate(comment.id, { onError: alertError('삭제 실패') }),
            },
          ]
        : []),
      ...(!isMine
        ? [
            {
              label: '댓글 신고',
              onPress: () =>
                promptReason('댓글 신고', (reason) =>
                  report.mutate(
                    { targetType: 'comment', targetId: comment.id, reason },
                    { onSuccess: () => Alert.alert('신고 완료', REPORT_DONE_MESSAGE), onError: alertError('신고 실패') },
                  ),
                ),
            },
          ]
        : []),
    ]);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    addComment.mutate(
      { authorId: session.currentUserId, text },
      {
        onSuccess: () => {
          setDraft('');
          // 키보드를 내리고, 방금 쓴 댓글(목록 맨 아래)로 스크롤
          Keyboard.dismiss();
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
        },
      },
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
        <View style={styles.headerActions}>
          <IconButton
            accessibilityLabel="공유"
            onPress={() =>
              // 저장소 원본 URL 은 밖으로 내보내지 않는다 — 문구만 공유
              photo.data &&
              Share.share({
                message: photo.data.caption
                  ? `"${photo.data.caption}" — 온기에서 가족과 나눈 사진이에요.`
                  : '온기에서 가족과 나눈 사진이에요.',
              })
            }
            icon={<ShareIcon size={18} color={colors.text} strokeWidth={iconStroke} />}
          />
          <IconButton
            accessibilityLabel="더보기"
            onPress={() => photo.data && openPhotoActions(photo.data)}
            icon={<MoreHorizontal size={18} color={colors.text} strokeWidth={iconStroke} />}
          />
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {ctxPhotos && ctxPhotos.length > 1 ? (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            // 페이저 높이는 '지금 보는 사진' 비율로 — 목록에서 가장 긴 사진 높이로 잡히면 가로 사진 밑에 빈 공간이 생겨 작성자·댓글이 밀려 내려간다
            style={{ height: pageWidth / ((ctxPhotos.find((p) => p.id === currentId) ?? photo.data)?.aspectRatio || 1) }}
            contentOffset={{ x: Math.max(ctxPhotos.findIndex((p) => p.id === id), 0) * pageWidth, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
              const next = ctxPhotos[page];
              if (next && next.id !== currentId) setCurrentId(next.id);
              // 마지막으로 불러온 사진까지 넘겼으면 다음 페이지를 불러와 스와이프가 계속 이어지게
              if (page >= ctxPhotos.length - 1 && ctxQuery?.hasNextPage && !ctxQuery.isFetchingNextPage) ctxQuery.fetchNextPage();
            }}
          >
            {ctxPhotos.map((item, index) => {
              // 현재 사진 ±1 장만 실제로 그린다 — 목록 전체(30장+)를 마운트하면 이미지가 전부 로드된다
              const currentIndex = ctxPhotos.findIndex((p) => p.id === currentId);
              const near = Math.abs(index - currentIndex) <= 1;
              return (
                <View key={item.id} style={{ width: pageWidth }}>
                  {/* 이웃 사진이 더 길면 스와이프 중에만 아래가 잘려 보이고, 넘기고 나면 높이가 맞춰진다 */}
                  {near ? (
                    <Pressable onPress={() => setZoomUri(item.url)} accessibilityLabel="사진 크게 보기">
                      <Plate uri={item.url} aspectRatio={item.aspectRatio || 1} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        ) : photo.data ? (
          <Pressable onPress={() => setZoomUri(photo.data!.url)} accessibilityLabel="사진 크게 보기">
            <Plate uri={photo.data.url} aspectRatio={photo.data.aspectRatio || 1} />
          </Pressable>
        ) : photo.isError ? (
          <Pressable onPress={() => photo.refetch()} style={styles.errorBox}>
            <Text style={styles.errorText}>사진을 불러오지 못했어요.</Text>
            <Text style={styles.retry}>다시 시도</Text>
          </Pressable>
        ) : (
          <ActivityIndicator style={styles.errorBox} color={colors.textMuted} />
        )}
        {photo.data ? (
          <>

            <View style={styles.authorRow}>
              <Avatar name={author?.name ?? '?'} uri={author?.avatarUrl} />
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
              <Pressable
                style={styles.likeButton}
                onPress={() => toggleLike.mutate(photo.data!.id)}
                accessibilityRole="button"
                accessibilityLabel="따뜻해요"
                hitSlop={8}
              >
                <Heart
                  size={20}
                  color={colors.accent700}
                  fill={photo.data.likedByMe ? colors.accent700 : 'transparent'}
                  strokeWidth={iconStroke}
                />
                <Text style={styles.likeCount}>{photo.data.likeCount}</Text>
              </Pressable>
            </View>

            {photo.data.caption ? (
              <Text style={styles.quote}>{`"${photo.data.caption}"`}</Text>
            ) : null}

            <View style={styles.comments}>
              {comments.data?.map((comment) => {
                const commentAuthor = members.data?.find((m) => m.id === comment.authorId);
                return (
                  <Pressable
                    key={comment.id}
                    style={styles.comment}
                    onLongPress={() => openCommentActions(comment)}
                    delayLongPress={350}
                    accessibilityHint="길게 누르면 삭제·신고 메뉴가 열려요"
                  >
                    <Avatar name={commentAuthor?.name ?? '?'} uri={commentAuthor?.avatarUrl} size={30} />
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
                    <Pressable
                      onPress={() => openCommentActions(comment)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="댓글 옵션"
                      style={styles.commentMore}
                    >
                      <MoreHorizontal size={16} color={colors.neutral500} strokeWidth={iconStroke} />
                    </Pressable>
                  </Pressable>
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
      <PhotoZoomViewer uri={zoomUri} onClose={() => setZoomUri(null)} />
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
  headerActions: {
    flexDirection: 'row',
    gap: 4,
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
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 6,
  },
  likeCount: {
    fontSize: 13,
    color: colors.accent700,
    fontVariant: ['tabular-nums'],
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
  commentMore: {
    paddingTop: 2,
    paddingLeft: 6,
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
  errorBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    fontSize: 13,
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
});
