/**
 * Apple 로그인 — expo-apple-authentication.
 *
 * iOS 전용(네이티브 모듈, 개발 빌드 필요). 서버에는 identity token(JWT)을 보내고 서버가 Apple 공개키로 검증합니다.
 * 이름·이메일은 최초 로그인 1회만 내려오므로 이름은 함께 서버에 전달해 가입 시 사용합니다.
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

/** 사용자가 로그인 창을 닫은 경우 — 에러 알림 없이 조용히 중단 */
export class AppleSignInCancelled extends Error {
  constructor() {
    super('Apple 로그인이 취소됐어요.');
  }
}

export interface AppleCredential {
  identityToken: string;
  /** 최초 로그인 때만 값이 있음. 이후 로그인은 null */
  name: string | null;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function getAppleCredential(): Promise<AppleCredential> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple 로그인 정보를 받지 못했어요.');

    // 한국식 표기: 성+이름 붙여쓰기 (fullName 은 최초 로그인에만 채워짐)
    const family = credential.fullName?.familyName ?? '';
    const given = credential.fullName?.givenName ?? '';
    const name = `${family}${given}`.trim() || null;

    return { identityToken: credential.identityToken, name };
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') throw new AppleSignInCancelled();
    throw e;
  }
}
