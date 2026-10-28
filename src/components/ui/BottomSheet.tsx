import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** 제목 아래 한두 줄 설명 */
  description?: string;
  children?: ReactNode;
  /** 하단 고정 버튼 영역 — 스크롤되지 않는다 */
  footer?: ReactNode;
}

/**
 * 하단 시트 — 제목·설명·스크롤 본문·고정 푸터. 바깥을 누르거나 뒤로가기로 닫힌다.
 * 네이티브 액션시트(showActions)와 달리 한 화면에서 여러 단계(공간 → 앨범)를 끝낼 때 쓴다.
 */
export function BottomSheet({ visible, onClose, title, description, children, footer }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grab} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <ScrollView style={styles.body} bounces={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16, 17, 20, 0.45)',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.bg,
    paddingTop: 10,
    paddingHorizontal: 20,
  },
  grab: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral300,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.text,
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  body: {
    flexGrow: 0,
    marginTop: 14,
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
});
