import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFamily } from '../hooks/queries';
import { colors, fonts, iconStroke } from '../theme';

/** 모든 탭 상단에 고정되는 ONGI 로고 + 가족 공간 선택 헤더 */
export function AppHeader() {
  const router = useRouter();
  const group = useFamily();

  return (
    <View style={styles.header}>
      {/* scaleX 는 Text 가 아니라 View 에 — Text 에 직접 걸면 transformOrigin 이 무시돼 왼쪽 라인이 어긋난다 */}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>ONGI</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="가족 공간 전환"
        style={styles.groupSelector}
        onPress={() => router.push('/groups')}
        hitSlop={8}
      >
        <Text style={styles.kicker} numberOfLines={1}>
          {group.data?.name ?? '우리 가족의 오늘'}
        </Text>
        <ChevronDown size={14} color={colors.accent} strokeWidth={iconStroke} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  titleWrap: {
    // 가로로 살짝 넓게 — 왼쪽 끝을 기준으로 늘려 콘텐츠 왼쪽 라인(헤더 padding 20)과 맞춘다
    alignSelf: 'flex-start',
    transform: [{ scaleX: 1.15 }],
    transformOrigin: 'left center',
  },
  title: {
    // 둥글고 귀여운 로고체(Fredoka)
    fontFamily: fonts.logo,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 3,
    color: colors.text,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  kicker: {
    flexShrink: 1,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.accent,
  },
});
