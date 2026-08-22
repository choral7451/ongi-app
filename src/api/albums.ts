import type { Album, Person } from '../types';
import { post, request } from './client';

export async function getAlbums(groupId: string): Promise<Album[]> {
  const result = await request<{ albums: Album[] }>(`/ongi/groups/${groupId}/albums`);
  return result.albums;
}

export async function getPeople(groupId: string): Promise<Person[]> {
  const result = await request<{ people: Person[] }>(`/ongi/groups/${groupId}/people`);
  return result.people;
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

/** 그룹에 인물 태그 추가 — 사진 업로드 시 "함께 찍힌 가족" 으로 태그할 대상 */
export function createPerson(groupId: string, name: string): Promise<Person> {
  return post<Person>(`/ongi/groups/${groupId}/people`, { name });
}
