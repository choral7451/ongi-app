/**
 * 초대 문구 — 앱 설치 안내 + 코드 + 참여 방법 (웹은 랜딩만 남겨 앱으로만 참여).
 * 설치 링크는 스마트 링크 하나 — 웹(ongi-web `/download`)이 받는 사람 기기를 보고 App Store · Google Play 로 보낸다.
 */
export const DOWNLOAD_URL = 'https://www.ongifamily.com/download';

export function buildInviteMessage(params: { groupName?: string; inviteCode: string; expiresInDays?: number }): string {
  const { groupName, inviteCode, expiresInDays = 7 } = params;
  return [
    '[온기] 우리 가족 공간에 초대해요',
    '',
    ...(groupName ? [`가족 공간: ${groupName}`] : []),
    `초대 코드: ${inviteCode}`,
    '',
    '참여 방법',
    `1. 온기 앱 설치: ${DOWNLOAD_URL}`,
    "2. 로그인 후 '초대 코드로 참여'에 코드 입력",
    '',
    `초대 코드는 ${expiresInDays}일간 유효해요.`,
  ].join('\n');
}
