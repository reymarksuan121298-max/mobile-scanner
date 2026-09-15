import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export const StatusBadge = ({ isClaimed, isVoid, claimDate }) => {
  let label = 'UNCLAIMED';
  let bgColor = COLORS.warningLight;
  let textColor = '#B45309'; // Amber-700
  let borderColor = '#FCD34D';

  if (isVoid) {
    label = 'VOIDED';
    bgColor = COLORS.dangerLight;
    textColor = COLORS.danger;
    borderColor = '#FCA5A5';
  } else if (isClaimed) {
    label = 'ALREADY CLAIMED';
    bgColor = COLORS.successLight;
    textColor = COLORS.success;
    borderColor = '#6EE7B7';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor, borderColor }]}>
      <View style={[styles.dot, { backgroundColor: textColor }]} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
