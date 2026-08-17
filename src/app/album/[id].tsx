import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../components/PhotoGrid';
import { IconButton } from '../../components/ui/Button';
import { Plate } from '../../components/ui/Plate';
import { useAlbumPhotos, useAlbums } from '../../hooks/queries';
import { colors, fonts, iconStroke } from '../../theme';

/** 앨범 상세 — 커버 + 사진 그리드 */
export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const albums = useAlbums();
  const photos = useAlbumPhotos(id);

  const album = albums.data?.find((a) => a.id === id);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.headerTitle}>앨범</Text>
        <View style={styles.headerSpacer} />
      </View>

      <PhotoGrid
        photos={photos.data ?? []}
        loading={photos.isLoading}
        bottomInset={insets.bottom}
        ListHeaderComponent={
          <View style={styles.albumHead}>
            {album ? <Plate uri={album.coverUrl} height={180} /> : null}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{album?.title ?? ''}</Text>
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
