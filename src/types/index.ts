/** 도메인 모델 — 백엔드 API 응답 스키마와 맞출 지점 */

export type MemberRole = 'admin' | 'member' | 'pending';

/**
 * 그룹(가족 공간) — 사진·앨범·구성원이 전부 그룹 단위로 분리됩니다.
 * 한 계정이 여러 그룹에 속할 수 있습니다 (예: 우리집 / 외갓집).
 */
export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  inviteExpiresInDays: number;
  memberCount: number;
  photoCount: number;
  sinceLabel: string;
}

/** 그룹 구성원 — 호칭(name)은 그룹마다 다를 수 있어 그룹 소속 데이터입니다 */
export interface Member {
  id: string;
  groupId: string;
  /** 이 그룹 안에서 부르는 이름 (예: 엄마) */
  name: string;
  /** 실명 (예: 수진) */
  realName?: string;
  role: MemberRole;
  photoCount: number;
  avatarUrl?: string;
}

/** 인물 태그 대상 (구성원이 아닌 아이 등 포함) */
export interface Person {
  id: string;
  groupId: string;
  name: string;
  photoCount: number;
  imageUrl?: string;
}

export interface Album {
  id: string;
  groupId: string;
  title: string;
  coverUrl: string;
  photoCount: number;
  /** 목록에 보여줄 부가 정보 (예: "8월", "매주 업데이트") */
  meta: string;
}

export interface Photo {
  id: string;
  groupId: string;
  url: string;
  /** 세로 비율 힌트 (width/height) — 피드 레이아웃용 */
  aspectRatio: number;
  authorId: string;
  albumId?: string;
  caption?: string;
  location?: string;
  createdAt: string; // ISO
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  /** 함께 찍힌 인물 id 목록 */
  personIds: string[];
}

export interface Comment {
  id: string;
  photoId: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO
}

export interface ProfileStats {
  photoCount: number;
  albumCount: number;
  familyCount: number;
}

export interface StorageInfo {
  usedGb: number;
  totalGb: number;
}

/** 업로드 화면 — 기기 갤러리의 최근 사진 (목데이터) */
export interface LocalPhoto {
  id: string;
  uri: string;
}

/** 약관·정책 문서 */
export interface LegalDoc {
  slug: 'terms' | 'privacy';
  title: string;
  updatedAt: string; // "2026년 1월 1일" 형태의 표시용 문자열
  body: string;
}
