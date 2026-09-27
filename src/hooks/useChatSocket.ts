import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { BASE_URL } from '../api/client';
import { getTokens } from '../api/token';
import { useSession } from '../store/session';
import { chatKeys } from './queries';

type RoomPayload = { roomId?: string };

/**
 * 채팅 실시간 연결 — 로그인한 동안 서버(/ongi-chat)에 붙어 있고, 이벤트가 오면 해당 목록을 다시 불러온다.
 * 이벤트에는 방 id 만 실려 오므로 내용은 항상 REST 로 받는다.
 * 서버가 2대라 polling 없이 websocket 으로만 붙는다 (polling 은 같은 서버로 묶어 주는 설정이 필요).
 * 토큰이 만료돼 서버가 끊으면 REST 호출로 토큰을 갱신한 뒤 점점 늦춰 가며 다시 붙는다.
 */
export function useChatSocket() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const invalidate = (keys: readonly (readonly unknown[])[]) => keys.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
    const invalidateAll = () => invalidate([chatKeys.rooms, chatKeys.unread, ['chatRoom'], ['chatMessages']]);

    const socket = io(`${BASE_URL}/ongi-chat`, {
      transports: ['websocket'],
      auth: (cb) => cb({ token: getTokens()?.accessToken ?? '' }),
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,
    });

    socket.on('chat:message', ({ roomId }: RoomPayload) => {
      invalidate([chatKeys.rooms, chatKeys.unread]);
      if (roomId) invalidate([chatKeys.messages(roomId)]);
    });
    socket.on('chat:read', ({ roomId }: RoomPayload) => {
      if (roomId) invalidate([chatKeys.messages(roomId)]);
    });
    socket.on('chat:room', ({ roomId }: RoomPayload) => {
      invalidate([chatKeys.rooms, chatKeys.unread]);
      if (roomId) invalidate([chatKeys.room(roomId), chatKeys.messages(roomId)]);
    });

    // 끊겨 있던 동안 놓친 이벤트가 있을 수 있으니 다시 붙으면 채팅 캐시를 통째로 새로 고친다
    let connectedOnce = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    socket.on('connect', () => {
      if (connectedOnce) invalidateAll();
      connectedOnce = true;
      retries = 0;
    });
    // 서버가 끊은 경우(토큰 만료·세션 없음)는 자동 재연결되지 않는다 — REST 호출로 토큰을 갱신할 기회를 준 뒤 다시 붙는다
    socket.on('disconnect', (reason) => {
      if (reason !== 'io server disconnect') return;
      const delay = Math.min(30_000, 3_000 * 2 ** retries);
      retries += 1;
      retryTimer = setTimeout(() => {
        void queryClient.refetchQueries({ queryKey: chatKeys.unread }).finally(() => socket.connect());
      }, delay);
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      if (!socket.connected) socket.connect();
      invalidate([chatKeys.rooms, chatKeys.unread]);
    });

    return () => {
      sub.remove();
      if (retryTimer) clearTimeout(retryTimer);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient]);
}
