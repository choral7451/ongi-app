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
| 프레임워크 | Expo SDK 57 + TypeScript |
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
├── api/                      # API 계층 — 지금은 전부 목 구현
│   ├── client.ts             #   BASE_URL, request() — 백엔드 연동 지점
│   ├── photos.ts / albums.ts / family.ts / profile.ts
├── mocks/db.ts               # 인메모리 목 데이터 (시안 내용과 동일)
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

## 백엔드 연동 방법

화면과 훅은 그대로 두고 `src/api/*.ts`의 함수 본문만 교체하면 됩니다.

1. `src/api/client.ts`의 `BASE_URL`을 실제 서버 주소로 변경
2. 각 API 함수의 `mockResponse(...)`를 `request<T>('/path')` 호출로 교체
   ```ts
   // before (mock)
   export function getFeed(): Promise<Photo[]> {
     return mockResponse([...db.photos]);
   }
   // after (real)
   export function getFeed(): Promise<Photo[]> {
     return request<Photo[]>('/photos/feed');
   }
   ```
3. 응답 스키마가 다르면 `src/types/`의 모델과 맞추거나 변환 함수를 api 계층에 추가
4. 인증이 붙으면 `src/store/session.ts`를 로그인 결과로 채우기
