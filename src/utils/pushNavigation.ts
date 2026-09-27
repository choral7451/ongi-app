import type { Router } from 'expo-router';
import { useSession } from '../store/session';

/** 푸시를 탭했을 때와 앱 내 알림 목록에서 항목을 눌렀을 때 — 같은 페이로드로 같은 곳으로 간다 */
export function navigateForPushData(router: Router, data: Record<string, unknown> | undefined): void {
  const groupId = typeof data?.groupId === 'string' ? data.groupId : '';
  const photoId = typeof data?.photoId === 'string' ? data.photoId : '';
  const type = typeof data?.type === 'string' ? data.type : '';
  const roomId = typeof data?.roomId === 'string' ? data.roomId : '';
  if (type === 'chat' && roomId) {
    router.push({ pathname: '/chat/[id]', params: { id: roomId } });
    return;
  }
  if (groupId) useSession.getState().setActiveGroup(groupId);
  if (photoId) router.push({ pathname: '/photo/[id]', params: { id: photoId, ctx: 'feed' } });
  else if (type === 'member_joined') router.push('/family');
  else if (type.startsWith('event_')) router.push('/schedule');
  else if (type === 'inquiry_answered') router.push('/inquiries');
  else router.push('/');
}
