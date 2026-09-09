import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface PlateProps {
  /** 그릴 이미지 URL — 없으면 fallback (포스터 없는 영상 등) */
  uri?: string;
  /** 고정 높이 또는 비율 중 하나를 지정 */
  height?: number;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  /** 기본 cover — 미리보기처럼 잘리면 안 되는 곳은 contain */
  contentFit?: 'cover' | 'contain';
  /** uri 가 없을 때 대신 그릴 것 */
  fallback?: ReactNode;
}

/** 사진 표시 — 매트·테두리 없이 사진만 (웹과 동일) */
export function Plate({ uri, height, aspectRatio, style, contentFit = 'cover', fallback = null }: PlateProps) {
  return (
    <View style={[styles.frame, height != null ? { height } : { aspectRatio }, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} contentFit={contentFit} transition={200} cachePolicy="memory-disk" recyclingKey={uri} />
      ) : (
        fallback
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
  },
  image: {
    flex: 1,
    backgroundColor: colors.accent100,
  },
});
