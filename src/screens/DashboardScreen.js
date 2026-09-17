import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { claimService } from '../services/claimService';
import { formatCurrency, formatDrawTime, formatDate, formatClaimDate } from '../utils/formatters';
import { useApp } from '../context/AppContext';

export default function DashboardScreen({ navigation }) {
  const { setActiveTicket } = useApp();
  const [metrics, setMetrics] = useState({
    count: 0,
    totalLiability: 0,
    totalBetVolume: 0,
    tickets: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await claimService.fetchUnclaimedSummary(today);
      setMetrics(data);
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTicketClick = (ticket) => {
    setActiveTicket({
      transactionId: ticket.transactionId,
      totalWinAmount: ticket.winAmount,
      totalBetAmount: ticket.betAmount,
      betNo: ticket.betNo,
      betCode: ticket.betCode,
      rambolito: ticket.rambolito,
      fullName: ticket.fullName || ticket.outlet,
      username: ticket.username,
      drawTime: ticket.drawTime,
      drawDate: formatDate(ticket.drawDate || ticket.draw_date || ticket.created_at),
      claimDate: formatClaimDate(ticket.claimDate || ticket.claim_date || ticket.claimedDate || ticket.claimed_date),
      isClaimed: Number(ticket.isClaim) === 1,
      isVoid: Number(ticket.isVoid) === 1,
    });
    navigation.navigate('TicketDetails');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrandContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.headerLogo}
            resizeMode="cover"
          />
          <View>
            <Text style={styles.headerTitle}>OPERATIONS DASHBOARD</Text>
            <Text style={styles.headerSubtitle}>MANDAUE STL CENTRAL REGISTRY</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={fetchDashboardData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Text style={styles.refreshBtnText}>🔄 SYNC</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchDashboardData} colors={[COLORS.accent]} />
        }
      >
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.cardNavy]}>
            <Text style={styles.kpiCardLabel}>UNCLAIMED TICKETS</Text>
            <Text style={styles.kpiCardValue}>{metrics.count}</Text>
            <Text style={styles.kpiCardHint}>Pending in Central API</Text>
          </View>

          <View style={[styles.kpiCard, styles.cardGold]}>
            <Text style={styles.kpiCardLabel}>TOTAL WIN LIABILITY</Text>
            <Text style={styles.kpiCardValueEmerald}>
              {formatCurrency(metrics.totalLiability)}
            </Text>
            <Text style={styles.kpiCardHint}>Payable winning liability</Text>
          </View>
        </View>

        {/* Quick Launch QR Scanner Banner */}
        <TouchableOpacity
          style={styles.scannerBanner}
          onPress={() => navigation.navigate('Scanner')}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerIcon}>📷</Text>
            <View>
              <Text style={styles.bannerTitle}>LAUNCH CAMERA SCANNER</Text>
              <Text style={styles.bannerSubtitle}>Point at winning ticket barcode/QR</Text>
            </View>
          </View>
          <Text style={styles.bannerArrow}>→</Text>
        </TouchableOpacity>

        {/* Recent Unclaimed List */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TODAY'S UNCLAIMED TICKETS</Text>
            <Text style={styles.countBadge}>{metrics.tickets.length} ACTIVE</Text>
          </View>

          {metrics.tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {loading ? 'Fetching records...' : 'No unclaimed winning records for today.'}
              </Text>
            </View>
          ) : (
            metrics.tickets.slice(0, 20).map((t, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.ticketRow}
                onPress={() => handleTicketClick(t)}
              >
                <View style={styles.ticketLeft}>
                  <Text style={styles.ticketId}>{t.transactionId}</Text>
                  <Text style={styles.ticketOutlet}>{t.fullName || t.outlet || 'N/A'}</Text>
                  <Text style={styles.ticketDraw}>{formatDrawTime(t.drawTime, t.drawDate)}</Text>
                </View>
                <View style={styles.ticketRight}>
                  <Text style={styles.ticketWinAmount}>{formatCurrency(t.winAmount)}</Text>
                  <Text style={styles.ticketBetComb}>
                    {t.betNo} ({t.betCode || 'RS3'})
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
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
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
  },
  content: {
    padding: 16,
    gap: 14,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiCard: {
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardNavy: {
    backgroundColor: COLORS.primaryDark,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.accent,
  },
  cardGold: {
    backgroundColor: COLORS.surface,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.success,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  kpiCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  kpiCardValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  kpiCardValueEmerald: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.success,
    marginTop: 4,
  },
  kpiCardHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  scannerBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIcon: {
    fontSize: 28,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bannerSubtitle: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  bannerArrow: {
    color: COLORS.accent,
    fontSize: 22,
    fontWeight: '900',
  },
  listSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentDark,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  ticketLeft: {
    gap: 2,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  ticketOutlet: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  ticketDraw: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  ticketRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ticketWinAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.success,
  },
  ticketBetComb: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
