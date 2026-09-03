/**
 * 카카오 네이티브 로그인 — @react-native-seoul/kakao-login.
 *
 * 네이티브 모듈이라 개발 빌드에서만 동작합니다.
 * Expo Go 등 모듈이 없는 환경에서는 null 을 돌려줘 서버의 개발용 로그인으로 폴백합니다.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** 사용자가 로그인 창을 닫은 경우 — 에러 알림 없이 조용히 중단 */
export class KakaoSignInCancelled extends Error {
  constructor() {
    super('카카오 로그인이 취소됐어요.');
  }
}

export async function getKakaoAccessToken(): Promise<string | null> {
  if (isExpoGo) return null; // 개발용 로그인 폴백

  let kakao: typeof import('@react-native-seoul/kakao-login');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    kakao = require('@react-native-seoul/kakao-login');
  } catch {
    return null;
  }

  try {
    const result = await kakao.login(); // 카카오톡 앱이 있으면 앱으로, 없으면 계정 웹뷰로
    return result.accessToken;
  } catch (e) {
    const message = e instanceof Error ? e.message.toLowerCase() : '';
    const code = (e as { code?: string })?.code ?? '';
    if (message.includes('cancel') || code === 'E_CANCELLED_OPERATION' || code === 'user_cancelled') {
      throw new KakaoSignInCancelled();
    }
    throw e;
  }
}
