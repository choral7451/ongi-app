/** 일정 달력 날짜 유틸 — 기기 로컬 타임존 기준 (한국 사용자 대상) */

const pad2 = (n: number) => String(n).padStart(2, '0');

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayStr = () => toDateStr(new Date());

/** 'YYYY-MM-DD' → 로컬 자정 Date */
export const parseDateStr = (s: string) => new Date(`${s}T00:00:00`);

export const monthOf = (dateStr: string) => dateStr.slice(0, 7);

/** 'YYYY-MM' + n개월 */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function addDaysStr(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

/** 달력 그리드 — 일요일 시작, 앞뒤 빈 칸은 null */
export function monthMatrix(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(first.getDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(`${month}-${pad2(day)}`);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  return weeks;
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** '2026-09-12' → '2026년 9월 12일 토요일' */
export function formatKoreanDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS_KO[d.getDay()]}요일`;
}

/** '2026-09-12' → '9. 12. (토)' */
export function formatShortDate(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}. ${d.getDate()}. (${WEEKDAYS_KO[d.getDay()]})`;
}

/** '19:00' → '오후 7:00' */
export function formatKoreanTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${pad2(m)}`;
}

/** 발생일까지 남은 일수 (오늘 = 0) */
export function daysUntil(dateStr: string): number {
  return Math.round((parseDateStr(dateStr).getTime() - parseDateStr(todayStr()).getTime()) / 86_400_000);
}

/** 'D-3' | '오늘' | 'D+2' */
export function ddayLabel(dateStr: string): string {
  const n = daysUntil(dateStr);
  if (n === 0) return '오늘';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

export const REPEAT_LABELS: Record<string, string> = {
  none: '반복 없음',
  weekly: '매주',
  monthly: '매월',
  yearly: '매년',
};
