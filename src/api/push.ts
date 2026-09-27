import { request } from './client';

/** 이 기기의 Expo Push Token 을 서버에 등록 (로그인 후) */
export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  await request<null>('/ongi/push-tokens', { method: 'POST', body: JSON.stringify({ token, platform }) });
}

/** 로그아웃 시 이 기기 토큰만 해제 */
export async function unregisterPushToken(token: string): Promise<void> {
  await request<null>('/ongi/push-tokens', { method: 'DELETE', body: JSON.stringify({ token }) });
}

/** 푸시 종류별 수신 설정 — 서버에 저장돼 모든 기기에 공통. 문의 답변·운영 알림은 항상 온다 */
export interface PushPreferences {
  /** 새 사진·영상 */
  photo: boolean;
  /** 한마디(댓글) */
  comment: boolean;
  /** 좋아요 */
  like: boolean;
  /** 일정 등록·변경·리마인더 */
  event: boolean;
  /** 가족 소식 (새 구성원 참여) */
  family: boolean;
  /** 채팅 새 메시지 */
  chat: boolean;
}

export const PUSH_PREFERENCE_ITEMS: { key: keyof PushPreferences; label: string }[] = [
  { key: 'photo', label: '새 사진·영상' },
  { key: 'comment', label: '댓글' },
  { key: 'like', label: '좋아요' },
  { key: 'event', label: '일정' },
  { key: 'family', label: '가족 참여' },
  { key: 'chat', label: '채팅' },
];

export async function getPushPreferences(): Promise<PushPreferences> {
  return request<PushPreferences>('/ongi/push-preferences');
}

/** 바꿀 항목만 보내면 된다 — 서버가 나머지는 유지하고 전체를 돌려준다 */
export async function updatePushPreferences(patch: Partial<PushPreferences>): Promise<PushPreferences> {
  return request<PushPreferences>('/ongi/push-preferences', { method: 'PUT', body: JSON.stringify(patch) });
}
