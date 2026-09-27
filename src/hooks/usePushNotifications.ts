import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { getActiveChatRoom } from '../store/chat';
import { usePushStore } from '../store/push';
import { useSession } from '../store/session';
import { navigateForPushData } from '../utils/pushNavigation';

// 앱이 켜져 있을 때도 배너로 보여준다 — 단, 지금 보고 있는 대화방의 새 메시지는 화면에 바로 보이므로 띄우지 않는다
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const inOpenRoom = data?.type === 'chat' && typeof data.roomId === 'string' && data.roomId === getActiveChatRoom();
    return {
      shouldShowBanner: !inOpenRoom,
      shouldShowList: !inOpenRoom,
      shouldPlaySound: false,
      shouldSetBadge: false,
    };
  },
});

/**
 * 로그인 상태가 되면 (앱 내 스위치가 켜져 있을 때) 권한을 묻고 푸시 토큰을 서버에 등록한다.
 * 앱이 다시 활성화될 때도 동기화해, 기기 설정에서 알림을 켜고 돌아온 경우를 잡는다.
 * 알림을 탭하면 페이로드(groupId, photoId)로 해당 사진 상세로 이동.
 * 앱이 활성화되면 알림창에 쌓인 알림과 아이콘 배지를 비운다 — 안드로이드 홈 아이콘 숫자는 알림창 개수라 이걸 지워야 사라진다.
 * 놓친 소식은 앱 내 알림 목록(종 아이콘)에 남는다.
 */
export function usePushNotifications() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const hydrate = usePushStore((s) => s.hydrate);
  const sync = usePushStore((s) => s.sync);
  const router = useRouter();
  const queryClient = useQueryClient();

  /** 푸시가 알린 새 소식이 화면에 바로 보이게 — 사진·댓글·일정 관련 캐시를 통째로 stale 처리 */
  const invalidateForPush = () => {
    for (const key of ['feed', 'albums', 'albumPhotos', 'unfiledPhotos', 'comments', 'events', 'members', 'photo', 'inquiries', 'notifications', 'notificationsUnseenCount', 'chatRooms', 'chatUnread', 'chatMessages']) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void hydrate().then(() => sync());
    void clearDeliveredNotifications();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void sync();
        void clearDeliveredNotifications();
      }
    });
    return () => sub.remove();
  }, [isAuthenticated, hydrate, sync]);

  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      invalidateForPush();
      navigateForPushData(router, data);
    };
    // 종료 상태에서 알림으로 켜진 경우
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) open(response.notification.request.content.data as Record<string, unknown>);
    });
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      open(response.notification.request.content.data as Record<string, unknown>);
    });
    // 앱이 켜져 있는 동안 배너로 도착한 푸시 — 탭하지 않아도 관련 목록이 새 소식으로 갱신되게
    const receivedSub = Notifications.addNotificationReceivedListener(() => invalidateForPush());
    return () => {
      sub.remove();
      receivedSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);
}

/** 알림창의 온기 알림을 모두 지우고 아이콘 배지를 0 으로 — 실패해도 조용히 (권한 없음·시뮬레이터) */
export async function clearDeliveredNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {
    // 알림 권한이 없거나 지원하지 않는 환경
  }
}
