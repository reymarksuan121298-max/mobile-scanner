import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { COLORS } from '../constants/theme';
import { StatusBadge } from '../components/StatusBadge';
import { ClaimConfirmModal } from '../components/ClaimConfirmModal';
import {
  formatCurrency,
  formatDrawTime,
  getBetTypeLabel,
  formatDate,
  formatClaimDate,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
  formatVercelTransId,
  formatSupervisorDisplay,
} from '../utils/formatters';
import { claimService } from '../services/claimService';
import { useApp } from '../context/AppContext';
import { triggerScanFeedback } from '../utils/feedback';

export default function TicketDetailsScreen({ navigation, route }) {
  const { activeTicket, setActiveTicket, showToast, addClaimRecord } = useApp();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!activeTicket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyText}>No ticket loaded.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Text style={styles.backBtnText}>BACK TO SCANNER</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    transactionId,
    totalWinAmount,
    totalBetAmount,
    isClaimed,
    isVoid,
    drawTime,
    drawDate,
    fullName,
    username,
    supervisor,
    betNo,
    betCode,
    rambolito,
    claimDate,
    agentId: ticketAgentId,
    isVercel: ticketIsVercel,
    allCombinations = [],
  } = activeTicket;

  const agentId = ticketAgentId || extractAgentFromTransId(transactionId);
  const isVercel = ticketIsVercel || isVercelTicket(transactionId);
  const baseId = getBaseTransId(transactionId);

  const handleCopyTransId = () => {
    Clipboard.setString(baseId);
    setCopied(true);
    showToast('Transaction ID copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteClaim = async () => {
    setIsProcessingClaim(true);
    try {
      const result = await claimService.executeClaim(baseId);
      triggerScanFeedback('claimSuccess');

      // Update local state to reflect claimed status
      const updatedTicket = {
        ...activeTicket,
        transactionId: baseId,
        isClaimed: true,
        claimDate: result.timestamp || new Date().toISOString(),
      };
      setActiveTicket(updatedTicket);

      // Record in audit ledger
      await addClaimRecord({
        transactionId: baseId,
        winAmount: totalWinAmount,
        betNo,
        betCode,
        fullName,
        username,
        drawTime,
        drawDate,
        agentId: agentId || null,
        isVercel,
        status: 'CLAIMED',
        notes: isVercel
          ? `Claim executed for Physical Vercel Ticket (Agent #${agentId || 'N/A'})`
          : 'Claim executed successfully via API',
      });

      setConfirmModalOpen(false);
      showToast('Winnings payout successfully recorded!', 'success');

      Alert.alert(
        'Claim Successful',
        `Transaction ${baseId} has been marked as CLAIMED in the central ledger.\n\nPayout Amount: ${formatCurrency(totalWinAmount)}`,
        [
          {
            text: 'Scan Next Ticket',
            onPress: () => navigation.navigate('Scanner'),
          },
          { text: 'View Summary', style: 'cancel' },
        ]
      );
    } catch (err) {
      triggerScanFeedback('error');
      Alert.alert(
        'Claim Failed',
        err.message || 'Unable to update claim status on the central server.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingClaim(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.headerBackText}>SCANNER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TICKET VERIFICATION</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Status & ID Card */}
        <View style={styles.topCard}>
          <View style={styles.topCardRow}>
            <StatusBadge isClaimed={isClaimed} isVoid={isVoid} claimDate={claimDate} />
            <TouchableOpacity
              style={styles.copyBadge}
              onPress={handleCopyTransId}
            >
              <Text style={styles.copyBadgeText}>{copied ? '✓ COPIED' : '📋 COPY ID'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.idLabel}>TRANSACTION ID</Text>
          <Text style={styles.transIdText}>{transactionId}</Text>
        </View>

        {/* Physical VERCEL Ticket Badge Banner */}
        {isVercel && (
          <View style={styles.vercelBanner}>
            <View style={styles.vercelPill}>
              <Text style={styles.vercelPillText}>⚡ PHYSICAL TICKET (VERCEL)</Text>
            </View>
          </View>
        )}

        {/* Big Payout Liability Card */}
        <View style={styles.liabilityCard}>
          <Text style={styles.liabilityLabel}>TOTAL WINNING LIABILITY</Text>
          <Text style={styles.liabilityAmount}>{formatCurrency(totalWinAmount)}</Text>
          <View style={styles.betVolumeRow}>
            <Text style={styles.betVolumeText}>
              Bet Volume: <Text style={styles.boldWhite}>{formatCurrency(totalBetAmount)}</Text>
            </Text>
            <Text style={styles.betVolumeText}>
              Type: <Text style={styles.boldGold}>{getBetTypeLabel(betCode, rambolito)}</Text>
            </Text>
          </View>
        </View>

        {/* Detailed Breakdown Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionHeading}>TICKET SPECIFICATIONS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>OUTLET / FULL NAME</Text>
            <Text style={styles.detailValue}>{fullName || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>SUPERVISOR ACCOUNT</Text>
            <Text style={styles.detailValueBold}>
              {formatSupervisorDisplay(username, supervisor, agentId)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>BET COMBINATION</Text>
            <Text style={styles.combValue}>{betNo || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>DRAW SCHEDULE</Text>
            <Text style={styles.detailValue}>{formatDrawTime(drawTime, drawDate)}</Text>
          </View>

          {isClaimed && (
            <View style={[styles.detailRow, styles.claimHighlightRow]}>
              <Text style={styles.claimHighlightLabel}>CLAIMED TIMESTAMP</Text>
              <Text style={styles.claimHighlightValue}>{formatClaimDate(claimDate) || 'Processed'}</Text>
            </View>
          )}
        </View>

        {/* Multi-Combination Line Items (if any) */}
        {allCombinations.length > 1 && (
          <View style={styles.multiCard}>
            <Text style={styles.sectionHeading}>
              ALL COMBINATIONS IN RECEIPT ({allCombinations.length})
            </Text>
            {allCombinations.map((c, idx) => (
              <View key={idx} style={styles.combItem}>
                <Text style={styles.combNum}>#{idx + 1} • {c.betNo} ({c.betCode})</Text>
                <Text style={styles.combWin}>{formatCurrency(c.winAmount)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Claim Action Bar */}
      <View style={styles.bottomBar}>
        {!isClaimed && !isVoid ? (
          <TouchableOpacity
            style={styles.claimActionBtn}
            onPress={() => setConfirmModalOpen(true)}
          >
            <Text style={styles.claimActionIcon}>💰</Text>
            <Text style={styles.claimActionText}>PROCESS CLAIM & DISBURSE</Text>
          </TouchableOpacity>
        ) : isClaimed ? (
          <View style={styles.claimedNotice}>
            <Text style={styles.claimedNoticeIcon}>✅</Text>
            <Text style={styles.claimedNoticeText}>
              This ticket is already marked as CLAIMED.
            </Text>
          </View>
        ) : (
          <View style={styles.voidNotice}>
            <Text style={styles.voidNoticeText}>⛔ TICKET IS VOIDED</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.scanNextBtn}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Text style={styles.scanNextText}>SCAN NEXT TICKET</Text>
        </TouchableOpacity>
      </View>

      {/* Claim Confirmation Modal */}
      <ClaimConfirmModal
        visible={confirmModalOpen}
        ticket={activeTicket}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleExecuteClaim}
        isProcessing={isProcessingClaim}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  headerBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  backArrow: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: '900',
    marginRight: 4,
  },
  headerBackText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  topCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  copyBadge: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  idLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  transIdText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primary,
    marginTop: 2,
  },
  vercelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  vercelPill: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  vercelPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  agentPill: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  agentPillText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentVal: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.primaryDark,
  },
  vercelTag: {
    fontSize: 9,
    fontWeight: '900',
    color: '#6366F1',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  liabilityCard: {
    backgroundColor: COLORS.primaryDark,
    padding: 18,
    borderRadius: 14,
    borderLeftWidth: 6,
    borderLeftColor: COLORS.accent,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  liabilityLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  liabilityAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 8,
  },
  betVolumeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 8,
  },
  betVolumeText: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  boldWhite: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  boldGold: {
    fontWeight: '800',
    color: COLORS.accent,
  },
  detailsCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  detailValueBold: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  combValue: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primaryDark,
  },
  claimHighlightRow: {
    backgroundColor: COLORS.successLight,
    padding: 8,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  claimHighlightLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.success,
  },
  claimHighlightValue: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.success,
  },
  multiCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  combItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  combNum: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
  },
  combWin: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.success,
  },
  bottomBar: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  claimActionBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  claimActionIcon: {
    fontSize: 18,
  },
  claimActionText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  claimedNotice: {
    backgroundColor: COLORS.successLight,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  claimedNoticeIcon: {
    fontSize: 16,
  },
  claimedNoticeText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '800',
  },
  voidNotice: {
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  voidNoticeText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  scanNextBtn: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scanNextText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: COLORS.accent,
    fontWeight: '800',
    fontSize: 12,
  },
});
