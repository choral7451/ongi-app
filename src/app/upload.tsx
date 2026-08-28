import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Check, Image as ImageIcon, X } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UPLOAD_MAX_SELECT } from '../api/photos';
import { Button, IconButton } from '../components/ui/Button';
import { Plate } from '../components/ui/Plate';
import { SectionHeader } from '../components/ui/SectionHeader';
import { photosApi } from '../api';
import {
  useAlbumsOf,
  useLocalPhotos,
  useMyGroups,
  useUploadPhotos,
} from '../hooks/queries';
import { useSession } from '../store/session';
import { colors, fonts, iconStroke, radius } from '../theme';

/** 그룹별 앨범·인물 선택 상태 */
interface TargetDraft {
  albumId?: string;
  personIds: string[];
}

interface GroupTargetFieldsProps {
  groupId: string;
  draft: TargetDraft;
  onChange: (next: TargetDraft) => void;
}

/** 한 그룹의 앨범 칩 — 단일/멀티 그룹 모두에서 재사용 (인물 태그는 인물 UI 가 생기면 다시 추가) */
function GroupTargetFields({ groupId, draft, onChange }: GroupTargetFieldsProps) {
  const albums = useAlbumsOf(groupId);
  const toggleAlbum = (albumId: string) =>
    onChange({ ...draft, albumId: draft.albumId === albumId ? undefined : albumId });

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>앨범 (선택)</Text>
        <View style={styles.chips}>
          {albums.data?.map((album) => {
            const selected = draft.albumId === album.id;
            return (
              <Pressable
                key={album.id}
                style={[styles.chip, selected ? styles.chipOutline : styles.chipNeutral]}
                onPress={() => toggleAlbum(album.id)}
              >
                <Text style={selected ? styles.chipOutlineText : styles.chipNeutralText}>
                  {album.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

/** 1c — 사진 올리기: 사진·설명은 공통, 앨범·인물은 그룹별로 지정 */
export default function UploadScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const activeGroupId = useSession((s) => s.activeGroupId);
  const myGroups = useMyGroups();
  const localPhotos = useLocalPhotos();
  const upload = useUploadPhotos();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([activeGroupId]);
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({});

  const draftOf = (groupId: string): TargetDraft => drafts[groupId] ?? { personIds: [] };
  const setDraftOf = (groupId: string) => (next: TargetDraft) =>
    setDrafts((prev) => ({ ...prev, [groupId]: next }));

  // 선택 순서 그대로의 사진 목록 — 미리보기에서 좌우로 넘겨본다
  const selectedPhotos = useMemo(
    () =>
      selectedIds
        .map((id) => localPhotos.data?.photos.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p != null),
    [selectedIds, localPhotos.data],
  );

  const { width: windowWidth } = useWindowDimensions();
  const pageWidth = windowWidth - 40; // content 좌우 패딩 20씩 제외
  const [previewIndex, setPreviewIndex] = useState(0);

  // ── 드래그 선택: 그리드 위에서 가로로 끌기 시작하면 지나간 칸을 선택(첫 칸이 이미 선택돼 있었으면 해제) ──
  const GRID_COLUMNS = 4;
  const GRID_GAP = 6;
  const gridRef = useRef<View>(null);
  const gridOrigin = useRef({ x: 0, y: 0, width: 0 });
  const dragMode = useRef<'select' | 'deselect' | null>(null);
  const dragVisited = useRef(new Set<string>());
  const [dragging, setDragging] = useState(false);
  const photosRef = useRef<{ id: string }[]>([]);
  photosRef.current = localPhotos.data?.photos ?? [];

  const cellAt = (pageX: number, pageY: number): string | null => {
    const { x, y, width } = gridOrigin.current;
    if (width <= 0) return null;
    const cellW = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
    const col = Math.floor((pageX - x) / (cellW + GRID_GAP));
    const row = Math.floor((pageY - y) / (cellW + GRID_GAP));
    if (col < 0 || col >= GRID_COLUMNS || row < 0) return null;
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
  const panResponder = useRef(
    PanResponder.create({
      // 가로로 먼저 움직이면 드래그 선택 시작 (세로는 스크롤에 양보)
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: (e) => {
        gridRef.current?.measureInWindow((x, y, width) => {
          gridOrigin.current = { x, y, width };
          const id = cellAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
          dragVisited.current = new Set();
          dragMode.current = id && selectedIdsRef.current.includes(id) ? 'deselect' : 'select';
          setDragging(true);
          if (id) applyDrag(id);
        });
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
  const shownIndex = Math.min(previewIndex, Math.max(selectedPhotos.length - 1, 0));

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= UPLOAD_MAX_SELECT) {
        Alert.alert('선택 한도', `한 번에 ${UPLOAD_MAX_SELECT}장까지 올릴 수 있어요. 나눠서 올려주세요.`);
        return prev;
      }
      return [...prev, id];
    });

  const toggleGroup = (groupId: string) =>
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        // 최소 1개 그룹은 유지
        return prev.length > 1 ? prev.filter((g) => g !== groupId) : prev;
      }
      return [...prev, groupId];
    });

  const submit = () => {
    // 가족 공간이 없으면 업로드 대신 공간 만들기로 안내
    if (!validGroupSelected) {
      Alert.alert('가족 공간이 필요해요', '사진은 가족 공간에 올라가요. 먼저 공간을 만들거나 초대 코드로 참여해 주세요.', [
        { text: '나중에', style: 'cancel' },
        { text: '공간 만들기', onPress: () => router.push('/groups') },
      ]);
      return;
    }

    runUpload(selectedIds);
  };

  /** ids 만 올린다 — 실패분 재시도에도 그대로 쓴다 */
  const runUpload = (ids: string[]) => {
    upload.mutate(
      {
        localPhotoIds: ids,
        // 문구는 첫 업로드에만 — 재시도 때 또 붙이면 중복된다
        caption: ids === selectedIds ? caption.trim() || undefined : undefined,
        targets: selectedGroupIds.map((groupId) => ({
          groupId,
          albumId: draftOf(groupId).albumId,
          personIds: draftOf(groupId).personIds,
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

  const multiGroup = selectedGroupIds.length > 1;
  // 가족 공간이 없으면 게시 대상이 없어 업로드 자체가 불가능
  const noGroup = !myGroups.isPending && (myGroups.data?.length ?? 0) === 0;
  const validGroupSelected = selectedGroupIds.some((id) => id !== '');

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        {/* 타이틀은 절대 중앙 고정 — 버튼 라벨("올리기"→"올리는 중…") 폭 변화에 밀리지 않게 */}
        <View style={[styles.titleWrap, { paddingTop: Math.max(insets.top, 6) }]} pointerEvents="none">
          <Text style={styles.title}>사진 올리기</Text>
        </View>
        <IconButton
          accessibilityLabel="닫기"
          onPress={() => router.back()}
          icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Button
          label={upload.isPending ? (progress ? `올리는 중 ${progress.done}/${progress.total}` : '올리는 중…') : '올리기'}
          onPress={submit}
          disabled={selectedIds.length === 0 || upload.isPending}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={!dragging}
        scrollEventThrottle={200}
        onScroll={(e) => {
          // 갤러리 그리드 끝 근처에서 다음 60장 자동 로드
          const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 600 && localPhotos.hasNextPage && !localPhotos.isFetchingNextPage) {
            void localPhotos.fetchNextPage();
          }
        }}
      >
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>올릴 공간</Text>
          {noGroup ? (
            <Text style={styles.hint}>
              아직 가족 공간이 없어요. 홈에서 공간을 만들거나 초대 코드로 참여한 뒤 올릴 수 있어요.
            </Text>
          ) : null}
          <View style={styles.chips}>
            {myGroups.data?.map((group) => {
              const selected = selectedGroupIds.includes(group.id);
              return (
                <Pressable
                  key={group.id}
                  style={[styles.groupChip, selected && styles.groupChipSelected]}
                  onPress={() => toggleGroup(group.id)}
                >
                  {selected ? (
                    <Check size={13} color={colors.accent} strokeWidth={2.2} />
                  ) : null}
                  <Text
                    style={selected ? styles.groupChipTextSelected : styles.groupChipText}
                  >
                    {group.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {multiGroup ? (
            <Text style={styles.hint}>
              선택한 공간마다 따로 게시돼요. 좋아요·댓글도 공간별로 분리됩니다.
            </Text>
          ) : null}
        </View>

        {selectedPhotos.length > 0 ? (
          <View style={styles.previewBox}>
            {/* 원본 비율 그대로 미리보기 — 여러 장이면 좌우로 넘겨본다.
                수백 장을 골라도 화면 근처 페이지만 렌더링하도록 FlatList 윈도잉 (전부 그리면 선택 직후 멈춘 것처럼 보임) */}
            <FlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={selectedPhotos}
              keyExtractor={(photo) => photo.id}
              renderItem={({ item }) => (
                <View style={{ width: pageWidth }}>
                  <Plate uri={item.uri} aspectRatio={item.aspectRatio || 1} />
                </View>
              )}
              getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews
              onMomentumScrollEnd={(e) =>
                setPreviewIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))
              }
            />
            {selectedPhotos.length > 1 && selectedPhotos.length <= 12 ? (
              <View style={styles.dots}>
                {selectedPhotos.map((photo, index) => (
                  <View
                    key={photo.id}
                    style={[styles.dot, index === shownIndex && styles.dotActive]}
                  />
                ))}
              </View>
            ) : selectedPhotos.length > 12 ? (
              <Text style={styles.pageCounter}>
                {shownIndex + 1} / {selectedPhotos.length}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.previewEmpty}>
            <ImageIcon size={28} color={colors.neutral500} strokeWidth={iconStroke} />
            <Text style={styles.previewEmptyText}>아래에서 사진을 선택해 주세요</Text>
          </View>
        )}

        <SectionHeader
          title="최근 사진"
          size="sm"
          meta={selectedIds.length > 0 ? `${selectedIds.length}장 선택됨` : undefined}
        />
        <View ref={gridRef} style={styles.grid} {...panResponder.panHandlers}>
          {localPhotos.data?.photos.map((photo) => {
            const order = selectedIds.indexOf(photo.id);
            const selected = order >= 0;
            return (
              <Pressable
                key={photo.id}
                style={[styles.cell, selected && styles.cellSelected]}
                onPress={() => toggleSelect(photo.id)}
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

        {multiGroup ? (
          selectedGroupIds.map((groupId) => {
            const group = myGroups.data?.find((g) => g.id === groupId);
            return (
              <View key={groupId} style={styles.groupCard}>
                <View style={styles.groupCardHead}>
                  <Text style={styles.groupCardTitle}>{group?.name ?? ''}</Text>
                  <View style={styles.groupCardRule} />
                </View>
                <GroupTargetFields
                  groupId={groupId}
                  draft={draftOf(groupId)}
                  onChange={setDraftOf(groupId)}
                />
              </View>
            );
          })
        ) : (
          <GroupTargetFields
            groupId={selectedGroupIds[0]}
            draft={draftOf(selectedGroupIds[0])}
            onChange={setDraftOf(selectedGroupIds[0])}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>설명</Text>
          <TextInput
            style={styles.input}
            value={caption}
            onChangeText={setCaption}
            placeholder="사진에 담긴 이야기를 적어보세요"
            placeholderTextColor={colors.neutral500}
          />
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
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
    paddingBottom: 32,
    gap: 16,
  },
  previewBox: {
    gap: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral200,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  pageCounter: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  previewEmpty: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.divider,
  },
  previewEmptyText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: '23.5%',
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
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderText: {
    fontSize: 10,
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.md * 0.75,
  },
  chipNeutral: {
    backgroundColor: colors.neutral200,
  },
  chipNeutralText: {
    fontSize: 11,
    color: colors.neutral800,
  },
  chipAccent: {
    backgroundColor: colors.accent100,
  },
  chipAccentText: {
    fontSize: 11,
    color: colors.accent800,
  },
  chipOutline: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 2,
  },
  chipOutlineText: {
    fontSize: 11,
    color: colors.accent,
  },
  groupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  groupChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent100,
  },
  groupChipText: {
    fontSize: 12,
    color: colors.neutral700,
  },
  groupChipTextSelected: {
    fontSize: 12,
    color: colors.accent800,
  },
  hint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  groupCard: {
    gap: 14,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  groupCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupCardTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    color: colors.text,
  },
  groupCardRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.accent300,
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
});
