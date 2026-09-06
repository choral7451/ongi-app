import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { CalendarPlus, Home, Image as ImageIcon, Plus, User, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMyGroups } from '../hooks/queries';
import { colors, fonts, iconStroke } from '../theme';

const TABS = [
  { name: 'index', label: '홈', Icon: Home },
  { name: 'albums', label: '앨범', Icon: ImageIcon },
  { name: 'plus', label: '올리기', Icon: Plus }, // 가운데 — 사진/일정 선택 시트
  { name: 'family', label: '가족', Icon: Users },
  { name: 'profile', label: '나', Icon: User },
] as const;

/**
 * 커스텀 하단 탭 바 — 가운데 (+) 는 탭이 아니라 외곽선 원형 버튼으로,
 * "사진 올리기 / 일정 만들기" 선택 시트를 띄웁니다.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const myGroups = useMyGroups();
  const [sheetOpen, setSheetOpen] = useState(false);

  // 가족 공간이 없으면 만들기부터 안내
  const requireGroup = (proceed: () => void) => {
    if (myGroups.isSuccess && myGroups.data.length === 0) {
      setSheetOpen(false);
      Alert.alert('가족 공간이 필요해요', '먼저 공간을 만들거나 초대 코드로 참여해 주세요.', [
        { text: '나중에', style: 'cancel' },
        { text: '공간 만들기', onPress: () => router.push('/groups') },
      ]);
      return;
    }
    setSheetOpen(false);
    proceed();
  };

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        if (tab.name === 'plus') {
          return (
            <Pressable key={tab.name} style={styles.item} onPress={() => setSheetOpen(true)} accessibilityLabel="올리기">
              <View style={styles.uploadCircle}>
                <Plus size={20} color={colors.accent} strokeWidth={iconStroke} />
              </View>
              <Text style={styles.label}>{tab.label}</Text>
            </Pressable>
          );
        }

        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const focused = state.index === routeIndex;
        const color = focused ? colors.accent : colors.neutral600;
        return (
          <Pressable
            key={tab.name}
            style={styles.item}
            onPress={() => navigation.navigate(tab.name)}
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
          >
            <tab.Icon size={22} color={color} strokeWidth={iconStroke} />
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}

      {/* (+) 선택 시트 — 사진 올리기 / 일정 만들기 */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>무엇을 함께할까요?</Text>
            <Pressable accessibilityRole="button" style={styles.sheetRow} onPress={() => requireGroup(() => router.push('/upload'))}>
              <View style={styles.sheetIcon}>
                <ImageIcon size={18} color={colors.accent} strokeWidth={iconStroke} />
              </View>
              <View style={styles.sheetRowInfo}>
                <Text style={styles.sheetRowTitle}>사진 올리기</Text>
                <Text style={styles.sheetRowSub}>오늘의 순간을 가족과 나눠요</Text>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" style={[styles.sheetRow, styles.sheetRowLast]} onPress={() => requireGroup(() => router.push('/event-form'))}>
              <View style={styles.sheetIcon}>
                <CalendarPlus size={18} color={colors.accent} strokeWidth={iconStroke} />
              </View>
              <View style={styles.sheetRowInfo}>
                <Text style={styles.sheetRowTitle}>일정 만들기</Text>
                <Text style={styles.sheetRowSub}>생신·모임을 등록하고 함께 챙겨요</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
    paddingHorizontal: 8,
    minHeight: 74,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.neutral600,
  },
  uploadCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    backgroundColor: colors.bg,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16,17,20,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,17,20,0.18)',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
    paddingBottom: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  sheetRowLast: {
    borderBottomWidth: 0,
  },
  sheetIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowInfo: {
    flex: 1,
    gap: 1,
  },
  sheetRowTitle: {
    fontSize: 14.5,
    color: colors.text,
  },
  sheetRowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
