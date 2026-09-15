import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

export const ToastNotification = ({ visible, message, type = 'info' }) => {
  if (!visible || !message) return null;

  let borderColor = COLORS.accent;
  let icon = 'ℹ️';

  if (type === 'success') {
    borderColor = COLORS.success;
    icon = '✅';
  } else if (type === 'danger' || type === 'error') {
    borderColor = COLORS.danger;
    icon = '❌';
  } else if (type === 'warning') {
    borderColor = COLORS.warning;
    icon = '⚠️';
  }

  return (
    <View style={[styles.container, { borderLeftColor: borderColor }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderLeftWidth: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 9999,
  },
  icon: {
    fontSize: 16,
    marginRight: 10,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
});
