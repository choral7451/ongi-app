import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme';

export interface ToastContent {
  message: string;
  /** 오른쪽 링크 (예: 보러 가기) */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastProps {
  toast: ToastContent | null;
  /** 화면 아래에서 띄울 거리 — 선택 모드 하단 바 위로 올릴 때 사용 */
  bottom: number;
}

/**
 * 결과 안내 토스트 — Alert 처럼 흐름을 끊지 않고 아래에서 잠깐 보였다 사라진다.
 * 사라지는 시점은 부모가 toast 를 null 로 바꿔 정한다 (useToast 참고).
 */
export function Toast({ toast, bottom }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const lastRef = useRef<ToastContent | null>(null);
  if (toast) lastRef.current = toast;
  const shown = lastRef.current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: toast ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [toast, opacity]);

  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents={toast ? 'box-none' : 'none'}
      style={[styles.toast, { bottom, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} numberOfLines={2}>
        {shown.message}
      </Text>
      {shown.actionLabel && shown.onAction ? (
        <Pressable onPress={shown.onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{shown.actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1f2024',
  },
  message: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.white,
  },
  action: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent300,
  },
});
