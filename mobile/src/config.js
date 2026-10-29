import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to the computer's active Wi-Fi address (10.83.67.219)
export const DEFAULT_API_URL = 'http://10.83.67.219:8000';

const SERVER_URL_KEY = '@aicte_server_url';

export async function getApiUrl() {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    // Ignore stale / unreachable IP from previous sessions
    if (saved && saved.trim() && !saved.includes('192.168.1.6')) {
      return saved.trim();
    }
    return DEFAULT_API_URL;
  } catch {
    return DEFAULT_API_URL;
  }
}

export async function setApiUrl(url) {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save API URL', e);
  }
}
