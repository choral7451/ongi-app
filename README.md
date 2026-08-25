# 온기 (Ongi)

가족 사진 공유 앱 — 디자인 시안(`온기.dc.html`, Classical 디자인 시스템)을 React Native로 구현한 프로젝트입니다.

## 실행

```bash
npm install
npm run ios      # 또는 npm run android / npm run web
```

## 기술 스택

| 영역 | 라이브러리 |
| --- | --- |
| 프레임워크 | Expo SDK 54 + TypeScript |
| 내비게이션 | expo-router (파일 기반, 탭 + 모달 + 상세 스택) |
| 서버 상태 | @tanstack/react-query |
| 클라이언트 상태 | zustand (세션) |
| 이미지 | expo-image |
| 아이콘 | lucide-react-native |
| 폰트 | @expo-google-fonts/noto-serif-kr (세리프 헤딩) |

## 구조

```
src/
├── app/                      # expo-router 라우트
│   ├── _layout.tsx           #   폰트 로드 + QueryClientProvider + 루트 스택
│   ├── (tabs)/               #   하단 탭: 홈 / 앨범 / (올리기) / 가족 / 나
│   │   ├── index.tsx         #   1a 홈 피드
│   │   ├── albums.tsx        #   1b 앨범 (인물별 + 가족 앨범)
│   │   ├── family.tsx        #   1d 가족 (구성원 · 초대 코드)
│   │   └── profile.tsx       #   1f 프로필 / 설정
│   ├── upload.tsx            #   1c 사진 올리기 (모달)
│   └── photo/[id].tsx        #   1e 사진 상세 (반응 · 댓글)
├── api/                      # API 계층 — artinfo-server /ongi/* 호출
│   ├── client.ts             #   BASE_URL, request() — 토큰 갱신·응답 봉투 언랩
│   ├── photos.ts / albums.ts / family.ts / profile.ts / reports.ts
├── hooks/queries.ts          # react-query 훅 + queryKeys
├── store/session.ts          # zustand — 로그인 사용자
├── components/
│   ├── ui/                   # 디자인 시스템 컴포넌트 (Button, Tag, Avatar, Plate, SectionHeader)
│   ├── feed/FeedPost.tsx
│   └── TabBar.tsx            # 커스텀 하단 탭 바 (가운데 올리기 버튼)
├── theme/                    # 디자인 토큰 (색·간격·폰트) — 시안 :root와 1:1
├── types/                    # 도메인 모델
└── utils/format.ts           # 한국어 날짜/시간 포맷
```

## 백엔드 연동

- API 주소는 `EXPO_PUBLIC_API_URL` (기본값: 운영 서버 `https://api-artinfokorea.com`). 로컬 서버로 붙으려면 `.env` 에서 덮어쓴다.
- 빌드 프로필·환경변수는 `eas.json` 참고. `ios/` 는 prebuild 산출물이라 권한 문구·Info.plist 설정은 `app.json` 에서 바꾼다.
- 약관·개인정보 처리방침 본문은 서버(`/ongi/legal/:slug`)가 내려준다.
