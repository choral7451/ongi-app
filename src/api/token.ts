import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * 토큰 저장소 — 네이티브는 expo-secure-store, 웹은 localStorage.
 * 메모리 캐시를 두고 요청 헤더에서는 동기적으로 읽습니다.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const STORAGE_KEY = 'ongi.tokens';

let cached: AuthTokens | null = null;

export function getTokens(): AuthTokens | null {
  return cached;
}

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  cached = tokens;
  const value = JSON.stringify(tokens);
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, value);
    } catch {
      // 시크릿 모드 등 저장 불가 환경 — 메모리로만 유지
    }
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, value);
  }
}

export async function loadTokens(): Promise<AuthTokens | null> {
  if (cached) return cached;
  try {
    const value =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    cached = value ? (JSON.parse(value) as AuthTokens) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export async function clearTokens(): Promise<void> {
  cached = null;
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    } catch {
      // 무시
    }
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }
}
