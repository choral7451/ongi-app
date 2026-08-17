/**
 * API 클라이언트 — artinfo-server 의 /ongi/* 엔드포인트를 호출합니다.
 *
 * 서버 응답은 전역 인터셉터가 { code, message, item } 봉투로 감싸므로
 * request() 는 item 만 풀어서 돌려줍니다.
 */
import { clearTokens, getTokens, saveTokens } from './token';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

interface Envelope<T> {
  code: string;
  message: string | null;
  item: T;
}

/** 401 동시 발생 시 갱신 요청이 한 번만 나가도록 공유 */
let refreshPromise: Promise<boolean> | null = null;

async function doFetch(path: string, init?: RequestInit): Promise<Response> {
  const tokens = getTokens();
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
      ...init?.headers,
    },
  });
}

async function parse<T>(res: Response, path: string): Promise<T> {
  if (!res.ok) {
    let message = `API ${res.status}: ${path}`;
    try {
      const body = await res.json();
      // 도메인 예외는 { code: 'ONGI-…', message } 형태 — 사용자에게 그대로 보여줄 수 있는 한국어 메시지
      if (typeof body?.message === 'string' && body.message) message = body.message;
    } catch {
      // 본문이 JSON 이 아니면 상태 코드 메시지 유지
    }
    throw new Error(message);
  }
  const envelope = (await res.json()) as Envelope<T>;
  return envelope.item;
}

async function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const tokens = getTokens();
      if (!tokens) return false;
      try {
        const res = await fetch(`${BASE_URL}/ongi/auths/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokens),
        });
        if (!res.ok) return false;
        const envelope = (await res.json()) as Envelope<{ accessToken: string; refreshToken: string }>;
        await saveTokens({
          accessToken: envelope.item.accessToken,
          refreshToken: envelope.item.refreshToken,
        });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  // access token 만료 → refresh 후 1회 재시도
  if (res.status === 401 && getTokens()) {
    const renewed = await refreshTokens();
    if (renewed) {
      res = await doFetch(path, init);
    } else {
      await clearTokens();
    }
  }

  return parse<T>(res, path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
}
