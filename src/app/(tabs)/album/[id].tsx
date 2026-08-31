import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, FolderInput, Send, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../../components/PhotoGrid';
import { Button, IconButton } from '../../../components/ui/Button';
import { Plate } from '../../../components/ui/Plate';
import { queryKeys, useAlbumPhotos, useAlbums, useCopyPhotos, useDeletePhotos, useFeed, useMembers, useMovePhotos, useMyGroups, useUnfiledPhotos } from '../../../hooks/queries';
import { useQueryClient } from '@tanstack/react-query';
import * as albumsApi from '../../../api/albums';
import { showActions } from '../../../utils/dialogs';
import type { Photo } from '../../../types';
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

  // 선택 모드 — 작성자 본인 또는 관리자인 사진만 골라서 한 번에 삭제
  const members = useMembers();
  const me = members.data?.find((m) => m.isMe);
  const canDelete = (photo: Photo) => !!me && (me.role === 'admin' || photo.authorId === me.id);
  const deletePhotos = useDeletePhotos();
  const movePhotos = useMovePhotos();
  const copyPhotos = useCopyPhotos();
  const myGroups = useMyGroups();
  const queryClient = useQueryClient();
  const otherGroups = (myGroups.data ?? []).filter((g) => g.id !== activeGroupId);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const deletableCount = photos.data?.filter(canDelete).length ?? 0;

  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };
  const toggleSelect = (photo: Photo) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });
  const selectAll = () => setSelectedIds(new Set((photos.data ?? []).filter(canDelete).map((p) => p.id)));
  const pickAlbumAndMove = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    const move = (albumId: string | null) =>
      movePhotos.mutate(
        { photoIds: [...selectedIds], albumId },
        {
          onSuccess: ({ skippedIds }) => {
            exitSelect();
            if (skippedIds.length > 0) Alert.alert('일부 사진은 옮기지 못했어요', `${skippedIds.length}장은 권한이 없어요.`);
          },
          onError: (e) => Alert.alert('앨범 이동 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
        },
      );
    const targets = (albums.data ?? []).filter((a) => a.id !== id);
    showActions(`${count}장을 옮길 앨범`, [
      ...(isUnfiled ? [] : [{ label: '앨범 없음 (미분류)', onPress: () => move(null) }]),
      ...targets.map((a) => ({ label: a.title, onPress: () => move(a.id) })),
    ]);
  };

  /** 다른 가족 공간에 공유 — 대상 공간 → 그 공간의 앨범 순으로 고른 뒤 복사 */
  const pickGroupAndCopy = () => {
    const count = selectedIds.size;
    if (count === 0 || otherGroups.length === 0) return;
    const copy = (targetGroupId: string, albumId: string | null) =>
      copyPhotos.mutate(
        { photoIds: [...selectedIds], targetGroupId, albumId },
        {
          onSuccess: ({ copiedIds, skippedIds }) => {
            exitSelect();
            Alert.alert(
              '공유 완료',
              `${copiedIds.length}장을 공유했어요.${skippedIds.length > 0 ? `\n${skippedIds.length}장은 권한이 없어 건너뛰었어요.` : ''}`,
            );
          },
          onError: (e) => Alert.alert('공유 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
        },
      );
    const pickAlbum = async (targetGroupId: string, groupName: string) => {
      const albums = await queryClient.fetchQuery({ queryKey: queryKeys.albums(targetGroupId), queryFn: () => albumsApi.getAlbums(targetGroupId) }).catch(() => []);
      showActions(`「${groupName}」의 앨범`, [
        { label: '앨범 없음 (미분류)', onPress: () => copy(targetGroupId, null) },
        ...albums.map((a) => ({ label: a.title, onPress: () => copy(targetGroupId, a.id) })),
      ]);
    };
    showActions(`${count}장을 공유할 가족 공간`, otherGroups.map((g) => ({ label: g.name, onPress: () => void pickAlbum(g.id, g.name) })));
  };

  const confirmDelete = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    Alert.alert('사진 삭제', `선택한 ${count}장과 달린 댓글이 모두 삭제되며 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: `${count}장 삭제`,
        style: 'destructive',
        onPress: () =>
          deletePhotos.mutate([...selectedIds], {
            onSuccess: ({ skippedIds }) => {
              exitSelect();
              if (skippedIds.length > 0) Alert.alert('일부 사진은 삭제하지 못했어요', `${skippedIds.length}장은 권한이 없거나 이미 삭제됐어요.`);
            },
            onError: (e) => Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
          }),
      },
    ]);
  };

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
        <Text style={styles.headerTitle}>{selecting ? `${selectedIds.size}장 선택` : '앨범'}</Text>
        {selecting ? (
          <Button label="취소" onPress={exitSelect} />
        ) : !isAll && (photos.data?.length ?? 0) > 0 ? (
          <Button label="선택" onPress={() => setSelecting(true)} />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <PhotoGrid
        photos={photos.data ?? []}
        loading={photos.isLoading}
        error={photos.isError}
        onRetry={() => photos.refetch()}
        bottomInset={insets.bottom}
        detailCtx={isAll ? 'all' : isUnfiled ? 'unfiled' : `album:${id}`}
        selectable={selecting}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        canSelect={canDelete}
        onEndReached={() => photos.hasNextPage && !photos.isFetchingNextPage && photos.fetchNextPage()}
        loadingMore={photos.isFetchingNextPage}
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

      {selecting ? (
        <View style={[styles.selectBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button label={selectedIds.size === deletableCount ? '선택 해제' : '모두 선택'} onPress={selectedIds.size === deletableCount ? () => setSelectedIds(new Set()) : selectAll} />
          {otherGroups.length > 0 ? (
            <Button
              label={copyPhotos.isPending ? '공유 중…' : '다른 공간에 공유'}
              icon={<Send size={15} color={colors.accent} strokeWidth={iconStroke} />}
              onPress={pickGroupAndCopy}
              disabled={selectedIds.size === 0 || copyPhotos.isPending}
            />
          ) : null}
          <Button
            label={movePhotos.isPending ? '이동 중…' : '앨범 이동'}
            icon={<FolderInput size={15} color={colors.accent} strokeWidth={iconStroke} />}
            onPress={pickAlbumAndMove}
            disabled={selectedIds.size === 0 || movePhotos.isPending}
          />
          <Button
            label={deletePhotos.isPending ? '삭제 중…' : `${selectedIds.size}장 삭제`}
            icon={<Trash2 size={15} color={colors.danger} strokeWidth={iconStroke} />}
            onPress={confirmDelete}
            disabled={selectedIds.size === 0 || deletePhotos.isPending}
            style={styles.deleteButton}
          />
        </View>
      ) : null}
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
  selectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  deleteButton: {
    borderColor: colors.danger,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginTop: 10,
  },
});
