import type {
  Album,
  Comment,
  Group,
  LocalPhoto,
  Member,
  Person,
  Photo,
  ProfileStats,
  StorageInfo,
} from '../types';

/**
 * 인메모리 목 데이터베이스.
 * 백엔드가 붙기 전까지 api/ 계층이 여기서 읽고 씁니다.
 * 모든 콘텐츠(구성원·인물·앨범·사진)는 그룹(가족 공간) 소속입니다.
 */

export const groups: Group[] = [
  {
    id: 'g-kim',
    name: '김씨네 온기',
    inviteCode: 'ONGI-2847',
    inviteExpiresInDays: 7,
    memberCount: 5,
    photoCount: 292,
    sinceLabel: '2025년 12월부터',
  },
  {
    id: 'g-oe',
    name: '외갓집 모임',
    inviteCode: 'ONGI-5130',
    inviteExpiresInDays: 7,
    memberCount: 3,
    photoCount: 47,
    sinceLabel: '2026년 3월부터',
  },
];

/** 현재 계정(수진)이 속한 그룹 id 목록 — 백엔드의 GroupMember 역할 */
export const myGroupIds: string[] = ['g-kim', 'g-oe'];

export const members: Member[] = [
  // 김씨네 온기
  { id: 'm-mom', groupId: 'g-kim', name: '엄마', realName: '수진', role: 'admin', photoCount: 52 },
  { id: 'm-dad', groupId: 'g-kim', name: '아빠', realName: '동현', role: 'member', photoCount: 47 },
  { id: 'm-gma', groupId: 'g-kim', name: '할머니', realName: '영자', role: 'member', photoCount: 31 },
  { id: 'm-gpa', groupId: 'g-kim', name: '할아버지', realName: '만수', role: 'member', photoCount: 28 },
  { id: 'm-aunt', groupId: 'g-kim', name: '고모', realName: '미영', role: 'pending', photoCount: 0 },
  // 외갓집 모임 — 같은 사람(수진)이라도 그룹마다 호칭이 다릅니다
  { id: 'm-oe-me', groupId: 'g-oe', name: '수진', realName: '수진', role: 'admin', photoCount: 12 },
  { id: 'm-oe-imo', groupId: 'g-oe', name: '이모', realName: '정은', role: 'member', photoCount: 21 },
  { id: 'm-oe-gma', groupId: 'g-oe', name: '외할머니', realName: '순자', role: 'member', photoCount: 14 },
];

export const people: Person[] = [
  // 김씨네 온기
  { id: 'p-jiwoo', groupId: 'g-kim', name: '지우', photoCount: 84, imageUrl: 'https://picsum.photos/seed/ongi-p1/200/200?grayscale' },
  { id: 'p-mom', groupId: 'g-kim', name: '엄마', photoCount: 52, imageUrl: 'https://picsum.photos/seed/ongi-p2/200/200?grayscale' },
  { id: 'p-dad', groupId: 'g-kim', name: '아빠', photoCount: 47, imageUrl: 'https://picsum.photos/seed/ongi-p3/200/200?grayscale' },
  { id: 'p-gma', groupId: 'g-kim', name: '할머니', photoCount: 31, imageUrl: 'https://picsum.photos/seed/ongi-p4/200/200?grayscale' },
  { id: 'p-gpa', groupId: 'g-kim', name: '할아버지', photoCount: 28, imageUrl: 'https://picsum.photos/seed/ongi-p5/200/200?grayscale' },
  // 외갓집 모임
  { id: 'p-oe-gma', groupId: 'g-oe', name: '외할머니', photoCount: 25, imageUrl: 'https://picsum.photos/seed/ongi-q1/200/200?grayscale' },
  { id: 'p-oe-imo', groupId: 'g-oe', name: '이모', photoCount: 18, imageUrl: 'https://picsum.photos/seed/ongi-q2/200/200?grayscale' },
  { id: 'p-oe-me', groupId: 'g-oe', name: '수진', photoCount: 12, imageUrl: 'https://picsum.photos/seed/ongi-q3/200/200?grayscale' },
];

export const albums: Album[] = [
  // 김씨네 온기
  { id: 'a-jeju', groupId: 'g-kim', title: '제주 여행', coverUrl: 'https://picsum.photos/seed/ongi-jeju/600/420?grayscale', photoCount: 36, meta: '8월' },
  { id: 'a-jiwoo', groupId: 'g-kim', title: '지우 성장 기록', coverUrl: 'https://picsum.photos/seed/ongi-kid/600/420?grayscale', photoCount: 112, meta: '매주 업데이트' },
  { id: 'a-seollal', groupId: 'g-kim', title: '설날 2026', coverUrl: 'https://picsum.photos/seed/ongi-seollal/600/420?grayscale', photoCount: 24, meta: '2월' },
  { id: 'a-party', groupId: 'g-kim', title: '할머니 팔순 잔치', coverUrl: 'https://picsum.photos/seed/ongi-party/600/420?grayscale', photoCount: 58, meta: '5월' },
  { id: 'a-picnic', groupId: 'g-kim', title: '봄 소풍', coverUrl: 'https://picsum.photos/seed/ongi-picnic/600/420?grayscale', photoCount: 18, meta: '4월' },
  { id: 'a-daily', groupId: 'g-kim', title: '우리집 일상', coverUrl: 'https://picsum.photos/seed/ongi-daily/600/420?grayscale', photoCount: 44, meta: '수시로' },
  // 외갓집 모임
  { id: 'a-oe-kimjang', groupId: 'g-oe', title: '외갓집 김장', coverUrl: 'https://picsum.photos/seed/ongi-kimjang/600/420?grayscale', photoCount: 22, meta: '작년 11월' },
  { id: 'a-oe-bday', groupId: 'g-oe', title: '순자 여사 생신', coverUrl: 'https://picsum.photos/seed/ongi-bday/600/420?grayscale', photoCount: 25, meta: '6월' },
];

export const photos: Photo[] = [
  // 김씨네 온기
  {
    id: 'ph-1',
    groupId: 'g-kim',
    url: 'https://picsum.photos/seed/ongi-beach/900/620?grayscale',
    aspectRatio: 900 / 620,
    authorId: 'm-mom',
    albumId: 'a-jeju',
    caption: '협재 바다 앞에서. 지우가 처음으로 파도를 무서워하지 않았어요.',
    location: '제주 협재',
    createdAt: '2026-08-17T14:30:00+09:00',
    likeCount: 5,
    commentCount: 2,
    likedByMe: false,
    personIds: ['p-jiwoo', 'p-dad'],
  },
  {
    id: 'ph-2',
    groupId: 'g-kim',
    url: 'https://picsum.photos/seed/ongi-garden/900/900?grayscale',
    aspectRatio: 1,
    authorId: 'm-gma',
    createdAt: '2026-08-17T11:02:00+09:00',
    likeCount: 3,
    commentCount: 0,
    likedByMe: false,
    personIds: ['p-gma'],
  },
  {
    id: 'ph-3',
    groupId: 'g-kim',
    url: 'https://picsum.photos/seed/ongi-dinner/900/700?grayscale',
    aspectRatio: 900 / 700,
    authorId: 'm-dad',
    albumId: 'a-daily',
    caption: '오랜만에 다 같이 저녁. 지우가 반찬 투정을 안 했다!',
    createdAt: '2026-08-16T19:40:00+09:00',
    likeCount: 4,
    commentCount: 1,
    likedByMe: true,
    personIds: ['p-jiwoo', 'p-mom', 'p-gma'],
  },
  // 외갓집 모임
  {
    id: 'ph-oe-1',
    groupId: 'g-oe',
    url: 'https://picsum.photos/seed/ongi-oe1/900/650?grayscale',
    aspectRatio: 900 / 650,
    authorId: 'm-oe-imo',
    albumId: 'a-oe-bday',
    caption: '엄마 생신상. 미역국은 역시 내 담당.',
    createdAt: '2026-08-17T09:20:00+09:00',
    likeCount: 2,
    commentCount: 1,
    likedByMe: false,
    personIds: ['p-oe-gma', 'p-oe-imo'],
  },
  {
    id: 'ph-oe-2',
    groupId: 'g-oe',
    url: 'https://picsum.photos/seed/ongi-oe2/900/900?grayscale',
    aspectRatio: 1,
    authorId: 'm-oe-gma',
    createdAt: '2026-08-15T16:05:00+09:00',
    likeCount: 3,
    commentCount: 0,
    likedByMe: true,
    personIds: ['p-oe-gma'],
  },
];

// 앨범 상세 그리드를 채우는 추가 목 사진들 — 각 앨범에 과거 날짜로 6장씩
const groupAuthors: Record<string, string[]> = {
  'g-kim': ['m-mom', 'm-dad', 'm-gma', 'm-gpa'],
  'g-oe': ['m-oe-me', 'm-oe-imo', 'm-oe-gma'],
};
const groupPeople: Record<string, string[]> = {
  'g-kim': ['p-jiwoo', 'p-mom', 'p-dad', 'p-gma', 'p-gpa'],
  'g-oe': ['p-oe-gma', 'p-oe-imo', 'p-oe-me'],
};
albums.forEach((album, ai) => {
  const authors = groupAuthors[album.groupId] ?? [];
  const persons = groupPeople[album.groupId] ?? [];
  for (let i = 0; i < 6; i += 1) {
    const daysAgo = 4 + ai * 3 + i; // 피드 최신 사진들보다 과거로 배치
    const date = new Date(2026, 7, 17 - daysAgo, 10 + ((ai + i) % 8), (i * 13) % 60);
    photos.push({
      id: `ph-${album.id}-${i}`,
      groupId: album.groupId,
      url: `https://picsum.photos/seed/${album.id}-${i}/600/600?grayscale`,
      aspectRatio: 1,
      authorId: authors[(ai + i) % authors.length],
      albumId: album.id,
      caption: undefined,
      createdAt: date.toISOString(),
      likeCount: (ai + i * 2) % 5,
      commentCount: 0,
      likedByMe: false,
      personIds: [persons[i % persons.length], persons[(i + 1) % persons.length]].filter(
        (p, idx, arr) => arr.indexOf(p) === idx,
      ),
    });
  }
});

export const comments: Comment[] = [
  {
    id: 'c-1',
    photoId: 'ph-1',
    authorId: 'm-gma',
    text: '우리 강아지 많이 컸네. 다음엔 할미도 데려가라~',
    createdAt: '2026-08-17T15:10:00+09:00',
  },
  {
    id: 'c-2',
    photoId: 'ph-1',
    authorId: 'm-dad',
    text: '이 사진 인화해서 거실에 걸자.',
    createdAt: '2026-08-17T16:22:00+09:00',
  },
  {
    id: 'c-3',
    photoId: 'ph-3',
    authorId: 'm-mom',
    text: '다음 주엔 삼겹살 먹자고 하네요 ㅎㅎ',
    createdAt: '2026-08-16T20:05:00+09:00',
  },
  {
    id: 'c-oe-1',
    photoId: 'ph-oe-1',
    authorId: 'm-oe-me',
    text: '이모 최고! 다음엔 나도 갈게요',
    createdAt: '2026-08-17T10:02:00+09:00',
  },
];

export const profileStats: ProfileStats = {
  photoCount: 128,
  albumCount: 6,
  familyCount: 5,
};

export const storageInfo: StorageInfo = {
  usedGb: 4.2,
  totalGb: 15,
};

/** 업로드 화면의 "최근 사진" — 실제 기기 갤러리 대신 쓰는 목데이터 */
export const localPhotos: LocalPhoto[] = Array.from({ length: 11 }, (_, i) => ({
  id: `local-${i + 1}`,
  uri: `https://picsum.photos/seed/ongi-recent-${i + 1}/400/400?grayscale`,
}));
