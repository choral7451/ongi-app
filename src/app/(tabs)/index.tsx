import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { EventBanner } from '../../components/EventBanner';
import { FeedPost } from '../../components/feed/FeedPost';
import { NoGroupState } from '../../components/NoGroupState';
import { useAlbums, useFeed, useMembers, useMyGroups } from '../../hooks/queries';
import { useUi } from '../../store/ui';
import { colors } from '../../theme';
import type { Photo } from '../../types';
import { formatFeedDate } from '../../utils/format';

interface FeedSection {
  title: string;
  meta: string;
  data: Photo[];
}

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList) as unknown as typeof SectionList;

/** 1a — 홈 / 피드: 날짜순으로 가족의 오늘. 스크롤을 내리면 헤더·일정 배너가 접히고, 올리면 다시 나타난다 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const feed = useFeed();
  const members = useMembers();
  const albums = useAlbums();
  const myGroups = useMyGroups();
  const hasNoGroup = myGroups.isSuccess && myGroups.data.length === 0;

  // ── 접히는 헤더 — 이동량 기반이지만 최상단(y≤0)에선 무조건 펼친다 (당겨서 새로고침 등으로 오프셋이 튀어도 안 숨게) ──
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerH = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const dy = y - lastY.value;
      lastY.value = y;
      if (y <= 0) {
        translateY.value = 0;
        return;
      }
      translateY.value = Math.min(0, Math.max(-headerH.value, translateY.value - dy));
    },
    // 손을 떼면 어중간한 위치에 걸치지 않게 가까운 쪽으로 스냅
    onEndDrag: () => {
      if (lastY.value <= headerH.value || translateY.value > -headerH.value / 2) translateY.value = withTiming(0, { duration: 160 });
      else translateY.value = withTiming(-headerH.value, { duration: 160 });
    },
    onMomentumEnd: () => {
      if (lastY.value <= 0) translateY.value = withTiming(0, { duration: 120 });
    },
  });
  const headerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  // 로고 탭 → 스크롤 최상단 + 헤더 펼침 (피드·일정 새로고침은 AppHeader 가 invalidate)
  const listRef = useRef<SectionList<Photo, FeedSection>>(null);
  const homeResetTick = useUi((s) => s.homeResetTick);
  useEffect(() => {
    if (homeResetTick === 0) return;
    translateY.value = 0;
    lastY.value = 0;
    listRef.current?.getScrollResponder()?.scrollTo({ y: 0, animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeResetTick]);

  // 당겨서 새로고침 스피너는 사용자가 직접 당겼을 때만 — feed.isRefetching 은 백그라운드 갱신에도 true 가 되어 스피너가 수시로 뜬다
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    translateY.value = 0; // 새로고침 후 헤더는 항상 펼친 상태로
    try {
      await feed.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // 게시물마다 find() 를 돌리지 않도록 맵으로 — 스크롤 중 renderItem 비용 절감
  const memberById = useMemo(() => new Map((members.data ?? []).map((m) => [m.id, m])), [members.data]);
  const albumById = useMemo(() => new Map((albums.data ?? []).map((a) => [a.id, a])), [albums.data]);

  const sections = useMemo<FeedSection[]>(() => {
    if (!feed.data) return [];
    // 로컬 타임존 기준 날짜로 그룹핑 (UTC/오프셋 혼재 대응)
    const localDayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const byDay = new Map<string, Photo[]>();
    for (const photo of feed.data) {
      const day = localDayKey(new Date(photo.createdAt));
      byDay.set(day, [...(byDay.get(day) ?? []), photo]);
    }
    const todayKey = localDayKey(new Date());
    return [...byDay.entries()].map(([day, photos]) => {
      const date = new Date(`${day}T00:00:00`);
      return {
        title: day === todayKey ? '오늘' : `${date.getMonth() + 1}월 ${date.getDate()}일`,
        meta: formatFeedDate(date),
        data: photos,
      };
    });
  }, [feed.data]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 헤더 + 일정 배너 — 스크롤 방향에 따라 접히는 한 덩어리 */}
      <Animated.View
        style={[styles.headerWrap, { top: insets.top }, headerStyle]}
        onLayout={(e) => {
          const height = Math.round(e.nativeEvent.layout.height);
          setHeaderHeight(height);
          headerH.value = height;
        }}
      >
        <AppHeader />
        <EventBanner />
      </Animated.View>
      {/* 상태바 커버 — 접히며 올라가는 헤더가 시계 위로 비치지 않게 위 레이어에서 가린다 */}
      <View style={[styles.statusCover, { height: insets.top }]} pointerEvents="none" />

      {hasNoGroup ? (
        <View style={{ paddingTop: headerHeight }}>
          <NoGroupState />
        </View>
      ) : (
      <AnimatedSectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: headerHeight }]}
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        // 다음 페이지를 더 일찍 불러와 붙는 순간이 화면 밖에서 일어나게 (중간 덜컹 방지)
        onEndReachedThreshold={1.5}
        // 스크롤 버벅임 방지 — 화면 밖 셀 분리, 배치 렌더 억제
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        // 푸터 높이 고정 — 로딩 스피너가 나타났다 사라질 때 목록이 튀지 않게
        ListFooterComponent={
          <View style={styles.footer}>{feed.isFetchingNextPage ? <ActivityIndicator color={colors.textMuted} /> : null}</View>
        }
        renderItem={({ item }) => (
          <View style={styles.postWrap}>
            <FeedPost
              photo={item}
              author={memberById.get(item.authorId)}
              album={item.albumId ? albumById.get(item.albumId) : undefined}
              photoFirst
            />
          </View>
        )}
        ListEmptyComponent={
          feed.isLoading ? null : feed.isError ? (
            <Pressable onPress={() => feed.refetch()} style={styles.emptyBox}>
              <Text style={styles.empty}>피드를 불러오지 못했어요.</Text>
              <Text style={styles.retry}>다시 시도</Text>
            </Pressable>
          ) : (
            <Text style={[styles.empty, styles.emptyBox]}>아직 올라온 사진이 없어요. 첫 사진을 올려보세요.</Text>
          )
        }
      />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerWrap: {
    // top 은 렌더 시 insets.top 으로 지정 — absolute 는 부모 paddingTop(상태바)을 무시한다
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.bg,
  },
  statusCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 11,
    backgroundColor: colors.bg,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  postWrap: {
    marginBottom: 22,
  },
  footer: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retry: {
    fontSize: 13,
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
});
