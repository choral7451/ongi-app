import { useRouter } from 'expo-router';
import { ChevronRight, MoreHorizontal, Plus } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../components/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NoGroupState } from '../../components/NoGroupState';
import { Plate } from '../../components/ui/Plate';
import { VideoPlaceholder } from '../../components/ui/VideoPlaceholder';
import { useAlbumList, useCreateAlbum, useDeleteAlbum, useFeed, useMembers, useMyGroups, useRenameAlbum, useUnfiledPhotos } from '../../hooks/queries';
import type { Album } from '../../types';
import { useActiveGroupId } from '../../store/session';
import { colors, fonts, iconStroke, radius } from '../../theme';
import { pickCoverUrl } from '../../utils/photoDisplay';
import { promptText } from '../../utils/prompt';

/**
 * 1b — 앨범.
 * 위: 전체 사진·미분류 두 모음을 작은 가로 카드로 (직접 만든 앨범과 구분).
 * 아래: "앨범" 섹션 — 정사각 커버 2열 그리드, 관리자는 첫 칸이 '새 앨범' 타일, 각 앨범 커버 모서리에 ⋯ 관리 버튼.
 */
export default function AlbumsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeGroupId = useActiveGroupId();
  const albums = useAlbumList(activeGroupId);
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

  // 커버는 그릴 수 있는 가장 최근 항목 — 포스터 없는 영상은 건너뛴다
  const allCover = pickCoverUrl(allPhotos.data);
  const unfiledCover = pickCoverUrl(unfiled.data);
  // 장수는 서버가 센 값 — 목록은 30장씩 페이지로 오므로 길이로 세면 30장 넘는 공간에서 틀린다. 구서버면 길이로 폴백
  const allCount = albums.data?.totalCount ?? allPhotos.data?.length ?? 0;
  const unfiledCount = albums.data?.unfiledCount ?? unfiled.data?.length ?? 0;
  const albumList = albums.data?.albums ?? [];

  const showError = (title: string) => (e: unknown) =>
    Alert.alert(title, e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');

  const promptRename = (album: Album) => {
    promptText({
      title: '앨범 이름 변경',
      defaultValue: album.title,
      confirmText: '변경',
      onSubmit: (title) => {
        const trimmed = title.trim();
        if (!trimmed || trimmed === album.title) return;
        renameAlbum.mutate({ albumId: album.id, title: trimmed }, { onError: showError('이름 변경 실패') });
      },
    });
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

  // 커버의 ⋯ 버튼 또는 길게 누르기 → 앨범 관리 메뉴 (전체 사진·미분류 같은 가상 앨범 제외)
  const showAlbumMenu = (album: Album) => {
    Alert.alert(`앨범 「${album.title}」`, undefined, [
      { text: '이름 변경', onPress: () => promptRename(album) },
      { text: '삭제', style: 'destructive', onPress: () => confirmDelete(album) },
      { text: '취소', style: 'cancel' },
    ], { cancelable: true }); // 안드로이드: 바깥을 눌러 닫기
  };

  const promptNewAlbum = () => {
    promptText({
      title: '새 앨범',
      message: '앨범 이름을 입력해 주세요',
      confirmText: '만들기',
      onSubmit: (title) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        createAlbum.mutate(trimmed, {
          onError: (e) =>
            Alert.alert('앨범 만들기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
        });
      },
    });
  };

  const openAlbum = (id: string) => router.push({ pathname: '/album/[id]', params: { id } });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AppHeader />

      {hasNoGroup ? (
        <NoGroupState compact />
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        {/* 모음 — 전체 사진 · 미분류. 직접 만든 앨범이 아니라서 그리드와 분리 */}
        {allCount > 0 ? (
          <View style={styles.collections}>
            <Pressable
              style={({ pressed }) => [styles.collection, pressed && styles.pressed]}
              onPress={() => openAlbum('all')}
              accessibilityRole="button"
              accessibilityLabel={`전체 사진 ${allCount}장`}
            >
              <Plate uri={allCover} style={styles.collectionCover} fallback={<VideoPlaceholder size={16} />} />
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionTitle}>전체 사진</Text>
                <Text style={styles.collectionMeta}>{allCount}장</Text>
              </View>
              <ChevronRight size={16} color={colors.neutral500} strokeWidth={iconStroke} />
            </Pressable>
            {unfiledCount > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.collection, pressed && styles.pressed]}
                onPress={() => openAlbum('unfiled')}
                accessibilityRole="button"
                accessibilityLabel={`미분류 ${unfiledCount}장`}
              >
                <Plate uri={unfiledCover} style={styles.collectionCover} fallback={<VideoPlaceholder size={16} />} />
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionTitle}>미분류</Text>
                  <Text style={styles.collectionMeta}>{unfiledCount}장</Text>
                </View>
                <ChevronRight size={16} color={colors.neutral500} strokeWidth={iconStroke} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* 앨범 섹션 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>앨범</Text>
          {albumList.length > 0 ? <Text style={styles.sectionMeta}>{albumList.length}개</Text> : null}
        </View>

        {!isAdmin && albumList.length === 0 ? (
          <Text style={styles.empty}>아직 앨범이 없어요. 관리자가 앨범을 만들면 여기에 보여요.</Text>
        ) : (
          <View style={styles.grid}>
            {isAdmin ? (
              <Pressable
                style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
                onPress={promptNewAlbum}
                disabled={createAlbum.isPending}
                accessibilityRole="button"
                accessibilityLabel="새 앨범 만들기"
              >
                <View style={styles.newTile}>
                  <Plus size={24} color={colors.text} strokeWidth={iconStroke} />
                </View>
                <View>
                  <Text style={styles.albumTitle}>{createAlbum.isPending ? '만드는 중…' : '새 앨범'}</Text>
                  <Text style={styles.albumMeta}>{albumList.length === 0 ? '첫 앨범을 만들어 보세요' : '사진을 모아 담아요'}</Text>
                </View>
              </Pressable>
            ) : null}
            {albumList.map((album) => (
              <Pressable
                key={album.id}
                style={({ pressed }) => [styles.gridItem, pressed && styles.pressed]}
                onPress={() => openAlbum(album.id)}
                onLongPress={isAdmin ? () => showAlbumMenu(album) : undefined}
                accessibilityRole="button"
                accessibilityLabel={`앨범 ${album.title}, ${album.photoCount}장`}
              >
                <View>
                  <Plate uri={album.coverUrl} aspectRatio={1} style={styles.cover} />
                  {isAdmin ? (
                    <Pressable
                      style={styles.moreButton}
                      onPress={() => showAlbumMenu(album)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`앨범 ${album.title} 관리`}
                    >
                      <MoreHorizontal size={16} color={colors.text} strokeWidth={iconStroke} />
                    </Pressable>
                  ) : null}
                </View>
                <View>
                  <Text style={styles.albumTitle} numberOfLines={1}>{album.title}</Text>
                  <Text style={styles.albumMeta} numberOfLines={1}>
                    {album.photoCount}장 · {album.meta}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.7,
  },
  collections: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  collection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    paddingRight: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  collectionCover: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.text,
  },
  collectionMeta: {
    marginTop: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    lineHeight: 26,
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    paddingVertical: 24,
    textAlign: 'center',
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
  cover: {
    borderRadius: radius.md,
  },
  newTile: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.neutral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.text,
  },
  albumMeta: {
    marginTop: 1,
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
