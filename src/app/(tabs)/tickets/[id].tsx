import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import {
  EmptyState,
  StaxisButton,
  StaxisTag,
  StaxisText,
} from '@/components/staxis';
import {
  Colors,
  Palette,
  Radius,
  Spacing,
  Type,
} from '@/constants/staxis-theme';
import { fetchData, postData } from '@/lib/api';
import {
  categoryLabel,
  priorityLabel,
  statusLabel,
} from '@/lib/tickets';
import { TicketDetail, TicketMessage } from '@/lib/types';
import { fmtDateTime } from '@/lib/utils';

type Bubble = {
  key: string;
  body: string;
  fromUser: boolean;
  author: string;
  createdAt: string;
};

function statusTagVariant(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success' as const;
  if (status === 'IN_PROGRESS') return 'warn' as const;
  if (status === 'ON_HOLD') return 'neutral' as const;
  return 'info' as const;
}

function priorityTagVariant(priority: string) {
  if (priority === 'URGENT') return 'danger' as const;
  if (priority === 'HIGH') return 'warn' as const;
  return 'neutral' as const;
}

function MessageBubble({ bubble }: { bubble: Bubble }) {
  const fromUser = bubble.fromUser;

  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: fromUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: fromUser ? Palette.signal : Palette.bone2,
            borderBottomRightRadius: fromUser ? 2 : Radius.md,
            borderBottomLeftRadius: fromUser ? Radius.md : 2,
          },
        ]}
      >
        <StaxisText
          variant="tableCellMono"
          style={{ color: fromUser ? Palette.bone : Colors.text2 }}
        >
          {bubble.author}
        </StaxisText>
        <StaxisText
          variant="bodyBase"
          style={fromUser ? { color: Palette.bone } : undefined}
        >
          {bubble.body}
        </StaxisText>
        <StaxisText
          variant="listTime"
          style={fromUser ? { color: 'rgba(245,242,236,0.62)' } : undefined}
        >
          {fmtDateTime(bubble.createdAt)}
        </StaxisText>
      </View>
    </View>
  );
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchData<TicketDetail>(`/tickets/my/${id}`);
      setData(result);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const message = await postData<TicketMessage>(
        `/tickets/my/${id}/reply`,
        { body: trimmed },
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, message],
              status:
                prev.status === 'RESOLVED' || prev.status === 'CLOSED'
                  ? 'OPEN'
                  : prev.status,
            }
          : prev,
      );
      setBody('');
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Palette.signal} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <EmptyState
          title="Couldn't load ticket"
          message="Check your connection and try again."
          action={{ label: 'Retry', onPress: load }}
        />
      </View>
    );
  }

  if (!data) return null;

  const closed = data.status === 'CLOSED';

  const bubbles: Bubble[] = [
    {
      key: 'description',
      body: data.description,
      fromUser: true,
      author: `${data.createdBy.firstName} ${data.createdBy.lastName}`,
      createdAt: data.createdAt,
    },
    ...data.messages.map<Bubble>((m) => ({
      key: m.id,
      body: m.body,
      fromUser: m.senderType === 'USER',
      author:
        m.senderType === 'USER'
          ? `${m.sender.firstName} ${m.sender.lastName}`
          : 'Support',
      createdAt: m.createdAt,
    })),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <Stack.Screen options={{ title: `#${data.ticketNumber}` }} />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        <View style={styles.metaHeader}>
          <StaxisText variant="displaySm">{data.subject}</StaxisText>
          <View style={styles.tagRow}>
            <StaxisTag
              variant={statusTagVariant(data.status)}
              label={statusLabel(data.status)}
            />
            <StaxisTag
              variant={priorityTagVariant(data.priority)}
              label={priorityLabel(data.priority)}
            />
            <StaxisText variant="listSub">
              {categoryLabel(data.category)}
            </StaxisText>
          </View>
        </View>

        {bubbles.map((b) => (
          <MessageBubble key={b.key} bubble={b} />
        ))}
      </ScrollView>

      {closed ? (
        <View style={styles.closedNotice}>
          <StaxisText variant="formHint">
            This ticket is closed. Open a new ticket if you need more help.
          </StaxisText>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            placeholder="Write a reply..."
            placeholderTextColor={Colors.text3}
            value={body}
            onChangeText={setBody}
            multiline
            style={styles.composerInput}
          />
          <StaxisButton
            variant="primary"
            label={sending ? '' : 'Send'}
            size="sm"
            onPress={onSend}
            disabled={sending || !body.trim()}
            icon={
              sending ? (
                <ActivityIndicator color={Palette.bone} size="small" />
              ) : undefined
            }
            style={(!body.trim() || sending) ? { opacity: 0.5 } : undefined}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, backgroundColor: Colors.bgApp },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaHeader: { gap: Spacing.sm },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.lg,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    gap: 2,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.select({ ios: Spacing.xl, default: Spacing.sm }),
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.bgCard,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lineStrong,
    borderRadius: Radius.sm,
    backgroundColor: Colors.bgApp,
    ...Type.formInput,
  },
  closedNotice: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Platform.select({ ios: Spacing.xxl, default: Spacing.lg }),
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
});
