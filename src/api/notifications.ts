import type { Notification } from '../types';
import { post, request } from './client';

/** 내 알림 목록 (최신순 50개) */
export async function getNotifications(): Promise<Notification[]> {
  const result = await request<{ notifications: Notification[] }>('/ongi/notifications');
  return result.notifications;
}

/** 알림 모두 읽음 처리 */
export async function markAllRead(): Promise<void> {
  await post<null>('/ongi/notifications/read');
}
