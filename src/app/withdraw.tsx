import { useRouter } from 'expo-router';
import { Check, ChevronLeft, DoorOpen, Image as ImageIcon, LogOut, MessageCircle, Users } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../components/ui/Button';
import { useDeleteAccount, useFamily, useProfileStats } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke, radius } from '../theme';
import { alertError, confirm } from '../utils/dialogs';

function LossItem({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <View style={styles.loss}>
      <View style={styles.lossIcon}>{icon}</View>
      <View style={styles.lossBody}>
        <Text style={styles.lossTitle}>{title}</Text>
        <Text style={styles.lossSub}>{sub}</Text>
      </View>
    </View>
  );
}

/**
 * 계정 관리 → 회원탈퇴 안내 — 잃는 것과 대안을 먼저 보여주고, 동의 체크 뒤에만 탈퇴 버튼이 켜진다.
 * 버튼을 누르면 기존과 같은 확인창을 한 번 더 거친다.
 */
export default function WithdrawScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const session = useSession();
  const stats = useProfileStats();
  const family = useFamily();
  const deleteAccount = useDeleteAccount();
  const [agreed, setAgreed] = useState(false);

  const photoCount = stats.data?.photoCount ?? 0;
  const familyCount = stats.data?.familyCount ?? 0;
  const familyName = family.data?.name;

  const onSignOut = () => {
    confirm('로그아웃', '로그아웃 하시겠어요? 계정과 사진은 그대로 남아요.', '로그아웃', () => session.signOut(), false);
  };

  const onDelete = () => {
    confirm(
      '회원탈퇴',
      '탈퇴하면 올린 사진과 댓글이 모두 삭제되며 되돌릴 수 없어요. 정말 탈퇴하시겠어요?',
      '탈퇴하기',
      () =>
        deleteAccount.mutate(undefined, {
          onSuccess: () => session.signOut(),
          onError: alertError('회원탈퇴 실패'),
        }),
    );
  };

  const canDelete = agreed && !deleteAccount.isPending;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>회원탈퇴</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.heading}>탈퇴하기 전에 확인해 주세요</Text>
        <Text style={styles.lead}>탈퇴하면 아래 내용이 모두 삭제되며 되돌릴 수 없어요.</Text>

        <View style={styles.lossList}>
          <LossItem
            icon={<ImageIcon size={18} color={colors.neutral800} strokeWidth={iconStroke} />}
            title={photoCount > 0 ? `올린 사진과 영상 ${photoCount}개` : '올린 사진과 영상'}
            sub="공간의 다른 사람 화면에서도 사라져요"
          />
          <LossItem
            icon={<MessageCircle size={18} color={colors.neutral800} strokeWidth={iconStroke} />}
            title="남긴 댓글과 대화"
            sub="'탈퇴한 사용자'로 표시돼요"
          />
          <LossItem
            icon={<Users size={18} color={colors.neutral800} strokeWidth={iconStroke} />}
            title={
              familyCount > 1
                ? `참여 중인 공간 ${familyCount}곳의 구성원 정보`
                : familyName
                  ? `${familyName} 공간 참여 정보`
                  : '공간 참여 정보'
            }
            sub="다른 사람의 공간은 그대로 남아요"
          />
        </View>

        <View style={styles.alt}>
          <Text style={styles.altTitle}>잠깐, 이런 방법도 있어요</Text>
          <View style={styles.altRow}>
            <Pressable style={[styles.altButton, styles.altPrimary]} onPress={onSignOut} accessibilityRole="button">
              <LogOut size={16} color={colors.accent} strokeWidth={iconStroke} />
              <Text style={[styles.altLabel, styles.altPrimaryLabel]}>로그아웃만 하기</Text>
            </Pressable>
            <Pressable
              style={[styles.altButton, styles.altSecondary]}
              onPress={() => router.replace('/family')}
              accessibilityRole="button"
            >
              <DoorOpen size={16} color={colors.neutral800} strokeWidth={iconStroke} />
              <Text style={styles.altLabel}>공간만 나가기</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.spacer} />

        <Pressable
          style={styles.agreeRow}
          onPress={() => setAgreed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
            {agreed ? <Check size={14} color={colors.white} strokeWidth={2.5} /> : null}
          </View>
          <Text style={styles.agreeText}>위 내용을 확인했고, 계정과 데이터가 삭제되는 데 동의합니다.</Text>
        </Pressable>

        <Pressable
          style={[styles.deleteButton, canDelete ? styles.deleteButtonOn : styles.deleteButtonOff]}
          onPress={onDelete}
          disabled={!canDelete}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canDelete }}
        >
          <Text style={[styles.deleteLabel, canDelete ? styles.deleteLabelOn : styles.deleteLabelOff]}>
            {deleteAccount.isPending ? '탈퇴 처리 중…' : '탈퇴하기'}
          </Text>
        </Pressable>
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
    paddingTop: 12,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: 30,
    color: colors.text,
  },
  lead: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.neutral700,
  },
  lossList: {
    marginTop: 22,
    gap: 16,
  },
  loss: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  lossIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lossBody: {
    flex: 1,
    gap: 2,
  },
  lossTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  lossSub: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  alt: {
    marginTop: 22,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.neutral100,
  },
  altTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  altRow: {
    flexDirection: 'row',
    gap: 8,
  },
  altButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
  },
  altPrimary: {
    borderColor: colors.accent,
  },
  altSecondary: {
    borderColor: colors.neutral400,
  },
  altLabel: {
    fontSize: 13,
    color: colors.text,
  },
  altPrimaryLabel: {
    color: colors.accent,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  deleteButton: {
    marginTop: 8,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  deleteButtonOn: {
    borderColor: colors.danger,
  },
  deleteButtonOff: {
    borderColor: colors.neutral300,
  },
  deleteLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  deleteLabelOn: {
    color: colors.danger,
  },
  deleteLabelOff: {
    color: colors.neutral400,
  },
});
