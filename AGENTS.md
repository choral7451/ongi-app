# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## AI 개발 프로세스 (온기) — 모든 작업은 이 순서를 따른다

**흐름**: ① 요청(기대값 포함) → ② 테스트 먼저(서버 로직) → ③ 구현 → ④ PR(스펙 요약) → ⑤ AI 리뷰 → ⑥ 사람 리뷰(플래그·테스트 변경만) → ⑦ CI 통과 시 머지 → ⑧ 배포 후 확인. 모든 변경은 브랜치 → PR 로만 머지한다 (main 직푸시는 브랜치 보호가 차단).

- **온기 기능 작업은 이 레포(앱)와 `../artinfo-server` 만 본다.** `../ongi-web` 은 랜딩 페이지(`src/app/page.tsx`)만 운영 중이라 웹 앱 클라이언트(`src/app/(app)/…`)는 함께 고칠 필요가 없다 — 랜딩 문구·스크린샷 요청일 때만 건드린다.
- 요청에 기대 동작(기대값)을 함께 명시하고, 커밋 전 게이트: `npx tsc --noEmit` · `npx eslint src` 모두 통과 — CI 가 같은 검사를 강제한다.
- 테스트가 실패하면 테스트를 고치지 말고 구현을 의심할 것. 기대값 수정은 사유와 함께 별도 커밋으로만.
- 검증·정책 로직(날짜 계산 등)은 서버에 두고, 서버 쪽에 테스트를 작성한다.

## 릴리즈 프로세스 (2026-09-26부터, 항상 이렇게)

앱 코드를 main 에 올린 뒤에는 따로 요청 없이 테스트 빌드까지 올린다.

1. **버전**: 스토어 릴리즈(App Store 승인·Play 프로덕션 출시) 뒤 첫 수정 때만 `app.json` 의 `version` patch 를 +1. 그 버전이 릴리즈되기 전까지의 추가 수정은 버전 유지 — 빌드 번호(iOS buildNumber · Android versionCode)는 EAS 원격 autoIncrement 로만 올라간다.
2. **iOS → TestFlight**: `gh workflow run ios-testflight.yml` — GitHub macOS 러너에서 EAS 로컬 빌드 후 제출 (`.github/workflows/ios-testflight.yml`, 시크릿 `EXPO_TOKEN`). EAS 무료 플랜의 iOS 클라우드 빌드 한도를 쓰지 않는다.
3. **Android → Play 내부 테스트**: `npx eas-cli build --platform android --profile production --auto-submit --non-interactive --no-wait`. 서비스 계정 키 `google-play-service-account.json` 은 gitignore — 새 Mac 에서는 Google Cloud 'ongi' 프로젝트의 `eas-play-submit` 서비스 계정 키를 다시 받아 둔다.
4. 둘 다 끝날 때까지 지켜보고 빌드 번호·링크를 보고한다.
