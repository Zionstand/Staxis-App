import { Image } from 'expo-image';
import { ReactNode, useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type MarkdownTextProps = {
  children: string;
  /** Render on a brand-colored bubble (white text). */
  onPrimary?: boolean;
};

type Segment = { type: 'text'; value: string } | { type: 'image'; url: string };

// Ticket bodies are plain text with attached images folded in as `![alt](url)`
// (see message-composer `withAttachments`). We render text with a little inline
// formatting and images with expo-image — no heavy Markdown engine, which also
// avoids the unmaintained `react-native-markdown-display` crash on new RN.
const IMAGE_RE = /!\[[^\]]*\]\(([^)\s]+)\)/g;

// Inline: **bold**, *italic*, `code`, [label](url), and bare http(s) links.
const INLINE_RE =
  /(\*\*([^*]+?)\*\*)|(\*([^*\n]+?)\*)|(`([^`]+?)`)|(\[([^\]]+?)\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s]+)/g;

function parseSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  IMAGE_RE.lastIndex = 0;
  while ((match = IMAGE_RE.exec(input)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: input.slice(last, match.index) });
    }
    segments.push({ type: 'image', url: match[1] });
    last = match.index + match[0].length;
  }
  if (last < input.length) segments.push({ type: 'text', value: input.slice(last) });
  return segments;
}

function renderInline(text: string, linkColor: string, codeBg: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));

    if (match[2] !== undefined) {
      nodes.push(<Text key={key++} style={styles.bold}>{match[2]}</Text>);
    } else if (match[4] !== undefined) {
      nodes.push(<Text key={key++} style={styles.italic}>{match[4]}</Text>);
    } else if (match[6] !== undefined) {
      nodes.push(
        <Text key={key++} style={[styles.code, { backgroundColor: codeBg }]}>
          {match[6]}
        </Text>,
      );
    } else {
      // Markdown link `[label](url)` (groups 8/9) or a bare URL (group 10).
      const url = match[9] ?? match[10];
      const label = match[8] ?? url;
      if (url) {
        nodes.push(
          <Text
            key={key++}
            onPress={() => Linking.openURL(url).catch(() => {})}
            style={[styles.link, { color: linkColor }]}>
            {label}
          </Text>,
        );
      }
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Renders a ticket message: text (with light inline formatting) plus images. */
export function MarkdownText({ children, onPrimary }: MarkdownTextProps) {
  const theme = useTheme();
  const segments = useMemo(() => parseSegments(children ?? ''), [children]);
  const linkColor = onPrimary ? '#ffffff' : theme.primary;
  const codeBg = onPrimary ? 'rgba(255,255,255,0.18)' : theme.backgroundElement;

  return (
    <View style={styles.container}>
      {segments.map((seg, i) => {
        if (seg.type === 'image') {
          return (
            <Image
              key={`img-${i}`}
              source={{ uri: seg.url }}
              style={styles.image}
              contentFit="contain"
              accessibilityLabel="Attached image"
            />
          );
        }
        const text = seg.value.trim();
        if (!text) return null;
        return (
          <ThemedText
            key={`txt-${i}`}
            type="default"
            style={onPrimary ? styles.onPrimary : undefined}>
            {renderInline(text, linkColor, codeBg)}
          </ThemedText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  onPrimary: {
    color: '#ffffff',
  },
  bold: {
    fontFamily: 'Outfit_700Bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: Fonts.mono,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  link: {
    textDecorationLine: 'underline',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
});
