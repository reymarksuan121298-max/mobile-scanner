import { Vibration, Platform } from 'react-native';

/**
 * Trigger Haptic / Vibration Feedback for QR Scans
 */
export const triggerScanFeedback = (type = 'success') => {
  try {
    if (type === 'success') {
      // Crisp single pulse for successful scan
      if (Platform.OS === 'android') {
        Vibration.vibrate(70);
      } else {
        Vibration.vibrate(100);
      }
    } else if (type === 'claimSuccess') {
      // Double pulse for confirmed claim payout
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 100, 80, 120]);
      } else {
        Vibration.vibrate([0, 120, 80, 120]);
      }
    } else if (type === 'error') {
      // Long buzz for error/void
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 200, 100, 200]);
      } else {
        Vibration.vibrate(400);
      }
    }
  } catch (err) {
    console.log('Feedback error:', err);
  }
};
