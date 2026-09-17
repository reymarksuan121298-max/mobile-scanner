import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Image,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'react-native-camera-kit';
import { COLORS } from '../constants/theme';
import { ScannerOverlay } from '../components/ScannerOverlay';
import { ManualEntryModal } from '../components/ManualEntryModal';
import { StatusBadge } from '../components/StatusBadge';
import { ClaimConfirmModal } from '../components/ClaimConfirmModal';
import { claimService } from '../services/claimService';
import { useApp } from '../context/AppContext';
import { triggerScanFeedback } from '../utils/feedback';
import {
  formatCurrency,
  formatDrawTime,
  getBetTypeLabel,
  formatClaimDate,
  cleanTransId,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
  formatVercelTransId,
  formatSupervisorDisplay,
} from '../utils/formatters';

export default function ScannerScreen({ navigation }) {
  const { showToast, settings, addClaimRecord } = useApp();

  // Camera & Permission States
  const [hasPermission, setHasPermission] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Ticket Result Modal State (Instant Pop-up on Scan)
  const [ticketResult, setTicketResult] = useState(null);
  const [confirmClaimModalOpen, setConfirmClaimModalOpen] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const [copied, setCopied] = useState(false);

  const scanLockoutRef = useRef(false);

  // Request Android Camera Permissions on Launch
  const checkCameraPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'STL Mandaue QR Scanner requires camera access to scan winning ticket QR codes.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          Alert.alert(
            'Camera Permission Denied',
            'Please grant camera permission in Android Settings to scan physical lottery tickets.',
            [{ text: 'OK' }]
          );
        }
      } catch (err) {
        console.warn('Camera permission request error:', err);
      }
    } else {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    checkCameraPermission();
  }, [checkCameraPermission]);

  /**
   * Process a scanned QR code or manually entered Transaction ID
   */
  const handleProcessTransactionId = useCallback(
    async (rawCode) => {
      const transId = cleanTransId(rawCode);
      if (!transId || scanLockoutRef.current) return;

      scanLockoutRef.current = true;
      setIsScanning(false);
      setIsSearching(true);

      if (settings?.vibrateOnScan !== false) {
        triggerScanFeedback('success');
      }

      try {
        const result = await claimService.lookupTicket(transId);

        if (!result.found) {
          Alert.alert(
            'Ticket Not Found',
            `No active bet record found for transaction ID "${transId}".`,
            [
              {
                text: 'OK',
                onPress: () => {
                  scanLockoutRef.current = false;
                  setIsScanning(true);
                },
              },
            ]
          );
          return;
        }

        const agentId = result.agentId || extractAgentFromTransId(result.transactionId) || extractAgentFromTransId(transId);
        const isVercel = result.isVercel || isVercelTicket(result.transactionId) || isVercelTicket(transId);
        const baseId = getBaseTransId(result.transactionId || transId);

        const enrichedResult = {
          ...result,
          transactionId: baseId,
          baseTransactionId: baseId,
          scannedTransactionId: transId,
          agentId: agentId || null,
          isVercel,
        };

        // Record scan event
        await addClaimRecord({
          transactionId: baseId,
          winAmount: result.totalWinAmount,
          betNo: result.betNo,
          betCode: result.betCode,
          fullName: result.fullName,
          username: result.username,
          drawTime: result.drawTime,
          drawDate: result.drawDate,
          agentId: agentId || null,
          isVercel: isVercel,
          status: result.isClaimed ? 'CLAIMED' : result.isVoid ? 'VOIDED' : 'UNCLAIMED',
          notes: isVercel
            ? `Scanned Physical Vercel Ticket (Agent #${agentId || 'N/A'})`
            : 'Scanned via QR Terminal',
        });

        setTicketResult(enrichedResult);
        setManualModalOpen(false);
      } catch (err) {
        Alert.alert(
          'API Connection Error',
          err.message || 'Unable to communicate with the Mandaue Claim API server.',
          [
            {
              text: 'Retry',
              onPress: () => {
                scanLockoutRef.current = false;
                setIsScanning(true);
              },
            },
          ]
        );
      } finally {
        setIsSearching(false);
      }
    },
    [settings?.vibrateOnScan, addClaimRecord]
  );

  /**
   * Execute Claim Payout (PUT /api/accountant/claim/{id})
   */
  const handleExecuteClaim = async () => {
    if (!ticketResult) return;
    setIsProcessingClaim(true);

    try {
      const res = await claimService.executeClaim(ticketResult.transactionId);
      triggerScanFeedback('claimSuccess');

      const formattedClaimDateVal = res.claimDate || formatClaimDate(res.timestamp || new Date());

      const updated = {
        ...ticketResult,
        isClaimed: true,
        claimDate: formattedClaimDateVal,
      };
      setTicketResult(updated);

      const agentId = ticketResult.agentId || extractAgentFromTransId(ticketResult.transactionId);
      const isVercel = ticketResult.isVercel || isVercelTicket(ticketResult.transactionId);

      await addClaimRecord({
        transactionId: ticketResult.transactionId,
        winAmount: ticketResult.totalWinAmount,
        betNo: ticketResult.betNo,
        betCode: ticketResult.betCode,
        fullName: ticketResult.fullName,
        username: ticketResult.username,
        drawTime: ticketResult.drawTime,
        drawDate: ticketResult.drawDate,
        agentId: agentId || null,
        isVercel: isVercel,
        status: 'CLAIMED',
        claimDate: formattedClaimDateVal,
        timestamp: formattedClaimDateVal,
        notes: isVercel
          ? `Claim disbursed for Physical Vercel Ticket (Agent #${agentId || 'N/A'})`
          : 'Claim successfully disbursed',
      });

      setConfirmClaimModalOpen(false);
      showToast('Winnings payout successfully recorded in central ledger!', 'success');

      Alert.alert(
        'Claim Successful',
        `Transaction ${ticketResult.transactionId} is now marked as CLAIMED.\n\nDisbursed Payout: ${formatCurrency(ticketResult.totalWinAmount)}`,
        [
          {
            text: 'Scan Next Ticket',
            onPress: handleCloseAndScanNext,
          },
          { text: 'Keep Ticket Open', style: 'cancel' },
        ]
      );
    } catch (err) {
      triggerScanFeedback('error');
      Alert.alert(
        'Claim Failed',
        err.message || 'Server rejected the claim update request.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingClaim(false);
    }
  };

  /**
   * Close ticket modal and immediately resume scanner
   */
  const handleCloseAndScanNext = () => {
    setTicketResult(null);
    setConfirmClaimModalOpen(false);
    scanLockoutRef.current = false;
    setIsScanning(true);
  };

  const handleCopyTransId = () => {
    if (!ticketResult) return;
    Clipboard.setString(ticketResult.transactionId);
    setCopied(true);
    showToast('Transaction ID copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const currentAgentId =
    ticketResult?.agentId ||
    (ticketResult?.transactionId ? extractAgentFromTransId(ticketResult.transactionId) : null);
  const currentIsVercel =
    ticketResult?.isVercel ||
    (ticketResult?.transactionId ? isVercelTicket(ticketResult.transactionId) : false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primaryDark} />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerBrandContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View>
            <Text style={styles.brandTitle}>STL MANDAUE</Text>
            <Text style={styles.brandSubtitle}>QR CLAIM TERMINAL</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.readyBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.readyText}>SCANNING</Text>
          </View>
        </View>
      </View>

      {/* Live Camera Viewfinder Stream */}
      <View style={styles.cameraViewport}>
        {hasPermission ? (
          <Camera
            style={StyleSheet.absoluteFill}
            scanBarcode={isScanning && !ticketResult && !isSearching}
            onReadCode={(event) => {
              const code = event?.nativeEvent?.codeStringValue;
              if (code) {
                handleProcessTransactionId(code);
              }
            }}
            showFrame={false}
            laserColor="transparent"
            frameColor="transparent"
          />
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionIcon}>📷</Text>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={checkCameraPermission}
            >
              <Text style={styles.permissionBtnText}>GRANT ACCESS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reticle Overlay on Top of Live Camera */}
        <ScannerOverlay isScanning={isScanning && !isSearching && !ticketResult} />

        {isSearching && (
          <View style={styles.searchingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.searchingText}>VERIFYING TICKET LEDGER...</Text>
          </View>
        )}
      </View>

      {/* Bottom Control Bar */}
      <View style={styles.bottomControls}>
        <TouchableOpacity
          style={styles.manualEntryBtn}
          onPress={() => setManualModalOpen(true)}
        >
          <Text style={styles.manualIcon}>⌨️</Text>
          <Text style={styles.manualBtnText}>TYPE CODE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            scanLockoutRef.current = false;
            setIsScanning(true);
            showToast('Scanner ready.', 'info');
          }}
        >
          <Text style={styles.resetIcon}>🔄</Text>
          <Text style={styles.resetBtnText}>RESET</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Transaction ID Lookup Modal */}
      <ManualEntryModal
        visible={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        onSearch={handleProcessTransactionId}
        isLoading={isSearching}
      />

      {/* INSTANT TICKET VERIFICATION & CLAIM SHEET MODAL */}
      {ticketResult && (
        <Modal
          visible={Boolean(ticketResult)}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseAndScanNext}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.sheetContainer}>
              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderTitleRow}>
                  <Text style={styles.sheetHeaderTitle}>TICKET VERIFICATION</Text>
                  <StatusBadge
                    isClaimed={ticketResult.isClaimed}
                    isVoid={ticketResult.isVoid}
                    claimDate={ticketResult.claimDate}
                  />
                </View>
                <TouchableOpacity
                  style={styles.sheetCloseBtn}
                  onPress={handleCloseAndScanNext}
                >
                  <Text style={styles.sheetCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.sheetBody}>
                {/* Physical VERCEL Ticket Badge Banner */}
                {currentIsVercel && (
                  <View style={styles.vercelBanner}>
                    <View style={styles.vercelPill}>
                      <Text style={styles.vercelPillText}>⚡ PHYSICAL TICKET (VERCEL)</Text>
                    </View>
                  </View>
                )}

                {/* Big Payout Highlight */}
                <View style={styles.payoutCard}>
                  <Text style={styles.payoutLabel}>TOTAL WINNING PAYOUT</Text>
                  <Text style={styles.payoutAmount}>
                    {formatCurrency(ticketResult.totalWinAmount)}
                  </Text>
                  <View style={styles.payoutMetaRow}>
                    <Text style={styles.payoutMetaText}>
                      Bet: <Text style={styles.boldWhite}>{formatCurrency(ticketResult.totalBetAmount)}</Text>
                    </Text>
                    <Text style={styles.payoutMetaText}>
                      Type: <Text style={styles.boldGold}>{getBetTypeLabel(ticketResult.betCode, ticketResult.rambolito)}</Text>
                    </Text>
                  </View>
                </View>

                {/* Ticket Details Box */}
                <View style={styles.infoCard}>
                  {/* Transaction ID */}
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={handleCopyTransId}
                  >
                    <Text style={styles.infoLabel}>TRANSACTION ID</Text>
                    <View style={styles.transIdRow}>
                      <Text style={styles.transIdVal}>{ticketResult.transactionId}</Text>
                      <Text style={styles.copyPill}>{copied ? '✓ COPIED' : '📋'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Combination */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>COMBINATION</Text>
                    <Text style={styles.combVal}>{ticketResult.betNo || 'N/A'}</Text>
                  </View>

                  {/* Outlet */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>TELLER</Text>
                    <Text style={styles.infoVal}>{ticketResult.fullName || 'N/A'}</Text>
                  </View>

                  {/* Supervisor */}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>SUPERVISOR</Text>
                    <Text style={styles.infoValBold}>
                      {formatSupervisorDisplay(
                        ticketResult.username,
                        ticketResult.supervisor,
                        currentAgentId
                      )}
                    </Text>
                  </View>

                  {/* Draw Schedule */}
                  <View style={[styles.infoRow, !ticketResult.isClaimed && { borderBottomWidth: 0 }]}>
                    <Text style={styles.infoLabel}>DRAW SCHEDULE</Text>
                    <Text style={styles.infoVal}>
                      {formatDrawTime(ticketResult.drawTime, ticketResult.drawDate)}
                    </Text>
                  </View>

                  {/* Claimed Timestamp */}
                  {ticketResult.isClaimed && (
                    <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.infoLabel}>CLAIMED AT</Text>
                      <Text style={styles.infoValBold}>
                        {formatClaimDate(ticketResult.claimDate) || 'Processed'}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Sheet Action Footer */}
              <View style={styles.sheetFooter}>
                {!ticketResult.isClaimed && !ticketResult.isVoid ? (
                  <TouchableOpacity
                    style={styles.claimBtn}
                    onPress={() => setConfirmClaimModalOpen(true)}
                  >
                    <Text style={styles.claimBtnIcon}>💰</Text>
                    <Text style={styles.claimBtnText}>
                      CLAIM & DISBURSE {formatCurrency(ticketResult.totalWinAmount)}
                    </Text>
                  </TouchableOpacity>
                ) : ticketResult.isClaimed ? (
                  <View style={styles.alreadyClaimedBanner}>
                    <Text style={styles.alreadyClaimedText}>
                      ✅ THIS TICKET HAS BEEN CLAIMED
                    </Text>
                  </View>
                ) : (
                  <View style={styles.voidBanner}>
                    <Text style={styles.voidText}>⛔ TICKET IS VOIDED</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.scanNextBtn}
                  onPress={handleCloseAndScanNext}
                >
                  <Text style={styles.scanNextText}>SCAN NEXT TICKET</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Confirmation Dialog before PUT */}
      <ClaimConfirmModal
        visible={confirmClaimModalOpen}
        ticket={ticketResult}
        onClose={() => setConfirmClaimModalOpen(false)}
        onConfirm={handleExecuteClaim}
        isProcessing={isProcessingClaim}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.25)',
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 6,
  },
  readyText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cameraViewport: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  permissionContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 24,
    gap: 12,
  },
  permissionIcon: {
    fontSize: 48,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  permissionBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionBtnText: {
    color: COLORS.primaryDark,
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  searchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 29, 71, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    gap: 12,
  },
  searchingText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bottomControls: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  manualEntryBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  manualIcon: {
    fontSize: 16,
  },
  manualBtnText: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  resetBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  resetIcon: {
    fontSize: 15,
  },
  resetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Ticket Sheet Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  sheetHeader: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  sheetHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetBody: {
    padding: 16,
    gap: 12,
  },
  vercelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1.5,
    borderColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  payoutCard: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
  },
  payoutLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
  },
  payoutAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
    marginBottom: 8,
  },
  payoutMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 8,
  },
  payoutMetaText: {
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
  infoCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoValBold: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.primary,
  },
  transIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transIdVal: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  copyPill: {
    fontSize: 10,
    fontWeight: '800',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.primary,
  },
  combVal: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primaryDark,
  },
  sheetFooter: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    gap: 8,
  },
  claimBtn: {
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
  claimBtnIcon: {
    fontSize: 18,
  },
  claimBtnText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  alreadyClaimedBanner: {
    backgroundColor: COLORS.successLight,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  alreadyClaimedText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '900',
  },
  voidBanner: {
    backgroundColor: COLORS.dangerLight,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  voidText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '900',
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
});
