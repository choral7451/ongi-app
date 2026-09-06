import { create } from 'zustand';
import type { FamilyEvent } from '../types';

/**
 * 화면 간 UI 신호 — 홈 로고를 누르면 홈 화면이 스크롤·헤더까지 처음 상태로 돌아가게 한다.
 * savedEvent: 일정 폼이 저장한 최신 값 — 상세 화면이 파라미터 스냅샷 대신 이 값으로 즉시 갱신한다.
 */
interface UiState {
  homeResetTick: number;
  requestHomeReset: () => void;
  savedEvent: FamilyEvent | null;
  setSavedEvent: (event: FamilyEvent | null) => void;
}

export const useUi = create<UiState>((set) => ({
  homeResetTick: 0,
  requestHomeReset: () => set((s) => ({ homeResetTick: s.homeResetTick + 1 })),
  savedEvent: null,
  setSavedEvent: (event) => set({ savedEvent: event }),
}));
