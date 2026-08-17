import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Camera, Check, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../components/ui/Button';
import { Plate } from '../components/ui/Plate';
import { SectionHeader } from '../components/ui/SectionHeader';
import {
  useAlbumsOf,
  useLocalPhotos,
  useMyGroups,
  usePeopleOf,
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

/** 한 그룹의 앨범 칩 + 인물 칩 — 단일/멀티 그룹 모두에서 재사용 */
function GroupTargetFields({ groupId, draft, onChange }: GroupTargetFieldsProps) {
  const albums = useAlbumsOf(groupId);
  const people = usePeopleOf(groupId);

  const toggleAlbum = (albumId: string) =>
    onChange({ ...draft, albumId: draft.albumId === albumId ? undefined : albumId });

  const togglePerson = (personId: string) =>
    onChange({
      ...draft,
      personIds: draft.personIds.includes(personId)
        ? draft.personIds.filter((p) => p !== personId)
        : [...draft.personIds, personId],
    });

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
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>함께 찍힌 가족</Text>
        <View style={styles.chips}>
          {people.data?.map((person) => {
            const selected = draft.personIds.includes(person.id);
            return (
              <Pressable
                key={person.id}
                style={[styles.chip, selected ? styles.chipAccent : styles.chipNeutral]}
                onPress={() => togglePerson(person.id)}
              >
                <Text style={selected ? styles.chipAccentText : styles.chipNeutralText}>
                  {person.name}
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
  const [caption, setCaption] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([activeGroupId]);
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({});

  const draftOf = (groupId: string): TargetDraft => drafts[groupId] ?? { personIds: [] };
  const setDraftOf = (groupId: string) => (next: TargetDraft) =>
    setDrafts((prev) => ({ ...prev, [groupId]: next }));

  const mainPreview = useMemo(() => {
    if (selectedIds.length === 0) return undefined;
    return localPhotos.data?.find((p) => p.id === selectedIds[0])?.uri;
  }, [selectedIds, localPhotos.data]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleGroup = (groupId: string) =>
    setSelectedGroupIds((prev) => {
      if (prev.includes(groupId)) {
        // 최소 1개 그룹은 유지
        return prev.length > 1 ? prev.filter((g) => g !== groupId) : prev;
      }
      return [...prev, groupId];
    });

  const submit = () => {
    upload.mutate(
      {
        localPhotoIds: selectedIds,
        caption: caption.trim() || undefined,
        targets: selectedGroupIds.map((groupId) => ({
          groupId,
          albumId: draftOf(groupId).albumId,
          personIds: draftOf(groupId).personIds,
        })),
      },
      { onSuccess: () => router.back() },
    );
  };

  const multiGroup = selectedGroupIds.length > 1;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="닫기"
          onPress={() => router.back()}
          icon={<X size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>사진 올리기</Text>
        <Button
          label={upload.isPending ? '올리는 중…' : '올리기'}
          onPress={submit}
          disabled={selectedIds.length === 0 || upload.isPending}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>올릴 공간</Text>
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

        {mainPreview ? (
          <Plate uri={mainPreview} height={230} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.previewEmpty]}>
            <Camera size={28} color={colors.neutral500} strokeWidth={iconStroke} />
            <Text style={styles.previewEmptyText}>아래에서 사진을 선택해 주세요</Text>
          </View>
        )}

        <SectionHeader
          title="최근 사진"
          size="sm"
          meta={selectedIds.length > 0 ? `${selectedIds.length}장 선택됨` : undefined}
        />
        <View style={styles.grid}>
          {localPhotos.data?.map((photo) => {
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
          <Pressable style={[styles.cell, styles.cameraCell]}>
            <Camera size={18} color={colors.neutral500} strokeWidth={iconStroke} />
          </Pressable>
        </View>

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
    </KeyboardAvoidingView>
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
  preview: {
    height: 230,
  },
  previewEmpty: {
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
  cameraCell: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
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
