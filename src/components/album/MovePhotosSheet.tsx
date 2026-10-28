import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { SheetRow } from './SheetRow';
import { colors } from '../../theme';
import type { Album } from '../../types';

interface MovePhotosSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 실제로 옮겨질(내 사진) 장수 */
  count: number;
  /** 선택했지만 남이 올려서 안 옮겨지는 장수 */
  excludedCount: number;
  albums: Album[];
  /** 지금 보는 앨범 — 목록에서 뺀다 */
  currentAlbumId?: string;
  /** 미분류를 보고 있으면 '앨범 없음' 선택지를 뺀다 */
  hideUnfiled: boolean;
  pending: boolean;
  onMove: (albumId: string | null) => void;
}

/** 이 공간 안에서 앨범 옮기기 — 앨범 한 줄 고르고 버튼 */
export function MovePhotosSheet({ visible, onClose, count, excludedCount, albums, currentAlbumId, hideUnfiled, pending, onMove }: MovePhotosSheetProps) {
  // undefined = 아직 안 고름
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (visible) setTarget(undefined);
  }, [visible]);

  const targets = albums.filter((a) => a.id !== currentAlbumId);
  const targetLabel = target === null ? '미분류' : targets.find((a) => a.id === target)?.title;
  const ready = target !== undefined && !pending;
  const description =
    excludedCount > 0
      ? `${excludedCount}장은 다른 가족이 올린 사진이라 옮기지 않아요. 내 사진 ${count}장만 이동해요.`
      : '이 공간 안에서 앨범만 바뀌어요.';

  return (
    <BottomSheet
      visible={visible}
      onClose={pending ? () => {} : onClose}
      title={`${count}장을 옮길 앨범`}
      description={description}
      footer={
        <Pressable
          onPress={() => target !== undefined && onMove(target)}
          disabled={!ready}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, !ready && styles.ctaDisabled]}
        >
          <Text style={styles.ctaLabel}>{pending ? '이동 중…' : target === undefined ? '앨범을 골라주세요' : `「${targetLabel}」으로 ${count}장 이동`}</Text>
        </Pressable>
      }
    >
      {hideUnfiled ? null : <SheetRow label="앨범 없음 (미분류)" muted selected={target === null} onPress={() => setTarget(null)} />}
      {targets.map((a) => (
        <SheetRow key={a.id} initial={a.title.trim().charAt(0)} label={a.title} caption={`${a.photoCount}장`} muted selected={target === a.id} onPress={() => setTarget(a.id)} />
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
