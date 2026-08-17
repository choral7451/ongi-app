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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button, IconButton } from '../../components/ui/Button';
import { Plate } from '../../components/ui/Plate';
import { Tag } from '../../components/ui/Tag';
import {
  useAddComment,
  useAlbumPhotos,
  useAlbums,
  useComments,
  useMembers,
  usePeople,
  usePhoto,
  useToggleLike,
} from '../../hooks/queries';
import { useSession } from '../../store/session';
import { colors, fonts, iconStroke } from '../../theme';
import { formatFullDateTime, formatTime } from '../../utils/format';

/** 1e — 사진 상세: 반응 · 댓글 */
export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();

  const photo = usePhoto(id);
  const comments = useComments(id);
  const members = useMembers();
  const albums = useAlbums();
  const people = usePeople();
  const toggleLike = useToggleLike();
  const addComment = useAddComment(id);

  const [draft, setDraft] = useState('');

  const author = members.data?.find((m) => m.id === photo.data?.authorId);
  const album = albums.data?.find((a) => a.id === photo.data?.albumId);
  const albumPhotos = useAlbumPhotos(photo.data?.albumId ?? '');
  const positionInAlbum =
    album && albumPhotos.data
      ? `${albumPhotos.data.findIndex((p) => p.id === id) + 1} / ${albumPhotos.data.length}`
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
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{album?.title ?? '사진'}</Text>
          {positionInAlbum ? <Text style={styles.headerMeta}>{positionInAlbum}</Text> : null}
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
        {photo.data ? (
          <>
            <Plate uri={photo.data.url} height={340} />

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
                  fill={colors.accent700}
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
