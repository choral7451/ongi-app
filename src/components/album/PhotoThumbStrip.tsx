import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { displayImageUrl } from '../../utils/photoDisplay';
import { VideoPlaceholder } from '../ui/VideoPlaceholder';
import type { Photo } from '../../types';

const MAX = 7;

/** 시트 안 "이 사진들" 미리보기 — 최대 7장 + 나머지 장수 */
export function PhotoThumbStrip({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null;
  const shown = photos.slice(0, MAX);
  const rest = photos.length - shown.length;
  return (
    <View style={styles.row}>
      {shown.map((p) => {
        const uri = displayImageUrl(p);
        return uri ? (
          <Image key={p.id} source={{ uri }} style={styles.thumb} contentFit="cover" cachePolicy="memory-disk" recyclingKey={uri} />
        ) : (
          <VideoPlaceholder key={p.id} style={styles.thumb} />
        );
      })}
      {rest > 0 ? (
        <View style={[styles.thumb, styles.more]}>
          <Text style={styles.moreText}>+{rest}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 3,
    backgroundColor: colors.neutral200,
  },
  more: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
