import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
import { useActionSheetStore, type ActionItem } from '../utils/dialogs';

/** showActions 의 안드로이드 하단 시트 — 바깥·뒤로가기·취소로 닫힌다. 루트 레이아웃에 한 번만 둔다 */
export function ActionSheetHost() {
  const request = useActionSheetStore((s) => s.request);
  const close = useActionSheetStore((s) => s.close);
  const insets = useSafeAreaInsets();

  const select = (action: ActionItem) => {
    close();
    // 액션이 다음 시트·확인창을 열 수 있으므로 닫은 뒤 실행
    action.onPress();
  };

  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="닫기" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.title} numberOfLines={2}>
            {request?.title}
          </Text>
          <ScrollView style={styles.list} bounces={false}>
            {request?.actions.map((action, index) => (
              <Pressable
                key={`${index}-${action.label}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => select(action)}
                accessibilityRole="button"
              >
                <Text style={[styles.label, action.destructive && styles.destructive]} numberOfLines={1}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={({ pressed }) => [styles.row, styles.cancelRow, pressed && styles.rowPressed]}
            onPress={close}
            accessibilityRole="button"
          >
            <Text style={styles.cancelLabel}>취소</Text>
          </Pressable>
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
    maxHeight: '75%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.bg,
    paddingTop: 18,
  },
  title: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.textMuted,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  rowPressed: {
    backgroundColor: colors.neutral100,
  },
  label: {
    fontSize: 16,
    color: colors.text,
  },
  destructive: {
    color: colors.danger,
  },
  cancelRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral700,
    textAlign: 'center',
  },
});
