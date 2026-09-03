import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { albumsApi, familyApi, groupsApi, photosApi, profileApi, reportsApi } from '../api';
import type { UploadPayload } from '../api/photos';
import type { Comment, Photo } from '../types';
import { useActiveGroupId, useSession } from '../store/session';

/**
 * 그룹 스코프 데이터는 쿼리 키에 groupId가 들어갑니다.
 * 그룹을 전환하면(activeGroupId 변경) 해당 그룹의 캐시로 자동 전환됩니다.
 */
export const queryKeys = {
  myGroups: ['myGroups'] as const,
  feed: (groupId: string) => ['feed', groupId] as const,
  photo: (id: string) => ['photo', id] as const,
  comments: (photoId: string) => ['comments', photoId] as const,
  localPhotos: ['localPhotos'] as const,
  albums: (groupId: string) => ['albums', groupId] as const,
  people: (groupId: string) => ['people', groupId] as const,
  group: (groupId: string) => ['group', groupId] as const,
  members: (groupId: string) => ['members', groupId] as const,
  profileStats: ['profileStats'] as const,
};

// ── 그룹 ──────────────────────────────────────────────

export function useMyGroups() {
  return useQuery({ queryKey: queryKeys.myGroups, queryFn: groupsApi.getMyGroups });
}

/**
 * 활성 그룹 보정 — 로그인 직후(빈 값)이거나 탈퇴 등으로 목록에 없는 그룹을 보고 있으면
 * 내 첫 그룹으로 전환합니다. 탭 레이아웃에서 한 번만 호출하면 됩니다.
 */
export function useActiveGroupSync() {
  const { data: groups } = useMyGroups();
  const activeGroupId = useActiveGroupId();
  const setActiveGroup = useSession((s) => s.setActiveGroup);

  useEffect(() => {
    if (!groups || groups.length === 0) return;
    if (!activeGroupId || !groups.some((g) => g.id === activeGroupId)) {
      setActiveGroup(groups[0].id);
    }
  }, [groups, activeGroupId, setActiveGroup]);
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.createGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myGroups }),
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.renameGroup,
    onSuccess: (_group, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.joinGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myGroups }),
  });
}

// ── 그룹 스코프 콘텐츠 ─────────────────────────────────

/** 사진 목록 페이지 크기 — 스크롤 끝에서 이어서 불러온다 */
const PAGE_SIZE = 30;

/**
 * 사진 목록 공통 — 커서(직전 페이지 마지막 사진 id) 기반 무한 스크롤.
 * 캐시에는 InfiniteData<Photo[]> 로 들어가지만, 소비처가 그대로 쓰도록 data 는 페이지를 평탄화한 Photo[] 로 돌려준다.
 */
function usePhotoList(queryKey: readonly unknown[], fetchPage: (after: string | undefined) => Promise<Photo[]>, enabled: boolean) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    // 한 페이지가 PAGE_SIZE 보다 짧으면 마지막 페이지
    getNextPageParam: (lastPage) => (lastPage.length < PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.id),
    enabled,
  });
  const data = useMemo(() => query.data?.pages.flat(), [query.data]);
  return { ...query, data };
}

export function useFeed() {
  const groupId = useActiveGroupId();
  return usePhotoList(queryKeys.feed(groupId), (after) => photosApi.getFeed(groupId, { limit: PAGE_SIZE, after }), groupId.length > 0);
}

const PHOTO_LIST_KEYS = new Set(['feed', 'albumPhotos', 'unfiledPhotos', 'personPhotos']);

/** 목록 캐시의 실제 모양 — 무한 스크롤 페이지 배열 */
type PhotoListCache = InfiniteData<Photo[], string | undefined>;

/** 모든 사진 목록 캐시(페이지 안의 사진)를 바꿔치기 — pageParams 는 보존, InfiniteData 모양이 아니면 건너뛴다 */
function patchPhotoLists(queryClient: QueryClient, patch: (photo: Photo) => Photo) {
  queryClient.setQueriesData<PhotoListCache>(
    { predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) },
    (old) => (old && Array.isArray(old.pages) ? { ...old, pages: old.pages.map((page) => page.map(patch)) } : old),
  );
}

/** 모든 사진 목록 캐시에서 keep 이 false 인 사진 제거 — pageParams 는 보존, InfiniteData 모양이 아니면 건너뛴다 */
function filterPhotoLists(queryClient: QueryClient, keep: (photo: Photo) => boolean) {
  queryClient.setQueriesData<PhotoListCache>(
    { predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) },
    (old) => (old && Array.isArray(old.pages) ? { ...old, pages: old.pages.map((page) => page.filter(keep)) } : old),
  );
}

/** 목록 캐시(피드·앨범·미분류·인물)에 이미 있는 사진 — 상세 진입/스와이프 시 서버 응답 전에 바로 보여준다 */
function findPhotoInLists(queryClient: QueryClient, id: string): Photo | undefined {
  for (const [, data] of queryClient.getQueriesData<PhotoListCache>({ predicate: (q) => PHOTO_LIST_KEYS.has(q.queryKey[0] as string) })) {
    if (!data || !Array.isArray(data.pages)) continue;
    for (const page of data.pages) {
      const found = Array.isArray(page) ? page.find((p) => p.id === id) : undefined;
      if (found) return found;
    }
  }
  return undefined;
}

export function usePhoto(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.photo(id),
    queryFn: () => photosApi.getPhoto(id),
    enabled: !!id,
    // 스와이프로 넘길 때 정보 영역이 비었다 다시 그려지는 깜빡임 방지
    placeholderData: () => findPhotoInLists(queryClient, id),
  });
}

export function useAlbumPhotos(albumId: string) {
  return usePhotoList(['albumPhotos', albumId], (after) => photosApi.getPhotosByAlbum(albumId, { limit: PAGE_SIZE, after }), albumId.length > 0);
}

/** 앨범에 담기지 않은 사진 — 앨범 탭의 "미분류" */
export function useUnfiledPhotos(groupId: string) {
  return usePhotoList(['unfiledPhotos', groupId], (after) => photosApi.getUnfiledPhotos(groupId, { limit: PAGE_SIZE, after }), groupId.length > 0);
}

export function usePersonPhotos(personId: string) {
  return usePhotoList(['personPhotos', personId], (after) => photosApi.getPhotosByPerson(personId, { limit: PAGE_SIZE, after }), personId.length > 0);
}

export function useComments(photoId: string) {
  return useQuery({
    queryKey: queryKeys.comments(photoId),
    queryFn: () => photosApi.getComments(photoId),
    enabled: !!photoId,
    // 다음 사진 댓글이 오기 전까지 이전 목록을 유지해 레이아웃이 튀지 않게
    placeholderData: keepPreviousData,
  });
}

/** 기기 사진 보관함 — queryFn 이 권한을 요청하므로 사용자가 실제로 사진을 고르려 할 때만 enabled 로 켠다 */
/** 기기 갤러리 사진 — 60장씩 무한 스크롤. data 는 지금까지 불러온 페이지를 합친 모양 */
export function useLocalPhotos(enabled = true) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.localPhotos,
    queryFn: ({ pageParam }) => photosApi.getLocalPhotos(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasNextPage ? last.endCursor : undefined),
    enabled,
  });
  const pages = query.data?.pages;
  const data = pages
    ? { photos: pages.flatMap((p) => p.photos), limited: pages[0]?.limited ?? false }
    : undefined;
  return {
    data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useAlbums() {
  const groupId = useActiveGroupId();
  return useAlbumsOf(groupId);
}

/** 특정 그룹의 앨범 — 멀티 그룹 업로드처럼 활성 그룹 밖 데이터가 필요할 때 */
export function useAlbumsOf(groupId: string) {
  return useQuery({
    queryKey: queryKeys.albums(groupId),
    queryFn: () => albumsApi.getAlbums(groupId),
    enabled: groupId.length > 0,
  });
}

export function useCreateAlbum() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: (title: string) => albumsApi.createAlbum(groupId, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) }),
  });
}

export function useRenameAlbum() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: (params: { albumId: string; title: string }) => albumsApi.renameAlbum(params.albumId, params.title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) }),
  });
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: albumsApi.deleteAlbum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) });
      // 담겨 있던 사진이 미분류로 이동하므로 함께 갱신
      queryClient.invalidateQueries({ queryKey: ['unfiledPhotos', groupId] });
    },
  });
}

export function usePeople() {
  const groupId = useActiveGroupId();
  return usePeopleOf(groupId);
}

/** 특정 그룹의 인물 목록 */
export function usePeopleOf(groupId: string) {
  return useQuery({
    queryKey: queryKeys.people(groupId),
    queryFn: () => albumsApi.getPeople(groupId),
    enabled: groupId.length > 0,
  });
}

export function useFamily() {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: queryKeys.group(groupId),
    queryFn: () => familyApi.getFamily(groupId),
    enabled: groupId.length > 0,
  });
}

export function useMembers() {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: queryKeys.members(groupId),
    queryFn: () => familyApi.getMembers(groupId),
    enabled: groupId.length > 0,
  });
}

// ── 프로필 ────────────────────────────────────────────

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: profileApi.getMe });
}

/** 이름·프로필 이미지 변경 공통 — 내 정보와, 이름·이미지가 복사돼 있는 캐시들을 갱신 */
function useApplyProfileChange() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  const setCurrentUserName = useSession((s) => s.setCurrentUserName);
  return (me: profileApi.Me) => {
    queryClient.setQueryData(['me'], me);
    setCurrentUserName(me.name);
    // 구성원·인물에 전파된 이름/이미지 반영
    queryClient.invalidateQueries({ queryKey: queryKeys.members(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.people(groupId) });
  };
}

export function useUpdateMyName() {
  const apply = useApplyProfileChange();
  return useMutation({ mutationFn: profileApi.updateMyName, onSuccess: apply });
}

export function useUploadAvatar() {
  const apply = useApplyProfileChange();
  return useMutation({ mutationFn: profileApi.uploadAvatar, onSuccess: apply });
}

export function useProfileStats() {
  return useQuery({ queryKey: queryKeys.profileStats, queryFn: profileApi.getProfileStats });
}

export function useLegalDoc(slug: string) {
  return useQuery({
    queryKey: ['legal', slug],
    queryFn: () => profileApi.getLegalDoc(slug),
    staleTime: Infinity,
  });
}

export function useDeleteAccount() {
  return useMutation({ mutationFn: profileApi.deleteAccount });
}

// ── 변경 ──────────────────────────────────────────────

/** 같은 사진이 캐시에 여러 벌 존재한다 (피드·앨범·미분류·인물 목록) — 전부 함께 갱신해야 하트가 어긋나지 않는다 */

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: photosApi.toggleLike,
    onSuccess: (photo) => {
      queryClient.setQueryData(queryKeys.photo(photo.id), photo);
      // 리페치하면 새로고침 스피너로 화면이 튀므로, 모든 사진 목록 캐시에서 해당 사진만 바꿔치기
      patchPhotoLists(queryClient, (p) => (p.id === photo.id ? photo : p));
    },
  });
}

/** 다른 가족 공간에 사진 공유(복사) — 대상 공간의 피드·앨범·미분류 캐시를 갱신 */
export function useCopyPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: photosApi.copyPhotos,
    onSuccess: (_result, { targetGroupId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed(targetGroupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.albums(targetGroupId) });
      queryClient.invalidateQueries({ queryKey: ['albumPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['unfiledPhotos', targetGroupId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(targetGroupId) });
    },
  });
}

/** 사진 일괄 앨범 이동 — 옮긴 사진의 albumId 를 캐시에 반영하고 앨범 목록·앨범별/미분류 목록을 갱신 */
export function useMovePhotos() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: photosApi.movePhotos,
    onSuccess: ({ movedIds }, { albumId }) => {
      const moved = new Set(movedIds);
      const patch = (p: Photo): Photo => (moved.has(p.id) ? { ...p, albumId: albumId ?? undefined } : p);
      patchPhotoLists(queryClient, patch);
      for (const id of moved) queryClient.setQueryData<Photo>(queryKeys.photo(id), (old) => (old ? patch(old) : old));
      queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) });
      queryClient.invalidateQueries({ queryKey: ['albumPhotos'] });
      queryClient.invalidateQueries({ queryKey: ['unfiledPhotos'] });
    },
  });
}

/** 사진 일괄 삭제 — 삭제된 것만 캐시에서 제거하고 앨범/그룹 카운트를 갱신 */
export function useDeletePhotos() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: photosApi.deletePhotos,
    onSuccess: ({ deletedIds }) => {
      const deleted = new Set(deletedIds);
      for (const id of deleted) queryClient.removeQueries({ queryKey: queryKeys.photo(id) });
      filterPhotoLists(queryClient, (p) => !deleted.has(p.id));
      queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats });
    },
  });
}

/** 사진 삭제 — 상세·모든 사진 목록 캐시에서 제거하고 앨범/그룹 카운트를 갱신 */
export function useDeletePhoto() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: photosApi.deletePhoto,
    onSuccess: (_void, photoId) => {
      queryClient.removeQueries({ queryKey: queryKeys.photo(photoId) });
      filterPhotoLists(queryClient, (p) => p.id !== photoId);
      queryClient.invalidateQueries({ queryKey: queryKeys.albums(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.members(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats });
    },
  });
}

export function useDeleteComment(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => photosApi.deleteComment({ photoId, commentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(photoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.photo(photoId) });
      queryClient.invalidateQueries({ predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) });
    },
  });
}

export function useReport() {
  return useMutation({ mutationFn: reportsApi.report });
}

/** 차단/차단 해제 — 차단한 사람의 콘텐츠가 사라지므로 그룹 콘텐츠 전체를 다시 불러온다 */
function useInvalidateGroupContent() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.members(groupId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
    queryClient.invalidateQueries({ predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) });
    queryClient.invalidateQueries({ queryKey: ['comments'] });
  };
}

export function useBlockMember() {
  const invalidate = useInvalidateGroupContent();
  return useMutation({ mutationFn: familyApi.blockMember, onSuccess: invalidate });
}

export function useUnblockMember() {
  const invalidate = useInvalidateGroupContent();
  return useMutation({ mutationFn: familyApi.unblockMember, onSuccess: invalidate });
}

/** 가족 공간 나가기 — 내 그룹 목록을 갱신하고, 남은 그룹이 있으면 첫 번째로 전환 (없으면 비움) */
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.leaveGroup(groupId),
    onSuccess: async (_void, groupId) => {
      queryClient.removeQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.members(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.feed(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.albums(groupId) });
      const groups = await queryClient.fetchQuery({ queryKey: queryKeys.myGroups, queryFn: groupsApi.getMyGroups });
      setActiveGroup(groups[0]?.id ?? '');
      queryClient.invalidateQueries({ queryKey: queryKeys.profileStats });
    },
  });
}

export function useRemoveMember() {
  const invalidate = useInvalidateGroupContent();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: (memberId: string) => familyApi.removeMember({ groupId, memberId }),
    onSuccess: invalidate,
  });
}

export function useAddComment(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { authorId: string; text: string }) =>
      photosApi.addComment({ photoId, ...params }),
    onSuccess: (comment) => {
      // 리페치를 기다리지 않고 바로 목록에 붙여 방금 쓴 댓글이 즉시 보이게
      queryClient.setQueryData<Comment[]>(queryKeys.comments(photoId), (old) => (old && !old.some((c) => c.id === comment.id) ? [...old, comment] : old));
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(photoId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.photo(photoId) });
      // 댓글 수(commentCount)가 모든 사진 목록 캐시에 복사돼 있으므로 전부 무효화
      queryClient.invalidateQueries({ predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) });
    },
  });
}

export function useUploadPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadPayload) => photosApi.uploadPhotos(payload),
    // 일부 청크만 실패해도 올라간 사진은 있으니 항상 목록을 갱신한다
    onSuccess: (_result, payload) => {
      for (const target of payload.targets) {
        queryClient.invalidateQueries({ queryKey: queryKeys.feed(target.groupId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.albums(target.groupId) });
        queryClient.invalidateQueries({ queryKey: ['unfiledPhotos', target.groupId] });
      }
    },
  });
}
