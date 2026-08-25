import { useRouter } from 'expo-router';
import { Plus, Ticket } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { colors, fonts, iconStroke, radius } from '../theme';

/**
 * 가족 공간이 하나도 없을 때(가입 직후) 탭 콘텐츠 대신 보여주는 첫 화면.
 * 심사관·신규 사용자가 빈 화면에서 막히지 않도록 만들기/참여 진입점을 크게 둔다.
 */
export function NoGroupState({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.kicker}>시작하기</Text>
      <Text style={styles.title}>아직 가족 공간이 없어요</Text>
      <Text style={styles.body}>
        가족 공간을 만들고 초대 코드를 나누거나,{'\n'}받은 초대 코드로 가족 공간에 참여해 보세요.
      </Text>
      <View style={styles.actions}>
        <Button
          label="가족 공간 만들기"
          icon={<Plus size={15} color={colors.accent} strokeWidth={iconStroke} />}
          onPress={() => router.push('/groups')}
          style={styles.action}
        />
        <Button
          variant="secondary"
          label="초대 코드로 참여"
          icon={<Ticket size={15} color={colors.text} strokeWidth={iconStroke} />}
          onPress={() => router.push('/groups')}
          style={styles.action}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 22,
    gap: 8,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
  },
  wrapCompact: {
    marginTop: 8,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    color: colors.textMuted,
    marginBottom: 6,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  action: {
    paddingVertical: 11,
  },
});
