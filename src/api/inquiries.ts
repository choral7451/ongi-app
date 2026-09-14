import type { Inquiry } from '../types';
import { post, request } from './client';

/** 내 문의와 운영자 답변 (최근 순) */
export async function getMyInquiries(): Promise<Inquiry[]> {
  const result = await request<{ inquiries: Inquiry[] }>('/ongi/inquiries');
  return result.inquiries;
}

/** 문의 남기기 — 운영자가 확인 후 답변하면 푸시로 알려준다 */
export function createInquiry(content: string): Promise<Inquiry> {
  return post<Inquiry>('/ongi/inquiries', { content });
}
