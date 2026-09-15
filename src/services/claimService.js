import apiClient from './api';
import { APP_CONFIG } from '../constants/config';
import {
  cleanTransId,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
} from '../utils/formatters';

/**
 * Helper to get a date string YYYY-MM-DD
 */
const getFormattedDate = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Claim Service for STL Mandaue Operations
 */
export const claimService = {
  /**
   * Look up a ticket by its transaction ID or scanned QR code value
   * Queries GET /api/accountant/claim/{id} and enriches with supervisor/agent metadata
   */
  async lookupTicket(rawTransId) {
    const transId = cleanTransId(rawTransId);
    if (!transId) {
      throw new Error('Transaction ID is required.');
    }

    const agentId = extractAgentFromTransId(transId);
    const isVercel = isVercelTicket(transId);
    const baseTransId = getBaseTransId(transId);

    try {
      // 1. Fetch Primary Ticket Bet Data from Claim Endpoint
      let response = null;
      let ticketList = [];
      let payload = null;
      let activeLookupId = transId;

      try {
        response = await apiClient.get(
          `${APP_CONFIG.endpoints.claimLookup}/${encodeURIComponent(transId)}`
        );
        payload = response.data;
        if (Array.isArray(payload?.data)) {
          ticketList = payload.data;
        } else if (payload?.data && typeof payload.data === 'object') {
          ticketList = [payload.data];
        }
      } catch (directErr) {
        // If direct lookup fails on a Vercel ticket, attempt fallback with base transaction ID
        if (baseTransId && baseTransId !== transId) {
          try {
            response = await apiClient.get(
              `${APP_CONFIG.endpoints.claimLookup}/${encodeURIComponent(baseTransId)}`
            );
            payload = response.data;
            if (Array.isArray(payload?.data)) {
              ticketList = payload.data;
              activeLookupId = baseTransId;
            } else if (payload?.data && typeof payload.data === 'object') {
              ticketList = [payload.data];
              activeLookupId = baseTransId;
            }
          } catch (fallbackErr) {
            // Re-throw original error if fallback also fails
            throw directErr;
          }
        } else {
          throw directErr;
        }
      }

      // If lookup returned 200 but empty data and we have a base ID, try fallback
      if (!ticketList.length && baseTransId && baseTransId !== transId) {
        try {
          const fallbackRes = await apiClient.get(
            `${APP_CONFIG.endpoints.claimLookup}/${encodeURIComponent(baseTransId)}`
          );
          const fallbackPayload = fallbackRes.data;
          if (Array.isArray(fallbackPayload?.data) && fallbackPayload.data.length > 0) {
            ticketList = fallbackPayload.data;
            payload = fallbackPayload;
            activeLookupId = baseTransId;
          }
        } catch {
          // ignore fallback error and report not found below
        }
      }

      // 2. Fetch receipts from unclaimedReceipts (both isClaim=0 and isClaim=1) for date window
      const today = new Date();
      const past60Days = new Date();
      past60Days.setDate(today.getDate() - 60);
      const fromDateStr = getFormattedDate(past60Days);
      const toDateStr = getFormattedDate(today);

      let unclaimedList = [];
      let claimedList = [];

      try {
        const [unclaimedRes, claimedRes] = await Promise.all([
          apiClient
            .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=0&from=${fromDateStr}&to=${toDateStr}`)
            .catch(() => null),
          apiClient
            .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=1&from=${fromDateStr}&to=${toDateStr}`)
            .catch(() => null),
        ]);

        unclaimedList = unclaimedRes?.data?.data?.data || unclaimedRes?.data?.data || unclaimedRes?.data || [];
        claimedList = claimedRes?.data?.data?.data || claimedRes?.data?.data || claimedRes?.data || [];
        if (!Array.isArray(unclaimedList)) unclaimedList = [];
        if (!Array.isArray(claimedList)) claimedList = [];
      } catch (receiptFetchErr) {
        console.log('Receipts list fetch error (non-fatal):', receiptFetchErr);
      }

      // Check if ticket was found in claimedList (isClaim=1)
      const matchedClaimedReceipt = claimedList.find((item) => {
        const itemTransId = String(item.transactionId || item.transId || '').trim().toLowerCase();
        return (
          itemTransId === transId.toLowerCase() ||
          (baseTransId && itemTransId === baseTransId.toLowerCase())
        );
      });

      // Check if ticket was found in unclaimedList (isClaim=0)
      const matchedUnclaimedReceipt = unclaimedList.find((item) => {
        const itemTransId = String(item.transactionId || item.transId || '').trim().toLowerCase();
        return (
          itemTransId === transId.toLowerCase() ||
          (baseTransId && itemTransId === baseTransId.toLowerCase())
        );
      });

      // If claimLookup did not return any tickets, but receipt exists in claimedList or unclaimedList, reconstruct ticket
      if (!ticketList.length && (matchedClaimedReceipt || matchedUnclaimedReceipt)) {
        const matchedItem = matchedClaimedReceipt || matchedUnclaimedReceipt;
        const isFromClaimedList = Boolean(matchedClaimedReceipt);

        return {
          found: true,
          transactionId: matchedItem.transactionId || matchedItem.transId || transId,
          scannedTransactionId: transId,
          baseTransactionId: baseTransId,
          activeLookupId: matchedItem.transactionId || baseTransId || transId,
          agentId: agentId || matchedItem.agentId || null,
          isVercel: isVercel || Boolean(agentId),
          primaryTicket: matchedItem,
          allCombinations: [matchedItem],
          totalWinAmount: parseFloat(matchedItem.winAmount || matchedItem.win_amount || 0),
          totalBetAmount: parseFloat(matchedItem.betAmount || matchedItem.amount || 0),
          isClaimed: isFromClaimedList || Number(matchedItem.isClaim) === 1 || Number(matchedItem.is_claim) === 1,
          isVoid: Number(matchedItem.isVoid) === 1 || Number(matchedItem.is_void) === 1,
          drawTime: matchedItem.drawTime || matchedItem.draw_time,
          drawDate: matchedItem.drawDate || matchedItem.draw_date || matchedItem.created_at,
          fullName: matchedItem.fullName || matchedItem.outlet || (agentId ? `Agent POS #${agentId}` : 'N/A'),
          username: matchedItem.username || null,
          supervisor: matchedItem.supervisor || (agentId ? `Agent #${agentId}` : null),
          betNo: matchedItem.betNo || matchedItem.bet_no,
          betCode: matchedItem.betCode || matchedItem.bet_code,
          rambolito: matchedItem.rambolito,
          claimDate: matchedItem.claimDate || matchedItem.claim_date || (isFromClaimedList ? (matchedItem.updated_at || new Date().toISOString()) : null),
          message: isFromClaimedList ? 'Ticket located (Already Claimed).' : 'Ticket located successfully.',
        };
      }

      if (!ticketList.length) {
        return {
          found: false,
          transactionId: transId,
          baseTransactionId: baseTransId,
          agentId: agentId || null,
          isVercel: isVercel,
          message: 'No active bet ticket found for this Transaction ID.',
          tickets: [],
        };
      }

      // Primary ticket fields from claim endpoint
      const primaryTicket = ticketList[0];
      const totalWinAmount = ticketList.reduce((sum, item) => sum + parseFloat(item.winAmount || 0), 0);
      const totalBetAmount = ticketList.reduce((sum, item) => sum + parseFloat(item.betAmount || item.amount || 0), 0);
      
      const isAlreadyClaimed =
        Boolean(matchedClaimedReceipt) ||
        ticketList.some(
          (item) =>
            Number(item.isClaim) === 1 ||
            Number(item.is_claim) === 1 ||
            item.isClaim === '1' ||
            item.isClaim === true ||
            item.is_claim === true ||
            (item.claimDate !== null && item.claimDate !== undefined && item.claimDate !== '') ||
            (item.claim_date !== null && item.claim_date !== undefined && item.claim_date !== '') ||
            String(item.status || '').toUpperCase() === 'CLAIMED'
        );
      
      const isVoided = ticketList.some(
        (item) =>
          Number(item.isVoid) === 1 ||
          Number(item.is_void) === 1 ||
          item.isVoid === '1' ||
          item.isVoid === true ||
          item.is_void === true ||
          (item.voidDate !== null && item.voidDate !== undefined && item.voidDate !== '') ||
          String(item.status || '').toUpperCase() === 'VOIDED'
      );

      // Resolve Supervisor / Username
      let resolvedUsername = primaryTicket.username || matchedClaimedReceipt?.username || matchedUnclaimedReceipt?.username || null;
      let resolvedSupervisor = primaryTicket.supervisor || matchedClaimedReceipt?.supervisor || matchedUnclaimedReceipt?.supervisor || (agentId ? `Agent #${agentId}` : null);

      const resolvedClaimDate =
        primaryTicket.claimDate ||
        primaryTicket.claim_date ||
        matchedClaimedReceipt?.claimDate ||
        matchedClaimedReceipt?.claim_date ||
        (isAlreadyClaimed ? (matchedClaimedReceipt?.updated_at || new Date().toISOString()) : null);

      return {
        found: true,
        transactionId: primaryTicket.transactionId || transId,
        scannedTransactionId: transId,
        baseTransactionId: baseTransId,
        activeLookupId,
        agentId: agentId || primaryTicket.agentId || null,
        isVercel: isVercel || Boolean(agentId),
        primaryTicket,
        allCombinations: ticketList,
        totalWinAmount,
        totalBetAmount,
        isClaimed: isAlreadyClaimed,
        isVoid: isVoided,
        drawTime: primaryTicket.drawTime,
        drawDate: primaryTicket.drawDate || primaryTicket.created_at,
        fullName: primaryTicket.fullName || primaryTicket.outlet || (agentId ? `Agent POS #${agentId}` : 'N/A'),
        username: resolvedUsername,
        supervisor: resolvedSupervisor,
        betNo: primaryTicket.betNo,
        betCode: primaryTicket.betCode,
        rambolito: primaryTicket.rambolito,
        claimDate: resolvedClaimDate,
        message: payload?.message || (isAlreadyClaimed ? 'Ticket located (Already Claimed).' : 'Ticket located successfully.'),
      };
    } catch (error) {
      console.error('lookupTicket error:', error);
      throw error;
    }
  },

  /**
   * Execute Claim Payout on central server
   * PUT /api/accountant/claim/{transactionId}
   */
  async executeClaim(rawTransId) {
    const transId = cleanTransId(rawTransId);
    if (!transId) {
      throw new Error('Transaction ID is required to execute claim.');
    }

    const baseTransId = getBaseTransId(transId);

    try {
      let response;
      let executedId = transId;

      try {
        response = await apiClient.put(
          `${APP_CONFIG.endpoints.claimExecute}/${encodeURIComponent(transId)}`,
          { isClaim: 1 }
        );
      } catch (putErr) {
        if (baseTransId && baseTransId !== transId) {
          response = await apiClient.put(
            `${APP_CONFIG.endpoints.claimExecute}/${encodeURIComponent(baseTransId)}`,
            { isClaim: 1 }
          );
          executedId = baseTransId;
        } else {
          throw putErr;
        }
      }

      return {
        success: true,
        transactionId: executedId,
        scannedTransactionId: transId,
        message: response.data?.message || 'Bet successfully claimed and recorded.',
        timestamp: new Date().toISOString(),
        raw: response.data,
      };
    } catch (error) {
      console.error('executeClaim error:', error);
      throw error;
    }
  },

  /**
   * Fetch unclaimed receipts directly from endpoint
   * GET /api/accountant/UnclaimedReceipts?isClaim={0|1}&from={date}&to={date}
   */
  async fetchUnclaimedReceipts({ isClaim = 0, from, to } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('isClaim', String(isClaim));
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const queryString = params.toString();
      const url = `${APP_CONFIG.endpoints.unclaimedReceipts}?${queryString}`;
      const response = await apiClient.get(url);
      const list = response.data?.data?.data || response.data?.data || response.data || [];
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.warn('fetchUnclaimedReceipts error:', error.message);
      throw error;
    }
  },

  /**
   * Fetch today's unclaimed tickets summary
   */
  async fetchUnclaimedSummary(dateStr) {
    try {
      const targetDate = dateStr || getFormattedDate(new Date());
      const response = await apiClient.get(
        `${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=0&from=${targetDate}&to=${targetDate}`
      );
      const list = response.data?.data?.data || response.data?.data || [];
      const arrayList = Array.isArray(list) ? list : [];

      const count = arrayList.length;
      const totalLiability = arrayList.reduce((sum, item) => sum + parseFloat(item.winAmount || 0), 0);
      const totalBetVolume = arrayList.reduce((sum, item) => sum + parseFloat(item.betAmount || item.amount || 0), 0);

      return {
        count,
        totalLiability,
        totalBetVolume,
        date: targetDate,
        tickets: arrayList,
      };
    } catch (error) {
      console.warn('fetchUnclaimedSummary error:', error.message);
      return { count: 0, totalLiability: 0, totalBetVolume: 0, date: dateStr, tickets: [] };
    }
  }
};

