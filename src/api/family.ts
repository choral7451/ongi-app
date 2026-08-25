import type { Member } from '../types';
import { post, request } from './client';
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

/** 구성원 차단 — 차단한 사람의 사진·댓글이 내 화면에서 사라진다 (상대에게는 알리지 않음) */
export function blockMember(memberId: string): Promise<null> {
  return post<null>(`/ongi/members/${memberId}/block`);
}

export async function unblockMember(memberId: string): Promise<void> {
  await request<null>(`/ongi/members/${memberId}/block`, { method: 'DELETE' });
}

/** 구성원 내보내기 — 그룹 관리자만 가능 (서버가 검증) */
export async function removeMember(params: { groupId: string; memberId: string }): Promise<void> {
  await request<null>(`/ongi/groups/${params.groupId}/members/${params.memberId}`, { method: 'DELETE' });
}
