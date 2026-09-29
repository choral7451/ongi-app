import Constants from 'expo-constants';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { sendActivityPing } from '../api/activity';
import { useSession } from '../store/session';
import { ActivityMeter, FLUSH_INTERVAL_MS } from '../utils/activityMeter';

/**
 * 로그인한 동안 앱을 화면에 띄워 둔 시간을 서버에 보낸다 — 운영자가 보는 지표(접속자·체류시간)용.
 * 앱을 켰을 때, 쓰는 동안 1분마다, 화면에서 내릴 때 보낸다. 실패해도 화면에는 아무 일도 없다.
 */
export function useActivityPing() {
  const isAuthenticated = useSession((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    const platform = Platform.OS;
    const appVersion = Constants.expoConfig?.version ?? '';
    const meter = new ActivityMeter((ping) => sendActivityPing({ ...ping, platform, appVersion }));

    if (AppState.currentState === 'active') meter.resume();
    const sub = AppState.addEventListener('change', (state) => (state === 'active' ? meter.resume() : meter.pause()));
    const timer = setInterval(() => meter.tick(), FLUSH_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(timer);
      meter.pause();
    };
  }, [isAuthenticated]);
}
