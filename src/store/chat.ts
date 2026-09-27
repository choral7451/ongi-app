/**
 * 지금 보고 있는 대화방 — 그 방의 새 메시지 푸시는 앱이 켜져 있을 때 배너로 띄우지 않는다.
 * 렌더와 무관한 값이라 상태 스토어가 아닌 모듈 변수로 둔다.
 */
let activeRoomId: string | null = null;

export function setActiveChatRoom(roomId: string | null): void {
  activeRoomId = roomId;
}

export function getActiveChatRoom(): string | null {
  return activeRoomId;
}
