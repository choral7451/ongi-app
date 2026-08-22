import { useRouter } from 'expo-router';
import { Heart, MessageCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useToggleLike } from '../../hooks/queries';
import { colors, iconStroke } from '../../theme';
import type { Album, Member, Photo } from '../../types';
import { formatTime } from '../../utils/format';
import { Avatar } from '../ui/Avatar';
import { Plate } from '../ui/Plate';

interface FeedPostProps {
  photo: Photo;
  author?: Member;
  album?: Album;
  /** 사진을 캡션/작성자보다 위에 배치할지 (디자인의 두 가지 카드 변형) */
  photoFirst?: boolean;
}

/** 홈 피드의 게시물 하나 — 사진 · 작성자 · 반응 · 캡션 */
export function FeedPost({ photo, author, album, photoFirst = true }: FeedPostProps) {
  const router = useRouter();
  const toggleLike = useToggleLike();

  const openDetail = () => router.push({ pathname: '/photo/[id]', params: { id: photo.id, ctx: 'feed' } });

  const authorRow = (
    <View style={styles.authorRow}>
      <Avatar name={author?.name ?? '?'} />
      <View style={styles.authorInfo}>
        <Text style={styles.authorName}>{author?.name}</Text>
        <Text style={styles.meta}>
          {formatTime(photo.createdAt)}
          {album ? ` · 앨범 「${album.title}」` : ''}
        </Text>
      </View>
      <Pressable
        style={styles.stat}
        onPress={() => toggleLike.mutate(photo.id)}
        accessibilityLabel="따뜻해요"
      >
        <Heart
          size={16}
          color={colors.accent700}
          fill={photo.likedByMe ? colors.accent700 : 'transparent'}
          strokeWidth={iconStroke}
        />
        <Text style={[styles.statText, { color: colors.accent700 }]}>{photo.likeCount}</Text>
      </Pressable>
      {photo.commentCount > 0 ? (
        <Pressable style={styles.stat} onPress={openDetail} accessibilityLabel="댓글">
          <MessageCircle size={16} color={colors.neutral600} strokeWidth={iconStroke} />
          <Text style={styles.statText}>{photo.commentCount}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <View style={styles.post}>
      {photoFirst ? (
        <>
          <Pressable onPress={openDetail}>
            <Plate uri={photo.url} aspectRatio={photo.aspectRatio} />
          </Pressable>
          {authorRow}
        </>
      ) : (
        <>
          {authorRow}
          <Pressable onPress={openDetail}>
            <Plate uri={photo.url} aspectRatio={photo.aspectRatio} />
          </Pressable>
        </>
      )}
      {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  post: {
    gap: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.neutral600,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: 13.5,
    lineHeight: 21.5,
    color: colors.text,
  },
});
