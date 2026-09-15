import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { storageService } from '../services/storageService';
import { APP_CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [claimHistory, setClaimHistory] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(APP_CONFIG.scanner);
  const [customToken, setCustomToken] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Load initial settings and history
  const loadInitialData = useCallback(async () => {
    try {
      const history = await storageService.getClaimHistory();
      setClaimHistory(history);

      const savedSettings = await storageService.getSettings();
      setSettings(savedSettings);

      const token = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      if (token) setCustomToken(token);

      const baseUrl = await AsyncStorage.getItem(APP_CONFIG.STORAGE_KEYS.BASE_URL);
      if (baseUrl) setCustomBaseUrl(baseUrl);
    } catch (err) {
      console.warn('Error loading initial app data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3500);
  }, []);

  const addClaimRecord = useCallback(async (record) => {
    const entry = await storageService.recordClaimEvent(record);
    if (entry) {
      setClaimHistory(prev => [entry, ...prev.filter(i => i.transactionId !== entry.transactionId || i.status !== entry.status)].slice(0, 500));
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    await storageService.clearHistory();
    setClaimHistory([]);
    showToast('Local scan history cleared.', 'success');
  }, [showToast]);

  const updateAppSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    await storageService.saveSettings(newSettings);
  }, []);

  const saveApiCredentials = useCallback(async (token, baseUrl) => {
    try {
      if (token) {
        await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token.trim());
        setCustomToken(token.trim());
      } else {
        await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        setCustomToken('');
      }

      if (baseUrl) {
        await AsyncStorage.setItem(APP_CONFIG.STORAGE_KEYS.BASE_URL, baseUrl.trim());
        setCustomBaseUrl(baseUrl.trim());
      } else {
        await AsyncStorage.removeItem(APP_CONFIG.STORAGE_KEYS.BASE_URL);
        setCustomBaseUrl('');
      }

      showToast('API Configuration updated successfully.', 'success');
    } catch (err) {
      showToast('Failed to save API configuration.', 'danger');
    }
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        claimHistory,
        activeTicket,
        setActiveTicket,
        isLoading,
        setIsLoading,
        settings,
        updateAppSettings,
        customToken,
        customBaseUrl,
        saveApiCredentials,
        addClaimRecord,
        clearAllHistory,
        refreshHistory: loadInitialData,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
