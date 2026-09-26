import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PUSH_PREFERENCE_ITEMS } from '../api/push';
import { IconButton } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { usePushPreferences, useUpdatePushPreferences } from '../hooks/queries';
import { usePushStore } from '../store/push';
import { colors, fonts, iconStroke } from '../theme';

/** 나 → 푸시 알림 — 전체 스위치(이 기기)와 종류별 스위치(서버 저장, 모든 기기 공통) */
export default function PushSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pushEnabled = usePushStore((s) => s.enabled);
  const pushStatus = usePushStore((s) => s.status);
  const setPushEnabled = usePushStore((s) => s.setEnabled);
  const { preferences } = usePushPreferences();
  const updatePreferences = useUpdatePushPreferences();

  const statusText = !pushEnabled
    ? '꺼짐'
    : pushStatus === 'registered'
      ? '켜짐'
      : pushStatus === 'denied'
        ? '기기 설정에서 꺼짐'
        : pushStatus === 'unavailable'
          ? '이 기기에서 지원 안 함'
          : pushStatus === 'error'
            ? '등록 실패'
            : '';

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>푸시 알림</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>알림 받기</Text>
            <Text style={styles.rowMeta}>{statusText}</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={(v) =>
              void setPushEnabled(v).then((status) => {
                if (v && status === 'denied') {
                  Alert.alert('알림이 꺼져 있어요', '휴대폰 설정에서 온기의 알림을 허용해 주세요.', [
                    { text: '나중에', style: 'cancel' },
                    { text: '설정 열기', onPress: () => void Linking.openSettings() },
                  ]);
                }
              })
            }
            trackColor={{ true: colors.accent }}
          />
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title="종류별로 받기" size="sm" />
        </View>
        {/* 서버에 저장돼 모든 기기 공통. 전체가 꺼져 있으면 값만 보여주고 잠근다 */}
        {PUSH_PREFERENCE_ITEMS.map((item, index) => (
          <View key={item.key} style={[styles.row, index < PUSH_PREFERENCE_ITEMS.length - 1 && styles.divider]}>
            <Text style={[styles.rowLabel, !pushEnabled && styles.rowLabelDisabled]}>{item.label}</Text>
            <Switch
              value={preferences[item.key]}
              disabled={!pushEnabled}
              onValueChange={(v) =>
                updatePreferences.mutate(
                  { [item.key]: v },
                  { onError: (e) => Alert.alert('설정을 저장하지 못했어요', e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.') },
                )
              }
              trackColor={{ true: colors.accent }}
            />
          </View>
        ))}
        <Text style={styles.hint}>문의 답변 알림은 설정과 관계없이 항상 보내드려요.{'\n'}종류별 설정은 계정에 저장돼 다른 기기에서도 같이 적용돼요.</Text>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.text,
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  rowLabelDisabled: {
    color: colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sectionGap: {
    marginTop: 24,
  },
  hint: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 17,
    color: colors.textMuted,
  },
});
