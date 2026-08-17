/**
 * 구글 네이티브 로그인 — @react-native-google-signin/google-signin.
 *
 * 네이티브 모듈이라 개발 빌드(npx expo run:ios)에서만 동작합니다.
 * Expo Go 등 모듈이 없는 환경에서는 null 을 돌려줘 서버의 개발용 로그인으로 폴백합니다.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Google Cloud 콘솔의 iOS OAuth 클라이언트 ID (비밀 아님) */
const GOOGLE_IOS_CLIENT_ID = '446390529009-4v2v53ig6830u7h6splbi79r34uaj3n7.apps.googleusercontent.com';

/** Expo Go(스토어 클라이언트)에서는 네이티브 모듈이 없으므로 require 자체를 건너뛴다 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** 사용자가 로그인 창을 닫은 경우 — 에러 알림 없이 조용히 중단 */
export class GoogleSignInCancelled extends Error {
  constructor() {
    super('구글 로그인이 취소됐어요.');
  }
}

let configured = false;

export async function getGoogleAccessToken(): Promise<string | null> {
  if (isExpoGo) return null; // 개발용 로그인 폴백 — 실제 구글 로그인은 개발 빌드(npx expo run:ios)에서

  let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin;
  try {
    // Expo Go 에는 네이티브 모듈이 없어 require 단계에서 실패 → 개발용 로그인 폴백 (정적 import 를 쓰면 앱 자체가 죽음)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    return null;
  }

  if (!configured) {
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      // Android 연동 시 웹 클라이언트 ID 를 webClientId 로 추가
    });
    configured = true;
  }

  try {
    const result = await GoogleSignin.signIn();
    if (result.type === 'cancelled') throw new GoogleSignInCancelled();

    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (e) {
    if (e instanceof GoogleSignInCancelled) throw e;
    // 구버전 SDK 는 취소를 예외로 던짐 (SIGN_IN_CANCELLED)
    if ((e as { code?: string })?.code === 'SIGN_IN_CANCELLED' || (e as { code?: string })?.code === '-5') {
      throw new GoogleSignInCancelled();
    }
    throw e;
  }
}
