import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastContent } from '../components/ui/Toast';

const TOAST_MS = 3200;

/** 화면 하나에서 쓰는 토스트 상태 — show 하면 일정 시간 뒤 저절로 사라진다 */
export function useToast() {
  const [toast, setToast] = useState<ToastContent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);
  const show = useCallback(
    (content: ToastContent) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(content);
      timer.current = setTimeout(() => setToast(null), TOAST_MS);
    },
    [],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return { toast, show, hide };
}
