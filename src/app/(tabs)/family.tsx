import * as Clipboard from 'expo-clipboard';
import { Copy, Share as ShareIcon } from 'lucide-react-native';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tag } from '../../components/ui/Tag';
import { useFamily, useMembers } from '../../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../../theme';
import type { Member } from '../../types';

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

  const inviteCode = family.data?.inviteCode ?? '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>우리 가족</Text>
        <Text style={styles.title}>{family.data?.name ?? ' '}</Text>
        {family.data ? (
          <Text style={styles.headerMeta}>
            구성원 {family.data.memberCount}명 · 사진 {family.data.photoCount}장 ·{' '}
            {family.data.sinceLabel}
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View>
          {members.data?.map((member, i) => (
            <View
              key={member.id}
              style={[
                styles.memberRow,
                i < (members.data?.length ?? 0) - 1 && styles.memberDivider,
              ]}
            >
              <Avatar name={member.name} size={40} pending={member.role === 'pending'} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {member.name}
                  {member.realName ? ` (${member.realName})` : ''}
                </Text>
                <Text style={styles.memberMeta}>
                  {member.role === 'pending'
                    ? '초대 수락 대기 중'
                    : `사진 ${member.photoCount}장`}
                </Text>
              </View>
              {roleTag(member)}
            </View>
          ))}
        </View>

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
              label="초대 링크 공유"
              icon={<ShareIcon size={15} color={colors.accent} strokeWidth={iconStroke} />}
              onPress={() =>
                Share.share({
                  message: `온기에서 우리 가족과 함께해요! 초대 코드: ${inviteCode}`,
                })
              }
            />
          </View>
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
