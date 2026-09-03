import * as Clipboard from 'expo-clipboard';
import { ChevronRight, Copy, Hash, LogOut, Pencil, Plus, Share as ShareIcon } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoGroupState } from '../../components/NoGroupState';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import {
  useBlockMember,
  useCreateGroup,
  useFamily,
  useJoinGroup,
  useLeaveGroup,
  useMembers,
  useMyGroups,
  useRemoveMember,
  useRenameGroup,
  useReport,
  useUnblockMember,
} from '../../hooks/queries';
import { alertError, confirm, promptReason, REPORT_DONE_MESSAGE, showActions } from '../../utils/dialogs';
import { useActiveGroupId, useSession } from '../../store/session';
import { colors, fonts, iconStroke, radius } from '../../theme';
import type { Member } from '../../types';
import { buildInviteMessage } from '../../utils/invite';

function roleTag(member: Member) {
  switch (member.role) {
    case 'admin':
      return <Tag label="관리자" variant="outline" />;
    case 'pending':
      return <Tag label="대기" variant="accent" />;
    default:
      return <Tag label="멤버" variant="neutral" />;
  }
}

/** 1d — 가족: 구성원 · 초대 */
export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const family = useFamily();
  const members = useMembers();
  const myGroups = useMyGroups();
  const hasNoGroup = myGroups.isSuccess && myGroups.data.length === 0;

  const block = useBlockMember();
  const unblock = useUnblockMember();
  const router = useRouter();
  const remove = useRemoveMember();

  const report = useReport();

  const inviteCode = family.data?.inviteCode ?? '';
  const me = members.data?.find((m) => m.isMe);
  const activeGroupId = useActiveGroupId();
  const leave = useLeaveGroup();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const setActiveGroup = useSession((st) => st.setActiveGroup);

  const renameGroup = useRenameGroup();
  const promptRename = () =>
    Alert.prompt(
      '공간 이름 바꾸기',
      '가족 모두에게 새 이름으로 보여요.',
      (name) => {
        if (!name?.trim()) return;
        renameGroup.mutate({ groupId: activeGroupId, name: name.trim() }, { onError: alertError('이름 변경 실패') });
      },
      'plain-text',
      family.data?.name ?? '',
    );

  const promptCreate = () =>
    Alert.prompt('새 공간 만들기', '가족 공간 이름을 입력해 주세요.', (name) => {
      if (!name?.trim()) return;
      createGroup.mutate(name.trim(), {
        onSuccess: (created) => setActiveGroup(created.id),
        onError: alertError('공간 만들기 실패'),
      });
    });

  const promptJoin = () =>
    Alert.prompt('초대 코드로 참여', '받은 6자리 초대 코드를 입력해 주세요.', (code) => {
      if (!code?.trim()) return;
      joinGroup.mutate(code.trim(), {
        onSuccess: (joined) => setActiveGroup(joined.id),
        onError: alertError('참여 실패'),
      });
    });
  const isSoleAdmin = me?.role === 'admin' && !members.data?.some((m) => m.id !== me.id && m.role === 'admin');
  const othersCount = (members.data?.length ?? 1) - 1;
  const confirmLeave = () =>
    confirm(
      '가족 공간 나가기',
      othersCount === 0
        ? '마지막 구성원이라 나가면 이 가족 공간도 사라져요. 올린 사진은 함께 삭제됩니다.'
        : isSoleAdmin
          ? '나가면 가장 먼저 참여한 구성원이 관리자가 돼요. 올린 사진과 댓글은 공간에 남습니다.'
          : '올린 사진과 댓글은 공간에 남고, 다시 참여하려면 새 초대 코드가 필요해요.',
      '나가기',
      () =>
        leave.mutate(activeGroupId, {
          onSuccess: () => router.replace('/'),
          onError: alertError('나가기 실패'),
        }),
    );

  /** 구성원 ⋯ 메뉴 — 차단/해제 · 신고 · (관리자) 내보내기. App Store 1.2 UGC 요건 */
  const openMemberActions = (member: Member) => {
    if (member.isMe) return;
    showActions(member.name, [
      member.blockedByMe
        ? {
            label: '차단 해제',
            onPress: () => unblock.mutate(member.id, { onError: alertError('차단 해제 실패') }),
          }
        : {
            label: '차단',
            destructive: true,
            onPress: () =>
              confirm(
                '구성원 차단',
                `${member.name}의 사진과 댓글이 더 이상 보이지 않아요. 언제든 해제할 수 있어요.`,
                '차단',
                () => block.mutate(member.id, { onError: alertError('차단 실패') }),
              ),
          },
      {
        label: '신고',
        onPress: () =>
          promptReason('구성원 신고', (reason) =>
            report.mutate(
              { targetType: 'member', targetId: member.id, reason },
              { onSuccess: () => Alert.alert('신고 완료', REPORT_DONE_MESSAGE), onError: alertError('신고 실패') },
            ),
          ),
      },
      ...(me?.role === 'admin' && member.role !== 'admin'
        ? [
            {
              label: '가족 공간에서 내보내기',
              destructive: true,
              onPress: () =>
                confirm(
                  '구성원 내보내기',
                  `${member.name}을(를) 이 가족 공간에서 내보낼까요? 다시 참여하려면 새 초대 코드가 필요해요.`,
                  '내보내기',
                  () => remove.mutate(member.id, { onError: alertError('내보내기 실패') }),
                ),
            },
          ]
        : []),
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AppHeader />
      <View style={styles.header}>
        {family.data ? (
          <Text style={styles.headerMeta}>
            구성원 {family.data.memberCount}명 · 사진 {family.data.photoCount}장 ·{' '}
            {family.data.sinceLabel}
          </Text>
        ) : null}
      </View>

      {hasNoGroup ? (
        <NoGroupState compact />
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          {members.data?.map((member, i) => (
            <Pressable
              key={member.id}
              onPress={() => openMemberActions(member)}
              onLongPress={() => openMemberActions(member)}
              disabled={member.isMe}
              accessibilityLabel={`${member.name} 옵션`}
              style={[
                styles.memberRow,
                i < (members.data?.length ?? 0) - 1 && styles.memberDivider,
              ]}
            >
              <Avatar name={member.name} uri={member.avatarUrl} size={40} pending={member.role === 'pending'} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.name}
                  {member.realName && member.realName !== member.name ? ` (${member.realName})` : ''}
                </Text>
                <Text style={styles.memberMeta}>
                  {member.blockedByMe
                    ? '차단됨'
                    : member.role === 'pending'
                      ? '초대 수락 대기 중'
                      : `사진 ${member.photoCount}장`}
                </Text>
              </View>
              {roleTag(member)}
            </Pressable>
          ))}
        </View>

        {inviteCode ? (
        <View style={styles.inviteCard}>
          <Text style={styles.inviteKicker}>가족 초대하기</Text>
          <Text style={styles.inviteCode}>{inviteCode}</Text>
          <Text style={styles.inviteBody}>
            초대 코드는 {family.data?.inviteExpiresInDays ?? 7}일간 유효해요.{'\n'}가족이 앱에서
            코드를 입력하면 바로 함께할 수 있어요.
          </Text>
          <View style={styles.inviteActions}>
            <Button
              variant="secondary"
              label="코드 복사"
              icon={<Copy size={15} color={colors.text} strokeWidth={iconStroke} />}
              onPress={() => Clipboard.setStringAsync(inviteCode)}
            />
            <Button
              label="초대 코드 공유"
              icon={<ShareIcon size={15} color={colors.accent} strokeWidth={iconStroke} />}
              onPress={() =>
                Share.share({
                  message: buildInviteMessage({
                    groupName: family.data?.name,
                    inviteCode,
                    expiresInDays: family.data?.inviteExpiresInDays,
                  }),
                })
              }
            />
          </View>
        </View>
        ) : null}

        {/* 헤더 드롭다운은 전환 전용 — 공간 관리는 설정 리스트 카드로 */}
        <View style={styles.manageSection}>
          <Text style={styles.manageKicker}>공간 관리</Text>
          <View style={styles.settingsCard}>
            {me?.role === 'admin' ? (
              <>
                <Pressable style={styles.settingRow} onPress={promptRename} accessibilityRole="button">
                  <Pencil size={16} color={colors.textMuted} strokeWidth={iconStroke} />
                  <Text style={styles.settingLabel}>공간 이름 바꾸기</Text>
                  <ChevronRight size={15} color={colors.neutral400 ?? colors.textMuted} strokeWidth={iconStroke} />
                </Pressable>
                <View style={styles.settingDivider} />
              </>
            ) : null}
            <Pressable style={styles.settingRow} onPress={promptCreate} accessibilityRole="button">
              <Plus size={16} color={colors.textMuted} strokeWidth={iconStroke} />
              <Text style={styles.settingLabel}>새 공간 만들기</Text>
              <ChevronRight size={15} color={colors.neutral400 ?? colors.textMuted} strokeWidth={iconStroke} />
            </Pressable>
            <View style={styles.settingDivider} />
            <Pressable style={styles.settingRow} onPress={promptJoin} accessibilityRole="button">
              <Hash size={16} color={colors.textMuted} strokeWidth={iconStroke} />
              <Text style={styles.settingLabel}>초대 코드로 참여</Text>
              <ChevronRight size={15} color={colors.neutral400 ?? colors.textMuted} strokeWidth={iconStroke} />
            </Pressable>
            <View style={styles.settingDivider} />
            <Pressable style={styles.settingRow} onPress={confirmLeave} disabled={leave.isPending} accessibilityRole="button">
              <LogOut size={16} color={colors.danger} strokeWidth={iconStroke} />
              <Text style={[styles.settingLabel, styles.settingDanger]}>
                {leave.isPending ? '나가는 중…' : '가족 공간 나가기'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  manageSection: {
    marginTop: 26,
    gap: 9,
  },
  manageKicker: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
  },
  settingsCard: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  settingDanger: {
    color: colors.danger,
  },
  settingDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
  },
  headerMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  memberDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    color: colors.text,
  },
  memberMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  inviteCard: {
    marginTop: 20,
    alignItems: 'center',
    gap: 9,
    padding: 18,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
    shadowColor: colors.neutral900,
    shadowOpacity: 0.14,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  inviteKicker: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.accent,
  },
  inviteCode: {
    fontFamily: fonts.headingRegular,
    fontSize: 34,
    letterSpacing: 2.7,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  inviteBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.text,
    opacity: 0.8,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
});
