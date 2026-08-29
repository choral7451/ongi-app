import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface PlateProps {
  uri: string;
  /** 고정 높이 또는 비율 중 하나를 지정 */
  height?: number;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  /** 기본 cover — 미리보기처럼 잘리면 안 되는 곳은 contain */
  contentFit?: 'cover' | 'contain';
}

/** 사진 표시 — 매트·테두리 없이 사진만 (웹과 동일) */
export function Plate({ uri, height, aspectRatio, style, contentFit = 'cover' }: PlateProps) {
  return (
    <View style={[styles.frame, height != null ? { height } : { aspectRatio }, style]}>
      <Image source={{ uri }} style={styles.image} contentFit={contentFit} transition={200} />
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
