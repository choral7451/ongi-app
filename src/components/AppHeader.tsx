import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFamily, useMyGroups } from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke, radius } from '../theme';

/** 모든 탭 상단에 고정되는 ONGI 로고 + 가족 공간 드롭다운 (전환 전용 — 만들기·참여는 가족 탭) */
export function AppHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const group = useFamily();
  const groups = useMyGroups();
  const activeGroupId = useSession((s) => s.activeGroupId);
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  const [open, setOpen] = useState(false);

  // 로고 탭 → 홈으로 + 피드 새로고침
  const goHome = () => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
    router.navigate('/');
  };

  const switchTo = (groupId: string) => {
    setOpen(false);
    if (groupId !== activeGroupId) setActiveGroup(groupId);
  };

  return (
    <View style={styles.header}>
      {/* scaleX 는 Text 가 아니라 View 에 — Text 에 직접 걸면 transformOrigin 이 무시돼 왼쪽 라인이 어긋난다 */}
      <Pressable onPress={goHome} accessibilityRole="button" accessibilityLabel="홈으로" hitSlop={8} style={styles.titleWrap}>
        <Text style={styles.title}>ONGI</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="가족 공간 전환"
        style={styles.groupSelector}
        onPress={() => setOpen(true)}
        hitSlop={8}
      >
        <Text style={styles.kicker} numberOfLines={1}>
          {group.data?.name ?? '우리 가족의 오늘'}
        </Text>
        <ChevronDown size={14} color={colors.accent} strokeWidth={iconStroke} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.dropdown, { top: insets.top + 52 }]} onStartShouldSetResponder={() => true}>
            {groups.data?.map((item) => {
              const active = item.id === activeGroupId;
              return (
                <Pressable key={item.id} accessibilityRole="button" onPress={() => switchTo(item.id)} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, active && styles.rowNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.rowMeta}>
                      구성원 {item.memberCount}명 · 사진 {item.photoCount}장
                    </Text>
                  </View>
                  {active ? <Check size={16} color={colors.accent} strokeWidth={iconStroke} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              style={styles.manageRow}
              onPress={() => {
                setOpen(false);
                router.push('/family');
              }}
            >
              <Text style={styles.manageText}>새 공간 만들기 · 초대 코드 참여</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  titleWrap: {
    // 가로로 살짝 넓게 — 왼쪽 끝을 기준으로 늘려 콘텐츠 왼쪽 라인(헤더 padding 20)과 맞춘다
    alignSelf: 'flex-start',
    transform: [{ scaleX: 1.15 }],
    transformOrigin: 'left center',
  },
  title: {
    // 둥글고 귀여운 로고체(Fredoka)
    fontFamily: fonts.logo,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: 3,
    color: colors.text,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  kicker: {
    flexShrink: 1,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.accent,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.18)',
  },
  dropdown: {
    position: 'absolute',
    right: 20,
    minWidth: 230,
    maxWidth: '75%',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    color: colors.text,
  },
  rowNameActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  rowMeta: {
    marginTop: 1,
    fontSize: 11,
    color: colors.textMuted,
  },
  manageRow: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  manageText: {
    fontSize: 12.5,
    color: colors.accent,
  },
});
