import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../constants/config';
import { formatClaimDate } from '../utils/formatters';

const { STORAGE_KEYS } = APP_CONFIG;

export const storageService = {
  /**
   * Save a scan or claim event to the local audit ledger
   */
  async recordClaimEvent(event) {
    try {
      const existingHistory = await this.getClaimHistory();
      const formattedDate = formatClaimDate(event.claimDate || event.timestamp || new Date());
      const newEntry = {
        id: event.transactionId + '_' + Date.now(),
        transactionId: event.transactionId,
        timestamp: formattedDate,
        claimDate: formattedDate,
        status: event.status || 'CLAIMED', // 'CLAIMED', 'SCANNED_ONLY', 'FAILED'
        winAmount: event.winAmount || 0,
        betNo: event.betNo || 'N/A',
        betCode: event.betCode || 'RS3',
        fullName: event.fullName || 'N/A',
        username: event.username || 'N/A',
        drawTime: event.drawTime || 'N/A',
        drawDate: event.drawDate || 'N/A',
        claimedBy: event.claimedBy || 'Accountant/Teller',
        notes: event.notes || '',
      };

      // Put latest on top, keep max 500 records
      const updatedHistory = [newEntry, ...existingHistory.filter(i => i.transactionId !== event.transactionId || i.status !== event.status)].slice(0, 500);
      await AsyncStorage.setItem(STORAGE_KEYS.CLAIM_HISTORY, JSON.stringify(updatedHistory));
      return newEntry;
    } catch (err) {
      console.error('recordClaimEvent error:', err);
    }
  },

  /**
   * Get all claim history items
   */
  async getClaimHistory() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.CLAIM_HISTORY);
      return json ? JSON.parse(json) : [];
    } catch (err) {
      console.error('getClaimHistory error:', err);
      return [];
    }
  },

  /**
   * Clear local history
   */
  async clearHistory() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CLAIM_HISTORY);
      return true;
    } catch (err) {
      console.error('clearHistory error:', err);
      return false;
    }
  },

  /**
   * Save app settings
   */
  async saveSettings(settings) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
    } catch (err) {
      console.error('saveSettings error:', err);
    }
  },

  /**
   * Get app settings
   */
  async getSettings() {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
      return json ? JSON.parse(json) : APP_CONFIG.scanner;
    } catch (err) {
      return APP_CONFIG.scanner;
    }
  }
};
