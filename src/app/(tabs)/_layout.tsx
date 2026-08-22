import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { useActiveGroupSync } from '../../hooks/queries';

export default function TabsLayout() {
  // 로그인 직후 활성 그룹이 비어 있으면 내 첫 그룹으로 맞춘다
  useActiveGroupSync();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="albums" options={{ title: '앨범' }} />
      <Tabs.Screen name="family" options={{ title: '가족' }} />
      <Tabs.Screen name="profile" options={{ title: '나' }} />
      {/* 상세 화면들 — 탭 버튼에는 없지만 탭바가 유지되도록 탭 그룹 안에 둔다 */}
      <Tabs.Screen name="photo/[id]" options={{ href: null }} />
      <Tabs.Screen name="album/[id]" options={{ href: null }} />
      <Tabs.Screen name="person/[id]" options={{ href: null }} />
    </Tabs>
  );
}
