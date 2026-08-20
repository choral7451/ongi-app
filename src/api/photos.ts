import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import type { Comment, LocalPhoto, Photo } from '../types';
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

/** 업로드 화면 — 기기 갤러리의 최근 사진. 권한이 거부되면 빈 목록 */
export async function getLocalPhotos(): Promise<LocalPhoto[]> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) return [];

  const page = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    first: 60,
  });

  return page.assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    aspectRatio: asset.height > 0 ? asset.width / asset.height : 1,
  }));
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

/** 사진 올리기 — 파일을 S3 에 올려 URL 을 받은 뒤, 그룹(타깃)마다 독립 게시물을 만듭니다 */
export async function uploadPhotos(payload: UploadPayload): Promise<Photo[]> {
  // 갤러리 사진을 JPEG 으로 통일 (HEIC 등 기기 포맷은 다른 플랫폼에서 안 보일 수 있음)
  const prepared = await Promise.all(
    payload.localPhotoIds.map(async (assetId) => {
      const info = await MediaLibrary.getAssetInfoAsync(assetId);
      const jpeg = await ImageManipulator.manipulateAsync(info.localUri ?? info.uri, [], {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      return {
        uri: jpeg.uri,
        aspectRatio: jpeg.height > 0 ? Math.round((jpeg.width / jpeg.height) * 100) / 100 : 1,
      };
    }),
  );

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
  const photos = uploaded.urls.map((url, index) => ({
    url,
    aspectRatio: prepared[index].aspectRatio,
  }));

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
