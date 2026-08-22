import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Home, Image as ImageIcon, Plus, User, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, iconStroke } from '../theme';

const TABS = [
  { name: 'index', label: '홈', Icon: Home },
  { name: 'albums', label: '앨범', Icon: ImageIcon },
  { name: 'upload', label: '올리기', Icon: Plus }, // 가운데 — 모달로 열림
  { name: 'family', label: '가족', Icon: Users },
  { name: 'profile', label: '나', Icon: User },
] as const;

/**
 * 커스텀 하단 탭 바 — 가운데 "올리기"는 탭이 아니라
 * 외곽선 원형 버튼으로, 업로드 모달을 띄웁니다.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        if (tab.name === 'upload') {
          return (
            <Pressable
              key={tab.name}
              style={styles.item}
              onPress={() => router.push('/upload')}
              accessibilityLabel="사진 올리기"
            >
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
});
