import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/theme';
import { useApp } from '../context/AppContext';
import {
  formatCurrency,
  formatDrawTime,
  formatDate,
  extractAgentFromTransId,
  isVercelTicket,
} from '../utils/formatters';

export default function HistoryScreen({ navigation }) {
  const { claimHistory, clearAllHistory, setActiveTicket } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, CLAIMED, UNCLAIMED

  const filteredList = useMemo(() => {
    return claimHistory.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const itemAgentId = item.agentId || extractAgentFromTransId(item.transactionId);
      const isVercel = item.isVercel || isVercelTicket(item.transactionId);
      
      const matchQuery =
        !q ||
        (item.transactionId || '').toLowerCase().includes(q) ||
        (item.fullName || '').toLowerCase().includes(q) ||
        (item.username || '').toLowerCase().includes(q) ||
        (item.betNo || '').toLowerCase().includes(q) ||
        (itemAgentId && String(itemAgentId).toLowerCase().includes(q)) ||
        (isVercel && ('vercel'.includes(q) || 'physical'.includes(q) || `agent #${itemAgentId}`.toLowerCase().includes(q)));

      if (!matchQuery) return false;
      if (filterStatus === 'CLAIMED') return item.status === 'CLAIMED';
      if (filterStatus === 'UNCLAIMED') return item.status === 'UNCLAIMED';
      return true;
    });
  }, [claimHistory, searchTerm, filterStatus]);

  const summary = useMemo(() => {
    const totalCount = filteredList.length;
    const totalClaimedAmt = filteredList
      .filter(i => i.status === 'CLAIMED')
      .reduce((sum, i) => sum + parseFloat(i.winAmount || 0), 0);
    return { totalCount, totalClaimedAmt };
  }, [filteredList]);

  const handleClear = () => {
    Alert.alert(
      'Clear Scan History',
      'Are you sure you want to erase the local device scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAllHistory },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const isClaimed = item.status === 'CLAIMED';
    const itemAgentId = item.agentId || extractAgentFromTransId(item.transactionId);
    const itemIsVercel = item.isVercel || isVercelTicket(item.transactionId);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setActiveTicket({
            transactionId: item.transactionId,
            totalWinAmount: item.winAmount,
            betNo: item.betNo,
            betCode: item.betCode,
            fullName: item.fullName,
            username: item.username,
            drawTime: item.drawTime,
            drawDate: item.drawDate,
            agentId: itemAgentId,
            isVercel: itemIsVercel,
            isClaimed,
            isVoid: item.status === 'VOIDED',
          });
          navigation.navigate('TicketDetails');
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isClaimed ? COLORS.success : COLORS.warning },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isClaimed ? COLORS.success : COLORS.warning },
              ]}
            >
              {item.status}
            </Text>

            {itemIsVercel && (
              <View style={styles.historyVercelPill}>
                <Text style={styles.historyVercelText}>
                  {itemAgentId ? `VERCEL #${itemAgentId}` : 'VERCEL'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.timestampText}>
            {formatDate(item.timestamp) || 'Recent'}
          </Text>
        </View>

        <Text style={styles.transIdText}>{item.transactionId}</Text>

        <View style={styles.cardDetails}>
          <Text style={styles.detailText}>
            Outlet: <Text style={styles.detailBold}>{item.fullName || (itemAgentId ? `Agent #${itemAgentId}` : 'N/A')}</Text>
          </Text>
          <Text style={styles.detailText}>
            Comb: <Text style={styles.detailBold}>{item.betNo || 'N/A'} ({item.betCode || 'RS3'})</Text>
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.drawText}>
            {formatDrawTime(item.drawTime, item.drawDate)}
          </Text>
          <Text style={styles.winAmountText}>
            {formatCurrency(item.winAmount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCAN AUDIT HISTORY</Text>
        {claimHistory.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtnText}>CLEAR</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.kpiStrip}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>TOTAL SCANS</Text>
          <Text style={styles.kpiValue}>{summary.totalCount}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>CLAIMED DISBURSEMENT</Text>
          <Text style={styles.kpiValueGold}>{formatCurrency(summary.totalClaimedAmt)}</Text>
        </View>
      </View>

      {/* Search & Filter Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search Transaction ID or Outlet..."
          placeholderTextColor={COLORS.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <View style={styles.filterTabs}>
          {['ALL', 'CLAIMED', 'UNCLAIMED'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                filterStatus === tab && styles.tabBtnActive,
              ]}
              onPress={() => setFilterStatus(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  filterStatus === tab && styles.tabBtnTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredList}
        keyExtractor={item => item.id || item.transactionId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>No scan records found</Text>
            <Text style={styles.emptySubtitle}>
              Scanned tickets and payout claim transactions will appear here.
            </Text>
          </View>
        }
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
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  clearBtnText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  kpiStrip: {
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  kpiBox: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  kpiValueGold: {
    color: COLORS.accent,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 8,
  },
  searchInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: COLORS.accent,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  historyVercelPill: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: '#6366F1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  historyVercelText: {
    color: '#6366F1',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  timestampText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  transIdText: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: COLORS.primary,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  detailBold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
    marginTop: 2,
  },
  drawText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  winAmountText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.success,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
