import { Pressable, StyleSheet, Text } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { PhotoThumbStrip } from './PhotoThumbStrip';
import { colors } from '../../theme';
import type { Photo } from '../../types';

interface DeletePhotosSheetProps {
  visible: boolean;
  onClose: () => void;
  /** 실제로 지워질 사진 — 내가 올린 것(관리자는 전부) */
  photos: Photo[];
  /** 선택했지만 남이 올려서 제외되는 장수와 그 사람들 호칭 */
  excludedCount: number;
  excludedNames: string[];
  pending: boolean;
  onDelete: () => void;
}

/**
 * 삭제 확인 — Alert 대신 시트. 섞어 골랐으면 "N장은 할머니가 올린 사진이라 제외돼요" 를 먼저 말하고,
 * 지워질 사진을 미리 보여준다.
 */
export function DeletePhotosSheet({ visible, onClose, photos, excludedCount, excludedNames, pending, onDelete }: DeletePhotosSheetProps) {
  const count = photos.length;
  const who = excludedNames.length > 0 ? `${excludedNames.join('·')}가 올린 사진` : '다른 가족이 올린 사진';
  const description =
    (excludedCount > 0 ? `선택한 ${count + excludedCount}장 중 ${excludedCount}장은 ${who}이라 제외돼요. ` : '') + '달린 댓글도 함께 지워지고 되돌릴 수 없어요.';
  return (
    <BottomSheet
      visible={visible}
      onClose={pending ? () => {} : onClose}
      title={`${count}장을 삭제할까요?`}
      description={description}
      footer={
        <>
          <Pressable onPress={onClose} disabled={pending} accessibilityRole="button" style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}>
            <Text style={styles.cancelLabel}>취소</Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={pending || count === 0}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, (pending || count === 0) && styles.ctaDisabled]}
          >
            <Text style={styles.ctaLabel}>{pending ? '삭제 중…' : `${count}장 삭제`}</Text>
          </Pressable>
        </>
      }
    >
      <PhotoThumbStrip photos={photos} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  cancel: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelPressed: {
    backgroundColor: colors.neutral100,
  },
  cancelLabel: {
    fontSize: 14,
    color: colors.text,
  },
  cta: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.85,
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
