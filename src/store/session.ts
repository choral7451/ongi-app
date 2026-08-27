import { create } from 'zustand';
import { fetchMe, signOut as signOutApi, type AuthUser } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { loadTokens } from '../api/token';
import { unregisterCurrentPushToken } from '../push/token';

/** 앱 시작 시 세션 복원 최대 대기 — 네트워크가 멈춰도 스플래시에 갇히지 않게 한다 */
const RESTORE_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * 세션 상태 — 로그인한 사용자.
 * 로그인 성공 시 setUser 로 채워지고, 토큰은 expo-secure-store 에 저장됩니다.
 * 앱 시작 시 restore() 가 저장된 토큰으로 세션을 복원합니다.
 */
interface SessionState {
  /** 저장된 토큰으로 세션을 복원하는 중인지 — 완료 전에는 화면을 띄우지 않음 */
  isHydrating: boolean;
  isAuthenticated: boolean;
  currentUserId: string;
  currentUserName: string;
  /** 지금 보고 있는 그룹(가족 공간) — 모든 탭 콘텐츠가 이 그룹 기준 */
  activeGroupId: string;
  restore: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  /** 프로필에서 이름을 바꿨을 때 화면 표시용 이름 갱신 */
  setCurrentUserName: (name: string) => void;
  setActiveGroup: (groupId: string) => void;
  signOut: () => void;
}

export const useSession = create<SessionState>((set) => ({
  isHydrating: true,
  isAuthenticated: false,
  currentUserId: '',
  currentUserName: '',
  activeGroupId: '',
  restore: async () => {
    try {
      const tokens = await loadTokens();
      if (!tokens) return;
      const me = await withTimeout(fetchMe(), RESTORE_TIMEOUT_MS);
      set({ isAuthenticated: true, currentUserId: me.id, currentUserName: me.name });
    } catch (e) {
      // 타임아웃·네트워크 오류면 토큰은 남겨두고 로그인 화면으로 (다음 실행 때 재시도)
      if (!(e instanceof Error && e.message === 'timeout')) await signOutApi();
    } finally {
      set({ isHydrating: false });
    }
  },
  setUser: (user) =>
    set({ isAuthenticated: true, currentUserId: user.id, currentUserName: user.name }),
  setCurrentUserName: (name) => set({ currentUserName: name }),
  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
  signOut: () => {
    // 이 기기 푸시 토큰 해제 → 세션 토큰이 살아있는 동안 먼저 호출
    void unregisterCurrentPushToken().finally(() => void signOutApi());
    set({ isAuthenticated: false, currentUserId: '', currentUserName: '', activeGroupId: '' });
  },
}));

// 토큰 갱신 실패(refresh 만료 등) → 화면이 에러만 뿌리는 좀비 세션이 되지 않도록 즉시 로그아웃
setUnauthorizedHandler(() => {
  if (useSession.getState().isAuthenticated) useSession.getState().signOut();
});

/** 현재 활성 그룹 id — 그룹 스코프 쿼리 훅에서 사용 */
export const useActiveGroupId = () => useSession((s) => s.activeGroupId);
