import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoGroupState } from '../../components/NoGroupState';
import { Button } from '../../components/ui/Button';
import { Plate } from '../../components/ui/Plate';
import { useAlbums, useCreateAlbum, useDeleteAlbum, useFeed, useMembers, useMyGroups, useRenameAlbum, useUnfiledPhotos } from '../../hooks/queries';
import type { Album } from '../../types';
import { useActiveGroupId } from '../../store/session';
import { colors, fonts, iconStroke } from '../../theme';

/** 1b — 앨범: 전체 사진 + 미분류 + 직접 만든 앨범 */
export default function AlbumsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const albums = useAlbums();
  const activeGroupId = useActiveGroupId();
  const unfiled = useUnfiledPhotos(activeGroupId);
  const allPhotos = useFeed();
  const createAlbum = useCreateAlbum();
  const renameAlbum = useRenameAlbum();
  const deleteAlbum = useDeleteAlbum();
  const myGroups = useMyGroups();
  const hasNoGroup = myGroups.isSuccess && myGroups.data.length === 0;
  const members = useMembers();
  // 앨범 추가·이름 변경·삭제는 그룹 관리자만
  const isAdmin = members.data?.find((m) => m.isMe)?.role === 'admin';

  const showError = (title: string) => (e: unknown) =>
    Alert.alert(title, e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');

  const promptRename = (album: Album) => {
    Alert.prompt(
      '앨범 이름 변경',
      undefined,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '변경',
          onPress: (title?: string) => {
            const trimmed = title?.trim();
            if (!trimmed || trimmed === album.title) return;
            renameAlbum.mutate({ albumId: album.id, title: trimmed }, { onError: showError('이름 변경 실패') });
          },
        },
      ],
      'plain-text',
      album.title,
    );
  };

  const confirmDelete = (album: Album) => {
    Alert.alert('앨범 삭제', `"${album.title}" 앨범을 삭제할까요?\n사진은 삭제되지 않고 미분류로 이동해요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => deleteAlbum.mutate(album.id, { onError: showError('앨범 삭제 실패') }),
      },
    ]);
  };

  // 길게 누르면 앨범 관리 메뉴 (전체 사진·미분류 같은 가상 앨범 제외)
  const showAlbumMenu = (album: Album) => {
    Alert.alert(`앨범 「${album.title}」`, undefined, [
      { text: '이름 변경', onPress: () => promptRename(album) },
      { text: '삭제', style: 'destructive', onPress: () => confirmDelete(album) },
      { text: '취소', style: 'cancel' },
    ]);
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
        <View />
        {hasNoGroup || !isAdmin ? null : (
          <Button
            label={createAlbum.isPending ? '만드는 중…' : '새 앨범'}
            icon={<Plus size={15} color={colors.accent} strokeWidth={iconStroke} />}
            onPress={promptNewAlbum}
            disabled={createAlbum.isPending}
          />
        )}
      </View>

      {hasNoGroup ? (
        <NoGroupState compact />
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {allPhotos.data && allPhotos.data.length > 0 ? (
            <Pressable
              style={styles.gridItem}
              onPress={() => router.push({ pathname: '/album/[id]', params: { id: 'all' } })}
            >
              <Plate uri={allPhotos.data[0].url} height={108} />
              <View>
                <Text style={styles.albumTitle}>전체 사진</Text>
                <Text style={styles.albumMeta}>{allPhotos.data.length}장 · 이 공간의 모든 사진</Text>
              </View>
            </Pressable>
          ) : null}
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
              onLongPress={isAdmin ? () => showAlbumMenu(album) : undefined}
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
