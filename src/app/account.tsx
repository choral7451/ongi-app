import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useMe, useMyGroups } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke } from '../theme';

const PROVIDER_LABEL: Record<string, string> = {
  apple: 'Apple로 로그인',
  kakao: '카카오로 로그인',
  google: '구글로 로그인',
  naver: '네이버로 로그인',
};

/**
 * 나 → 계정 관리 — 가입 정보와 참여 중인 공간을 보여주고, 회원탈퇴 진입점을 맨 아래 작은 글씨로 둔다.
 * 프로필 탭에서 바로 탈퇴하던 것을 한 단계 안으로 옮겨 충동 탈퇴를 줄이되, 앱 안에서 찾을 수 있는 위치(App Store 5.1.1(v))는 유지한다.
 */
export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();
  const me = useMe();
  const groups = useMyGroups();

  const providerLabel = me.data ? (PROVIDER_LABEL[me.data.provider] ?? me.data.provider) : '';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>계정 관리</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SectionHeader title="가입 정보" size="sm" />
        <View style={[styles.row, styles.divider]}>
          <Text style={styles.rowLabel}>이름</Text>
          <Text style={styles.rowValue}>{me.data?.name ?? session.currentUserName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>로그인 방식</Text>
          <Text style={styles.rowValue}>{providerLabel}</Text>
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title="참여 중인 공간" meta={groups.data ? `${groups.data.length}개` : undefined} size="sm" />
        </View>
        {(groups.data ?? []).map((group, index) => (
          <View key={group.id} style={[styles.row, index < (groups.data?.length ?? 0) - 1 && styles.divider]}>
            <Users size={18} color={colors.neutral600} strokeWidth={iconStroke} />
            <Text style={styles.rowLabel}>{group.name}</Text>
            <Text style={styles.rowMeta}>{group.memberCount}명</Text>
          </View>
        ))}
        {groups.data?.length === 0 ? <Text style={styles.empty}>참여 중인 공간이 없어요.</Text> : null}

        <View style={styles.footer}>
          <Pressable
            style={styles.withdrawRow}
            onPress={() => router.push('/withdraw')}
            accessibilityRole="button"
            accessibilityLabel="회원탈퇴"
          >
            <Text style={styles.withdraw}>회원탈퇴</Text>
            <ChevronRight size={16} color={colors.neutral400} strokeWidth={iconStroke} />
          </Pressable>
        </View>
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  rowValue: {
    fontSize: 13,
    color: colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: 14,
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionGap: {
    marginTop: 24,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  withdrawRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  withdraw: {
    fontSize: 13,
    color: colors.neutral600,
  },
});
