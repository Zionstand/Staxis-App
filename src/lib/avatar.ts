import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

import { uploadFile } from '@/lib/api';

export type AvatarSource = 'camera' | 'library';

type UploadResult = { imageUrl?: string; user?: unknown };

// Common picker options: square crop (avatars are circular) and light compression
// so uploads stay small on mobile data.
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

async function ensurePermission(source: AvatarSource): Promise<boolean> {
  const { granted, canAskAgain } =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (granted) return true;

  Alert.alert(
    source === 'camera' ? 'Camera access needed' : 'Photo access needed',
    `Allow access to ${source === 'camera' ? 'your camera' : 'your photos'} to update your profile picture.`,
    canAskAgain
      ? [{ text: 'OK' }]
      : [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
  );
  return false;
}

/**
 * Pick a photo (camera or library), then upload it as the user's profile picture.
 * Returns the new image URL, or null if the user cancelled / denied permission.
 * The backend replaces any existing image and persists the new URL on the user.
 */
export async function pickAndUploadAvatar(
  userId: string,
  source: AvatarSource,
): Promise<string | null> {
  if (!(await ensurePermission(source))) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const form = new FormData();
  form.append('file', {
    uri: asset.uri,
    name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
    // React Native's FormData file shape isn't in the DOM lib types.
  } as unknown as Blob);

  const res = await uploadFile<UploadResult>(`/upload/profile/${userId}`, form);
  return res.imageUrl ?? null;
}
