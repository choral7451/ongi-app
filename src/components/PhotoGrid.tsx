import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { Check } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  ListHeaderComponent?: ReactElement;
  bottomInset?: number;
  loading?: boolean;
  /** 불러오기 실패 — 빈 상태와 구분해 재시도 버튼을 보여준다 */
  error?: boolean;
  onRetry?: () => void;
  /** 사진 상세에서 좌우 스와이프로 넘길 목록 컨텍스트 — 'feed' | 'album:<id>' | 'unfiled' | 'person:<id>' */
  detailCtx?: string;
  /** 선택 모드 — 탭하면 상세 대신 선택 토글. canSelect 가 false 인 사진은 흐리게 표시되고 선택 불가 */
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (photo: Photo) => void;
  canSelect?: (photo: Photo) => boolean;
}

/** 3열 정사각 사진 그리드 — 탭하면 사진 상세로 */
export function PhotoGrid({
  photos,
  ListHeaderComponent,
  bottomInset = 0,
  loading,
  error,
  onRetry,
  detailCtx,
  selectable = false,
  selectedIds,
  onToggleSelect,
  canSelect,
}: PhotoGridProps) {
  const router = useRouter();
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
      ListHeaderComponent={ListHeaderComponent}
      extraData={selectedIds}
      renderItem={({ item }) => {
        const allowed = !selectable || (canSelect?.(item) ?? true);
        const selected = selectable && (selectedIds?.has(item.id) ?? false);
        return (
          <Pressable
            style={styles.cell}
            disabled={selectable && !allowed}
            accessibilityState={selectable ? { selected, disabled: !allowed } : undefined}
            onPress={() =>
              selectable
                ? onToggleSelect?.(item)
                : router.push({
                    pathname: '/photo/[id]',
                    params: detailCtx ? { id: item.id, ctx: detailCtx } : { id: item.id },
                  })
            }
          >
            <Image source={{ uri: item.url }} style={[styles.image, selectable && !allowed && styles.imageDisabled]} transition={150} />
            {selectable && allowed ? (
              <View style={[styles.checkBadge, selected && styles.checkBadgeOn]}>
                {selected ? <Check size={12} color={colors.bg} strokeWidth={2.5} /> : null}
              </View>
            ) : null}
            {selected ? <View style={styles.selectedOverlay} pointerEvents="none" /> : null}
          </Pressable>
        );
      }}
      ListEmptyComponent={
        loading ? null : error ? (
          <Pressable onPress={onRetry} style={styles.errorBox}>
            <Text style={styles.emptyText}>사진을 불러오지 못했어요.</Text>
            <Text style={styles.retry}>다시 시도</Text>
          </Pressable>
        ) : (
          <Text style={styles.empty}>아직 사진이 없어요.</Text>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  errorBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  retry: {
    fontSize: 13,
    color: colors.accent700,
    textDecorationLine: 'underline',
  },
  content: {
    paddingHorizontal: 20,
  },
  row: {
    gap: 4,
    marginBottom: 4,
  },
  cell: {
    flex: 1 / 3,
    aspectRatio: 1,
  },
  image: {
    flex: 1,
    backgroundColor: colors.neutral200,
  },
  imageDisabled: {
    opacity: 0.35,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.bg,
    backgroundColor: 'rgba(16,17,20,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
