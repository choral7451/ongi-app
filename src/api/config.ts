import { request } from './client';

export interface AppConfig {
  minIosVersion: string;
  latestIosVersion: string;
  storeUrl: string;
}

/** 앱 최소/최신 버전 — 공개 엔드포인트, 시작 시 버전 게이트용 */
export function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>('/ongi/app-config');
}

/** '1.2.3' 형태 버전 비교 — a < b 이면 음수 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
