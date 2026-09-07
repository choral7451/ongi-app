# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## AI 개발 프로세스 (온기)

- 기능 수정 시 `../ongi-web` 도 항상 함께 반영한다 (타입·쿼리 키 동일 유지).
- 요청에 기대 동작(기대값)을 함께 명시하고, 커밋 전 게이트: `npx tsc --noEmit` · `npx eslint src` 모두 통과 — CI 가 같은 검사를 강제한다.
- 테스트가 실패하면 테스트를 고치지 말고 구현을 의심할 것. 기대값 수정은 사유와 함께 별도 커밋으로만.
- 검증·정책 로직(날짜 계산 등)은 서버에 두고, 서버 쪽에 테스트를 작성한다.
