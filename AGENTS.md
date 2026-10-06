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
3. **Android → Play 내부 테스트**: `gh workflow run android-build.yml` — GitHub Linux 러너에서 EAS 로컬 빌드 후 fastlane 으로 Play 내부 테스트 트랙에 직접 제출 (`.github/workflows/android-build.yml`, 시크릿 `EXPO_TOKEN` · `PLAY_SERVICE_ACCOUNT_JSON`). EAS 클라우드 빌드 한도도, EAS Submit 큐도 쓰지 않는다. iOS 와 같은 구조.
   - **빌드는 됐는데 제출만 실패했을 때**: `gh run download <run-id> -n ongi-android-aab -D <dir>` → `npx eas-cli submit --platform android --profile production --path <dir>/ongi.aab --non-interactive --wait` (서비스 계정 키 `google-play-service-account.json` 은 gitignore — 새 Mac 에서는 Google Cloud 'ongi' 프로젝트의 `eas-play-submit` 서비스 계정 키를 다시 받아 둔다). 제출 뒤 `node scripts/play-promote.mjs status` 로 내부 테스트 트랙 확인. 제출이 진행 중일 때는 status 를 돌리지 않는다 (같은 서비스 계정으로 새 edit 를 열면 진행 중인 제출이 'This edit has expired' 로 실패한다).
4. 둘 다 끝날 때까지 지켜보고 빌드 번호·링크를 보고한다.

### 스토어 릴리즈 — 사용자가 "릴리즈 올려" / "배포해줘" 라고 하면 (확인 질문 없이 바로, 2026-09-26 방식 그대로)

대상은 항상 **main 의 최신 버전**(`app.json` version)이고, 그 버전의 최신 테스트 빌드(TestFlight 최신 빌드 번호 · Play 내부 테스트 최신 versionCode)를 그대로 스토어에 올린다. 순서:

1. **릴리즈 노트 작성**: 그 버전에 들어간 변경(지난 릴리즈 이후 커밋)으로 한국어 "새로운 기능"을 `•` 목록으로 쓴다. `store/ko/release_notes.txt` 에 저장해 두 플랫폼에 같은 문구를 쓴다.
   - **스토어 등록정보**는 `store/ko/` 에 둔다: `name` · `subtitle` · `description` · `keywords` · `promotional_text` (iOS), `name` · `play_short_description` · `description` (Play). iOS 는 심사 제출 때 파일이 있는 항목을 같이 보낸다(이름·부제는 새 버전 제출 때만 바뀐다). Play 는 `node scripts/play-promote.mjs listing` 으로 현재 값을 보고 `listing apply` 로 바꾼다.
2. **iOS 심사 제출**: `gh workflow run ios-release.yml -R choral7451/ongi-app -f version=<version> -f build_number=<TestFlight 빌드>` (노트는 `store/ko/release_notes.txt`, `-f notes="<노트>"` 를 주면 그 문구가 우선) → `.github/workflows/ios-release.yml` 이 App Store Connect API 로 새 버전 생성 → 빌드 연결 → 노트 입력 → 심사 제출 (승인 시 자동 출시). 시크릿 `ASC_KEY_ID`·`ASC_ISSUER_ID`·`ASC_PRIVATE_KEY`, 키 파일 `AuthKey_2C4Y97SKB3.p8` 은 gitignore. 결과는 `gh run watch` 로 지켜보고, App Store Connect 상태가 WAITING_FOR_REVIEW 인지 API 로 확인한다.
3. **Android 프로덕션 승격**: `node scripts/play-promote.mjs status` 로 내부 테스트의 최신 versionCode 확인 → `node scripts/play-promote.mjs promote <versionCode> <version> <노트 파일>` (Play Developer API 로 internal → production 트랙 이동 + ko-KR 릴리즈 노트). `eas submit` 은 업로드 방식이라 같은 versionCode 를 다시 못 올린다 — 승격에는 쓰지 않는다.
4. **보고**: 플랫폼별 버전·빌드 번호·상태(iOS 심사 대기 / Android 프로덕션 출시)와 제출한 릴리즈 노트를 보여준다.
5. **이후**: 다음 앱 수정 때 `app.json` version patch +1 (릴리즈 프로세스 1번). 강제 업데이트(`ongi_configs` 의 `min_ios_version`·`min_android_version`)는 사용자가 따로 요청할 때만, 그리고 스토어 배포가 실제로 끝난 뒤에만 올린다.
