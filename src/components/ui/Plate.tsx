import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../../theme';

interface PlateProps {
  uri: string;
  /** 고정 높이 또는 비율 중 하나를 지정 */
  height?: number;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * 디자인 시스템 .plate — 매트 처리된 사진.
 * 6px 표면색 매트 + 1px 헤어라인 외곽선으로 액자 느낌을 냅니다.
 */
export function Plate({ uri, height, aspectRatio, style }: PlateProps) {
  return (
    <View style={[styles.frame, height != null ? { height } : { aspectRatio }, style]}>
      <Image source={{ uri }} style={styles.image} contentFit="cover" transition={200} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    padding: 6,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  image: {
    flex: 1,
    backgroundColor: colors.accent100,
  },
});
