import type { Member } from '../types';
import { request } from './client';
import { getGroup } from './groups';

/** 현재 그룹 정보 — 가족 탭 헤더/초대 카드에서 사용 */
export const getFamily = getGroup;

export async function getMembers(groupId: string): Promise<Member[]> {
  const result = await request<{ members: Member[] }>(`/ongi/groups/${groupId}/members`);
  return result.members;
}

export function getMember(id: string): Promise<Member | undefined> {
  return request<Member>(`/ongi/members/${id}`);
}
