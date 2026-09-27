import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAllMyGroupMembers, useChatRoom, useCreateChatRoom, useInviteChat } from '../../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../../theme';
import { alertError } from '../../utils/dialogs';

/** 고를 수 있는 사람 — 여러 공간에 함께 있어도 한 명. 이름·사진은 먼저 나오는 공간의 구성원 기준 */
interface Person {
  userId: string;
  /** 서버에 보낼 구성원 id — 그 사람의 어느 공간 레코드든 된다 */
  memberId: string;
  name: string;
  avatarUrl?: string;
  groupIds: string[];
  groupNames: string[];
}

const ALL = 'all';

/**
 * 새 대화 · 초대 — 내가 속한 모든 공간의 사람을 한 번씩만 보여준다 (함께 있는 공간은 이름 아래 작게).
 * 위의 공간 칩으로 좁혀 볼 수 있고, 공간을 고르면 그 공간 사람을 한 번에 고를 수 있다.
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

  const [picked, setPicked] = useState<Map<string, Person>>(new Map());
  const [query, setQuery] = useState('');
  const [roomName, setRoomName] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>(ALL);

  const alreadyIn = useMemo(() => new Set((room.data?.participants ?? []).map((p) => p.id)), [room.data]);

  // 공간별 구성원 → 사람 단위로 합친다 (나 · 승인 대기 · 차단한 사람 · 이미 방에 있는 사람 제외)
  const people = useMemo(() => {
    const byUser = new Map<string, Person>();
    for (const { group, members } of sections) {
      for (const m of members) {
        if (m.isMe || m.role === 'pending' || m.blockedByMe || alreadyIn.has(m.userId)) continue;
        const existing = byUser.get(m.userId);
        if (existing) {
          existing.groupIds.push(group.id);
          existing.groupNames.push(group.name);
        } else {
          byUser.set(m.userId, { userId: m.userId, memberId: m.id, name: m.name, avatarUrl: m.avatarUrl, groupIds: [group.id], groupNames: [group.name] });
        }
      }
    }
    return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [sections, alreadyIn]);

  // 칩은 고를 사람이 있는 공간만, 공간이 둘 이상일 때만
  const groupChips = useMemo(() => sections.filter(({ group }) => people.some((p) => p.groupIds.includes(group.id))).map(({ group }) => group), [sections, people]);
  const activeFilter = groupChips.some((g) => g.id === groupFilter) ? groupFilter : ALL;

  const visible = useMemo(() => {
    const q = query.trim();
    return people.filter((p) => (activeFilter === ALL || p.groupIds.includes(activeFilter)) && (!q || p.name.includes(q)));
  }, [people, activeFilter, query]);

  const toggle = (person: Person) =>
    setPicked((old) => {
      const next = new Map(old);
      if (next.has(person.userId)) next.delete(person.userId);
      else next.set(person.userId, person);
      return next;
    });

  // 공간을 골랐을 때 — 그 공간 사람(검색 결과) 전부 선택 / 전부 해제
  const allVisiblePicked = visible.length > 0 && visible.every((p) => picked.has(p.userId));
  const toggleAllVisible = () =>
    setPicked((old) => {
      const next = new Map(old);
      if (allVisiblePicked) visible.forEach((p) => next.delete(p.userId));
      else visible.forEach((p) => next.set(p.userId, p));
      return next;
    });
  const activeGroupName = groupChips.find((g) => g.id === activeFilter)?.name;

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
        // 가로 스크롤 줄은 세로로 줄어들지 않게 고정 — 부모가 column 이면 ScrollView 가 눌려 칩이 찌그러진다
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chipRowContent}>
          {[...picked.values()].map((p) => (
            <Pressable key={p.userId} accessibilityRole="button" accessibilityLabel={`${p.name} 빼기`} onPress={() => toggle(p)} style={styles.pickedChip}>
              <Text style={styles.pickedChipText} numberOfLines={1}>
                {p.name}
              </Text>
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

      {groupChips.length >= 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={[styles.chipRowContent, styles.filterRowContent]}>
          {[{ id: ALL, name: '전체' }, ...groupChips].map((g) => {
            const on = activeFilter === g.id;
            return (
              <Pressable
                key={g.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setGroupFilter(g.id)}
                style={[styles.filterChip, on && styles.filterChipOn]}
              >
                <Text style={[styles.filterChipText, on && styles.filterChipTextOn]} numberOfLines={1}>
                  {g.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(p) => p.userId}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            activeFilter !== ALL && visible.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={toggleAllVisible} style={styles.selectAll} hitSlop={4}>
                <Text style={styles.selectAllText}>{allVisiblePicked ? `${activeGroupName} 선택 해제` : `${activeGroupName} 모두 선택 (${visible.length}명)`}</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>{query ? '검색 결과가 없어요' : '대화할 수 있는 가족이 아직 없어요'}</Text>}
          renderItem={({ item: person }) => {
            const selected = picked.has(person.userId);
            return (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${person.name}, ${person.groupNames.join(', ')}`}
                onPress={() => toggle(person)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Avatar name={person.name} uri={person.avatarUrl} size={40} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {person.groupNames.join(' · ')}
                  </Text>
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
  chipRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chipRowContent: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterRowContent: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  pickedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingLeft: 12,
    paddingRight: 9,
    borderRadius: 15,
    backgroundColor: colors.accent100,
  },
  pickedChipText: {
    maxWidth: 120,
    fontSize: 13,
    color: colors.accent700,
  },
  filterChip: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent100,
  },
  filterChipText: {
    maxWidth: 140,
    fontSize: 13,
    color: colors.neutral700,
  },
  filterChipTextOn: {
    color: colors.accent700,
    fontWeight: '600',
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
  selectAll: {
    alignSelf: 'flex-start',
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 6,
  },
  selectAllText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
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
    gap: 2,
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
