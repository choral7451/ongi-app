/** 5분 넘게 떠났다 돌아오면 새 방문으로 센다 */
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
/** 쓰는 동안 이 간격으로 보낸다 */
export const FLUSH_INTERVAL_MS = 60 * 1000;
/** 한 번에 잴 수 있는 최대 — 타이머가 멈췄다 늦게 돌면(기기 절전 등) 떠나 있던 시간이 섞이지 않게 */
const MAX_TICK_MS = 2 * FLUSH_INTERVAL_MS;
/** 서버가 한 번에 받는 최대(초) — 전송이 계속 실패해도 이 이상 쌓지 않는다 */
const MAX_PENDING_SECONDS = 1800;

export interface ActivityMeterPing {
  seconds: number;
  newSession: boolean;
}

/**
 * 앱을 화면에 띄워 둔 시간을 재서 보낸다.
 * - 화면에 올라오면(resume) 재기 시작, 내려가면(pause) 그때까지의 시간을 보낸다
 * - 쓰는 동안에는 tick 마다 보낸다
 * - 전송에 실패한 시간·방문은 버리지 않고 다음 전송에 합친다
 * 시계와 전송을 밖에서 받아 React·네트워크 없이 확인할 수 있다.
 */
export class ActivityMeter {
  private activeSince: number | null = null;
  private pausedAt: number | null = null;
  private pendingMs = 0;
  private pendingSession = false;
  private sending = false;

  constructor(
    private readonly send: (ping: ActivityMeterPing) => Promise<void>,
    private readonly now: () => number = Date.now,
  ) {}

  resume(): void {
    if (this.activeSince !== null) return;
    const now = this.now();
    const isNewSession = this.pausedAt === null || now - this.pausedAt > SESSION_TIMEOUT_MS;
    this.activeSince = now;
    this.pausedAt = null;
    if (isNewSession) {
      this.pendingSession = true;
      void this.flush();
    }
  }

  pause(): void {
    if (this.activeSince === null) return;
    this.collect();
    this.activeSince = null;
    this.pausedAt = this.now();
    void this.flush();
  }

  tick(): void {
    if (this.activeSince === null) return;
    this.collect();
    void this.flush();
  }

  private collect(): void {
    if (this.activeSince === null) return;
    const now = this.now();
    this.pendingMs += Math.min(Math.max(0, now - this.activeSince), MAX_TICK_MS);
    this.activeSince = now;
  }

  private async flush(): Promise<void> {
    if (this.sending) return;
    const seconds = Math.min(Math.round(this.pendingMs / 1000), MAX_PENDING_SECONDS);
    const newSession = this.pendingSession;
    if (seconds === 0 && !newSession) return;

    this.sending = true;
    const sentMs = this.pendingMs;
    this.pendingMs = 0;
    this.pendingSession = false;
    try {
      await this.send({ seconds, newSession });
    } catch {
      // 다음 전송에 합친다 — 그 사이 새로 쌓인 시간은 그대로 둔다
      this.pendingMs += sentMs;
      this.pendingSession = this.pendingSession || newSession;
    } finally {
      this.sending = false;
    }
  }
}
