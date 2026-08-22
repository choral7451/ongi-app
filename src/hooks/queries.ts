import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { albumsApi, familyApi, groupsApi, photosApi, profileApi } from '../api';
import type { UploadPayload } from '../api/photos';
import type { Photo } from '../types';
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
  storage: ['storage'] as const,
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

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.joinGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.myGroups }),
  });
}

// ── 그룹 스코프 콘텐츠 ─────────────────────────────────

export function useFeed() {
  const groupId = useActiveGroupId();
  return useQuery({
    queryKey: queryKeys.feed(groupId),
    queryFn: () => photosApi.getFeed(groupId),
    enabled: groupId.length > 0,
  });
}

export function usePhoto(id: string) {
  return useQuery({ queryKey: queryKeys.photo(id), queryFn: () => photosApi.getPhoto(id) });
}

export function useAlbumPhotos(albumId: string) {
  return useQuery({
    queryKey: ['albumPhotos', albumId],
    queryFn: () => photosApi.getPhotosByAlbum(albumId),
    enabled: albumId.length > 0,
  });
}

/** 앨범에 담기지 않은 사진 — 앨범 탭의 "미분류" */
export function useUnfiledPhotos(groupId: string) {
  return useQuery({
    queryKey: ['unfiledPhotos', groupId],
    queryFn: () => photosApi.getUnfiledPhotos(groupId),
    enabled: groupId.length > 0,
  });
}

export function usePersonPhotos(personId: string) {
  return useQuery({
    queryKey: ['personPhotos', personId],
    queryFn: () => photosApi.getPhotosByPerson(personId),
    enabled: personId.length > 0,
  });
}

export function useComments(photoId: string) {
  return useQuery({
    queryKey: queryKeys.comments(photoId),
    queryFn: () => photosApi.getComments(photoId),
  });
}

export function useLocalPhotos() {
  return useQuery({ queryKey: queryKeys.localPhotos, queryFn: photosApi.getLocalPhotos });
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

export function useCreatePerson() {
  const queryClient = useQueryClient();
  const groupId = useActiveGroupId();
  return useMutation({
    mutationFn: (name: string) => albumsApi.createPerson(groupId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.people(groupId) }),
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

export function useProfileStats() {
  return useQuery({ queryKey: queryKeys.profileStats, queryFn: profileApi.getProfileStats });
}

export function useStorageInfo() {
  return useQuery({ queryKey: queryKeys.storage, queryFn: profileApi.getStorageInfo });
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
const PHOTO_LIST_KEYS = new Set(['feed', 'albumPhotos', 'unfiledPhotos', 'personPhotos']);

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: photosApi.toggleLike,
    onSuccess: (photo) => {
      queryClient.setQueryData(queryKeys.photo(photo.id), photo);
      // 리페치하면 새로고침 스피너로 화면이 튀므로, 모든 사진 목록 캐시에서 해당 사진만 바꿔치기
      queryClient.setQueriesData<Photo[]>(
        { predicate: (query) => PHOTO_LIST_KEYS.has(query.queryKey[0] as string) },
        (old) => old?.map((p) => (p.id === photo.id ? photo : p)),
      );
    },
  });
}

export function useAddComment(photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { authorId: string; text: string }) =>
      photosApi.addComment({ photoId, ...params }),
    onSuccess: () => {
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
    onSuccess: (_created, payload) => {
      for (const target of payload.targets) {
        queryClient.invalidateQueries({ queryKey: queryKeys.feed(target.groupId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.albums(target.groupId) });
        queryClient.invalidateQueries({ queryKey: ['unfiledPhotos', target.groupId] });
      }
    },
  });
}
