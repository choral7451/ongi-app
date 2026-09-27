import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAllMyGroupMembers, useChatRoom, useCreateChatRoom, useInviteChat } from '../../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../../theme';
import type { Member } from '../../types';
import { alertError } from '../../utils/dialogs';

/** 같은 사람이 여러 공간에 있으면 공간마다 보이지만, 고르는 건 사람 단위 (userId) */
type Picked = { memberId: string; name: string };

/**
 * 새 대화 · 초대 — 내가 속한 모든 공간의 구성원을 공간별로 보여준다. 서로 다른 공간 사람도 함께 고를 수 있다.
 * 1명이면 1:1 (이미 있으면 그 방), 2명 이상이면 그룹방. `roomId` 가 있으면 그 그룹방에 초대.
 */
export default function NewChatScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const inviteMode = !!roomId;
  const room = useChatRoom(roomId ?? '');
  const { sections, isLoading } = useAllMyGroupMembers();
  const createRoom = useCreateChatRoom();
  const invite = useInviteChat(roomId ?? '');

  const [picked, setPicked] = useState<Map<string, Picked>>(new Map());
  const [query, setQuery] = useState('');
  const [roomName, setRoomName] = useState('');

  const alreadyIn = useMemo(() => new Set((room.data?.participants ?? []).map((p) => p.id)), [room.data]);
  const listSections = useMemo(() => {
    const q = query.trim();
    const pickable = (m: Member) => !m.isMe && m.role !== 'pending' && !m.blockedByMe && !alreadyIn.has(m.userId);
    const matches = (m: Member) => !q || m.name.includes(q) || (m.realName ?? '').includes(q);
    return sections
      .map(({ group, members }) => ({ key: group.id, title: group.name, data: members.filter((m) => pickable(m) && matches(m)) }))
      .filter((section) => section.data.length > 0);
  }, [sections, query, alreadyIn]);

  const toggle = (member: Member) =>
    setPicked((old) => {
      const next = new Map(old);
      if (next.has(member.userId)) next.delete(member.userId);
      else next.set(member.userId, { memberId: member.id, name: member.name });
      return next;
    });

  const count = picked.size;
  const busy = createRoom.isPending || invite.isPending;
  const submitLabel = inviteMode ? '초대' : count >= 2 ? '만들기' : '채팅';

  const submit = () => {
    const memberIds = [...picked.values()].map((p) => p.memberId);
    if (memberIds.length === 0 || busy) return;
    if (inviteMode) {
      invite.mutate(memberIds, { onSuccess: () => router.back(), onError: alertError('초대하지 못했어요') });
      return;
    }
    createRoom.mutate(
      { memberIds, name: count >= 2 ? roomName.trim() || undefined : undefined },
      {
        onSuccess: (created) => {
          router.dismiss();
          router.push({ pathname: '/chat/[id]', params: { id: created.id } });
        },
        onError: alertError('대화를 시작하지 못했어요'),
      },
    );
  };

  const hint = inviteMode
    ? '같은 가족 공간에 있는 사람을 초대할 수 있어요'
    : count === 0
      ? '대화할 사람을 골라 주세요'
      : count === 1
        ? '1:1 대화 — 이미 있으면 그 대화로 이어져요'
        : `${count}명과 그룹 대화를 만들어요`;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <IconButton accessibilityLabel="닫기" onPress={() => router.back()} icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />} />
        <Text style={styles.title}>{inviteMode ? '초대하기' : '새 대화'}</Text>
        <Pressable accessibilityRole="button" disabled={count === 0 || busy} onPress={submit} hitSlop={8} style={styles.submit}>
          {busy ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={[styles.submitText, (count === 0 || busy) && styles.submitDisabled]}>{submitLabel}</Text>
          )}
        </Pressable>
      </View>

      {count > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
          {[...picked.entries()].map(([userId, p]) => (
            <Pressable
              key={userId}
              accessibilityRole="button"
              accessibilityLabel={`${p.name} 빼기`}
              onPress={() =>
                setPicked((old) => {
                  const next = new Map(old);
                  next.delete(userId);
                  return next;
                })
              }
              style={styles.chip}
            >
              <Text style={styles.chipText}>{p.name}</Text>
              <X size={12} color={colors.accent700} strokeWidth={iconStroke} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {!inviteMode && count >= 2 ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>방 이름</Text>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            placeholder="선택 — 비우면 참여자 이름으로 보여요"
            placeholderTextColor={colors.neutral500}
            maxLength={30}
            style={styles.fieldInput}
          />
        </View>
      ) : null}

      <View style={styles.search}>
        <Search size={16} color={colors.neutral500} strokeWidth={iconStroke} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="이름 검색"
          placeholderTextColor={colors.neutral500}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <SectionList
          sections={listSections}
          keyExtractor={(member, index) => `${member.id}-${index}`}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          ListEmptyComponent={<Text style={styles.empty}>{query ? '검색 결과가 없어요' : '대화할 수 있는 가족이 아직 없어요'}</Text>}
          renderItem={({ item: member }) => {
            const selected = picked.has(member.userId);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={member.name}
                onPress={() => toggle(member)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar name={member.name} uri={member.avatarUrl} size={40} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{member.name}</Text>
                  {member.realName && member.realName !== member.name ? <Text style={styles.rowSub}>{member.realName}</Text> : null}
                </View>
                <View style={[styles.check, selected && styles.checkOn]}>{selected ? <Check size={14} color={colors.bg} strokeWidth={2.5} /> : null}</View>
              </Pressable>
            );
          }}
        />
      )}

      <Text style={[styles.hint, { paddingBottom: Math.max(insets.bottom, 12) }]}>{hint}</Text>
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
    fontSize: 17,
    color: colors.text,
  },
  submit: {
    minWidth: 48,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
  },
  submitDisabled: {
    color: colors.neutral400,
  },
  chipsWrap: {
    flexGrow: 0,
  },
  chips: {
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.accent100,
  },
  chipText: {
    fontSize: 13,
    color: colors.accent700,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  fieldInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  loading: {
    marginTop: 40,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  rowPressed: {
    backgroundColor: colors.neutral100,
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowName: {
    fontSize: 15,
    color: colors.text,
  },
  rowSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    borderWidth: 0,
    backgroundColor: colors.accent,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 13,
    color: colors.textMuted,
  },
  hint: {
    textAlign: 'center',
    paddingTop: 12,
    fontSize: 12.5,
    color: colors.textMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
});
