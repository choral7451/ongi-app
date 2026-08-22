import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Plate } from '../../components/ui/Plate';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useAlbums, useCreateAlbum, useCreatePerson, usePeople, useUnfiledPhotos } from '../../hooks/queries';
import { useActiveGroupId } from '../../store/session';
import { colors, fonts, iconStroke } from '../../theme';

/** 1b — 앨범: 직접 만든 앨범 + 인물별 */
export default function AlbumsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const albums = useAlbums();
  const people = usePeople();
  const activeGroupId = useActiveGroupId();
  const unfiled = useUnfiledPhotos(activeGroupId);
  const createAlbum = useCreateAlbum();
  const createPerson = useCreatePerson();

  const promptNewPerson = () => {
    Alert.prompt(
      '인물 추가',
      '사진에 태그할 가족·인물의 이름을 입력해 주세요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추가',
          onPress: (name?: string) => {
            const trimmed = name?.trim();
            if (!trimmed) return;
            createPerson.mutate(trimmed, {
              onError: (e) =>
                Alert.alert('인물 추가 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
            });
          },
        },
      ],
      'plain-text',
    );
  };

  const promptNewAlbum = () => {
    Alert.prompt(
      '새 앨범',
      '앨범 이름을 입력해 주세요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '만들기',
          onPress: (title?: string) => {
            const trimmed = title?.trim();
            if (!trimmed) return;
            createAlbum.mutate(trimmed, {
              onError: (e) =>
                Alert.alert('앨범 만들기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
            });
          },
        },
      ],
      'plain-text',
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>앨범</Text>
        <Button
          label={createAlbum.isPending ? '만드는 중…' : '새 앨범'}
          icon={<Plus size={15} color={colors.accent} strokeWidth={iconStroke} />}
          onPress={promptNewAlbum}
          disabled={createAlbum.isPending}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="인물별" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.peopleRow}
        >
          {people.data?.map((person) => (
            <Pressable
              key={person.id}
              style={styles.person}
              onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id } })}
            >
              <Image source={{ uri: person.imageUrl }} style={styles.personImage} />
              <Text style={styles.personName}>{person.name}</Text>
              <Text style={styles.personCount}>{person.photoCount}장</Text>
            </Pressable>
          ))}
          <Pressable style={styles.person} onPress={promptNewPerson} accessibilityLabel="인물 추가">
            <View style={[styles.personImage, styles.personAdd]}>
              <Plus size={18} color={colors.accent} strokeWidth={iconStroke} />
            </View>
            <Text style={styles.personName}>인물 추가</Text>
            <Text style={styles.personCount}> </Text>
          </Pressable>
        </ScrollView>

        <SectionHeader
          title="가족 앨범"
          meta={albums.data ? `${albums.data.length}개` : undefined}
        />
        <View style={styles.grid}>
          {unfiled.data && unfiled.data.length > 0 ? (
            <Pressable
              style={styles.gridItem}
              onPress={() => router.push({ pathname: '/album/[id]', params: { id: 'unfiled' } })}
            >
              <Plate uri={unfiled.data[0].url} height={108} />
              <View>
                <Text style={styles.albumTitle}>미분류</Text>
                <Text style={styles.albumMeta}>{unfiled.data.length}장 · 앨범에 담기 전 사진</Text>
              </View>
            </Pressable>
          ) : null}
          {albums.data?.map((album) => (
            <Pressable
              key={album.id}
              style={styles.gridItem}
              onPress={() => router.push({ pathname: '/album/[id]', params: { id: album.id } })}
            >
              <Plate uri={album.coverUrl} height={108} />
              <View>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumMeta}>
                  {album.photoCount}장 · {album.meta}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
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
  title: {
    fontFamily: fonts.heading,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  peopleRow: {
    gap: 16,
    marginBottom: 26,
  },
  person: {
    alignItems: 'center',
    gap: 6,
  },
  personAdd: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
  },
  personImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent100,
  },
  personName: {
    fontSize: 11,
    color: colors.text,
  },
  personCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: -4,
    fontVariant: ['tabular-nums'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  gridItem: {
    width: '47%',
    flexGrow: 1,
    gap: 8,
  },
  albumTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  albumMeta: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
