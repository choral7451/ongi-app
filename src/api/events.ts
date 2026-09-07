import type { FamilyEvent, Holiday } from '../types';
import { post, request } from './client';

export interface SaveEventPayload {
  title: string;
  /** calendarType 기준 날짜 YYYY-MM-DD */
  date: string;
  /** HH:MM — null 이면 하루 종일 */
  time: string | null;
  calendarType: 'solar' | 'lunar';
  repeatType: 'none' | 'weekly' | 'monthly' | 'yearly';
  memo: string | null;
  /** 등록·리마인드 푸시를 받을 사용자 id 목록 */
  notifyUserIds: string[];
}

/** [from, to] 범위의 발생일 목록 (양력) — 반복 일정은 발생일마다 한 건 */
export async function getEvents(groupId: string, from: string, to: string): Promise<FamilyEvent[]> {
  const result = await request<{ events: FamilyEvent[] }>(`/ongi/groups/${groupId}/events?from=${from}&to=${to}`);
  return result.events;
}

/** 해당 연도 한국 공휴일 — 대체공휴일·임시공휴일 포함 */
export async function getHolidays(year: number): Promise<Holiday[]> {
  const result = await request<{ holidays: Holiday[] }>(`/ongi/holidays?year=${year}`);
  return result.holidays;
}

export function createEvent(groupId: string, payload: SaveEventPayload): Promise<FamilyEvent> {
  return post<FamilyEvent>(`/ongi/groups/${groupId}/events`, payload);
}

export function updateEvent(eventId: string, payload: SaveEventPayload): Promise<FamilyEvent> {
  return request<FamilyEvent>(`/ongi/events/${eventId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteEvent(eventId: string): Promise<void> {
  await request<null>(`/ongi/events/${eventId}`, { method: 'DELETE' });
}
