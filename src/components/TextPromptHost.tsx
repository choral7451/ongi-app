import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme';
import { useTextPromptStore } from '../utils/prompt';

/** promptText 의 안드로이드 입력 모달 — 루트 레이아웃에 한 번만 둔다 */
export function TextPromptHost() {
  const request = useTextPromptStore((s) => s.request);
  const close = useTextPromptStore((s) => s.close);
  const [value, setValue] = useState('');

  // 새 요청이 열릴 때마다 기본값으로 초기화
  useEffect(() => {
    if (request) setValue(request.defaultValue ?? '');
  }, [request]);

  const submit = () => {
    const current = request;
    close();
    current?.onSubmit(value);
  };

  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="닫기" />
        <View style={styles.card}>
          <Text style={styles.title}>{request?.title}</Text>
          {request?.message ? <Text style={styles.message}>{request.message}</Text> : null}
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={setValue}
            placeholder={request?.placeholder}
            placeholderTextColor={colors.neutral500}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={close} accessibilityRole="button">
              <Text style={styles.cancelLabel}>취소</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={submit} accessibilityRole="button">
              <Text style={styles.confirmLabel}>{request?.confirmText ?? '확인'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(16, 17, 20, 0.45)',
  },
  card: {
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.text,
  },
  message: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  input: {
    marginTop: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.accent,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  action: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cancelLabel: {
    fontSize: 15,
    color: colors.neutral700,
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
});
