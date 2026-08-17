import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Bell,
  Camera,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Tag } from '../../components/ui/Tag';
import {
  useDeleteAccount,
  useFamily,
  useProfileStats,
  useStorageInfo,
} from '../../hooks/queries';
import { useSession } from '../../store/session';
import { colors, fonts, iconStroke } from '../../theme';

/** Alert는 웹에서 동작하지 않아 웹은 window.confirm으로 대체 */
function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  destructive = false,
) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

interface SettingRowProps {
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  divider?: boolean;
  onPress?: () => void;
}

function SettingRow({ icon, label, trailing, divider = true, onPress }: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, divider && styles.settingDivider]}
    >
      {icon}
      <Text style={styles.settingLabel}>{label}</Text>
      {trailing}
      <ChevronRight size={16} color={colors.neutral500} strokeWidth={iconStroke} />
    </Pressable>
  );
}

/** 1f — 프로필 / 설정 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();
  const stats = useProfileStats();
  const storage = useStorageInfo();
  const family = useFamily();
  const deleteAccount = useDeleteAccount();

  const onSignOut = () => {
    confirmAction('로그아웃', '로그아웃 하시겠어요?', '로그아웃', () => session.signOut());
  };

  const onDeleteAccount = () => {
    confirmAction(
      '회원탈퇴',
      '탈퇴하면 올린 사진과 댓글이 모두 삭제되며 되돌릴 수 없어요. 정말 탈퇴하시겠어요?',
      '탈퇴하기',
      () => deleteAccount.mutate(undefined, { onSuccess: () => session.signOut() }),
      true,
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHead}>
          <Image
            source={{ uri: 'https://picsum.photos/seed/ongi-p2/300/300?grayscale' }}
            style={styles.avatar}
          />
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{session.currentUserName}</Text>
            <Text style={styles.nameMeta}>
              {family.data?.name ?? ''} · 관리자
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{stats.data?.photoCount ?? '–'}</Text>
              <Text style={styles.statLabel}>올린 사진</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{stats.data?.albumCount ?? '–'}</Text>
              <Text style={styles.statLabel}>앨범</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{stats.data?.familyCount ?? '–'}</Text>
              <Text style={styles.statLabel}>가족</Text>
            </View>
          </View>
        </View>

        <SectionHeader title="설정" size="sm" />
        <SettingRow
          icon={<Bell size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="알림"
          trailing={<Text style={styles.settingMeta}>새 사진·댓글</Text>}
        />
        <SettingRow
          icon={<Camera size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="자동 백업"
          trailing={<Tag label="켜짐" variant="accent" />}
        />
        <SettingRow
          icon={<ImageIcon size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="저장 공간"
          trailing={
            <Text style={styles.settingMeta}>
              {storage.data ? `${storage.data.usedGb}GB / ${storage.data.totalGb}GB` : ''}
            </Text>
          }
        />
        <SettingRow
          icon={<Users size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="가족 관리"
          trailing={<Text style={styles.settingMeta}>초대 · 권한</Text>}
          divider={false}
        />

        <View style={styles.sectionGap}>
          <SectionHeader title="약관 및 정책" size="sm" />
        </View>
        <SettingRow
          icon={<FileText size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="이용약관"
          onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })}
        />
        <SettingRow
          icon={<ShieldCheck size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="개인정보 처리방침"
          divider={false}
          onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })}
        />

        <View style={styles.sectionGap}>
          <SectionHeader title="계정" size="sm" />
        </View>
        <Pressable style={styles.settingRow} onPress={onSignOut}>
          <Text style={styles.signOut}>로그아웃</Text>
        </Pressable>
        <Pressable
          style={styles.settingRow}
          onPress={onDeleteAccount}
          disabled={deleteAccount.isPending}
        >
          <Text style={styles.deleteAccount}>
            {deleteAccount.isPending ? '탈퇴 처리 중…' : '회원탈퇴'}
          </Text>
        </Pressable>
        <Text style={styles.deleteHint}>
          탈퇴하면 올린 사진과 댓글이 모두 삭제되며 복구할 수 없어요.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileHead: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.accent100,
  },
  nameBlock: {
    alignItems: 'center',
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
  },
  nameMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCell: {
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  settingDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  settingMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  signOut: {
    flex: 1,
    fontSize: 14,
    color: colors.accent700,
  },
  sectionGap: {
    marginTop: 24,
  },
  deleteAccount: {
    flex: 1,
    fontSize: 14,
    color: colors.danger,
  },
  deleteHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: -6,
    marginBottom: 8,
  },
});
