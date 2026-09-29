import { request } from './client';

export interface ActivityPing {
  /** 지난 전송 뒤로 앱을 화면에 띄워 둔 시간(초) */
  seconds: number;
  /** 새 방문의 첫 전송 (앱을 켰거나 5분 넘게 떠났다 돌아옴) */
  newSession: boolean;
  platform: string;
  appVersion: string;
}

/** 앱 사용 시간 전송 — 운영자가 보는 지표(접속자·체류시간)용. 화면에는 아무 영향이 없다 */
export async function sendActivityPing(ping: ActivityPing): Promise<void> {
  await request<{ ok: boolean }>('/ongi/activity/ping', { method: 'POST', body: JSON.stringify(ping) });
}
