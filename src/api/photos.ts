import * as db from '../mocks/db';
import type { Comment, LocalPhoto, Photo } from '../types';
import { post, request } from './client';

async function photoList(path: string): Promise<Photo[]> {
  const result = await request<{ photos: Photo[] }>(path);
  return result.photos;
}

/** 그룹의 날짜순 피드 (최신순 — 서버 정렬) */
export function getFeed(groupId: string): Promise<Photo[]> {
  return photoList(`/ongi/groups/${groupId}/photos`);
}

/** 앨범에 담긴 사진 (최신순) */
export function getPhotosByAlbum(albumId: string): Promise<Photo[]> {
  return photoList(`/ongi/albums/${albumId}/photos`);
}

/** 인물이 태그된 사진 (최신순) */
export function getPhotosByPerson(personId: string): Promise<Photo[]> {
  return photoList(`/ongi/people/${personId}/photos`);
}

export function getPhoto(id: string): Promise<Photo> {
  return request<Photo>(`/ongi/photos/${id}`);
}

export async function getComments(photoId: string): Promise<Comment[]> {
  const result = await request<{ comments: Comment[] }>(`/ongi/photos/${photoId}/comments`);
  return result.comments;
}

/** 따뜻해요 토글 — 갱신된 사진을 그대로 돌려받아 캐시에 반영 */
export function toggleLike(photoId: string): Promise<Photo> {
  return post<Photo>(`/ongi/photos/${photoId}/like`);
}

export function addComment(params: {
  photoId: string;
  authorId: string; // 서버는 세션에서 작성자를 유도하므로 사용하지 않음 (훅 시그니처 유지용)
  text: string;
}): Promise<Comment> {
  return post<Comment>(`/ongi/photos/${params.photoId}/comments`, { text: params.text });
}

/** 업로드 화면 — 기기 최근 사진 (아직 목: 갤러리 연동(expo-media-library) 전까지 유지) */
export function getLocalPhotos(): Promise<LocalPhoto[]> {
  return Promise.resolve(db.localPhotos);
}

/** 그룹별 게시 대상 — 앨범·인물 태그는 그룹에 종속되므로 그룹마다 따로 지정 */
export interface UploadTarget {
  groupId: string;
  albumId?: string;
  personIds: string[];
}

export interface UploadPayload {
  localPhotoIds: string[];
  caption?: string;
  /** 선택한 모든 그룹에 동시에 게시. 그룹마다 독립 게시물이 생겨 좋아요·댓글이 분리됩니다. */
  targets: UploadTarget[];
}

/** 사진 올리기 — 서버가 그룹(타깃)마다 독립 게시물을 만듭니다 */
export async function uploadPhotos(payload: UploadPayload): Promise<Photo[]> {
  // 기기 사진 id → URL (갤러리 연동 전: 목 데이터의 URI 를 그대로 사용.
  // 실제 파일 업로드가 붙으면 여기서 업로드 → URL 을 받아 전달)
  const photos = payload.localPhotoIds.map((localId) => {
    const local = db.localPhotos.find((l) => l.id === localId);
    return { url: local?.uri ?? 'https://picsum.photos/seed/ongi-new/900/620?grayscale', aspectRatio: 1 };
  });

  const result = await post<{ photos: Photo[] }>('/ongi/photos', {
    photos,
    caption: payload.caption,
    targets: payload.targets.map((target) => ({
      groupId: target.groupId,
      albumId: target.albumId,
      personIds: target.personIds,
    })),
  });
  return result.photos;
}
