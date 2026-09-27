import * as ImageManipulator from 'expo-image-manipulator';
import type { ChatMessage, ChatRoom, ChatRoomListItem } from '../types';
import { post, postForm, request } from './client';

/** 내 대화방 (마지막 메시지 최신 순) */
export async function getRooms(): Promise<ChatRoomListItem[]> {
  return (await request<{ rooms: ChatRoomListItem[] }>('/ongi/chat/rooms')).rooms;
}

/** 헤더 종이비행기 배지 — 참여 중인 모든 방의 안 읽은 메시지 수 */
export async function getUnreadCount(): Promise<number> {
  return (await request<{ count: number }>('/ongi/chat/unread-count')).count;
}

/** 대화 시작 — 구성원 1명이면 1:1(이미 있으면 그 방), 2명 이상이면 그룹방 */
export function createRoom(params: { memberIds: string[]; name?: string }): Promise<ChatRoom> {
  return post<ChatRoom>('/ongi/chat/rooms', params);
}

export function getRoom(roomId: string): Promise<ChatRoom> {
  return request<ChatRoom>(`/ongi/chat/rooms/${roomId}`);
}

/** 메시지 최신 순 — before 로 그 이전 페이지 */
export async function getMessages(roomId: string, before?: string): Promise<ChatMessage[]> {
  const query = before ? `?before=${encodeURIComponent(before)}` : '';
  return (await request<{ messages: ChatMessage[] }>(`/ongi/chat/rooms/${roomId}/messages${query}`)).messages;
}

export function sendText(roomId: string, content: string): Promise<ChatMessage> {
  return post<ChatMessage>(`/ongi/chat/rooms/${roomId}/messages`, { type: 'text', content });
}

/** 긴 변 최대 픽셀 — 사진 올리기와 같은 기준 */
const PHOTO_MAX_EDGE = 2048;

/** 사진 보내기 — JPEG 로 줄여 올린 뒤(POST /ongi/photos/files) 그 URL 로 메시지를 보낸다 */
export async function sendPhoto(roomId: string, image: { uri: string; width: number; height: number }): Promise<ChatMessage> {
  const { uri, width, height } = image;
  const resize = width >= height ? { width: Math.min(width || PHOTO_MAX_EDGE, PHOTO_MAX_EDGE) } : { height: Math.min(height || PHOTO_MAX_EDGE, PHOTO_MAX_EDGE) };
  const jpeg = await ImageManipulator.manipulateAsync(uri, [{ resize }], { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG });

  const form = new FormData();
  form.append('photoFiles', { uri: jpeg.uri, name: 'chat-photo.jpg', type: 'image/jpeg' } as unknown as Blob);
  const uploaded = await postForm<{ urls: string[]; thumbUrls?: (string | null)[] }>('/ongi/photos/files', form);

  return post<ChatMessage>(`/ongi/chat/rooms/${roomId}/messages`, {
    type: 'photo',
    mediaUrl: uploaded.urls[0],
    thumbUrl: uploaded.thumbUrls?.[0] ?? undefined,
    aspectRatio: width > 0 && height > 0 ? width / height : 1,
  });
}

/** 여기까지 읽음 */
export function markRead(roomId: string, messageId: string): Promise<null> {
  return post<null>(`/ongi/chat/rooms/${roomId}/read`, { messageId });
}

/** 그룹방에 초대 — 참여자 누구나 */
export function invite(roomId: string, memberIds: string[]): Promise<ChatRoom> {
  return post<ChatRoom>(`/ongi/chat/rooms/${roomId}/invite`, { memberIds });
}

/** 그룹방 나가기 · 1:1 방은 내 목록에서 지우기 */
export function leave(roomId: string): Promise<null> {
  return post<null>(`/ongi/chat/rooms/${roomId}/leave`);
}
