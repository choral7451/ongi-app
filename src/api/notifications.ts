import type { AppNotification } from '../types';
import { post, request } from './client';

/** 최근 30일 알림 (최근 순) + 마지막으로 목록을 연 시각 — 이보다 뒤 항목이 "새로운 알림" */
export async function getNotifications(): Promise<{ notifications: AppNotification[]; seenAt: string | null }> {
  const result = await request<{ notifications: AppNotification[]; seenAt?: string }>('/ongi/notifications');
  return { notifications: result.notifications, seenAt: result.seenAt ?? null };
}

/** 종 아이콘 배지 숫자 — 마지막으로 연 뒤 생긴 알림 개수 */
export async function getUnseenNotificationCount(): Promise<number> {
  const result = await request<{ count: number }>('/ongi/notifications/unseen-count');
  return result.count;
}

/** 목록을 열었다 — 지금까지 알림을 전부 본 것으로 (인스타그램 방식) */
export async function markNotificationsSeen(): Promise<string> {
  const result = await post<{ seenAt: string }>('/ongi/notifications/seen');
  return result.seenAt;
}
