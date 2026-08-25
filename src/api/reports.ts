import type { ReportTargetType } from '../types';
import { post } from './client';

/** 부적절한 사진·댓글·구성원 신고 — 운영진이 24시간 내 검토한다 (이용약관) */
export function report(params: { targetType: ReportTargetType; targetId: string; reason: string }): Promise<null> {
  return post<null>('/ongi/reports', params);
}
