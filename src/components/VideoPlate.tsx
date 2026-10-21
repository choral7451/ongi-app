import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Maximize, Pause, Play } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, iconStroke } from '../theme';

/** 재생 중 컨트롤을 띄워 두는 시간 — 지나면 영상만 보이게 숨긴다 */
const CONTROLS_HIDE_MS = 3000;

/**
 * 상세 화면의 영상 재생 — 처음엔 포스터+중앙 ▶, 누르면 재생.
 *
 * 인라인 컨트롤은 직접 그린다 — 시스템 컨트롤(nativeControls)이 일부 기기에서 보이지 않은 채
 * 탭만 먹어 재생·정지가 되던 문제가 있었다. 전체화면에서는 시스템 컨트롤을 쓴다.
 */
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const viewRef = useRef<VideoView>(null);

  // useCaching 은 쓰지 않는다 — iOS 캐시가 일부만 받아 둔 영상을 다시 열 때 데이터를 1바이트 어긋나게 이어 붙여
  // '영상을 불러오지 못했어요' 가 뜬다 (expo-video 3.0.16 CachedResource.requestBeginningOfData)
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    // 앞으로 15초치를 미리 받아 둔다 — 잠깐 끊기는 구간에서 재생이 멈추지 않게
    p.bufferOptions = { preferredForwardBufferDuration: 15, waitsToMinimizeStalling: true };
  });

  // 버퍼가 비면 status 가 loading 으로 떨어진다 — 멈춘 것처럼 보이지 않게 스피너를 얹는다
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { currentTime } = useEvent(player, 'timeUpdate', {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  const duration = player.duration;

  // 재생 중에는 잠시 뒤 컨트롤을 숨긴다 — 멈춰 있으면 계속 보인다
  useEffect(() => {
    if (!isPlaying || !controlsVisible) return;
    const timer = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, controlsVisible]);

  // 끝까지 보면 컨트롤을 다시 띄워 ▶ 로 처음부터 다시 볼 수 있게
  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => setControlsVisible(true));
    return () => subscription.remove();
  }, [player]);

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

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    // 끝난 영상은 처음부터
    if (duration > 0 && currentTime >= duration - 0.3) player.currentTime = 0;
    player.play();
  };

  const [barWidth, setBarWidth] = useState(0);
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <View style={[styles.box, { aspectRatio: aspectRatio || 1 }]}>
      <VideoView
        ref={viewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={fullscreen}
        allowsFullscreen
        allowsPictureInPicture
        onFullscreenEnter={() => setFullscreen(true)}
        onFullscreenExit={() => {
          setFullscreen(false);
          setControlsVisible(true);
        }}
        onPictureInPictureStart={() => (inPictureInPicture.current = true)}
        onPictureInPictureStop={() => (inPictureInPicture.current = false)}
      />
      {started && status !== 'error' ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel={controlsVisible ? '컨트롤 숨기기' : '컨트롤 보기'}
          onPress={() => setControlsVisible((visible) => !visible)}
        >
          {status === 'loading' ? (
            <View style={styles.statusOverlay} pointerEvents="none">
              <ActivityIndicator color={colors.white} />
            </View>
          ) : controlsVisible ? (
            <View style={styles.statusOverlay}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? '일시정지' : '재생'}
                style={styles.playCircle}
                onPress={togglePlay}
                hitSlop={8}
              >
                {isPlaying ? (
                  <Pause size={26} color={colors.white} fill={colors.white} strokeWidth={iconStroke} />
                ) : (
                  <Play size={26} color={colors.white} fill={colors.white} strokeWidth={iconStroke} style={styles.playIcon} />
                )}
              </Pressable>
            </View>
          ) : null}
          {controlsVisible ? (
            <View style={styles.bottomBar}>
              <Text style={styles.time}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Text>
              {/* 막대를 누른 위치로 이동 */}
              <Pressable
                style={styles.track}
                accessibilityRole="adjustable"
                accessibilityLabel="재생 위치"
                hitSlop={{ top: 12, bottom: 12 }}
                onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) => {
                  if (duration > 0 && barWidth > 0) {
                    player.currentTime = Math.max(0, Math.min(e.nativeEvent.locationX / barWidth, 1)) * duration;
                  }
                }}
              >
                <View style={styles.trackBase} />
                <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="전체화면"
                hitSlop={10}
                onPress={() => viewRef.current?.enterFullscreen().catch(() => {})}
              >
                <Maximize size={18} color={colors.white} strokeWidth={iconStroke} />
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {started && status === 'error' ? (
        <Pressable
          style={styles.statusOverlay}
          accessibilityRole="button"
          accessibilityLabel="영상 다시 불러오기"
          onPress={() => {
            player.replace(uri);
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
            <Play size={26} color={colors.white} fill={colors.white} strokeWidth={iconStroke} style={styles.playIcon} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 초 → m:ss (길이를 아직 모르면 0:00) */
function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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
  },
  // ▶ 삼각형이 왼쪽으로 치우쳐 보이는 것 보정
  playIcon: {
    marginLeft: 4,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(16,17,20,0.45)',
  },
  time: {
    fontSize: 12,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: 16,
    justifyContent: 'center',
  },
  trackBase: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
});
