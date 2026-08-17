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
