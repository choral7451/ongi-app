import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../../components/PhotoGrid';
import { IconButton } from '../../../components/ui/Button';
import { Plate } from '../../../components/ui/Plate';
import { useAlbumPhotos, useAlbums, useFeed, useUnfiledPhotos } from '../../../hooks/queries';
import { useActiveGroupId } from '../../../store/session';
import { colors, fonts, iconStroke } from '../../../theme';

/** 앨범 상세 — 커버 + 사진 그리드. id 가 'unfiled' 면 미분류, 'all' 이면 전체 사진 */
export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isUnfiled = id === 'unfiled';
  const isAll = id === 'all';
  const isVirtual = isUnfiled || isAll;
  const activeGroupId = useActiveGroupId();
  const albums = useAlbums();
  const albumPhotos = useAlbumPhotos(isVirtual ? '' : id);
  const unfiledPhotos = useUnfiledPhotos(isUnfiled ? activeGroupId : '');
  const allPhotos = useFeed();
  const photos = isAll ? allPhotos : isUnfiled ? unfiledPhotos : albumPhotos;

  const album = isVirtual ? undefined : albums.data?.find((a) => a.id === id);
  const title = isAll ? '전체 사진' : isUnfiled ? '미분류' : (album?.title ?? '');
  const coverUrl = isVirtual ? photos.data?.[0]?.url : album?.coverUrl;

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.replace('/albums')} // 탭 전환은 히스토리에 안 쌓여 back() 이 홈으로 떨어짐 — 앨범 탭으로 명시 복귀
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.headerTitle}>앨범</Text>
        <View style={styles.headerSpacer} />
      </View>

      <PhotoGrid
        photos={photos.data ?? []}
        loading={photos.isLoading}
        error={photos.isError}
        onRetry={() => photos.refetch()}
        bottomInset={insets.bottom}
        detailCtx={isAll ? 'all' : isUnfiled ? 'unfiled' : `album:${id}`}
        ListHeaderComponent={
          <View style={styles.albumHead}>
            {coverUrl ? <Plate uri={coverUrl} height={180} /> : null}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>
                {photos.data ? `${photos.data.length}장` : ''}
                {album ? ` · ${album.meta}` : ''}
              </Text>
            </View>
            <View style={styles.rule} />
          </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  albumHead: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginTop: 10,
  },
});
