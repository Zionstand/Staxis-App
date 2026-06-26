import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Badge } from '@/components/ui/badge';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchData, postData } from '@/lib/api';
import {
  categoryLabel,
  priorityLabel,
  priorityStyle,
  statusLabel,
  statusStyle,
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

function MessageBubble({ bubble }: { bubble: Bubble }) {
  const theme = useTheme();
  const fromUser = bubble.fromUser;

  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: fromUser ? 'flex-end' : 'flex-start' },
      ]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: fromUser ? '#208AEF' : theme.backgroundElement,
            borderBottomRightRadius: fromUser ? Spacing.half : Spacing.three,
            borderBottomLeftRadius: fromUser ? Spacing.three : Spacing.half,
          },
        ]}>
        <ThemedText
          type="small"
          style={[styles.bubbleAuthor, fromUser && styles.bubbleTextOnPrimary]}
          themeColor={fromUser ? undefined : 'textSecondary'}>
          {bubble.author}
        </ThemedText>
        <ThemedText
          type="default"
          style={fromUser ? styles.bubbleTextOnPrimary : undefined}>
          {bubble.body}
        </ThemedText>
        <ThemedText
          type="small"
          style={[styles.bubbleTime, fromUser && styles.bubbleTextOnPrimary]}
          themeColor={fromUser ? undefined : 'textSecondary'}>
          {fmtDateTime(bubble.createdAt)}
        </ThemedText>
      </View>
    </View>
  );
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
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
              // Backend reopens a resolved/closed ticket when the user replies.
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
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (error && !data) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="default" themeColor="textSecondary">
          Couldn&apos;t load this ticket.
        </ThemedText>
        <Pressable onPress={load}>
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (!data) return null;

  const ss = statusStyle(data.status);
  const ps = priorityStyle(data.priority);
  const closed = data.status === 'CLOSED';

  // The original description renders as the first message from the customer.
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}>
      <Stack.Screen options={{ title: `#${data.ticketNumber}` }} />
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        <View style={styles.metaHeader}>
          <ThemedText type="subtitle" style={styles.subject}>
            {data.subject}
          </ThemedText>
          <View style={styles.badgeRow}>
            <Badge label={statusLabel(data.status)} bg={ss.bg} color={ss.color} />
            <Badge label={priorityLabel(data.priority)} bg={ps.bg} color={ps.color} />
            <ThemedText type="small" themeColor="textSecondary">
              {categoryLabel(data.category)}
            </ThemedText>
          </View>
        </View>

        {bubbles.map((b) => (
          <MessageBubble key={b.key} bubble={b} />
        ))}
      </ScrollView>

      {closed ? (
        <ThemedView type="backgroundElement" style={styles.closedNotice}>
          <ThemedText type="small" themeColor="textSecondary">
            This ticket is closed. Open a new ticket if you need more help.
          </ThemedText>
        </ThemedView>
      ) : (
        <ThemedView
          style={[styles.composer, { borderTopColor: theme.backgroundSelected }]}>
          <ThemedTextInput
            placeholder="Write a reply…"
            value={body}
            onChangeText={setBody}
            multiline
            style={styles.composerInput}
          />
          <Pressable
            onPress={onSend}
            disabled={sending || !body.trim()}
            style={[
              styles.sendButton,
              (sending || !body.trim()) && styles.sendButtonDisabled,
            ]}>
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText type="smallBold" style={styles.sendText}>
                Send
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  metaHeader: {
    gap: Spacing.two,
  },
  subject: {
    fontSize: 22,
    lineHeight: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubble: {
    maxWidth: '85%',
    padding: Spacing.three,
    borderTopLeftRadius: Spacing.three,
    borderTopRightRadius: Spacing.three,
    gap: Spacing.half,
  },
  bubbleAuthor: {
    fontWeight: '700',
  },
  bubbleTime: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: Spacing.half,
  },
  bubbleTextOnPrimary: {
    color: '#ffffff',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Platform.select({ ios: Spacing.four, default: Spacing.two }),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerInput: {
    flex: 1,
    height: undefined,
    minHeight: 48,
    maxHeight: 120,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  sendButton: {
    height: 48,
    paddingHorizontal: Spacing.four,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: '#ffffff',
  },
  closedNotice: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Platform.select({ ios: Spacing.five, default: Spacing.three }),
  },
});
