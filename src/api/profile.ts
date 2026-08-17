import type { LegalDoc, ProfileStats, StorageInfo } from '../types';
import { request } from './client';

export function getProfileStats(): Promise<ProfileStats> {
  return request<ProfileStats>('/ongi/users/me/stats');
}

export function getStorageInfo(): Promise<StorageInfo> {
  return request<StorageInfo>('/ongi/users/me/storage');
}

/** 약관·정책 — 공개 엔드포인트라 로그인 전에도 조회 가능 */
export function getLegalDoc(slug: string): Promise<LegalDoc> {
  return request<LegalDoc>(`/ongi/legal/${slug}`);
}

/** 회원탈퇴 — 계정 소프트 삭제 + 발급된 토큰 무효화 */
export async function deleteAccount(): Promise<void> {
  await request<null>('/ongi/users/me', { method: 'DELETE' });
}
