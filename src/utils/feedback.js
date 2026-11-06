import { Vibration, Platform, NativeModules } from 'react-native';

/**
 * Play pleasant acoustic chime for already-claimed ticket
 */
export const playClaimedSound = () => {
  try {
    if (NativeModules.SoundModule && typeof NativeModules.SoundModule.playClaimedSound === 'function') {
      NativeModules.SoundModule.playClaimedSound();
    }
  } catch (err) {
    console.warn('SoundModule error:', err);
  }
};

/**
 * Trigger Haptic / Vibration & Audio Feedback for QR Scans
 */
export const triggerScanFeedback = (type = 'success') => {
  try {
    if (type === 'claimed') {
      // Pleasant acoustic chime + soft double vibration for already-claimed tickets
      playClaimedSound();
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 50, 60, 80]);
      } else {
        Vibration.vibrate(80);
      }
    } else if (type === 'success') {
      // Crisp single pulse for successful scan
      if (Platform.OS === 'android') {
        Vibration.vibrate(70);
      } else {
        Vibration.vibrate(100);
      }
    } else if (type === 'claimSuccess') {
      // Double pulse for confirmed claim payout
      playClaimedSound();
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
