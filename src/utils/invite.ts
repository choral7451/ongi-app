/** 초대 문구 — 웹 주소 + 코드 + 참여 방법을 한 번에 (앱·웹 공통 문구) */
export const WEB_URL = 'https://www.ongifamily.com';

export function buildInviteMessage(params: { groupName?: string; inviteCode: string; expiresInDays?: number }): string {
  const { groupName, inviteCode, expiresInDays = 7 } = params;
  const joinUrl = `${WEB_URL}/groups?code=${encodeURIComponent(inviteCode)}`;
  return [
    '[온기] 우리 가족 공간에 초대해요',
    '',
    ...(groupName ? [`가족 공간: ${groupName}`] : []),
    `초대 코드: ${inviteCode}`,
    '',
    '참여 방법',
    `1. ${WEB_URL} 접속 (또는 온기 앱 설치)`,
    "2. 로그인 후 '초대 코드로 참여'에 코드 입력",
    '',
    `바로 참여: ${joinUrl}`,
    `초대 코드는 ${expiresInDays}일간 유효해요.`,
  ].join('\n');
}
