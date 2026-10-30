import apiClient from './api';
import { APP_CONFIG } from '../constants/config';
import {
  cleanTransId,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
  formatVercelTransId,
  formatClaimDate,
  formatDate,
  parseScannedQr,
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
 * Helper to extract supervisor from any ticket/receipt object
 */
const extractSupervisorFromObject = (...objects) => {
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const val =
      obj.supervisor ||
      obj.supervisor_username ||
      obj.supervisorUsername ||
      obj.supervisor_name ||
      obj.supervisorName ||
      obj.spvr ||
      obj.spvr_username ||
      obj.spvrUsername ||
      obj.spvr_name ||
      obj.spvrName ||
      obj.supervisor_account ||
      obj.teller_supervisor;
    if (val && String(val).trim()) {
      return String(val).trim();
    }
  }
  return null;
};

/**
 * Helper to extract username from any ticket/receipt object
 */
const extractUsernameFromObject = (...objects) => {
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const val =
      obj.username ||
      obj.user_name ||
      obj.userName ||
      obj.teller_username ||
      obj.created_by_username;
    if (val && String(val).trim()) {
      return String(val).trim();
    }
  }
  return null;
};

/**
 * Claim Service for STL Mandaue Operations
 */
export const claimService = {
  /**
   * Look up a ticket by its transaction ID, scanned QR code value, or QR hash token
   * Queries GET /api/accountant/claim/{id} and matches against /api/accountant/UnclaimedReceipts
   * Supports modern QR payload {"qr_hash_token": "...", "qr_legacy": 0} and legacy tickets
   */
  async lookupTicket(rawTransId) {
    if (!rawTransId) {
      throw new Error('Transaction ID or QR Hash Token is required.');
    }

    const qrData =
      typeof rawTransId === 'object' && rawTransId !== null && (rawTransId.qrHashToken || rawTransId.qr_hash_token)
        ? {
            qrHashToken: rawTransId.qrHashToken || rawTransId.qr_hash_token,
            qrLegacy: rawTransId.qrLegacy !== undefined ? rawTransId.qrLegacy : rawTransId.qr_legacy,
            transactionId: rawTransId.transactionId || rawTransId.transId,
            agentId: rawTransId.agentId || rawTransId.agent,
            isModernQr: Boolean(rawTransId.qrHashToken || rawTransId.qr_hash_token),
          }
        : parseScannedQr(rawTransId);

    const targetQrHash = qrData.qrHashToken;
    const targetQrLegacy = qrData.qrLegacy;

    // Determine initial lookup ID: explicit transaction ID or fallback to qr_hash_token
    let transId = qrData.transactionId;
    if (!transId && targetQrHash) {
      transId = targetQrHash;
    }
    if (!transId) {
      transId = cleanTransId(rawTransId);
    }
    if (!transId) {
      throw new Error('Transaction ID or QR Hash Token is required.');
    }

    const agentId = qrData.agentId || extractAgentFromTransId(transId);
    const isVercel = isVercelTicket(transId);
    const baseTransId = targetQrHash && !qrData.transactionId ? null : getBaseTransId(transId);

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
            // If scanning with a hash token, don't crash yet; let receipt match run
            if (!targetQrHash) {
              throw directErr;
            }
          }
        } else if (!targetQrHash) {
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

      // 2. Fetch receipts to resolve Supervisor Username, Outlet Metadata, and QR Hash Token matches
      const getDateFromTransId = (tId) => {
        if (!tId) return null;
        const m = String(tId).match(/^(\d{2})(\d{2})(\d{2})/);
        if (m) {
          return `20${m[3]}-${m[1]}-${m[2]}`;
        }
        return null;
      };

      const ticketDate =
        getDateFromTransId(transId) ||
        getDateFromTransId(baseTransId) ||
        (ticketList[0]?.created_at ? ticketList[0].created_at.split(' ')[0] : null) ||
        getFormattedDate(new Date());

      const todayStr = getFormattedDate(new Date());
      const datesToFetch = Array.from(new Set([ticketDate, todayStr]));

      let allReceipts = [];
      try {
        const fetchPromises = [];
        for (const d of datesToFetch) {
          // Normal receipts (unclaimed and claimed)
          fetchPromises.push(
            apiClient
              .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=0&from=${d}&to=${d}`)
              .catch(() => null),
            apiClient
              .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=1&from=${d}&to=${d}`)
              .catch(() => null)
          );

          // If qr_legacy=0 or targetQrHash is present, also query modern QR records
          if (targetQrLegacy === 0 || targetQrHash) {
            fetchPromises.push(
              apiClient
                .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=0&from=${d}&to=${d}&qr_legacy=0`)
                .catch(() => null),
              apiClient
                .get(`${APP_CONFIG.endpoints.unclaimedReceipts}?isClaim=1&from=${d}&to=${d}&qr_legacy=0`)
                .catch(() => null)
            );
          }
        }
        const responses = await Promise.all(fetchPromises);
        for (const res of responses) {
          const list = res?.data?.data?.data || res?.data?.data || res?.data || [];
          if (Array.isArray(list)) {
            allReceipts.push(...list);
          }
        }
      } catch (receiptFetchErr) {
        console.log('Receipts list fetch error (non-fatal):', receiptFetchErr);
      }

      // Check if ticket was found in allReceipts by qr_hash_token or transaction ID
      const cleanedRaw = cleanTransId(rawTransId);
      const matchedReceipt = allReceipts.find((item) => {
        const itemTransId = String(item.transactionId || item.transId || '').trim().toLowerCase();
        const itemQrHash = String(item.qr_hash_token || item.qrHashToken || item.hash_token || item.token || '').trim().toLowerCase();

        // 1. Match by qr_hash_token
        if (targetQrHash && itemQrHash && itemQrHash === targetQrHash.toLowerCase()) {
          return true;
        }

        // 2. Match by transaction ID
        if (transId) {
          if (
            itemTransId === transId.toLowerCase() ||
            (baseTransId && itemTransId === baseTransId.toLowerCase())
          ) {
            return true;
          }
        }

        // 3. Match if item's qr_hash_token matches raw input
        if (itemQrHash) {
          if (cleanedRaw && itemQrHash === cleanedRaw.toLowerCase()) return true;
          if (transId && itemQrHash === transId.toLowerCase()) return true;
        }

        return false;
      });

      const isFromClaimedReceipt = Boolean(matchedReceipt && Number(matchedReceipt.isClaim) === 1);

      // If claimLookup did not return any tickets, but receipt exists in allReceipts (by qr_hash_token or transactionId), reconstruct ticket
      if (!ticketList.length && matchedReceipt) {
        const matchedTransId = matchedReceipt.transactionId || matchedReceipt.transId;
        // Attempt secondary lookup using the matched receipt's actual transactionId if different
        if (matchedTransId && (!targetQrHash || matchedTransId.toLowerCase() !== targetQrHash.toLowerCase())) {
          try {
            const extraRes = await apiClient.get(
              `${APP_CONFIG.endpoints.claimLookup}/${encodeURIComponent(matchedTransId)}`
            );
            if (Array.isArray(extraRes?.data?.data) && extraRes.data.data.length > 0) {
              ticketList = extraRes.data.data;
              payload = extraRes.data;
            }
          } catch {}
        }

        const resolvedAgentId =
          agentId ||
          matchedReceipt.agentId ||
          (matchedReceipt.tellerId ? String(matchedReceipt.tellerId) : null) ||
          extractAgentFromTransId(matchedReceipt.transactionId || matchedReceipt.transId) ||
          null;
        const resolvedIsVercel =
          isVercel ||
          Boolean(resolvedAgentId) ||
          isVercelTicket(matchedReceipt.transactionId || matchedReceipt.transId);

        const realTransId = matchedReceipt.transactionId || matchedReceipt.transId || transId;
        const base = getBaseTransId(realTransId);
        const resolvedSupervisor = extractSupervisorFromObject(matchedReceipt);
        const resolvedUsername = extractUsernameFromObject(matchedReceipt) || resolvedSupervisor;

        const rawReceiptClaimDate =
          matchedReceipt.claimDate ||
          matchedReceipt.claim_date ||
          matchedReceipt.claimedDate ||
          matchedReceipt.claimed_date ||
          (isFromClaimedReceipt ? (matchedReceipt.updated_at || new Date().toISOString()) : null);

        const resolvedQrHash =
          matchedReceipt.qr_hash_token ||
          matchedReceipt.qrHashToken ||
          targetQrHash ||
          null;

        const resolvedQrLegacy =
          matchedReceipt.qr_legacy !== undefined
            ? Number(matchedReceipt.qr_legacy)
            : targetQrLegacy !== null
            ? targetQrLegacy
            : 0;

        return {
          found: true,
          transactionId: base,
          scannedTransactionId: transId,
          baseTransactionId: base,
          activeLookupId: realTransId,
          qr_hash_token: resolvedQrHash,
          qr_legacy: resolvedQrLegacy,
          agentId: resolvedAgentId,
          isVercel: resolvedIsVercel,
          primaryTicket: matchedReceipt,
          allCombinations: ticketList.length ? ticketList : [matchedReceipt],
          totalWinAmount: parseFloat(matchedReceipt.winAmount || matchedReceipt.win_amount || 0),
          totalBetAmount: parseFloat(matchedReceipt.betAmount || matchedReceipt.amount || 0),
          isClaimed: isFromClaimedReceipt || Number(matchedReceipt.isClaim) === 1 || Number(matchedReceipt.is_claim) === 1,
          isVoid: Number(matchedReceipt.isVoid) === 1 || Number(matchedReceipt.is_void) === 1,
          drawTime: matchedReceipt.drawTime || matchedReceipt.draw_time,
          drawDate: formatDate(matchedReceipt.drawDate || matchedReceipt.draw_date || matchedReceipt.created_at),
          fullName: matchedReceipt.fullName || matchedReceipt.outlet || (resolvedAgentId ? `Agent POS #${resolvedAgentId}` : 'N/A'),
          username: resolvedUsername,
          supervisor: resolvedSupervisor || resolvedUsername,
          betNo: matchedReceipt.betNo || matchedReceipt.bet_no,
          betCode: matchedReceipt.betCode || matchedReceipt.bet_code,
          rambolito: matchedReceipt.rambolito,
          claimDate: rawReceiptClaimDate ? formatClaimDate(rawReceiptClaimDate) : null,
          message: isFromClaimedReceipt ? 'Ticket located (Already Claimed).' : 'Ticket located successfully.',
        };
      }

      if (!ticketList.length) {
        return {
          found: false,
          transactionId: baseTransId || transId,
          baseTransactionId: baseTransId,
          qr_hash_token: targetQrHash || null,
          qr_legacy: targetQrLegacy !== null ? targetQrLegacy : (targetQrHash ? 0 : null),
          agentId: agentId || null,
          isVercel: isVercel,
          message: 'No active winning bet ticket found for this Transaction ID / QR Hash Token.',
          tickets: [],
        };
      }

      // Primary ticket fields from claim endpoint
      const primaryTicket = ticketList[0];
      const totalWinAmount = ticketList.reduce((sum, item) => sum + parseFloat(item.winAmount || 0), 0);
      const totalBetAmount = ticketList.reduce((sum, item) => sum + parseFloat(item.betAmount || item.amount || 0), 0);

      const isAlreadyClaimed =
        isFromClaimedReceipt ||
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

      // Resolve Supervisor / Username / Agent
      const resolvedAgentId =
        agentId ||
        primaryTicket.agentId ||
        matchedReceipt?.agentId ||
        (matchedReceipt?.tellerId ? String(matchedReceipt.tellerId) : null) ||
        extractAgentFromTransId(primaryTicket.transactionId) ||
        null;
      const resolvedIsVercel =
        isVercel ||
        Boolean(resolvedAgentId) ||
        isVercelTicket(primaryTicket.transactionId) ||
        Boolean(primaryTicket.isVercel);

      const tellerInfo =
        matchedReceipt ||
        allReceipts.find(
          (item) =>
            primaryTicket.fullName &&
            String(item.fullName || item.outlet || '').toLowerCase().trim() === String(primaryTicket.fullName).toLowerCase().trim()
        );

      let resolvedSupervisor = extractSupervisorFromObject(
        primaryTicket,
        payload,
        payload?.data,
        payload?.ticket,
        matchedReceipt,
        tellerInfo
      );
      let resolvedUsername =
        extractUsernameFromObject(
          primaryTicket,
          payload,
          payload?.data,
          payload?.ticket,
          matchedReceipt,
          tellerInfo
        ) || resolvedSupervisor;

      const rawClaimDate =
        primaryTicket.claimDate ||
        primaryTicket.claim_date ||
        primaryTicket.claimedDate ||
        primaryTicket.claimed_date ||
        matchedReceipt?.claimDate ||
        matchedReceipt?.claim_date ||
        matchedReceipt?.claimedDate ||
        matchedReceipt?.claimed_date ||
        (isAlreadyClaimed ? (matchedReceipt?.updated_at || new Date().toISOString()) : null);

      const resolvedClaimDate = rawClaimDate ? formatClaimDate(rawClaimDate) : null;

      const realTransId = primaryTicket.transactionId || matchedReceipt?.transactionId || transId;
      const base = getBaseTransId(realTransId);

      const resolvedQrHash =
        primaryTicket.qr_hash_token ||
        primaryTicket.qrHashToken ||
        matchedReceipt?.qr_hash_token ||
        matchedReceipt?.qrHashToken ||
        targetQrHash ||
        null;

      const resolvedQrLegacy =
        primaryTicket.qr_legacy !== undefined
          ? Number(primaryTicket.qr_legacy)
          : matchedReceipt?.qr_legacy !== undefined
          ? Number(matchedReceipt.qr_legacy)
          : targetQrLegacy !== null
          ? targetQrLegacy
          : 0;

      return {
        found: true,
        transactionId: base,
        scannedTransactionId: transId,
        baseTransactionId: base,
        activeLookupId,
        qr_hash_token: resolvedQrHash,
        qr_legacy: resolvedQrLegacy,
        agentId: resolvedAgentId,
        isVercel: resolvedIsVercel,
        primaryTicket,
        allCombinations: ticketList,
        totalWinAmount,
        totalBetAmount,
        isClaimed: isAlreadyClaimed,
        isVoid: isVoided,
        drawTime: primaryTicket.drawTime,
        drawDate: formatDate(primaryTicket.drawDate || primaryTicket.created_at),
        fullName: primaryTicket.fullName || matchedReceipt?.fullName || matchedReceipt?.outlet || (resolvedAgentId ? `Agent POS #${resolvedAgentId}` : 'N/A'),
        username: resolvedUsername,
        supervisor: resolvedSupervisor || resolvedUsername,
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
    const formattedClaimDate = formatClaimDate(new Date());

    try {
      let response;
      let executedId = transId;

      const claimPayload = {
        isClaim: 1,
        claimDate: formattedClaimDate,
        claim_date: formattedClaimDate,
        claimedDate: formattedClaimDate,
        claimed_date: formattedClaimDate,
      };

      try {
        response = await apiClient.put(
          `${APP_CONFIG.endpoints.claimExecute}/${encodeURIComponent(transId)}`,
          claimPayload
        );
      } catch (putErr) {
        if (baseTransId && baseTransId !== transId) {
          response = await apiClient.put(
            `${APP_CONFIG.endpoints.claimExecute}/${encodeURIComponent(baseTransId)}`,
            claimPayload
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
        timestamp: formattedClaimDate,
        claimDate: formattedClaimDate,
        raw: response.data,
      };
    } catch (error) {
      console.error('executeClaim error:', error);
      throw error;
    }
  },

  /**
   * Fetch unclaimed receipts directly from endpoint
   * GET /api/accountant/UnclaimedReceipts?isClaim={0|1}&from={date}&to={date}&qr_legacy={0|1}
   */
  async fetchUnclaimedReceipts({ isClaim = 0, from, to, qr_legacy } = {}) {
    try {
      const params = new URLSearchParams();
      params.append('isClaim', String(isClaim));
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      if (qr_legacy !== undefined && qr_legacy !== null) {
        params.append('qr_legacy', String(qr_legacy));
      }

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
