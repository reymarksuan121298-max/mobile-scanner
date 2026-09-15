import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';

// Create base Axios instance
const apiClient = axios.create({
  baseURL: APP_CONFIG.defaultBaseUrl,
  timeout: 12000, // 12 seconds timeout
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach dynamic token and custom base URL if set
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Check stored custom base URL
      const storedBaseUrl = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.BASE_URL);
      if (storedBaseUrl) {
        config.baseURL = storedBaseUrl.trim();
      }

      // Check stored custom auth token
      const storedToken = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      const tokenToUse = storedToken ? storedToken.trim() : APP_CONFIG.defaultToken;

      // Ensure proper Bearer prefix
      config.headers['Authorization'] = tokenToUse.startsWith('Bearer ') 
        ? tokenToUse 
        : `Bearer ${tokenToUse}`;
    } catch (err) {
      console.warn('API Interceptor storage read error:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Normalize API error messages
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let customMessage = 'Network communication error. Please check your internet connection.';
    
    if (error.response) {
      // Server responded with a status outside 2xx
      const { status, data } = error.response;
      if (status === 404) {
        customMessage = 'Ticket record not found in central database.';
      } else if (status === 401 || status === 403) {
        customMessage = 'Authentication expired or invalid API token.';
      } else if (status === 405) {
        customMessage = 'API endpoint method not supported.';
      } else if (data?.message) {
        customMessage = data.message;
      } else if (status >= 500) {
        customMessage = `Server error (${status}). Please retry in a few moments.`;
      }
    } else if (error.code === 'ECONNABORTED') {
      customMessage = 'Request timed out. Please try again.';
    }

    const enhancedError = new Error(customMessage);
    enhancedError.originalError = error;
    enhancedError.statusCode = error.response ? error.response.status : null;
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
