import type { Photo } from '../types';

type Displayable = Pick<Photo, 'url' | 'thumbUrl' | 'mediaType'>;

/**
 * 목록·커버에 이미지로 그릴 URL — 그릴 수 없으면 null.
 *
 * 영상은 url 이 mp4 라 이미지로 못 그린다. 포스터(thumbUrl)가 있으면 그것을 쓰고,
 * 포스터 추출이 실패한 영상이면 null 을 돌려줘 호출부가 영상 자리표시자를 그리게 한다.
 * (서버의 pickAlbumCoverUrl 과 같은 규칙)
 */
export function displayImageUrl(photo: Displayable): string | null {
  if (photo.mediaType === 'video') return photo.thumbUrl ?? null;

  return photo.thumbUrl ?? photo.url;
}

/** 목록에서 커버로 쓸 URL — 최신순 목록에서 그릴 수 있는 첫 항목 */
export function pickCoverUrl(photos: Displayable[] | undefined): string | undefined {
  for (const photo of photos ?? []) {
    const url = displayImageUrl(photo);
    if (url) return url;
  }

  return undefined;
}
