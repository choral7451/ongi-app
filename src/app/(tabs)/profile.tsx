import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera, ChevronRight, FileText, Mail, Pencil, ShieldCheck, Users, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import {
  useDeleteAccount,
  useFamily,
  useLocalPhotos,
  useMe,
  useProfileStats,
  useUpdateMyName,
  useUploadAvatar,
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
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** 운영 문의처 — 약관·개인정보 처리방침의 문의 이메일과 동일 */
const SUPPORT_EMAIL = 'artinfokorea2022@gmail.com';

const showError = (title: string) => (e: unknown) =>
  Alert.alert(title, e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');

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
      {onPress ? <ChevronRight size={16} color={colors.neutral500} strokeWidth={iconStroke} /> : null}
    </Pressable>
  );
}

/** 1f — 프로필 / 설정 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();
  const me = useMe();
  const stats = useProfileStats();
  const family = useFamily();
  const deleteAccount = useDeleteAccount();
  const updateMyName = useUpdateMyName();
  const uploadAvatar = useUploadAvatar();

  const [pickerVisible, setPickerVisible] = useState(false);
  // 사진 보관함 권한은 사용자가 프로필 이미지 변경을 눌렀을 때만 요청한다 (App Store 5.1.1)
  const localPhotos = useLocalPhotos(pickerVisible);

  const promptRename = () => {
    Alert.prompt(
      '이름 변경',
      '가족에게 보여질 이름이에요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: (name?: string) => {
            const trimmed = name?.trim();
            if (!trimmed || trimmed === me.data?.name) return;
            updateMyName.mutate(trimmed, { onError: showError('이름 변경 실패') });
          },
        },
      ],
      'plain-text',
      me.data?.name ?? session.currentUserName,
    );
  };

  const pickAvatar = (assetId: string) => {
    setPickerVisible(false);
    uploadAvatar.mutate(assetId, { onError: showError('프로필 이미지 변경 실패') });
  };

  const onSignOut = () => {
    confirmAction('로그아웃', '로그아웃 하시겠어요?', '로그아웃', () => session.signOut());
  };

  const onDeleteAccount = () => {
    confirmAction(
      '회원탈퇴',
      '탈퇴하면 올린 사진과 댓글이 모두 삭제되며 되돌릴 수 없어요. 정말 탈퇴하시겠어요?',
      '탈퇴하기',
      () =>
        deleteAccount.mutate(undefined, {
          onSuccess: () => session.signOut(),
          onError: showError('회원탈퇴 실패'),
        }),
      true,
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHead}>
          <Pressable onPress={() => setPickerVisible(true)} accessibilityLabel="프로필 이미지 변경">
            {me.data?.avatarUrl ? (
              <Image source={{ uri: me.data.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text style={styles.avatarInitial}>
                  {(me.data?.name ?? session.currentUserName).slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera size={13} color={colors.white} strokeWidth={iconStroke} />
            </View>
          </Pressable>
          <View style={styles.nameBlock}>
            <Pressable style={styles.nameRow} onPress={promptRename} accessibilityLabel="이름 변경">
              <Text style={styles.name}>
                {updateMyName.isPending ? '변경 중…' : (me.data?.name ?? session.currentUserName)}
              </Text>
              <Pencil size={14} color={colors.neutral500} strokeWidth={iconStroke} />
            </Pressable>
            <Text style={styles.nameMeta}>{family.data?.name ?? ''}</Text>
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

        <SectionHeader title="가족 공간" size="sm" />
        <SettingRow
          icon={<Users size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="가족 공간 만들기 · 참여 · 전환"
          divider={false}
          onPress={() => router.push('/groups')}
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
          onPress={() => router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })}
        />
        <SettingRow
          icon={<Mail size={18} color={colors.neutral600} strokeWidth={iconStroke} />}
          label="문의하기"
          trailing={<Text style={styles.settingMeta}>{SUPPORT_EMAIL}</Text>}
          divider={false}
          onPress={() =>
            Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('[온기] 문의')}`).catch(() =>
              Alert.alert('문의하기', `${SUPPORT_EMAIL} 로 메일을 보내주세요.`),
            )
          }
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

      {/* 프로필 이미지 선택 — 최근 갤러리 사진에서 고른다 */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={[styles.pickerScreen, { paddingTop: Math.max(insets.top, 6) }]}>
          <View style={styles.pickerHeader}>
            <IconButton
              accessibilityLabel="닫기"
              onPress={() => setPickerVisible(false)}
              icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />}
            />
            <Text style={styles.pickerTitle}>프로필 이미지 선택</Text>
            <View style={styles.pickerSpacer} />
          </View>
          <FlatList
            data={localPhotos.data?.photos ?? []}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.pickerRow}
            contentContainerStyle={[styles.pickerContent, { paddingBottom: insets.bottom + 24 }]}
            onEndReached={() => {
              if (localPhotos.hasNextPage && !localPhotos.isFetchingNextPage) void localPhotos.fetchNextPage();
            }}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <Pressable style={styles.pickerCell} onPress={() => pickAvatar(item.id)}>
                <Image source={{ uri: item.uri }} style={styles.pickerImage} />
              </Pressable>
            )}
            ListEmptyComponent={
              localPhotos.isLoading ? null : (
                <Text style={styles.pickerEmpty}>사진 보관함에 사진이 없거나 접근 권한이 없어요.</Text>
              )
            }
          />
        </View>
      </Modal>
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
  avatarEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontSize: 34,
    color: colors.accent700,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  nameBlock: {
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 11,
    color: colors.textMuted,
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
  pickerScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  pickerTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.text,
  },
  pickerSpacer: {
    width: 36,
  },
  pickerContent: {
    paddingHorizontal: 20,
  },
  pickerRow: {
    gap: 4,
    marginBottom: 4,
  },
  pickerCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.neutral200,
  },
  pickerImage: {
    flex: 1,
  },
  pickerEmpty: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 60,
  },
});
