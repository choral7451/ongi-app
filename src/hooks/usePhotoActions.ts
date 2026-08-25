import { Alert } from 'react-native';
import type { Member, Photo } from '../types';
import { alertError, confirm, promptReason, REPORT_DONE_MESSAGE, showActions } from '../utils/dialogs';
import { useBlockMember, useDeletePhoto, useMembers, useReport } from './queries';

/**
 * 사진 ⋯ 메뉴 — 삭제(작성자·관리자) · 신고 · 작성자 차단.
 * App Store 1.2 (UGC) 요건: 신고 · 차단 · 콘텐츠 삭제 수단을 콘텐츠 바로 옆에 둔다.
 */
export function usePhotoActions(onDeleted?: () => void) {
  const members = useMembers();
  const deletePhoto = useDeletePhoto();
  const report = useReport();
  const block = useBlockMember();

  return (photo: Photo) => {
    const me = members.data?.find((m) => m.isMe);
    const author: Member | undefined = members.data?.find((m) => m.id === photo.authorId);
    const isMine = me?.id === photo.authorId;
    const canDelete = isMine || me?.role === 'admin';

    showActions('사진', [
      ...(canDelete
        ? [
            {
              label: '사진 삭제',
              destructive: true,
              onPress: () =>
                confirm('사진 삭제', '이 사진과 댓글이 모두 삭제되며 되돌릴 수 없어요.', '삭제', () =>
                  deletePhoto.mutate(photo.id, { onSuccess: onDeleted, onError: alertError('삭제 실패') }),
                ),
            },
          ]
        : []),
      ...(!isMine
        ? [
            {
              label: '사진 신고',
              onPress: () =>
                promptReason('사진 신고', (reason) =>
                  report.mutate(
                    { targetType: 'photo', targetId: photo.id, reason },
                    { onSuccess: () => Alert.alert('신고 완료', REPORT_DONE_MESSAGE), onError: alertError('신고 실패') },
                  ),
                ),
            },
            {
              label: `${author?.name ?? '작성자'} 차단`,
              destructive: true,
              onPress: () =>
                confirm(
                  '구성원 차단',
                  `${author?.name ?? '이 구성원'}의 사진과 댓글이 더 이상 보이지 않아요. 가족 탭에서 언제든 해제할 수 있어요.`,
                  '차단',
                  () => block.mutate(photo.authorId, { onSuccess: onDeleted, onError: alertError('차단 실패') }),
                ),
            },
          ]
        : []),
    ]);
  };
}
