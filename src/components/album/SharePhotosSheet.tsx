import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { PhotoThumbStrip } from './PhotoThumbStrip';
import { SheetRow } from './SheetRow';
import { useAlbumList } from '../../hooks/queries';
import { colors } from '../../theme';
import type { Group, Photo } from '../../types';

interface SharePhotosSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 공유할 사진 — 누가 올렸든 전부 간다 */
  photos: Photo[];
  /** 지금 보는 공간을 뺀 내 가족 공간들 */
  groups: Group[];
  pending: boolean;
  onShare: (target: { groupId: string; albumId: string | null }) => void;
}

/**
 * 다른 가족 공간에 공유 — 시트 한 장에서 공간 → 그 공간의 앨범 → 공유 버튼까지.
 * 네이티브 액션시트 2단과 달리 보낼 사진이 보이고, 중간에 공간을 바꿀 수 있다.
 */
export function SharePhotosSheet({ visible, onClose, photos, groups, pending, onShare }: SharePhotosSheetProps) {
  const [groupId, setGroupId] = useState<string | null>(null);
  // undefined = 아직 안 고름(앨범 불러오는 중) / null = 미분류
  const [albumId, setAlbumId] = useState<string | null | undefined>(undefined);
  const albums = useAlbumList(groupId ?? '');
  const group = groups.find((g) => g.id === groupId);

  // 열릴 때마다 처음부터
  useEffect(() => {
    if (visible) {
      setGroupId(null);
      setAlbumId(undefined);
    }
  }, [visible]);
  // 앨범 목록이 오면 미분류를 기본 선택 — 한 번만 더 누르면 끝나게
  useEffect(() => {
    if (groupId && albums.data && albumId === undefined) setAlbumId(null);
  }, [groupId, albums.data, albumId]);

  const count = photos.length;
  const ready = !!group && albumId !== undefined && !pending;
  const buttonLabel = pending
    ? '공유 중…'
    : !group
      ? '공간을 골라주세요'
      : albumId === undefined
        ? '앨범 불러오는 중…'
        : `「${group.name}」에 ${count}장 공유`;

  return (
    <BottomSheet
      visible={visible}
      onClose={pending ? () => {} : onClose}
      title={`${count}장을 다른 공간에 공유`}
      description="원본은 이 공간에 그대로 남고, 상대 공간에 새 게시물로 올라가요. 좋아요·댓글은 따로 쌓여요."
      footer={
        <Pressable
          onPress={() => group && albumId !== undefined && onShare({ groupId: group.id, albumId })}
          disabled={!ready}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, !ready && styles.ctaDisabled]}
        >
          <Text style={styles.ctaLabel}>{buttonLabel}</Text>
        </Pressable>
      }
    >
      <PhotoThumbStrip photos={photos} />
      <Text style={styles.stepLabel}>어느 가족 공간에 보낼까요?</Text>
      {groups.map((g) => (
        <SheetRow
          key={g.id}
          initial={g.name.trim().charAt(0)}
          label={g.name}
          caption={`구성원 ${g.memberCount}명`}
          selected={g.id === groupId}
          onPress={() => {
            if (g.id === groupId) return;
            setGroupId(g.id);
            setAlbumId(undefined);
          }}
        />
      ))}
      {group ? (
        <View style={styles.albumStep}>
          <Text style={styles.stepLabel}>「{group.name}」의 어느 앨범에 넣을까요?</Text>
          {albums.isLoading && !albums.data ? (
            <ActivityIndicator color={colors.textMuted} style={styles.loading} />
          ) : (
            <View style={styles.chips}>
              <Chip label="앨범 없음 (미분류)" selected={albumId === null} onPress={() => setAlbumId(null)} />
              {(albums.data?.albums ?? []).map((a) => (
                <Chip key={a.id} label={a.title} selected={albumId === a.id} onPress={() => setAlbumId(a.id)} />
              ))}
            </View>
          )}
        </View>
      ) : null}
    </BottomSheet>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipLabel, selected && styles.chipLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stepLabel: {
    fontSize: 11,
    letterSpacing: 1,
    color: colors.accent,
    marginBottom: 6,
  },
  albumStep: {
    marginTop: 18,
  },
  loading: {
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  chipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent100,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.text,
  },
  chipLabelOn: {
    color: colors.accent,
  },
  cta: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    backgroundColor: colors.accent700,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
