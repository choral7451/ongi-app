import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../components/PhotoGrid';
import { IconButton } from '../../components/ui/Button';
import { usePeople, usePersonPhotos } from '../../hooks/queries';
import { colors, fonts, iconStroke } from '../../theme';

/** 인물 상세 — 이 사람이 태그된 모든 사진 */
export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const people = usePeople();
  const photos = usePersonPhotos(id);

  const person = people.data?.find((p) => p.id === id);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.headerTitle}>인물</Text>
        <View style={styles.headerSpacer} />
      </View>

      <PhotoGrid
        photos={photos.data ?? []}
        loading={photos.isLoading}
        bottomInset={insets.bottom}
        detailCtx={`person:${id}`}
        ListHeaderComponent={
          <View style={styles.personHead}>
            <Image source={{ uri: person?.imageUrl }} style={styles.avatar} />
            <Text style={styles.name}>{person?.name ?? ''}</Text>
            <Text style={styles.meta}>
              {photos.data ? `함께한 사진 ${photos.data.length}장` : ''}
            </Text>
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
  personHead: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent100,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 32,
    color: colors.text,
    marginTop: 10,
  },
  meta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  rule: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginTop: 16,
  },
});
