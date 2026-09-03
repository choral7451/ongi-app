import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { usePushStore } from '../store/push';
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

/**
 * 로그인 상태가 되면 (앱 내 스위치가 켜져 있을 때) 권한을 묻고 푸시 토큰을 서버에 등록한다.
 * 앱이 다시 활성화될 때도 동기화해, iOS 설정에서 알림을 켜고 돌아온 경우를 잡는다.
 * 알림을 탭하면 페이로드(groupId, photoId)로 해당 사진 상세로 이동.
 */
export function usePushNotifications() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  const hydrate = usePushStore((s) => s.hydrate);
  const sync = usePushStore((s) => s.sync);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) return;
    void hydrate().then(() => sync());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });
    return () => sub.remove();
  }, [isAuthenticated, hydrate, sync]);

  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      const groupId = typeof data?.groupId === 'string' ? data.groupId : '';
      const photoId = typeof data?.photoId === 'string' ? data.photoId : '';
      if (groupId) setActiveGroup(groupId);
      if (photoId) router.push({ pathname: '/photo/[id]', params: { id: photoId, ctx: 'feed' } });
      else if (data?.type === 'member_joined') router.push('/family');
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
