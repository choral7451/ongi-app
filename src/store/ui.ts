import { create } from 'zustand';

/**
 * 화면 간 UI 신호 — 홈 로고를 누르면 홈 화면이 스크롤·헤더까지 처음 상태로 돌아가게 한다.
 * 데이터가 아니라 "리셋해 달라"는 틱 카운터만 공유한다.
 */
interface UiState {
  homeResetTick: number;
  requestHomeReset: () => void;
}

export const useUi = create<UiState>((set) => ({
  homeResetTick: 0,
  requestHomeReset: () => set((s) => ({ homeResetTick: s.homeResetTick + 1 })),
}));
