import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to production Render backend
export const DEFAULT_API_URL = 'https://casegrid-backend.onrender.com';

const SERVER_URL_KEY = '@aicte_server_url';

export async function getApiUrl() {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    // Ignore stale / unreachable local IPs from previous sessions
    if (saved && saved.trim() && !saved.includes('10.83.67.219') && !saved.includes('192.168.1.6')) {
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
