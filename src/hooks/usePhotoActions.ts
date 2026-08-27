import { Alert } from 'react-native';
import type { Member, Photo } from '../types';
import { alertError, confirm, promptReason, REPORT_DONE_MESSAGE, showActions } from '../utils/dialogs';
import { useAlbums, useBlockMember, useDeletePhoto, useMembers, useReport, useUpdatePhoto } from './queries';

/**
 * 사진 ⋯ 메뉴 — 수정·삭제(작성자·관리자) · 신고 · 작성자 차단.
 * App Store 1.2 (UGC) 요건: 신고 · 차단 · 콘텐츠 삭제 수단을 콘텐츠 바로 옆에 둔다.
 */
export function usePhotoActions(onDeleted?: () => void) {
  const members = useMembers();
  const deletePhoto = useDeletePhoto();
  const updatePhoto = useUpdatePhoto();
  const albums = useAlbums();
  const report = useReport();
  const block = useBlockMember();

  return (photo: Photo) => {
    // 구성원 정보가 아직 없으면 '내 사진'을 판별할 수 없어 자기 자신을 신고/차단하는 메뉴가 뜬다 — 로드 후에만 연다
    if (!members.data) {
      Alert.alert('잠시만요', '구성원 정보를 불러오는 중이에요. 잠시 후 다시 시도해 주세요.');
      return;
    }
    const me = members.data.find((m) => m.isMe);
    const author: Member | undefined = members.data?.find((m) => m.id === photo.authorId);
    const isMine = me?.id === photo.authorId;
    // 수정·삭제는 같은 규칙 — 작성자 본인 또는 관리자
    const canEdit = isMine || me?.role === 'admin';

    const editCaption = () =>
      Alert.prompt(
        '문구 수정',
        undefined,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '저장',
            onPress: (value?: string) => {
              const caption = value?.trim() || null;
              if (caption === (photo.caption ?? null)) return;
              updatePhoto.mutate({ photoId: photo.id, caption, albumId: photo.albumId ?? null }, { onError: alertError('수정 실패') });
            },
          },
        ],
        'plain-text',
        photo.caption ?? '',
      );

    const moveAlbum = () => {
      const list = albums.data ?? [];
      const choose = (albumId: string | null) => {
        if (albumId === (photo.albumId ?? null)) return;
        updatePhoto.mutate({ photoId: photo.id, caption: photo.caption ?? null, albumId }, { onError: alertError('앨범 변경 실패') });
      };
      showActions('앨범 선택', [
        { label: `앨범 없음 (미분류)${photo.albumId ? '' : '  ✓'}`, onPress: () => choose(null) },
        ...list.map((album) => ({
          label: `${album.title}${album.id === photo.albumId ? '  ✓' : ''}`,
          onPress: () => choose(album.id),
        })),
      ]);
    };

    showActions('사진', [
      ...(canEdit
        ? [
            { label: '문구 수정', onPress: editCaption },
            { label: '앨범 변경', onPress: moveAlbum },
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
