import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UPLOAD_MAX_SELECT } from '../api/photos';
import { IconButton } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { albumsApi, photosApi } from '../api';
import { useAlbumsOf, useLocalPhotos, useMyGroups, useUploadPhotos } from '../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../theme';
import type { Group } from '../types';

/** 그룹별 업로드 대상 — 키가 있으면 그 가족에 올린다 (albumId 없으면 미분류) */
type Targets = Record<string, { albumId?: string }>;

/** 이번 앱 세션의 마지막 업로드 대상 — 다음 업로드 때 기본값으로 미리 채운다 */
let lastTargets: Targets | null = null;

/** 허브 시트의 가족 한 줄 — 선택되면 담을 앨범 이름을 보여준다 */
function HubRow({
  group,
  target,
  onPress,
  onClear,
}: {
  group: Group;
  target: { albumId?: string } | undefined;
  onPress: () => void;
  onClear: () => void;
}) {
  const albums = useAlbumsOf(group.id);
  const selected = target != null;
  const albumName =
    target?.albumId != null ? albums.data?.find((a) => a.id === target.albumId)?.title : undefined;

  return (
    <Pressable accessibilityRole="button" style={styles.hubRow} onPress={onPress}>
      <View style={[styles.avatar, selected && styles.avatarSelected]}>
        <Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>
          {group.name.slice(0, 1)}
        </Text>
      </View>
      <View style={styles.hubRowInfo}>
        <Text style={[styles.hubRowName, selected && styles.hubRowNameSelected]} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={[styles.hubRowSub, selected && styles.hubRowSubSelected]} numberOfLines={1}>
          {selected ? `${albumName ?? '미분류'} 앨범에 담아요` : '누르면 앨범을 골라요'}
        </Text>
      </View>
      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${group.name} 선택 해제`}
          hitSlop={10}
          onPress={onClear}
          style={styles.checkCircle}
        >
          <Check size={13} color={colors.white} strokeWidth={2.5} />
        </Pressable>
      ) : (
        <ChevronRight size={15} color={colors.neutral500} strokeWidth={iconStroke} />
      )}
    </Pressable>
  );
}

/** 앨범 한 줄 — 라디오 + 이름 */
function AlbumRowItem({ label, picked, onPress }: { label: string; picked: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.albumRow} onPress={onPress}>
      <View style={[styles.radio, picked && styles.radioSelected]} />
      <Text style={[styles.albumRowText, picked && styles.albumRowTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** 앨범 선택 창 — 가족 하나의 앨범 목록. 고르면 즉시 허브로 돌아간다 */
function AlbumSheet({
  group,
  current,
  onPick,
  onBack,
  onUnselect,
}: {
  group: Group;
  current: { albumId?: string } | undefined;
  onPick: (albumId: string | undefined) => void;
  onBack: () => void;
  onUnselect: () => void;
}) {
  const albums = useAlbumsOf(group.id);
  const queryClient = useQueryClient();

  const createAlbum = () => {
    Alert.prompt('새 앨범 만들기', '앨범 이름을 입력해 주세요.', async (title) => {
      const name = title?.trim();
      if (!name) return;
      try {
        const album = await albumsApi.createAlbum(group.id, name);
        await queryClient.invalidateQueries({ queryKey: ['albums', group.id] });
        onPick(album.id);
      } catch (e) {
        Alert.alert('앨범 만들기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.');
      }
    });
  };

  return (
    <>
      <Pressable accessibilityRole="button" style={styles.sheetBackRow} onPress={onBack}>
        <ChevronLeft size={16} color={colors.text} strokeWidth={iconStroke} />
        <Text style={styles.sheetTitle} numberOfLines={1}>
          {group.name} · 어느 앨범에 담을까요?
        </Text>
      </Pressable>
      <Text style={styles.sheetSub}>앨범을 고르면 이전 화면으로 돌아가요</Text>
      <ScrollView style={styles.albumList} bounces={false}>
        <AlbumRowItem label="미분류" picked={current != null && current.albumId == null} onPress={() => onPick(undefined)} />
        {albums.data?.map((album) => (
          <AlbumRowItem key={album.id} label={album.title} picked={current?.albumId === album.id} onPress={() => onPick(album.id)} />
        ))}
        {Platform.OS === 'ios' ? (
          <Pressable accessibilityRole="button" style={styles.albumRow} onPress={createAlbum}>
            <Plus size={16} color={colors.accent} strokeWidth={iconStroke} />
            <Text style={styles.albumCreateText}>새 앨범 만들기</Text>
          </Pressable>
        ) : null}
        {current != null ? (
          <Pressable accessibilityRole="button" style={styles.albumRow} onPress={onUnselect}>
            <Text style={styles.albumUnselectText}>이 가족에는 올리지 않기</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </>
  );
}

/** 1c — 사진 올리기: 화면은 사진 고르기에 집중, 올리기를 누르면 "어디에 올릴까요?" 허브에서 가족·앨범을 고른다 */
export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const myGroups = useMyGroups();
  const localPhotos = useLocalPhotos();
  const upload = useUploadPhotos();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [targets, setTargets] = useState<Targets>({});
  const [sheet, setSheet] = useState<null | { step: 'hub' } | { step: 'album'; groupId: string }>(null);

  // ── 드래그 선택: 그리드 위에서 가로로 끌기 시작하면 지나간 칸을 선택(첫 칸이 이미 선택돼 있었으면 해제) ──
  const GRID_COLUMNS = 3;
  const GRID_GAP = 6;
  const gridRef = useRef<View>(null);
  const gridOrigin = useRef({ x: 0, y: 0, width: 0 });
  /** 실제 렌더된 셀 한 변 — 셀 폭이 % 라 계산값과 어긋나므로 첫 셀의 onLayout 으로 측정 */
  const cellSize = useRef(0);
  const dragMode = useRef<'select' | 'deselect' | null>(null);
  const dragVisited = useRef(new Set<string>());
  const [dragging, setDragging] = useState(false);
  const photosRef = useRef<{ id: string }[]>([]);
  photosRef.current = localPhotos.data?.photos ?? [];

  const cellAt = (pageX: number, pageY: number): string | null => {
    const { x, y, width } = gridOrigin.current;
    const cellW = cellSize.current || (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    if (width <= 0 || cellW <= 0) return null;
    const relX = pageX - x;
    const relY = pageY - y;
    if (relX < 0 || relY < 0) return null;
    const col = Math.floor(relX / (cellW + GRID_GAP));
    const row = Math.floor(relY / (cellW + GRID_GAP));
    // 셀과 셀 사이 간격 위에 있으면 무시하지 않고 가까운 셀로 취급 (col 은 범위만 제한)
    if (col >= GRID_COLUMNS) return null;
    return photosRef.current[row * GRID_COLUMNS + col]?.id ?? null;
  };
  const applyDrag = (id: string) => {
    if (dragVisited.current.has(id)) return;
    dragVisited.current.add(id);
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      if (dragMode.current === 'select') return has || prev.length >= UPLOAD_MAX_SELECT ? prev : [...prev, id];
      return has ? prev.filter((x) => x !== id) : prev;
    });
  };
  const measureGrid = () => {
    gridRef.current?.measureInWindow((x, y, width) => {
      gridOrigin.current = { x, y, width };
    });
  };
  /** 터치 시작 시각 — 잠깐(HOLD_MS) 누른 뒤 끌면 방향과 상관없이 드래그 선택 */
  const touchStartedAt = useRef(0);
  const HOLD_MS = 180;
  const panResponder = useRef(
    PanResponder.create({
      // 터치 시작만 기록하고 responder 는 가져가지 않는다 (탭은 그대로 Pressable 이 처리)
      onStartShouldSetPanResponderCapture: () => {
        touchStartedAt.current = Date.now();
        return false;
      },
      // ① 잠깐 누른 뒤 끌면 어느 방향이든 드래그 선택  ② 바로 끌 땐 가로 방향일 때만 (세로는 스크롤에 양보)
      onMoveShouldSetPanResponderCapture: (_e, g) => {
        const moved = Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4;
        if (!moved) return false;
        const held = Date.now() - touchStartedAt.current >= HOLD_MS;
        return held || Math.abs(g.dx) >= Math.abs(g.dy);
      },
      onPanResponderGrant: (e) => {
        // 원점은 onLayout/스크롤 때 미리 측정해 둔 값으로 즉시 계산 (measure 콜백을 기다리면 첫 칸을 놓친다)
        measureGrid();
        const id = cellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        dragVisited.current = new Set();
        dragMode.current = id && selectedIdsRef.current.includes(id) ? 'deselect' : 'select';
        setDragging(true);
        if (id) applyDrag(id);
      },
      onPanResponderMove: (e) => {
        if (!dragMode.current) return;
        const id = cellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
        if (id) applyDrag(id);
      },
      onPanResponderRelease: () => {
        dragMode.current = null;
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        dragMode.current = null;
        setDragging(false);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  const selectedIdsRef = useRef<string[]>([]);
  selectedIdsRef.current = selectedIds;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= UPLOAD_MAX_SELECT) {
        Alert.alert('선택 한도', `한 번에 ${UPLOAD_MAX_SELECT}장까지 올릴 수 있어요. 나눠서 올려주세요.`);
        return prev;
      }
      return [...prev, id];
    });

  // 가족 공간이 없으면 게시 대상이 없어 업로드 자체가 불가능
  const noGroup = !myGroups.isPending && (myGroups.data?.length ?? 0) === 0;

  /** 올리기 버튼 → 허브 시트 열기 (이번 세션의 지난 선택을 기본값으로) */
  const openTargetSheet = () => {
    if (noGroup) {
      Alert.alert('가족 공간이 필요해요', '사진은 가족 공간에 올라가요. 먼저 공간을 만들거나 초대 코드로 참여해 주세요.', [
        { text: '나중에', style: 'cancel' },
        { text: '공간 만들기', onPress: () => router.push('/groups') },
      ]);
      return;
    }
    if (Object.keys(targets).length === 0 && lastTargets) {
      const valid = Object.fromEntries(
        Object.entries(lastTargets).filter(([groupId]) => myGroups.data?.some((g) => g.id === groupId)),
      );
      if (Object.keys(valid).length > 0) setTargets(valid);
    }
    setSheet({ step: 'hub' });
  };

  const targetCount = Object.keys(targets).length;

  const submit = () => {
    if (targetCount === 0) return;
    lastTargets = targets;
    setSheet(null);
    runUpload(selectedIds);
  };

  /** ids 만 올린다 — 실패분 재시도에도 그대로 쓴다 */
  const runUpload = (ids: string[]) => {
    upload.mutate(
      {
        localPhotoIds: ids,
        // 문구는 첫 업로드에만 — 재시도 때 또 붙이면 중복된다
        caption: ids === selectedIds ? caption.trim() || undefined : undefined,
        targets: Object.entries(targets).map(([groupId, target]) => ({
          groupId,
          albumId: target.albumId,
          personIds: [],
        })),
        onProgress: (done, total) => setProgress({ done, total }),
      },
      {
        onSettled: () => setProgress(null),
        onSuccess: (result) => {
          if (result.failedIds.length === 0) {
            router.back();
            return;
          }
          const ok = ids.length - result.failedIds.length;
          Alert.alert(
            '일부 사진을 올리지 못했어요',
            `${ok}장 성공, ${result.failedIds.length}장 실패${result.errorMessage ? `\n${result.errorMessage}` : ''}`,
            [
              { text: '그만하기', style: 'cancel', onPress: () => router.back() },
              { text: '실패한 사진 다시 올리기', onPress: () => runUpload(result.failedIds) },
            ],
          );
        },
        onError: (e) =>
          Alert.alert('사진 올리기 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.'),
      },
    );
  };

  const sheetGroup =
    sheet?.step === 'album' ? myGroups.data?.find((g) => g.id === sheet.groupId) : undefined;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <View style={[styles.titleWrap, { paddingTop: Math.max(insets.top, 6) }]} pointerEvents="none">
          <Text style={styles.title}>사진 올리기</Text>
        </View>
        <IconButton
          accessibilityLabel="닫기"
          onPress={() => router.back()}
          icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!dragging}
        scrollEventThrottle={200}
        onScroll={(e) => {
          measureGrid();
          // 갤러리 그리드 끝 근처에서 다음 60장 자동 로드
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600 && localPhotos.hasNextPage && !localPhotos.isFetchingNextPage) {
            void localPhotos.fetchNextPage();
          }
        }}
      >
        <SectionHeader
          title="올릴 사진을 골라주세요"
          size="sm"
          meta={selectedIds.length > 0 ? `${selectedIds.length}장 선택됨` : undefined}
        />
        <View ref={gridRef} style={styles.grid} onLayout={measureGrid} {...panResponder.panHandlers}>
          {localPhotos.data?.photos.map((photo) => {
            const order = selectedIds.indexOf(photo.id);
            const selected = order >= 0;
            return (
              <Pressable
                key={photo.id}
                style={[styles.cell, selected && styles.cellSelected]}
                onPress={() => toggleSelect(photo.id)}
                onLayout={(e) => {
                  if (!cellSize.current) cellSize.current = e.nativeEvent.layout.width;
                }}
              >
                <Image source={{ uri: photo.uri }} style={styles.cellImage} />
                {selected ? (
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderText}>{order + 1}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {localPhotos.hasNextPage ? (
          <Pressable onPress={() => void localPhotos.fetchNextPage()} disabled={localPhotos.isFetchingNextPage} style={styles.libraryButton}>
            <Text style={styles.libraryButtonText}>{localPhotos.isFetchingNextPage ? '불러오는 중…' : '사진 더 보기'}</Text>
          </Pressable>
        ) : null}
        {localPhotos.data && !localPhotos.isLoading && localPhotos.data.photos.length === 0 ? (
          <Text style={styles.libraryHint}>사진 보관함에 사진이 없거나 접근 권한이 없어요. 설정에서 온기의 사진 접근을 허용해 주세요.</Text>
        ) : null}
        {localPhotos.data?.limited ? (
          <Pressable
            onPress={() => photosApi.presentLimitedLibraryPicker().then(() => localPhotos.refetch())}
            style={styles.libraryButton}
          >
            <Text style={styles.libraryButtonText}>접근 가능한 사진 더 고르기</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* 하단 고정 올리기 버튼 — 누르면 "어디에 올릴까요?" 허브가 열린다 */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
        <Pressable
          accessibilityRole="button"
          disabled={selectedIds.length === 0 || upload.isPending}
          onPress={openTargetSheet}
          style={[styles.bigButton, (selectedIds.length === 0 || upload.isPending) && styles.bigButtonDisabled]}
        >
          <Text style={[styles.bigButtonText, selectedIds.length === 0 && styles.bigButtonTextDisabled]}>
            {selectedIds.length > 0 ? `${selectedIds.length}장 올리기` : '사진을 골라주세요'}
          </Text>
        </Pressable>
      </View>

      {/* 어디에 올릴까요 — 허브 시트(가족 목록) ↔ 가족별 앨범 창 */}
      <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <KeyboardAvoidingView style={styles.sheetFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sheetHandle} />
            {sheet?.step === 'hub' ? (
              <>
                <Text style={styles.sheetTitle}>어디에 올릴까요?</Text>
                <Text style={styles.sheetSub}>가족을 누르면 담을 앨범을 골라요 · 여러 곳 선택 가능</Text>
                <ScrollView style={styles.hubList} bounces={false}>
                  {myGroups.data?.map((group) => (
                    <HubRow
                      key={group.id}
                      group={group}
                      target={targets[group.id]}
                      onPress={() => setSheet({ step: 'album', groupId: group.id })}
                      onClear={() =>
                        setTargets((prev) => {
                          const next = { ...prev };
                          delete next[group.id];
                          return next;
                        })
                      }
                    />
                  ))}
                </ScrollView>
                <View style={styles.captionField}>
                  <Text style={styles.fieldLabel}>
                    설명 <Text style={styles.fieldLabelMuted}>(선택)</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="사진에 담긴 이야기를 적어보세요"
                    placeholderTextColor={colors.neutral500}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={targetCount === 0}
                  onPress={submit}
                  style={[styles.bigButton, targetCount === 0 && styles.bigButtonDisabled]}
                >
                  <Text style={[styles.bigButtonText, targetCount === 0 && styles.bigButtonTextDisabled]}>
                    {targetCount === 0
                      ? '올릴 곳을 골라주세요'
                      : `${targetCount}개 공간에 ${selectedIds.length}장 올리기`}
                  </Text>
                </Pressable>
              </>
            ) : sheet?.step === 'album' && sheetGroup ? (
              <AlbumSheet
                group={sheetGroup}
                current={targets[sheetGroup.id]}
                onPick={(albumId) => {
                  setTargets((prev) => ({ ...prev, [sheetGroup.id]: { albumId } }));
                  setSheet({ step: 'hub' });
                }}
                onBack={() => setSheet({ step: 'hub' })}
                onUnselect={() => {
                  setTargets((prev) => {
                    const next = { ...prev };
                    delete next[sheetGroup.id];
                    return next;
                  });
                  setSheet({ step: 'hub' });
                }}
              />
            ) : null}
          </View>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {upload.isPending ? (
        <View style={styles.overlay} pointerEvents="auto" accessibilityViewIsModal accessibilityLabel="사진 올리는 중">
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.overlayTitle}>사진을 올리고 있어요</Text>
            {progress ? (
              <>
                <Text style={styles.overlayCount}>
                  {progress.done} / {progress.total}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }]} />
                </View>
              </>
            ) : null}
            <Text style={styles.overlayHint}>완료될 때까지 화면을 유지해 주세요</Text>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  libraryHint: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 8,
  },
  libraryButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
  },
  libraryButtonText: {
    fontSize: 13,
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  overlayCard: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
    minWidth: 220,
  },
  overlayTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
  },
  overlayCount: {
    fontSize: 22,
    color: colors.accent700,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: 180,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  overlayHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  titleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 10,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.text,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '32.1%',
    aspectRatio: 1,
    backgroundColor: colors.neutral200,
  },
  cellSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cellImage: {
    flex: 1,
  },
  orderBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 12,
    color: colors.white,
    fontVariant: ['tabular-nums'],
  },
  field: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12,
    color: 'rgba(16,17,20,0.7)',
  },
  input: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  bigButton: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigButtonDisabled: {
    backgroundColor: 'rgba(16,17,20,0.08)',
  },
  bigButtonText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.white,
  },
  bigButtonTextDisabled: {
    color: 'rgba(16,17,20,0.35)',
  },
  sheetFlex: {
    flex: 1,
  },
  captionField: {
    gap: 5,
    marginTop: 12,
    marginBottom: 14,
  },
  fieldLabelMuted: {
    color: colors.textMuted,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(16,17,20,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(16,17,20,0.18)',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.text,
    flexShrink: 1,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 4,
  },
  sheetBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubList: {
    maxHeight: 320,
  },
  hubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  hubRowInfo: {
    flex: 1,
    gap: 1,
  },
  hubRowName: {
    fontSize: 14,
    color: colors.text,
  },
  hubRowNameSelected: {
    color: colors.accent,
  },
  hubRowSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  hubRowSubSelected: {
    color: colors.accent,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    backgroundColor: colors.accent100,
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.neutral700,
  },
  avatarTextSelected: {
    color: colors.accent800,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumList: {
    maxHeight: 320,
    marginTop: 6,
  },
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(16,17,20,0.3)',
  },
  radioSelected: {
    borderWidth: 6,
    borderColor: colors.accent,
  },
  albumRowText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  albumRowTextSelected: {
    color: colors.accent,
  },
  albumCreateText: {
    fontSize: 14,
    color: colors.accent,
  },
  albumUnselectText: {
    fontSize: 13,
    color: colors.danger,
  },
});
