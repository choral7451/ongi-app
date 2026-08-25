import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import type { LegalDoc, ProfileStats } from '../types';
import { postForm, request } from './client';

export function getProfileStats(): Promise<ProfileStats> {
  return request<ProfileStats>('/ongi/users/me/stats');
}

/** 약관·정책 — 공개 엔드포인트라 로그인 전에도 조회 가능 */
export function getLegalDoc(slug: string): Promise<LegalDoc> {
  return request<LegalDoc>(`/ongi/legal/${slug}`);
}

/** 회원탈퇴 — 계정 정보 익명화 + 올린 사진·댓글·구성원 정보 삭제 + 발급된 토큰 무효화 */
export async function deleteAccount(): Promise<void> {
  await request<null>('/ongi/users/me', { method: 'DELETE' });
}

export interface Me {
  id: string;
  name: string;
  provider: string;
  avatarUrl: string | null;
}

export function getMe(): Promise<Me> {
  return request<Me>('/ongi/users/me');
}

/** 이름 변경 — 서버가 구성원·인물 표시 이름에도 전파한다 */
export function updateMyName(name: string): Promise<Me> {
  return request<Me>('/ongi/users/me', { method: 'PUT', body: JSON.stringify({ name }) });
}

/** 갤러리 사진을 프로필 이미지로 — 중앙 정사각 크롭 + 축소 후 업로드 */
export async function uploadAvatar(assetId: string): Promise<Me> {
  const info = await MediaLibrary.getAssetInfoAsync(assetId);
  const { width, height } = info;
  const size = Math.min(width, height);
  const crop = {
    originX: Math.round((width - size) / 2),
    originY: Math.round((height - size) / 2),
    width: size,
    height: size,
  };
  const jpeg = await ImageManipulator.manipulateAsync(info.localUri ?? info.uri, [{ crop }, { resize: { width: 400 } }], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const form = new FormData();
  form.append('avatarFile', { uri: jpeg.uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);

  return postForm<Me>('/ongi/users/me/avatar', form);
}
