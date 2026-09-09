import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, iconStroke } from '../theme';

/** 상세 화면의 영상 재생 — 처음엔 포스터+중앙 ▶, 누르면 재생 (시스템 컨트롤·전체화면·PiP) */
export function VideoPlate({
  uri,
  posterUri,
  aspectRatio,
  active = true,
}: {
  uri: string;
  posterUri?: string | null;
  aspectRatio: number;
  /** 지금 보고 있는 페이지인지 — 스와이프로 벗어나면 재생을 멈춘다 */
  active?: boolean;
}) {
  const [started, setStarted] = useState(false);
  // useCaching — 한 번 받은 영상은 기기에 남겨 다시 볼 때 network 를 타지 않는다
  const player = useVideoPlayer({ uri, useCaching: true }, (p) => {
    p.loop = false;
    // 앞으로 15초치를 미리 받아 둔다 — 잠깐 끊기는 구간에서 재생이 멈추지 않게
    p.bufferOptions = { preferredForwardBufferDuration: 15, waitsToMinimizeStalling: true };
  });

  // 버퍼가 비면 status 가 loading 으로 떨어진다 — 멈춘 것처럼 보이지 않게 스피너를 얹는다
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  // 옆 사진으로 넘어가면 소리만 계속 나거나 여러 영상이 동시에 디코딩되는 일이 없게 멈춘다
  useEffect(() => {
    if (!active) pause(player);
  }, [active, player]);

  // 상세는 탭 안에 있어 화면을 나가도 언마운트되지 않는다 — 포커스를 잃으면 직접 멈춰야 소리가 따라다니지 않는다.
  // PiP 로 띄운 영상은 화면을 나가서도 계속 보는 게 목적이므로 그대로 둔다.
  const inPictureInPicture = useRef(false);
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!inPictureInPicture.current) pause(player);
      };
    }, [player]),
  );

  return (
    <View style={[styles.box, { aspectRatio: aspectRatio || 1 }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        allowsFullscreen
        allowsPictureInPicture
        onPictureInPictureStart={() => (inPictureInPicture.current = true)}
        onPictureInPictureStop={() => (inPictureInPicture.current = false)}
      />
      {started && status === 'loading' ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}
      {started && status === 'error' ? (
        <Pressable
          style={styles.statusOverlay}
          accessibilityRole="button"
          accessibilityLabel="영상 다시 불러오기"
          onPress={() => {
            player.replace({ uri, useCaching: true });
            player.play();
          }}
        >
          <Text style={styles.errorText}>영상을 불러오지 못했어요.</Text>
          <Text style={styles.retryText}>다시 시도</Text>
        </Pressable>
      ) : null}
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

/** 이미 해제된 플레이어에 pause 를 부르면 던진다 — 언마운트 직전 정리에서도 안전하게 */
function pause(player: { pause: () => void }): void {
  try {
    player.pause();
  } catch {
    // 해제된 플레이어 — 이미 멈춘 것과 같다
  }
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
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.white,
  },
  retryText: {
    fontSize: 13,
    color: colors.white,
    textDecorationLine: 'underline',
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
