import { Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import {
  NotoSerifKR_400Regular,
  NotoSerifKR_600SemiBold,
  NotoSerifKR_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/noto-serif-kr';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSession } from '../store/session';
import { colors } from '../theme';
import { usePushNotifications } from '../hooks/usePushNotifications';

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

  useEffect(() => {
    if (fontsReady && !isHydrating) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, isHydrating]);

  if (!fontsReady || isHydrating) return null;

  return (
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
          <Stack.Screen name="groups" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* 약관·개인정보 처리방침은 로그인 전에도 열람 가능 */}
        <Stack.Screen name="legal/[slug]" />
      </Stack>
    </QueryClientProvider>
  );
}
