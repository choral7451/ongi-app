import { useRouter } from 'expo-router';
import { Check, Plus, Ticket, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCreateGroup, useJoinGroup, useMyGroups } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke, radius } from '../theme';

/** 가족 공간 전환 · 만들기 · 초대 코드 참여 (모달) */
export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const groups = useMyGroups();
  const activeGroupId = useSession((s) => s.activeGroupId);
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const switchTo = (groupId: string) => {
    setActiveGroup(groupId);
    router.back();
  };

  const onCreate = () => {
    createGroup.mutate(newName, {
      onSuccess: (group) => {
        setNewName('');
        switchTo(group.id);
      },
    });
  };

  const onJoin = () => {
    setJoinError(null);
    joinGroup.mutate(inviteCode, {
      onSuccess: (group) => {
        setInviteCode('');
        switchTo(group.id);
      },
      onError: (e) => setJoinError(e.message),
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="닫기"
          onPress={() => router.back()}
          icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>가족 공간</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <SectionHeader
          title="내 공간"
          meta={groups.data ? `${groups.data.length}개` : undefined}
        />
        <View style={styles.groupList}>
          {groups.data?.map((group) => {
            const active = group.id === activeGroupId;
            return (
              <Pressable
                key={group.id}
                accessibilityRole="button"
                onPress={() => switchTo(group.id)}
                style={[styles.groupRow, active && styles.groupRowActive]}
              >
                <View style={styles.groupInitial}>
                  <Text style={styles.groupInitialText}>{group.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    구성원 {group.memberCount}명 · 사진 {group.photoCount}장
                  </Text>
                </View>
                {active ? (
                  <Check size={18} color={colors.accent} strokeWidth={iconStroke} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title="새 공간 만들기" size="sm" />
        </View>
        <View style={styles.formRow}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="예: 김씨네 온기"
            placeholderTextColor={colors.neutral500}
          />
          <Button
            label={createGroup.isPending ? '만드는 중…' : '만들기'}
            icon={<Plus size={15} color={colors.accent} strokeWidth={iconStroke} />}
            onPress={onCreate}
            disabled={newName.trim().length === 0 || createGroup.isPending}
            style={styles.formButton}
          />
        </View>
        <Text style={styles.hint}>
          공간을 만들면 초대 코드가 발급돼요. 가족 탭에서 언제든 확인할 수 있어요.
        </Text>

        <View style={styles.sectionGap}>
          <SectionHeader title="초대 코드로 참여" size="sm" />
        </View>
        <View style={styles.formRow}>
          <TextInput
            style={styles.input}
            value={inviteCode}
            onChangeText={(v) => {
              setInviteCode(v);
              setJoinError(null);
            }}
            placeholder="예: ONGI-1234"
            placeholderTextColor={colors.neutral500}
            autoCapitalize="characters"
          />
          <Button
            label={joinGroup.isPending ? '확인 중…' : '참여하기'}
            icon={<Ticket size={15} color={colors.accent} strokeWidth={iconStroke} />}
            onPress={onJoin}
            disabled={inviteCode.trim().length === 0 || joinGroup.isPending}
            style={styles.formButton}
          />
        </View>
        {joinError ? <Text style={styles.error}>{joinError}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
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
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
  },
  groupList: {
    gap: 8,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  groupRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent100,
  },
  groupInitial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInitialText: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: colors.accent800,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 14,
    color: colors.text,
  },
  groupMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  sectionGap: {
    marginTop: 28,
  },
  // 만들기·참여하기 버튼 폭을 같게
  formButton: {
    width: 112,
    justifyContent: 'center',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
});
