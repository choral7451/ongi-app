import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

/** 하단 액션 시트 — iOS 는 네이티브 시트, 그 외는 Alert 버튼 목록 */
export function showActions(title: string, actions: ActionItem[]): void {
  if (actions.length === 0) return;
  if (Platform.OS === 'ios') {
    const options = [...actions.map((a) => a.label), '취소'];
    const destructiveButtonIndex = actions.findIndex((a) => a.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (index) => actions[index]?.onPress(),
    );
    return;
  }
  Alert.alert(title, undefined, [
    ...actions.map((a) => ({ text: a.label, style: a.destructive ? ('destructive' as const) : ('default' as const), onPress: a.onPress })),
    { text: '취소', style: 'cancel' as const },
  ]);
}

export function confirm(title: string, message: string, confirmText: string, onConfirm: () => void, destructive = true): void {
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** 신고 사유 입력 — 비워두면 '사유 미입력' 으로 접수 */
export function promptReason(title: string, onSubmit: (reason: string) => void): void {
  if (Platform.OS === 'ios') {
    Alert.prompt(
      title,
      '신고 내용은 운영진이 24시간 안에 확인해요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '신고', style: 'destructive', onPress: (text?: string) => onSubmit(text?.trim() || '사유 미입력') },
      ],
      'plain-text',
    );
    return;
  }
  confirm(title, '신고 내용은 운영진이 24시간 안에 확인해요.', '신고', () => onSubmit('사유 미입력'));
}

export const alertError = (title: string) => (e: unknown) =>
  Alert.alert(title, e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');

export const REPORT_DONE_MESSAGE = '신고가 접수됐어요. 운영진이 24시간 안에 확인하고 필요한 조치를 할게요.';
