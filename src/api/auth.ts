import { post, request } from './client';
import { getAppleCredential } from './apple';
import { getGoogleAccessToken } from './google';
import { clearTokens, saveTokens } from './token';

export type SocialProvider = 'kakao' | 'naver' | 'google' | 'apple';

export interface AuthUser {
  id: string;
  name: string;
  provider: SocialProvider;
}

interface LoginResponse {
  user: { id: string; name: string; provider: string };
  tokens: { accessToken: string; refreshToken: string };
}

/**
 * 소셜 로그인 — 백엔드(/ongi/auths/login)가 미가입 시 자동 가입 처리합니다.
 *
 * 구글: 네이티브 SDK 로 받은 access token 을 서버에 보내 검증합니다 (개발 빌드 필요).
 * 애플: identity token(JWT) + 최초 로그인 시 받은 이름을 보냅니다 (iOS 전용, 개발 빌드 필요).
 * 카카오·네이버: 아직 SDK 연동 전이라 token 없이 호출합니다(서버의 개발용 로그인).
 *  - 카카오: @react-native-seoul/kakao-login 또는 expo-auth-session
 *  - 네이버: @react-native-seoul/naver-login 또는 expo-auth-session
 */
export async function signInWithProvider(provider: SocialProvider): Promise<AuthUser> {
  let token: string | null = null;
  let name: string | null = null;
  if (provider === 'google') {
    token = await getGoogleAccessToken();
  } else if (provider === 'apple') {
    const credential = await getAppleCredential();
    token = credential.identityToken;
    name = credential.name;
  }

  const result = await post<LoginResponse>(
    '/ongi/auths/login',
    token ? { provider, token, ...(name ? { name } : {}) } : { provider },
  );
  await saveTokens(result.tokens);
  return { id: result.user.id, name: result.user.name, provider };
}

/** 저장된 토큰으로 내 정보 조회 — 앱 시작 시 세션 복원에 사용 */
export async function fetchMe(): Promise<{ id: string; name: string; provider: string }> {
  return request<{ id: string; name: string; provider: string }>('/ongi/users/me');
}

export async function signOut(): Promise<void> {
  await clearTokens();
}
