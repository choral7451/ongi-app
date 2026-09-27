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

/** "방금 전" · "5분 전" · "3시간 전" · "2일 전" · 그 이후는 "8월 17일" */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diffSec = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return '방금 전';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 채팅 목록 시각 — 오늘은 "오후 2:30", 어제는 "어제", 그 이전은 "8월 17일" (해가 다르면 "2025. 8. 17.") */
export function formatChatListTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return formatTime(iso);
  if (d.getTime() >= startOfToday - 24 * 60 * 60 * 1000) return '어제';
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
