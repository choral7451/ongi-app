import { Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  NotoSerifKR_400Regular,
  NotoSerifKR_600SemiBold,
  NotoSerifKR_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/noto-serif-kr';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { compareVersions, getAppConfig } from '../api/config';
import { ForceUpdateScreen } from '../components/ForceUpdateScreen';
import { ActionSheetHost } from '../components/ActionSheetHost';
import { TextPromptHost } from '../components/TextPromptHost';
import { useSession } from '../store/session';
import { colors } from '../theme';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useChatSocket } from '../hooks/useChatSocket';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

/** 로그인 후 푸시 토큰 등록 + 알림 탭 이동 — 라우터가 준비된 트리 안에서 실행 */
function PushNotificationsBridge() {
  usePushNotifications();
  useChatSocket();
  return null;
}

export default function RootLayout() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const isHydrating = useSession((s) => s.isHydrating);
  const restore = useSession((s) => s.restore);
  const [fontsLoaded, fontError] = useFonts({
    NotoSerifKR_400Regular,
    NotoSerifKR_600SemiBold,
    NotoSerifKR_800ExtraBold,
    Fredoka_700Bold,
  });
  // 폰트 로드에 실패해도 시스템 폰트로 진행 — 스플래시에 갇히지 않게
  const fontsReady = fontsLoaded || !!fontError;

  // 앱 시작 시 저장된 토큰으로 세션 복원
  useEffect(() => {
    void restore();
  }, [restore]);

  // 앱이 다시 활성화되면 stale 쿼리를 재조회 — RN 은 웹과 달리 포커스 신호를 직접 연결해야 한다
  // (푸시를 보고 들어왔을 때 피드·앨범이 옛 캐시로 보이던 문제)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => focusManager.setFocused(status === 'active'));
    return () => sub.remove();
  }, []);

  // 최소 지원 버전 확인 — 조회 실패 시엔 그냥 통과 (네트워크 문제로 앱이 잠기면 안 됨)
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  useEffect(() => {
    getAppConfig()
      .then((config) => {
        const current = Constants.expoConfig?.version ?? '0.0.0';
        if (compareVersions(current, config.minVersion ?? config.minIosVersion) < 0) setForceUpdateUrl(config.storeUrl);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsReady && !isHydrating) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, isHydrating]);

  // 로그아웃 시 이전 계정의 캐시(me·그룹·피드 등)를 비워 다음 계정에 섞이지 않게
  useEffect(() => {
    if (!isHydrating && !isAuthenticated) queryClient.clear();
  }, [isHydrating, isAuthenticated]);

  if (!fontsReady || isHydrating) return null;

  if (forceUpdateUrl) {
    return (
      <>
        <StatusBar style="dark" />
        <ForceUpdateScreen storeUrl={forceUpdateUrl} />
      </>
    );
  }

  return (
    // 키보드 처리 — 안드로이드 edge-to-edge 에서는 시스템 adjustResize 가 동작하지 않아 이 라이브러리가 키보드 높이를 직접 다룬다
    <KeyboardProvider>
      <QueryClientProvider client={queryClient}>
        <PushNotificationsBridge />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="upload" options={{ presentation: 'modal' }} />
            <Stack.Screen name="event-form" options={{ presentation: 'modal' }} />
            <Stack.Screen name="event-detail" />
            <Stack.Screen name="groups" options={{ presentation: 'modal' }} />
            <Stack.Screen name="inquiries" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="push-settings" />
            <Stack.Screen name="chat/index" />
            <Stack.Screen name="chat/new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="chat/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* 약관·개인정보 처리방침은 로그인 전에도 열람 가능 */}
          <Stack.Screen name="legal/[slug]" />
        </Stack>
        {/* promptText 의 안드로이드 입력 모달 (iOS 는 Alert.prompt) */}
        <TextPromptHost />
        {/* showActions 의 안드로이드 하단 시트 (iOS 는 ActionSheetIOS) */}
        <ActionSheetHost />
      </QueryClientProvider>
    </KeyboardProvider>
  );
}
