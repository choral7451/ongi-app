import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { useLegalDoc } from '../../hooks/queries';
import { colors, fonts, iconStroke } from '../../theme';

/** 약관·개인정보 처리방침 문서 뷰어 */
export default function LegalDocScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const doc = useLegalDoc(slug);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.headerTitle}>{doc.data?.title ?? (slug === 'privacy' ? '개인정보 처리방침' : '이용약관')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {doc.isPending ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateText}>문서를 불러오는 중이에요…</Text>
          </View>
        ) : doc.isError ? (
          <Pressable style={styles.stateBox} onPress={() => doc.refetch()} accessibilityRole="button">
            <Text style={styles.stateText}>문서를 불러오지 못했어요.</Text>
            <Text style={styles.retry}>다시 시도</Text>
          </Pressable>
        ) : doc.data ? (
          <>
            <Text style={styles.kicker}>온기 정책</Text>
            <Text style={styles.title}>{doc.data.title}</Text>
            <Text style={styles.updatedAt}>시행일 {doc.data.updatedAt}</Text>
            <View style={styles.rule} />
            <Text style={styles.body}>{doc.data.body}</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accent,
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 34,
    color: colors.text,
  },
  updatedAt: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginVertical: 16,
  },
  body: {
    fontSize: 13.5,
    lineHeight: 23,
    color: colors.text,
  },
  stateBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 60,
  },
  stateText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  retry: {
    fontSize: 13,
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
});
