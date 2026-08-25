import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedPost } from '../../components/feed/FeedPost';
import { NoGroupState } from '../../components/NoGroupState';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAlbums, useFamily, useFeed, useMembers, useMyGroups } from '../../hooks/queries';
import { colors, fonts, iconStroke } from '../../theme';
import type { Photo } from '../../types';
import { formatFeedDate } from '../../utils/format';

interface FeedSection {
  title: string;
  meta: string;
  data: Photo[];
}

/** 1a — 홈 / 피드: 날짜순으로 가족의 오늘 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feed = useFeed();
  const members = useMembers();
  const albums = useAlbums();
  const group = useFamily();
  const myGroups = useMyGroups();
  const hasNoGroup = myGroups.isSuccess && myGroups.data.length === 0;

  // 당겨서 새로고침 스피너는 사용자가 직접 당겼을 때만 — feed.isRefetching 은 백그라운드 갱신에도 true 가 되어 스피너가 수시로 뜬다
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await feed.refetch();
    } finally {
      setRefreshing(false);
    }
  };

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
      <View style={styles.header}>
        <View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="가족 공간 전환"
            style={styles.groupSelector}
            onPress={() => router.push('/groups')}
            hitSlop={8}
          >
            <Text style={styles.kicker}>{group.data?.name ?? '우리 가족의 오늘'}</Text>
            <ChevronDown size={12} color={colors.accent} strokeWidth={iconStroke} />
          </Pressable>
          <Text style={styles.title}>ONGI</Text>
        </View>
      </View>

      {hasNoGroup ? (
        <NoGroupState />
      ) : (
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} meta={section.meta} />
        )}
        renderItem={({ item }) => (
          <View style={styles.postWrap}>
            <FeedPost
              photo={item}
              author={members.data?.find((m) => m.id === item.authorId)}
              album={albums.data?.find((a) => a.id === item.albumId)}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  groupSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  kicker: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 2.5,
    color: colors.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  postWrap: {
    marginBottom: 22,
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
