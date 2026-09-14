import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';

/** 공유·저장용 임시 파일을 모아 두는 캐시 폴더 이름 */
const SHARE_DIR = 'share';
const SAVE_DIR = 'save';

/** URL 경로에서 확장자만 뽑는다 — presigned URL 의 쿼리스트링(?X-Amz-…)은 버린다 */
function extensionOf(url: string, fallback: string): string {
  const path = url.split('?')[0];
  const extension = path.includes('.') ? path.split('.').pop()!.toLowerCase() : '';
  return /^[a-z0-9]{1,5}$/.test(extension) ? extension : fallback;
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
};

const UTI: Record<string, string> = {
  jpg: 'public.jpeg',
  jpeg: 'public.jpeg',
  png: 'public.png',
  heic: 'public.heic',
  webp: 'org.webmproject.webp',
  mp4: 'public.mpeg-4',
  mov: 'com.apple.quicktime-movie',
  m4v: 'public.mpeg-4',
};

/**
 * 사진·영상을 다른 앱(카카오톡·메시지 등)으로 공유한다.
 *
 * 파일을 캐시에 내려받아 그 파일 자체를 넘긴다 — 저장소 presigned URL 은 밖으로 나가지 않는다.
 * 문구는 함께 보내지 않는다: 공유 시트에 텍스트를 같이 넘기면 카카오톡이 텍스트만 집어가
 * 정작 사진이 빠지는 일이 있어, 사진(영상)만 확실히 보낸다.
 */
export async function shareMedia(params: { id: string; url: string; mediaType?: 'photo' | 'video' }): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('이 기기에서는 공유를 쓸 수 없어요.');

  const extension = extensionOf(params.url, params.mediaType === 'video' ? 'mp4' : 'jpg');
  const file = await downloadToCache(SHARE_DIR, params.id, params.url, extension);

  await Sharing.shareAsync(file.uri, {
    mimeType: MIME[extension] ?? 'application/octet-stream',
    UTI: UTI[extension] ?? 'public.data',
    dialogTitle: params.mediaType === 'video' ? '영상 공유' : '사진 공유',
  });
}

/**
 * 사진·영상 원본을 기기의 사진 보관함(갤러리)에 저장한다.
 *
 * 저장 전용 권한만 요청한다 — iOS 는 '추가만 허용'(NSPhotoLibraryAddUsageDescription),
 * Android 13+ 는 권한 없이 저장되고 12 이하는 WRITE_EXTERNAL_STORAGE 가 필요하다.
 */
export async function saveMediaToLibrary(params: { id: string; url: string; mediaType?: 'photo' | 'video' }): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    throw new Error('사진 보관함에 저장하려면 권한이 필요해요. 설정에서 온기의 사진 접근을 허용해 주세요.');
  }

  const extension = extensionOf(params.url, params.mediaType === 'video' ? 'mp4' : 'jpg');
  const file = await downloadToCache(SAVE_DIR, params.id, params.url, extension);
  try {
    await MediaLibrary.saveToLibraryAsync(file.uri);
  } finally {
    try {
      file.delete();
    } catch {
      // 캐시 정리 실패는 무시 — 다음 저장 때 폴더째 비운다
    }
  }
}

/** 원본을 캐시 폴더에 내려받는다 — 지난 파일이 캐시를 먹지 않도록 매번 폴더를 비우고 새로 받는다 */
async function downloadToCache(folder: string, id: string, url: string, extension: string) {
  const directory = new Directory(Paths.cache, folder);
  try {
    if (directory.exists) directory.delete();
  } catch {
    // 지우지 못해도 아래에서 덮어쓰면 된다
  }
  directory.create({ intermediates: true, idempotent: true });

  return File.downloadFileAsync(url, new File(directory, `ongi-${id}.${extension}`));
}

/**
 * 영상에서 목록·피드용 포스터(첫 장면)를 뽑는다.
 *
 * 갤러리 원본 경로에서 바로 못 읽는 기기·포맷이 있어, 실패하면
 * ① 다른 지점(0초) → ② 캐시로 복사한 사본 순으로 다시 시도한다.
 * 그래도 실패하면 null — 업로드는 포스터 없이 계속되고 목록에는 영상 자리표시자가 뜬다.
 */
export async function extractVideoPoster(uri: string, durationSeconds: number): Promise<string | null> {
  // 아주 짧은 영상은 500ms 지점이 없을 수 있다 — 길이의 1/4 지점과 0초를 함께 시도
  const times = Array.from(new Set([Math.min(500, Math.floor((durationSeconds * 1000) / 4)), 0]));

  for (const time of times) {
    const poster = await tryThumbnail(uri, time);
    if (poster) return poster;
  }

  const copied = copyToCache(uri);
  if (!copied) return null;

  for (const time of times) {
    const poster = await tryThumbnail(copied, time);
    if (poster) return poster;
  }

  return null;
}

async function tryThumbnail(uri: string, time: number): Promise<string | null> {
  try {
    const { uri: poster } = await VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.8 });
    return poster;
  } catch {
    return null;
  }
}

/** 갤러리 원본을 앱 캐시로 복사한다 — 원본 경로를 직접 못 읽는 경우의 우회로 */
function copyToCache(uri: string): string | null {
  try {
    const source = new File(uri);
    if (!source.exists) return null;
    const directory = new Directory(Paths.cache, 'poster-src');
    directory.create({ intermediates: true, idempotent: true });
    const target = new File(directory, `src.${extensionOf(uri, 'mp4')}`);
    if (target.exists) target.delete();
    source.copy(target);
    return target.uri;
  } catch {
    return null;
  }
}

/** 캐시에 복사해 둔 영상 원본 정리 — 포스터를 뽑고 나면 바로 지운다 (200MB 가 남을 수 있다) */
export function clearPosterCache(): void {
  try {
    const directory = new Directory(Paths.cache, 'poster-src');
    if (directory.exists) directory.delete();
  } catch {
    // 정리 실패는 무시 — 다음 업로드 때 덮어쓴다
  }
}
