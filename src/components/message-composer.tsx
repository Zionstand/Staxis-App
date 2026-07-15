import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/ui/themed-text-input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadFile } from '@/lib/api';

// Client-side guard for attached images (the backend accepts whatever it's sent).
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function resolveMime(mimeType: string | undefined, nameOrUri: string): string | null {
  if (mimeType) return mimeType.toLowerCase();
  const ext = nameOrUri.split('.').pop()?.toLowerCase();
  return ext ? (EXT_TO_MIME[ext] ?? null) : null;
}

/**
 * Fold attached image URLs into the message body as Markdown images, so they
 * render on read (web + mobile) and round-trip through the Markdown-based ticket
 * storage — even though the composer itself is plain text.
 */
export function withAttachments(text: string, attachments: string[]): string {
  const images = attachments.map((url) => `![image](${url})`);
  return [text.trim(), ...images].filter(Boolean).join('\n\n');
}

type MessageComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Uploaded image URLs, shown as removable thumbnails. */
  attachments: string[];
  onAttachmentsChange: (urls: string[]) => void;
  placeholder?: string;
  inputStyle?: StyleProp<TextStyle>;
  /** Rendered to the right of the input (e.g. a Send button). */
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  /** Show the attach-image action. Defaults to true. */
  enableImage?: boolean;
};

/**
 * A plain-text message composer with optional image attachments (shown as
 * thumbnails). No formatting toolbar — a clean, help-desk-style input.
 */
export function MessageComposer({
  value,
  onChangeText,
  attachments,
  onAttachmentsChange,
  placeholder,
  inputStyle,
  trailing,
  containerStyle,
  enableImage = true,
}: MessageComposerProps) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);

  const pickAndUploadImage = async () => {
    if (uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const mime = resolveMime(asset.mimeType, asset.fileName ?? asset.uri);
    if (mime && !ALLOWED_IMAGE_TYPES.includes(mime)) {
      Alert.alert('Unsupported image', 'Please choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_IMAGE_BYTES) {
      Alert.alert('Image too large', 'Please choose an image smaller than 5 MB.');
      return;
    }

    setUploading(true);
    try {
      const name = asset.fileName ?? asset.uri.split('/').pop() ?? `image-${Date.now()}.jpg`;
      const type = mime ?? 'image/jpeg';
      const formData = new FormData();
      // React Native's FormData takes a { uri, name, type } file descriptor.
      formData.append('file', { uri: asset.uri, name, type } as unknown as Blob);
      const { url } = await uploadFile<{ url: string }>('/upload/editor-image', formData);
      onAttachmentsChange([...attachments, url]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) =>
    onAttachmentsChange(attachments.filter((_, i) => i !== index));

  const hasThumbs = attachments.length > 0 || uploading;

  return (
    <View style={containerStyle}>
      {hasThumbs && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.thumbs}>
          {attachments.map((url, i) => (
            <View key={`${url}-${i}`} style={styles.thumbWrap}>
              <Image
                source={{ uri: url }}
                style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}
                contentFit="cover"
              />
              <Pressable
                onPress={() => removeAt(i)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Remove image"
                style={styles.thumbRemove}>
                <Ionicons name="close" size={14} color="#ffffff" />
              </Pressable>
            </View>
          ))}
          {uploading && (
            <View style={[styles.thumb, styles.thumbLoading, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator size="small" color={theme.textSecondary} />
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.inputRow}>
        <ThemedTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
          style={[styles.input, inputStyle]}
        />
        {enableImage && (
          <Pressable
            onPress={pickAndUploadImage}
            disabled={uploading}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Attach image"
            style={({ pressed }) => [
              styles.attachButton,
              { backgroundColor: theme.backgroundElement },
              (pressed || uploading) && styles.pressed,
            ]}>
            <Ionicons name="image-outline" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  thumbs: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
    paddingRight: Spacing.two,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  thumbLoading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    height: undefined,
    minHeight: 48,
    maxHeight: 160,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  attachButton: {
    width: 44,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
