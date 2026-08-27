import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/push';
import { getRegisteredPushToken, setRegisteredPushToken } from '../push/token';
import { useSession } from '../store/session';

// 앱이 켜져 있을 때도 배너로 보여준다
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function fetchExpoPushToken(): Promise<string | null> {
  // 시뮬레이터는 푸시 토큰을 받을 수 없다
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return data;
}

/**
 * 로그인 상태가 되면 권한을 묻고 푸시 토큰을 서버에 등록한다.
 * 알림을 탭하면 페이로드(groupId, photoId)로 해당 사진 상세로 이동.
 */
export function usePushNotifications() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  const router = useRouter();
  const registering = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || registering.current) return;
    registering.current = true;
    (async () => {
      try {
        const token = await fetchExpoPushToken();
        if (token && token !== getRegisteredPushToken()) {
          await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
          setRegisteredPushToken(token);
        }
      } catch {
        // 권한 거부·네트워크 실패는 조용히 무시 — 다음 로그인 때 다시 시도
      } finally {
        registering.current = false;
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      const groupId = typeof data?.groupId === 'string' ? data.groupId : '';
      const photoId = typeof data?.photoId === 'string' ? data.photoId : '';
      if (groupId) setActiveGroup(groupId);
      if (photoId) router.push({ pathname: '/photo/[id]', params: { id: photoId, ctx: 'feed' } });
      else router.push('/');
    };
    // 종료 상태에서 알림으로 켜진 경우
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response.notification.request.content.data as Record<string, unknown>);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data as Record<string, unknown>);
    });
    return () => sub.remove();
  }, [router, setActiveGroup]);
}
