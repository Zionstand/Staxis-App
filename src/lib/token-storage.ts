import * as SecureStore from 'expo-secure-store';
import { session, serializeStorage } from '@/lib/session';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenStorage = {
  async getAccessToken(expected = session.current()) {
    return serializeStorage(async () => {
      session.assertCurrent(expected);
      const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      session.assertCurrent(expected);
      return token;
    });
  },
  async getRefreshToken(expected = session.current()) {
    return serializeStorage(async () => {
      session.assertCurrent(expected);
      const token = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      session.assertCurrent(expected);
      return token;
    });
  },
  async setTokens(accessToken: string, refreshToken: string, expected = session.current()) {
    return serializeStorage(async () => {
      session.assertCurrent(expected);
      try {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        session.assertCurrent(expected);
      } catch (error) {
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
          SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
        ]);
        throw error;
      }
    });
  },
  async clear() {
    return serializeStorage(async () => {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      return refreshToken;
    });
  },
};
