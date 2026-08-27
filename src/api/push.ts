import { request } from './client';

/** 이 기기의 Expo Push Token 을 서버에 등록 (로그인 후) */
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  await request<null>('/ongi/push-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) });
}

/** 로그아웃 시 이 기기 토큰만 해제 */
export async function unregisterPushToken(token: string): Promise<void> {
  await request<null>('/ongi/push-tokens', { method: 'DELETE', body: JSON.stringify({ token }) });
}
