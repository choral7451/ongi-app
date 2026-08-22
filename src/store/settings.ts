import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * 앱 로컬 설정 — 기기에 저장되고 서버에는 전송하지 않습니다.
 * 알림 켬/끔은 푸시 알림 구현 시 발송 여부 판단에 사용할 예정.
 */

const NOTIFICATIONS_KEY = 'ongi.settings.notifications';

interface SettingsState {
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

async function persistNotifications(enabled: boolean): Promise<void> {
  const value = enabled ? '1' : '0';
  if (Platform.OS === 'web') {
    window.localStorage.setItem(NOTIFICATIONS_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(NOTIFICATIONS_KEY, value);
}

async function loadNotifications(): Promise<boolean> {
  const value =
    Platform.OS === 'web'
      ? window.localStorage.getItem(NOTIFICATIONS_KEY)
      : await SecureStore.getItemAsync(NOTIFICATIONS_KEY);
  return value !== '0'; // 기본값 켬
}

export const useSettings = create<SettingsState>((set) => ({
  notificationsEnabled: true,
  setNotificationsEnabled: (enabled) => {
    set({ notificationsEnabled: enabled });
    void persistNotifications(enabled);
  },
}));

// 앱 시작 시 저장된 값 복원
void loadNotifications().then((enabled) => useSettings.setState({ notificationsEnabled: enabled }));
