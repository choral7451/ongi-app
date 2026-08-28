import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import type { Comment, LocalPhotos, Photo } from '../types';
import { post, postForm, request } from './client';

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

/** 앨범에 담기지 않은 그룹 사진 — 앨범 탭의 "미분류" (최신순) */
export function getUnfiledPhotos(groupId: string): Promise<Photo[]> {
  return photoList(`/ongi/groups/${groupId}/photos/unfiled`);
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

/** 사진 삭제 — 작성자 본인 또는 그룹 관리자만 가능 (서버가 검증) */
export async function deletePhoto(photoId: string): Promise<void> {
  await request<null>(`/ongi/photos/${photoId}`, { method: 'DELETE' });
}

/** 사진 일괄 삭제 — 사진마다 작성자·관리자 권한을 서버가 확인하고, 권한 없는 것은 skippedIds 로 돌려준다 */
export function deletePhotos(photoIds: string[]): Promise<{ deletedIds: string[]; skippedIds: string[] }> {
  return post<{ deletedIds: string[]; skippedIds: string[] }>('/ongi/photos/delete', { photoIds });
}

/** 다른 가족 공간에 사진 공유(복사) — 대상 공간에 독립 게시물 생성. 권한 없는 사진은 skippedIds */
export function copyPhotos(params: { photoIds: string[]; targetGroupId: string; albumId: string | null }): Promise<{ copiedIds: string[]; skippedIds: string[] }> {
  return post<{ copiedIds: string[]; skippedIds: string[] }>('/ongi/photos/copy', params);
}

/** 사진 일괄 앨범 이동 — albumId null 이면 미분류. 권한 없거나 다른 그룹 사진은 skippedIds */
export function movePhotos(params: { photoIds: string[]; albumId: string | null }): Promise<{ movedIds: string[]; skippedIds: string[] }> {
  return post<{ movedIds: string[]; skippedIds: string[] }>('/ongi/photos/move', params);
}

/** 댓글 삭제 — 댓글 작성자·사진 작성자·그룹 관리자만 가능 (서버가 검증) */
export async function deleteComment(params: { photoId: string; commentId: string }): Promise<void> {
  await request<null>(`/ongi/photos/${params.photoId}/comments/${params.commentId}`, { method: 'DELETE' });
}

export function addComment(params: {
  photoId: string;
  authorId: string; // 서버는 세션에서 작성자를 유도하므로 사용하지 않음 (훅 시그니처 유지용)
  text: string;
}): Promise<Comment> {
  return post<Comment>(`/ongi/photos/${params.photoId}/comments`, { text: params.text });
}

/** 한 번에 불러오는 갤러리 사진 수 — 스크롤 끝에서 이어서 불러온다 */
export const LOCAL_PHOTOS_PAGE = 60;

/** 업로드 화면 — 기기 갤러리 사진(최신순). after 커서로 다음 페이지. 권한이 거부되면 빈 목록 */
export async function getLocalPhotos(after?: string): Promise<LocalPhotos> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) return { photos: [], limited: false, hasNextPage: false };
  const limited = permission.accessPrivileges === 'limited';

  const page = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    first: LOCAL_PHOTOS_PAGE,
    ...(after ? { after } : {}),
  });

  return {
    limited,
    endCursor: page.endCursor,
    hasNextPage: page.hasNextPage,
    photos: page.assets.map((asset) => ({
      id: asset.id,
      uri: asset.uri,
      aspectRatio: asset.height > 0 ? asset.width / asset.height : 1,
    })),
  };
}

/** iOS '선택한 사진만' 모드에서 접근 가능한 사진을 다시 고르는 시스템 시트 */
export async function presentLimitedLibraryPicker(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await MediaLibrary.presentPermissionsPickerAsync();
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
  /** 진행률 콜백 — 완료(성공+실패)된 장수 / 전체 */
  onProgress?: (done: number, total: number) => void;
}

export interface UploadResult {
  photos: Photo[];
  /** 실패한 사진의 로컬 id — 그대로 다시 넘기면 실패분만 재시도 */
  failedIds: string[];
  /** 마지막 실패 메시지 (실패가 있을 때) */
  errorMessage?: string;
}

/** 서버는 요청당 파일 10장까지 받는다 (FilesInterceptor 한도) */
export const UPLOAD_CHUNK_SIZE = 10;
/** 동시에 올리는 청크 수 — 변환 메모리와 네트워크 부담을 제한 */
const UPLOAD_CONCURRENCY = 2;
/** 한 번에 선택 가능한 최대 장수 */
export const UPLOAD_MAX_SELECT = 500;

/** 긴 변 최대 픽셀 — 원본(12MP+)을 그대로 올리면 업로드·로딩 모두 느려진다 */
const UPLOAD_MAX_EDGE = 2048;

/** 원본 비율 유지 + 긴 변 2048 축소 + JPEG 통일 (HEIC 등 기기 포맷은 다른 플랫폼에서 안 보일 수 있음) */
async function prepareAsset(assetId: string): Promise<{ uri: string; aspectRatio: number }> {
  const info = await MediaLibrary.getAssetInfoAsync(assetId);
  const { width, height } = info;
  const aspectRatio = width > 0 && height > 0 ? width / height : 1;
  const resize = width >= height ? { width: Math.min(width, UPLOAD_MAX_EDGE) } : { height: Math.min(height, UPLOAD_MAX_EDGE) };
  const jpeg = await ImageManipulator.manipulateAsync(info.localUri ?? info.uri, [{ resize }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: jpeg.uri, aspectRatio };
}

/** 청크 하나 — 변환 → S3 업로드 → 게시. 실패하면 throw (호출부가 청크 단위로 실패를 기록) */
async function uploadChunk(ids: string[], payload: UploadPayload, withCaption: boolean): Promise<Photo[]> {
  const prepared = await Promise.all(ids.map((id) => prepareAsset(id)));

  const form = new FormData();
  prepared.forEach((photo, index) => {
    // React Native 의 FormData 파일 파트 — { uri, name, type } 객체를 그대로 넘긴다
    form.append('photoFiles', {
      uri: photo.uri,
      name: `photo-${index + 1}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
  });
  const uploaded = await postForm<{ urls: string[] }>('/ongi/photos/files', form);

  const result = await post<{ photos: Photo[] }>('/ongi/photos', {
    photos: uploaded.urls.map((url, index) => ({ url, aspectRatio: prepared[index].aspectRatio })),
    caption: withCaption ? payload.caption : undefined,
    targets: payload.targets.map((target) => ({
      groupId: target.groupId,
      albumId: target.albumId,
      personIds: target.personIds,
    })),
  });
  return result.photos;
}

/**
 * 사진 올리기 — 10장씩 청크로 나눠 순차(동시 2개) 업로드.
 * 100장 이상도 메모리 폭주 없이 올라가고, 청크 하나가 실패해도 나머지는 계속 진행한 뒤 실패분을 돌려준다.
 */
export async function uploadPhotos(payload: UploadPayload): Promise<UploadResult> {
  // 청크 크기는 장수에 맞춰 조절 — 적게 올릴 때도 진행률이 1장 단위로 움직이게 (2장 → 1장씩, 100장 → 10장씩)
  const chunkSize = Math.max(1, Math.min(UPLOAD_CHUNK_SIZE, Math.ceil(payload.localPhotoIds.length / 4)));
  const chunks: string[][] = [];
  for (let i = 0; i < payload.localPhotoIds.length; i += chunkSize) {
    chunks.push(payload.localPhotoIds.slice(i, i + chunkSize));
  }

  const total = payload.localPhotoIds.length;
  let done = 0;
  const photos: Photo[] = [];
  const failedIds: string[] = [];
  let errorMessage: string | undefined;
  payload.onProgress?.(0, total);

  let cursor = 0;
  const worker = async () => {
    while (cursor < chunks.length) {
      const index = cursor++;
      const ids = chunks[index];
      try {
        // 문구는 첫 사진에만 붙는다 — 첫 청크에서만 전달
        photos.push(...(await uploadChunk(ids, payload, index === 0)));
      } catch (e) {
        failedIds.push(...ids);
        errorMessage = e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.';
      } finally {
        done += ids.length;
        payload.onProgress?.(done, total);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, chunks.length) }, worker));

  return { photos, failedIds, errorMessage };
}
