import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 300);

export const ScannerOverlay = ({ isScanning = true }) => {
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;
    if (isScanning) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: SCAN_BOX_SIZE - 4,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    } else {
      laserAnim.setValue(0);
    }
    return () => animation && animation.stop();
  }, [isScanning, laserAnim]);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top Mask */}
      <View style={styles.maskTop}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>STL MANDAUE CLAIM SCANNER</Text>
        </View>
        <Text style={styles.hintText}>Align Ticket QR Code inside the frame</Text>
      </View>

      {/* Middle Row with Left Mask, Scan Window, Right Mask */}
      <View style={styles.middleRow}>
        <View style={styles.maskSide} />

        {/* Scan Frame */}
        <View style={styles.scanBox}>
          {/* Corner Markers */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Animated Laser Line */}
          {isScanning && (
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [{ translateY: laserAnim }],
                },
              ]}
            />
          )}
        </View>

        <View style={styles.maskSide} />
      </View>

      {/* Bottom Mask */}
      <View style={styles.maskBottom}>
        <Text style={styles.subHintText}>Fast Auto-Detection Active</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  maskTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 29, 71, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  badgeContainer: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_SIZE,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 29, 71, 0.7)',
  },
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: COLORS.accent,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  laserLine: {
    width: '100%',
    height: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 29, 71, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  subHintText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
