import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, FolderInput, Send, Trash2, X } from 'lucide-react-native';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PhotoGrid } from '../../../components/PhotoGrid';
import { pickCoverUrl } from '../../../utils/photoDisplay';
import { Button, IconButton } from '../../../components/ui/Button';
import { Plate } from '../../../components/ui/Plate';
import { Toast } from '../../../components/ui/Toast';
import { SharePhotosSheet } from '../../../components/album/SharePhotosSheet';
import { MovePhotosSheet } from '../../../components/album/MovePhotosSheet';
import { DeletePhotosSheet } from '../../../components/album/DeletePhotosSheet';
import { useAlbumList, useAlbumPhotos, useCopyPhotos, useDeletePhotos, useFeed, useMembers, useMovePhotos, useMyGroups, useUnfiledPhotos } from '../../../hooks/queries';
import { useToast } from '../../../hooks/useToast';
import type { Photo } from '../../../types';
import { useActiveGroupId, useSession } from '../../../store/session';
import { colors, fonts, iconStroke } from '../../../theme';

type Sheet = 'share' | 'move' | 'delete' | null;

/** 앨범 상세 — 커버 + 사진 그리드. id 가 'unfiled' 면 미분류, 'all' 이면 전체 사진 */
export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isUnfiled = id === 'unfiled';
  const isAll = id === 'all';
  const isVirtual = isUnfiled || isAll;
  const activeGroupId = useActiveGroupId();
  const setActiveGroup = useSession((s) => s.setActiveGroup);
  const albumList = useAlbumList(activeGroupId);
  const albums = { data: albumList.data?.albums };
  const albumPhotos = useAlbumPhotos(isVirtual ? '' : id);
  const unfiledPhotos = useUnfiledPhotos(isUnfiled ? activeGroupId : '');
  const allPhotos = useFeed();
  const photos = isAll ? allPhotos : isUnfiled ? unfiledPhotos : albumPhotos;

  // 선택 모드 — 누구 사진이든 고를 수 있다. 권한은 행동 단계에서: 공유는 전부, 이동·삭제는 내 사진(관리자는 전부)만
  const members = useMembers();
  const me = members.data?.find((m) => m.isMe);
  const canDelete = (photo: Photo) => !!me && (me.role === 'admin' || photo.authorId === me.id);
  const authorName = (photo: Photo) => members.data?.find((m) => m.id === photo.authorId)?.name;
  const deletePhotos = useDeletePhotos();
  const movePhotos = useMovePhotos();
  const copyPhotos = useCopyPhotos();
  const myGroups = useMyGroups();
  const otherGroups = (myGroups.data ?? []).filter((g) => g.id !== activeGroupId);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<Sheet>(null);
  const { toast, show: showToast, hide: hideToast } = useToast();
  // 탭 화면은 언마운트되지 않아 다른 화면에 다녀와도 선택 모드가 남아 있었다 — 화면을 벗어나면 선택을 푼다.
  // 같은 이유로 다시 들어와도 마운트가 아니라 사진 목록이 자동으로 새로 오지 않는다 — 오래된 캐시면 들어올 때 다시 받는다
  // (ref 로 읽는 이유: 의존성에 넣으면 신선도가 바뀔 때마다 효과가 다시 돌아 보고 있는 중에 선택이 풀린다)
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useFocusEffect(
    useCallback(() => {
      if (photosRef.current.isStale) void photosRef.current.refetch();
      return () => {
        setSelecting(false);
        setSelectedIds(new Set());
        setSheet(null);
      };
    }, []),
  );

  const list = photos.data ?? [];
  const selected = list.filter((p) => selectedIds.has(p.id));
  const deletable = selected.filter(canDelete);
  const excluded = selected.filter((p) => !canDelete(p));
  const excludedNames = [...new Set(excluded.map(authorName).filter((n): n is string => !!n))];
  const allSelected = list.length > 0 && selectedIds.size === list.length;

  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
    setSheet(null);
  };
  const toggleSelect = (photo: Photo) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });
  const enterSelectWith = (photo: Photo) => {
    setSelecting(true);
    setSelectedIds(new Set([photo.id]));
  };
  const selectAll = () => setSelectedIds(allSelected ? new Set() : new Set(list.map((p) => p.id)));

  const share = ({ groupId, albumId }: { groupId: string; albumId: string | null }) => {
    const group = otherGroups.find((g) => g.id === groupId);
    copyPhotos.mutate(
      { photoIds: selected.map((p) => p.id), targetGroupId: groupId, albumId },
      {
        onSuccess: ({ copiedIds, skippedIds }) => {
          exitSelect();
          const where = group ? `「${group.name}」에` : '다른 공간에';
          showToast({
            message: `${where} ${copiedIds.length}장을 공유했어요.${skippedIds.length > 0 ? ` ${skippedIds.length}장은 건너뛰었어요.` : ''}`,
            actionLabel: group ? '보러 가기' : undefined,
            onAction: group
              ? () => {
                  hideToast();
                  setActiveGroup(group.id);
                  router.navigate('/');
                }
              : undefined,
          });
        },
        onError: (e) => Alert.alert('공유 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
      },
    );
  };
  const move = (albumId: string | null) => {
    const target = albumId === null ? '미분류' : (albums.data?.find((a) => a.id === albumId)?.title ?? '앨범');
    movePhotos.mutate(
      { photoIds: deletable.map((p) => p.id), albumId },
      {
        onSuccess: ({ movedIds, skippedIds }) => {
          exitSelect();
          showToast({ message: `「${target}」으로 ${movedIds.length}장을 옮겼어요.${skippedIds.length > 0 ? ` ${skippedIds.length}장은 권한이 없어 그대로예요.` : ''}` });
        },
        onError: (e) => Alert.alert('앨범 이동 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
      },
    );
  };
  const remove = () =>
    deletePhotos.mutate(
      deletable.map((p) => p.id),
      {
        onSuccess: ({ deletedIds, skippedIds }) => {
          exitSelect();
          showToast({ message: `${deletedIds.length}장을 삭제했어요.${skippedIds.length > 0 ? ` ${skippedIds.length}장은 권한이 없거나 이미 삭제됐어요.` : ''}` });
        },
        onError: (e) => Alert.alert('삭제 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
      },
    );

  const album = isVirtual ? undefined : albums.data?.find((a) => a.id === id);
  const title = isAll ? '전체 사진' : isUnfiled ? '미분류' : (album?.title ?? '');
  // 장수는 서버가 센 값(앨범 목록 응답) — 사진 목록은 페이지로 오므로 길이로 세면 틀린다. 아직 없으면 받은 길이로 폴백
  const serverCount = isAll ? albumList.data?.totalCount : isUnfiled ? albumList.data?.unfiledCount : album?.photoCount;
  const photoCount = serverCount ?? photos.data?.length;
  // 커버는 그릴 수 있는 가장 최근 항목 — 포스터 없는 영상(url 이 mp4)은 건너뛴다
  const coverUrl = isVirtual ? pickCoverUrl(photos.data) : album?.coverUrl;
  const canEnterSelect = !isAll && list.length > 0;
  const busy = copyPhotos.isPending || movePhotos.isPending || deletePhotos.isPending;
  const actionBarHeight = 64 + Math.max(insets.bottom, 12);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 6) }]}>
      <View style={styles.header}>
        {selecting ? (
          <IconButton accessibilityLabel="선택 취소" onPress={exitSelect} icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />} />
        ) : (
          <IconButton
            accessibilityLabel="뒤로"
            onPress={() => router.replace('/albums')} // 탭 전환은 히스토리에 안 쌓여 back() 이 홈으로 떨어짐 — 앨범 탭으로 명시 복귀
            icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
          />
        )}
        <Text style={styles.headerTitle}>{selecting ? (selectedIds.size > 0 ? `${selectedIds.size}장 선택` : '사진을 골라주세요') : '앨범'}</Text>
        {selecting ? (
          <Button variant="ghost" label={allSelected ? '선택 해제' : '모두 선택'} onPress={selectAll} />
        ) : canEnterSelect ? (
          <Button label="선택" onPress={() => setSelecting(true)} />
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <PhotoGrid
        photos={list}
        loading={photos.isLoading}
        error={photos.isError}
        onRetry={() => photos.refetch()}
        bottomInset={selecting ? insets.bottom + actionBarHeight : insets.bottom}
        detailCtx={isAll ? 'all' : isUnfiled ? 'unfiled' : `album:${id}`}
        selectable={selecting}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onLongPress={canEnterSelect ? enterSelectWith : undefined}
        authorLabel={(p) => (!me || p.authorId === me.id ? undefined : authorName(p))}
        onEndReached={() => photos.hasNextPage && !photos.isFetchingNextPage && photos.fetchNextPage()}
        loadingMore={photos.isFetchingNextPage}
        ListHeaderComponent={
          <View style={styles.albumHead}>
            {coverUrl ? <Plate uri={coverUrl} height={180} /> : null}
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.meta}>
                {photoCount != null ? `${photoCount}장` : ''}
                {album ? ` · ${album.meta}` : ''}
              </Text>
            </View>
            {!selecting && canEnterSelect ? <Text style={styles.hint}>사진을 길게 누르면 바로 고를 수 있어요</Text> : null}
            <View style={styles.rule} />
          </View>
        }
      />

      {selecting ? (
        <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ActionItem
            label="다른 공간에 공유"
            icon={<Send size={22} color={colors.text} strokeWidth={iconStroke} />}
            disabled={selected.length === 0 || busy}
            onPress={() => {
              if (otherGroups.length === 0) {
                showToast({ message: '함께하는 다른 가족 공간이 아직 없어요.' });
                return;
              }
              setSheet('share');
            }}
          />
          <ActionItem
            label="앨범 이동"
            icon={<FolderInput size={22} color={colors.text} strokeWidth={iconStroke} />}
            disabled={deletable.length === 0 || busy}
            badge={deletable.length > 0 && deletable.length < selected.length ? deletable.length : undefined}
            onPress={() => setSheet('move')}
          />
          <ActionItem
            label={selected.length > 0 && deletable.length === 0 ? '내 사진 없음' : '삭제'}
            icon={<Trash2 size={22} color={colors.danger} strokeWidth={iconStroke} />}
            danger
            disabled={deletable.length === 0 || busy}
            badge={deletable.length > 0 && deletable.length < selected.length ? deletable.length : undefined}
            onPress={() => setSheet('delete')}
          />
        </View>
      ) : null}

      <SharePhotosSheet visible={sheet === 'share'} onClose={() => setSheet(null)} photos={selected} groups={otherGroups} pending={copyPhotos.isPending} onShare={share} />
      <MovePhotosSheet
        visible={sheet === 'move'}
        onClose={() => setSheet(null)}
        count={deletable.length}
        excludedCount={excluded.length}
        albums={albums.data ?? []}
        currentAlbumId={isVirtual ? undefined : id}
        hideUnfiled={isUnfiled}
        pending={movePhotos.isPending}
        onMove={move}
      />
      <DeletePhotosSheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        photos={deletable}
        excludedCount={excluded.length}
        excludedNames={excludedNames}
        pending={deletePhotos.isPending}
        onDelete={remove}
      />

      <Toast toast={toast} bottom={(selecting ? actionBarHeight : Math.max(insets.bottom, 12)) + 12} />
    </View>
  );
}

/** 선택 모드 하단 바의 한 칸 — 아이콘 위, 짧은 라벨 아래. badge 는 "실제로 적용될 장수" (섞어 골랐을 때만) */
function ActionItem({ label, icon, onPress, disabled, danger, badge }: { label: string; icon: ReactNode; onPress: () => void; disabled?: boolean; danger?: boolean; badge?: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={badge != null ? `${label} ${badge}장` : label}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed, disabled && styles.actionDisabled]}
    >
      {icon}
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
      {badge != null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
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
  hint: {
    marginTop: 6,
    fontSize: 11,
    color: colors.textMuted,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
    marginTop: 10,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  action: {
    width: 104,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionPressed: {
    backgroundColor: colors.neutral100,
  },
  actionDisabled: {
    opacity: 0.35,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.text,
  },
  actionLabelDanger: {
    color: colors.danger,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 18,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.neutral600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
});
