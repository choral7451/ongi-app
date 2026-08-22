import { create } from 'zustand';
import { fetchMe, signOut as signOutApi, type AuthUser } from '../api/auth';
import { loadTokens } from '../api/token';

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
      const me = await fetchMe();
      set({ isAuthenticated: true, currentUserId: me.id, currentUserName: me.name });
    } catch {
      // 토큰 만료 등 — 로그인 화면으로
      await signOutApi();
    } finally {
      set({ isHydrating: false });
    }
  },
  setUser: (user) =>
    set({ isAuthenticated: true, currentUserId: user.id, currentUserName: user.name }),
  setCurrentUserName: (name) => set({ currentUserName: name }),
  setActiveGroup: (groupId) => set({ activeGroupId: groupId }),
  signOut: () => {
    void signOutApi();
    set({ isAuthenticated: false, currentUserId: '', currentUserName: '', activeGroupId: '' });
  },
}));

/** 현재 활성 그룹 id — 그룹 스코프 쿼리 훅에서 사용 */
export const useActiveGroupId = () => useSession((s) => s.activeGroupId);
