import { unregisterPushToken } from '../api/push';

/** 마지막으로 서버에 등록한 이 기기의 Expo Push Token — 로그아웃 시 해제용 (세션 스토어와 순환 참조를 피하려고 분리) */
let registeredToken: string | null = null;

export const getRegisteredPushToken = () => registeredToken;
export const setRegisteredPushToken = (token: string | null) => {
  registeredToken = token;
};

/** 로그아웃 직전에 호출 — 이 기기 토큰만 서버에서 지운다 (실패해도 무시) */
export async function unregisterCurrentPushToken(): Promise<void> {
  const token = registeredToken;
  registeredToken = null;
  if (!token) return;
  await unregisterPushToken(token).catch(() => {});
}
