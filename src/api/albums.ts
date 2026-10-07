import type { Album, AlbumList } from '../types';
import { post, request } from './client';

/** 앨범 목록 + 전체·미분류 장수 — 앨범 탭은 이 장수를 쓴다 (받은 페이지 길이가 아니라 서버가 센 값) */
export function getAlbumList(groupId: string): Promise<AlbumList> {
  return request<AlbumList>(`/ongi/groups/${groupId}/albums`);
}

export async function getAlbums(groupId: string): Promise<Album[]> {
  const result = await getAlbumList(groupId);
  return result.albums;
}

export function createAlbum(groupId: string, title: string): Promise<Album> {
  return post<Album>(`/ongi/groups/${groupId}/albums`, { title });
}

export function renameAlbum(albumId: string, title: string): Promise<Album> {
  return request<Album>(`/ongi/albums/${albumId}`, { method: 'PUT', body: JSON.stringify({ title }) });
}

/** 앨범만 삭제 — 담긴 사진은 미분류로 이동 */
export async function deleteAlbum(albumId: string): Promise<void> {
  await request<null>(`/ongi/albums/${albumId}`, { method: 'DELETE' });
}

