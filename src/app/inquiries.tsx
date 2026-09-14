import { useRouter } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton } from '../components/ui/Button';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Tag } from '../components/ui/Tag';
import { useCreateInquiry, useMyInquiries } from '../hooks/queries';
import { colors, fonts, iconStroke, radius } from '../theme';
import { alertError } from '../utils/dialogs';
import { formatFullDateTime } from '../utils/format';

const MAX_LENGTH = 2000;

/** 문의하기 — 문의를 남기면 운영자가 답변하고, 답변이 달리면 푸시로 알려준다 */
export default function InquiriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inquiries = useMyInquiries();
  const createInquiry = useCreateInquiry();
  const [draft, setDraft] = useState('');

  const content = draft.trim();

  const submit = () => {
    if (content.length === 0 || createInquiry.isPending) return;
    createInquiry.mutate(content, {
      onSuccess: () => {
        setDraft('');
        Alert.alert('문의 접수', '문의가 접수됐어요. 답변이 등록되면 알림으로 알려드릴게요.');
      },
      onError: alertError('문의를 보내지 못했어요'),
    });
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <IconButton
          accessibilityLabel="뒤로"
          onPress={() => router.back()}
          icon={<ChevronLeft size={18} color={colors.text} strokeWidth={iconStroke} />}
        />
        <Text style={styles.title}>문의하기</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={inquiries.isRefetching} onRefresh={() => void inquiries.refetch()} />}
      >
        <SectionHeader title="새 문의" size="sm" />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="불편한 점이나 궁금한 점을 적어 주세요."
          placeholderTextColor={colors.neutral500}
          multiline
          maxLength={MAX_LENGTH}
          textAlignVertical="top"
        />
        <View style={styles.formFooter}>
          <Text style={styles.counter}>
            {draft.length}/{MAX_LENGTH}
          </Text>
          <Button
            label={createInquiry.isPending ? '보내는 중…' : '보내기'}
            icon={<Send size={15} color={colors.accent} strokeWidth={iconStroke} />}
            onPress={submit}
            disabled={content.length === 0 || createInquiry.isPending}
          />
        </View>

        <View style={styles.sectionGap}>
          <SectionHeader title="내 문의" size="sm" meta={inquiries.data ? `${inquiries.data.length}건` : undefined} />
        </View>

        {inquiries.isPending ? <ActivityIndicator style={styles.state} color={colors.textMuted} /> : null}
        {inquiries.isError ? (
          <Text style={styles.stateText} onPress={() => void inquiries.refetch()}>
            문의를 불러오지 못했어요. 눌러서 다시 시도해 주세요.
          </Text>
        ) : null}
        {inquiries.data?.length === 0 ? <Text style={styles.stateText}>아직 남긴 문의가 없어요.</Text> : null}

        <View style={styles.list}>
          {inquiries.data?.map((inquiry) => (
            <View key={inquiry.id} style={styles.card}>
              <View style={styles.cardHead}>
                <Tag label={inquiry.status === 'answered' ? '답변 완료' : '답변 대기'} variant={inquiry.status === 'answered' ? 'accent' : 'neutral'} />
                <Text style={styles.date}>{formatFullDateTime(inquiry.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{inquiry.content}</Text>
              {inquiry.answer ? (
                <View style={styles.answer}>
                  <Text style={styles.answerLabel}>온기 운영팀 답변</Text>
                  <Text style={styles.body}>{inquiry.answer}</Text>
                  {inquiry.answeredAt ? <Text style={styles.date}>{formatFullDateTime(inquiry.answeredAt)}</Text> : null}
                </View>
              ) : null}
            </View>
          ))}
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
  headerSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  counter: {
    fontSize: 11,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  sectionGap: {
    marginTop: 32,
  },
  state: {
    marginVertical: 24,
  },
  stateText: {
    marginVertical: 24,
    textAlign: 'center',
    fontSize: 13,
    color: colors.textMuted,
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  answer: {
    gap: 6,
    marginTop: 4,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.accent100,
  },
  answerLabel: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.accent800,
  },
});
