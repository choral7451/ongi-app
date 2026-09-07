import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** 상세 화면의 영상 재생 — 시스템 컨트롤 사용, 사진 Plate 와 같은 비율 규칙 */
export function VideoPlate({ uri, aspectRatio }: { uri: string; aspectRatio: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.box, { aspectRatio: aspectRatio || 1 }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.neutral900,
  },
});
