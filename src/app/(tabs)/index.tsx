import { useRouter } from 'expo-router';
import { Bell, ChevronDown } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedPost } from '../../components/feed/FeedPost';
import { IconButton } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAlbums, useFamily, useFeed, useMembers } from '../../hooks/queries';
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
        <IconButton
          accessibilityLabel="알림"
          icon={<Bell size={20} color={colors.text} strokeWidth={iconStroke} />}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshing={feed.isRefetching}
        onRefresh={() => feed.refetch()}
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
          feed.isLoading ? null : (
            <Text style={styles.empty}>아직 올라온 사진이 없어요. 첫 사진을 올려보세요.</Text>
          )
        }
      />
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
    justifyContent: 'space-between',
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
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 40,
    textAlign: 'center',
  },
});
