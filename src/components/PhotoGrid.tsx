import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { ReactElement } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import type { Photo } from '../types';

interface PhotoGridProps {
  photos: Photo[];
  ListHeaderComponent?: ReactElement;
  bottomInset?: number;
  loading?: boolean;
  /** 사진 상세에서 좌우 스와이프로 넘길 목록 컨텍스트 — 'feed' | 'album:<id>' | 'unfiled' | 'person:<id>' */
  detailCtx?: string;
}

/** 3열 정사각 사진 그리드 — 탭하면 사진 상세로 */
export function PhotoGrid({ photos, ListHeaderComponent, bottomInset = 0, loading, detailCtx }: PhotoGridProps) {
  const router = useRouter();
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={({ item }) => (
        <Pressable
          style={styles.cell}
          onPress={() =>
            router.push({
              pathname: '/photo/[id]',
              params: detailCtx ? { id: item.id, ctx: detailCtx } : { id: item.id },
            })
          }
        >
          <Image source={{ uri: item.url }} style={styles.image} transition={150} />
        </Pressable>
      )}
      ListEmptyComponent={
        loading ? null : <Text style={styles.empty}>아직 사진이 없어요.</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
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
  empty: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
  },
});
