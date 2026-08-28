import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { registerPushToken } from '../api/push';
import { getRegisteredPushToken, setRegisteredPushToken, unregisterCurrentPushToken } from '../push/token';

const PREF_KEY = 'ongi_push_enabled';

/**
 * 푸시 상태
 * - registered: 토큰이 서버에 등록됨 (정상)
 * - off: 사용자가 앱에서 끔
 * - denied: iOS 설정에서 알림이 꺼져 있음 → 설정 앱으로 안내
 * - unavailable: 시뮬레이터 등 토큰을 받을 수 없는 환경
 * - error: 등록 요청 실패 (네트워크 등)
 * - idle: 아직 시도 전
 */
export type PushStatus = 'idle' | 'registered' | 'off' | 'denied' | 'unavailable' | 'error';

interface PushState {
  /** 앱 내 스위치 값 — 가입 시 기본 켜짐 */
  enabled: boolean;
  status: PushStatus;
  /** 저장된 스위치 값 불러오기 (앱 시작 시 1회) */
  hydrate: () => Promise<void>;
  /** 스위치 변경 + 즉시 동기화. 반환값은 동기화 후 상태 */
  setEnabled: (enabled: boolean) => Promise<PushStatus>;
  /** 현재 스위치 값에 맞춰 토큰 등록/해제 (로그인 직후, 앱 활성화 시 호출) */
  sync: () => Promise<PushStatus>;
}

async function fetchExpoPushToken(): Promise<{ token: string | null; denied: boolean }> {
  if (!Device.isDevice) return { token: null, denied: false };
  const { status: existing } = await Notifications.getPermissionsAsync();
  const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return { token: null, denied: true };
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return { token: data, denied: false };
}

export const usePushStore = create<PushState>((set, get) => ({
  enabled: true,
  status: 'idle',
  hydrate: async () => {
    const saved = await SecureStore.getItemAsync(PREF_KEY).catch(() => null);
    set({ enabled: saved !== 'off' });
  },
  setEnabled: async (enabled) => {
    set({ enabled });
    await SecureStore.setItemAsync(PREF_KEY, enabled ? 'on' : 'off').catch(() => {});
    return get().sync();
  },
  sync: async () => {
    if (!get().enabled) {
      await unregisterCurrentPushToken();
      set({ status: 'off' });
      return 'off';
    }
    try {
      const { token, denied } = await fetchExpoPushToken();
      if (denied) {
        set({ status: 'denied' });
        return 'denied';
      }
      if (!token) {
        set({ status: 'unavailable' });
        return 'unavailable';
      }
      if (token !== getRegisteredPushToken()) {
        await registerPushToken(token, Platform.OS === 'android' ? 'android' : 'ios');
        setRegisteredPushToken(token);
      }
      set({ status: 'registered' });
      return 'registered';
    } catch {
      set({ status: 'error' });
      return 'error';
    }
  },
}));
