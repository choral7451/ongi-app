import { Play } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, iconStroke } from '../../theme';

/**
 * 포스터가 없는 영상 자리표시자 — 어두운 판 위에 ▶.
 * mp4 URL 을 이미지로 그리면 빈 칸이 되므로, 영상임을 알 수 있게 대신 그린다.
 */
export function VideoPlaceholder({ size = 22, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.box, style]}>
      <Play size={size} color={colors.white} fill={colors.white} strokeWidth={iconStroke} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral900,
  },
});
