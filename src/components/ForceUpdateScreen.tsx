import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

/** 지원 종료 버전 차단 화면 — 업데이트 외 다른 동작은 막는다 */
export function ForceUpdateScreen({ storeUrl }: { storeUrl: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>업데이트가 필요해요</Text>
      <Text style={styles.body}>
        지금 쓰시는 버전은 더 이상 지원되지 않아요.{'\n'}새 버전으로 업데이트하고 가족의 오늘을 이어가세요.
      </Text>
      <Pressable style={styles.button} onPress={() => Linking.openURL(storeUrl)} accessibilityRole="button">
        <Text style={styles.buttonLabel}>App Store 에서 업데이트</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textMuted,
  },
  button: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 13,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
