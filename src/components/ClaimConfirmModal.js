import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { formatCurrency, formatDrawTime, getBetTypeLabel } from '../utils/formatters';

export const ClaimConfirmModal = ({
  visible,
  ticket,
  onClose,
  onConfirm,
  isProcessing = false,
}) => {
  const { height } = useWindowDimensions();

  if (!ticket) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { maxHeight: Math.min(height * 0.92, 540) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>CONFIRM CLAIM DISBURSEMENT</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                You are about to mark this winning ticket as <Text style={styles.boldText}>CLAIMED</Text> in the central STL Mandaue ledger.
              </Text>
            </View>

            {/* Ticket Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.row}>
                <Text style={styles.label}>TRANSACTION ID:</Text>
                <Text style={styles.valueMono}>{ticket.transactionId}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>OUTLET / TELLER:</Text>
                <Text style={styles.value}>{ticket.fullName || 'N/A'}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>COMBINATION:</Text>
                <Text style={styles.valueBold}>
                  {ticket.betNo || 'N/A'} ({getBetTypeLabel(ticket.betCode, ticket.rambolito)})
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>DRAW SCHEDULE:</Text>
                <Text style={styles.value}>{formatDrawTime(ticket.drawTime, ticket.drawDate)}</Text>
              </View>

              <View style={[styles.row, styles.winRow]}>
                <Text style={styles.winLabel}>WINNING PAYOUT:</Text>
                <Text style={styles.winAmount}>
                  {formatCurrency(
                    ticket.totalWinAmount !== undefined && ticket.totalWinAmount !== null
                      ? ticket.totalWinAmount
                      : ticket.primaryTicket
                      ? ticket.primaryTicket.winAmount
                      : 0
                  )}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn]}
              onPress={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.confirmBtnText}>CONFIRM & DISBURSE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  closeBtn: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningIcon: {
    fontSize: 18,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: '800',
  },
  summaryContainer: {
    padding: 18,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  valueMono: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  valueBold: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  winRow: {
    borderBottomWidth: 0,
    paddingTop: 8,
    backgroundColor: COLORS.surfaceAlt,
    padding: 12,
    borderRadius: 8,
  },
  winLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  winAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.success,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surfaceAlt,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: {
    color: COLORS.accent,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.8,
  },
});
