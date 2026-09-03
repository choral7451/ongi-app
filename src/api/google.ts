/**
 * 구글 네이티브 로그인 — @react-native-google-signin/google-signin.
 *
 * 네이티브 모듈이라 개발 빌드(npx expo run:ios)에서만 동작합니다.
 * Expo Go 등 모듈이 없는 환경에서는 null 을 돌려줘 서버의 개발용 로그인으로 폴백합니다.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Google Cloud 콘솔의 iOS OAuth 클라이언트 ID (비밀 아님) */
const GOOGLE_IOS_CLIENT_ID = '446390529009-4v2v53ig6830u7h6splbi79r34uaj3n7.apps.googleusercontent.com';
/**
 * 웹 애플리케이션 OAuth 클라이언트 ID — Android 는 이 값이 webClientId 로 필요하다.
 * Android 에서 로그인이 되려면 같은 Google Cloud 프로젝트에 "Android" 유형 클라이언트(패키지명 + 서명 키 SHA-1)도 등록돼 있어야 한다.
 */
const GOOGLE_WEB_CLIENT_ID = '446390529009-mmvlcfo00f04nvt1uloi0glg00np6o4m.apps.googleusercontent.com';
/**
 * (기록) Android OAuth 클라이언트 — 코드에서 쓰지 않지만 콘솔 등록 완료 (2026-09-03).
 * 446390529009-fm7h7koggffc351a267mur2f5egkn25i.apps.googleusercontent.com
 * 패키지 com.ongifamily.app + EAS 서명키 SHA-1 (2F:06:...:C8:61) 로 검증된다.
 * Play App Signing 키 (스토어 배포용, 2026-09-03 등록):
 *   SHA-1 FF:59:F2:FC:91:46:8E:C1:D4:D1:70:44:6A:E3:5A:4B:63:F5:60:E9
 *   카카오 키 해시 /1ny/JFGjsHU0XBEauNaS2P1YOk=
 */

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
      webClientId: GOOGLE_WEB_CLIENT_ID,
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
