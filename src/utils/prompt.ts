import { Alert, Platform } from 'react-native';
import { create } from 'zustand';

export interface TextPromptOptions {
  title: string;
  message?: string;
  /** 입력칸에 미리 채워둘 값 (이름 변경 등) */
  defaultValue?: string;
  placeholder?: string;
  /** 확인 버튼 문구 — 기본 '확인' */
  confirmText?: string;
  /** 확인을 눌렀을 때 입력값 (앞뒤 공백 제거 전 원문) — 취소하면 호출되지 않는다 */
  onSubmit: (text: string) => void;
}

interface TextPromptState {
  request: TextPromptOptions | null;
  open: (options: TextPromptOptions) => void;
  close: () => void;
}

/** 안드로이드용 입력 모달 상태 — 루트의 TextPromptHost 가 구독해 띄운다 */
export const useTextPromptStore = create<TextPromptState>((set) => ({
  request: null,
  open: (options) => set({ request: options }),
  close: () => set({ request: null }),
}));

/**
 * 텍스트 한 줄 입력창.
 * Alert.prompt 는 iOS 전용이라 안드로이드에서는 눌러도 아무 반응이 없다 → iOS 는 기존 네이티브 입력창, 그 외는 TextPromptHost 모달.
 */
export function promptText(options: TextPromptOptions): void {
  if (Platform.OS === 'ios') {
    Alert.prompt(
      options.title,
      options.message,
      [
        { text: '취소', style: 'cancel' },
        { text: options.confirmText ?? '확인', onPress: (text?: string) => options.onSubmit(text ?? '') },
      ],
      'plain-text',
      options.defaultValue,
    );
    return;
  }
  useTextPromptStore.getState().open(options);
}
