import { memo } from 'react';
import { useRouter } from 'expo-router';
import { Heart, MessageCircle, MoreHorizontal, Play } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useToggleLike } from '../../hooks/queries';
import { usePhotoActions } from '../../hooks/usePhotoActions';
import { colors, iconStroke } from '../../theme';
import type { Album, Member, Photo } from '../../types';
import { formatTime } from '../../utils/format';
import { displayImageUrl } from '../../utils/photoDisplay';
import { Avatar } from '../ui/Avatar';
import { Plate } from '../ui/Plate';
import { VideoPlaceholder } from '../ui/VideoPlaceholder';

interface FeedPostProps {
  photo: Photo;
  author?: Member;
  album?: Album;
  /** 사진을 캡션/작성자보다 위에 배치할지 (디자인의 두 가지 카드 변형) */
  photoFirst?: boolean;
}

/** 홈 피드의 게시물 하나 — 사진 · 작성자 · 반응 · 캡션 */
export const FeedPost = memo(FeedPostInner);

function FeedPostInner({ photo, author, album, photoFirst = true }: FeedPostProps) {
  const router = useRouter();
  const toggleLike = useToggleLike();
  const openActions = usePhotoActions();

  const openDetail = () => router.push({ pathname: '/photo/[id]', params: { id: photo.id, ctx: 'feed' } });

  const authorRow = (
    <View style={styles.authorRow}>
      <Avatar name={author?.name ?? '?'} uri={author?.avatarUrl} />
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
      <Pressable style={styles.more} onPress={() => openActions(photo)} accessibilityLabel="더보기" hitSlop={8}>
        <MoreHorizontal size={16} color={colors.neutral600} strokeWidth={iconStroke} />
      </Pressable>
    </View>
  );

  // 영상은 포스터 위에 ▶ 배지 + 길이 표시 — 재생은 상세에서
  const posterUri = displayImageUrl(photo);
  const media = (
    <Pressable onPress={openDetail}>
      <View>
        {posterUri ? (
          <Plate uri={posterUri} aspectRatio={photo.aspectRatio} />
        ) : (
          // 포스터 없는 영상 — mp4 를 이미지로 그리면 빈 칸이 된다
          <View style={{ aspectRatio: photo.aspectRatio || 1 }}>
            <VideoPlaceholder size={30} />
          </View>
        )}
        {photo.mediaType === 'video' ? (
          <View style={styles.videoBadge}>
            <Play size={11} color={colors.white} fill={colors.white} strokeWidth={iconStroke} />
            {photo.durationSeconds ? (
              <Text style={styles.videoBadgeText}>
                {Math.floor(photo.durationSeconds / 60)}:{String(photo.durationSeconds % 60).padStart(2, '0')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View style={styles.post}>
      {photoFirst ? (
        <>
          {media}
          {authorRow}
        </>
      ) : (
        <>
          {authorRow}
          {media}
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
  videoBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(16,17,20,0.6)',
  },
  videoBadgeText: {
    fontSize: 11,
    color: colors.white,
    fontVariant: ['tabular-nums'],
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
  more: {
    marginLeft: 4,
  },
  caption: {
    fontSize: 13.5,
    lineHeight: 21.5,
    color: colors.text,
  },
});
