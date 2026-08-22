const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** "8월 17일 일요일" */
export function formatFeedDate(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAYS[date.getDay()]}요일`;
}

/** "오후 2:30" */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const period = hours < 12 ? '오전' : '오후';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${h12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "2026년 8월 17일 오후 2:30" */
export function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${formatTime(iso)}`;
}
