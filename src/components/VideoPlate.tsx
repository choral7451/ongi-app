import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, iconStroke } from '../theme';

/** 상세 화면의 영상 재생 — 처음엔 포스터+중앙 ▶, 누르면 재생 (시스템 컨트롤·전체화면·PiP) */
export function VideoPlate({ uri, posterUri, aspectRatio }: { uri: string; posterUri?: string | null; aspectRatio: number }) {
  const [started, setStarted] = useState(false);
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
      {!started ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="영상 재생"
          style={styles.posterOverlay}
          onPress={() => {
            setStarted(true);
            player.play();
          }}
        >
          {posterUri ? <Image source={{ uri: posterUri }} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
          <View style={styles.playCircle}>
            <Play size={26} color={colors.white} fill={colors.white} strokeWidth={iconStroke} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.neutral900,
  },
  posterOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral900,
  },
  playCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(16,17,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    // ▶ 삼각형이 왼쪽으로 치우쳐 보이는 것 보정
    paddingLeft: 4,
  },
});
