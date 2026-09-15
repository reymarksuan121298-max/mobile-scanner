/**
 * Currency Formatter for Philippine Peso (PHP)
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount || 0);
  if (isNaN(num)) return '₱0.00';
  return '₱' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format Draw Time & Date
 * Converts 24h/hour integers ('14', '21') to '2PM', '9PM' and pairs with date
 */
export const formatDrawTime = (timeStr, drawDate) => {
  if (!timeStr && !drawDate) return 'N/A';
  let rawTime = String(timeStr || '').trim();

  if (/^\d{1,2}$/.test(rawTime)) {
    const hourNum = parseInt(rawTime, 10);
    if (hourNum === 0) rawTime = '12AM';
    else if (hourNum === 12) rawTime = '12PM';
    else if (hourNum > 12) rawTime = `${hourNum - 12}PM`;
    else rawTime = `${hourNum}AM`;
  } else if (rawTime.includes('T') || rawTime.includes(' ')) {
    const parts = rawTime.split(/[\sT]/);
    if (parts.length > 1) {
      const timePart = parts[1].split(':');
      if (timePart.length > 0) {
        const hourNum = parseInt(timePart[0], 10);
        if (!isNaN(hourNum)) {
          if (hourNum === 0) rawTime = '12AM';
          else if (hourNum === 12) rawTime = '12PM';
          else if (hourNum > 12) rawTime = `${hourNum - 12}PM`;
          else rawTime = `${hourNum}AM`;
        }
      }
    }
  }

  const dateStr = formatDate(drawDate || timeStr);
  return dateStr ? `${rawTime} (${dateStr})`.trim() : rawTime || 'N/A';
};

/**
 * Format standard Date YYYY-MM-DD to readable format
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return null;
  try {
    if (typeof dateVal === 'string' && dateVal.includes('-')) {
      const parts = dateVal.split('T')[0].split(' ')[0].split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
      return dateVal.split('T')[0].split(' ')[0];
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    return String(dateVal);
  }
  return String(dateVal);
};

/**
 * Clean & Normalize Scanned Transaction ID / QR Code Value
 * Supports physical tickets, URLs, JSON payloads, and VERCEL agent IDs (e.g., 022226-UOOKNZNNVERCEL227)
 */
export const cleanTransId = (rawInput) => {
  if (!rawInput) return '';
  let str = String(rawInput).trim();

  // 1. Try parsing JSON if QR contains a JSON object
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      const possibleKey =
        parsed.transactionId ||
        parsed.transId ||
        parsed.trans_id ||
        parsed.id ||
        parsed.code ||
        parsed.ticketId;
      if (possibleKey) {
        str = String(possibleKey).trim();
      }
    } catch {
      // Ignore JSON error, continue with string extraction
    }
  }

  // 2. Handle URL query parameters if present (e.g. ?id=..., ?transId=...)
  if (str.includes('?')) {
    const queryPart = str.split('?')[1];
    if (queryPart) {
      const params = queryPart.split('&');
      for (const param of params) {
        const [k, v] = param.split('=');
        if (['id', 'transid', 'transactionid', 'code', 'ticket', 't'].includes((k || '').toLowerCase()) && v) {
          str = decodeURIComponent(v);
          break;
        }
      }
    }
  }

  // 3. If still a URL or path, extract the last segment
  if (str.includes('/')) {
    const segments = str.split('/').filter(Boolean);
    if (segments.length > 0) {
      str = segments[segments.length - 1].split('?')[0];
    }
  }

  // 4. Extract standard transaction ID pattern (e.g., 022226-UOOKNZNNVERCEL227 or 081626-OIAC4DXG)
  const patternMatch = str.match(/(\d{6}-[A-Za-z0-9]+)/);
  if (patternMatch) {
    str = patternMatch[1];
  }

  // Strip quotes and extra symbols, return uppercase
  return str.replace(/['"`]/g, '').trim().toUpperCase();
};

/**
 * Extract Agent ID number from VERCEL transaction ID or other formats
 * e.g., '022226-UOOKNZNNVERCEL227' -> '227'
 */
export const extractAgentFromTransId = (transId) => {
  if (!transId) return null;
  const str = String(transId).trim().toUpperCase();

  // Match VERCEL followed by digits (e.g., VERCEL227 -> 227)
  const vercelMatch = str.match(/VERCEL(\d+)/i);
  if (vercelMatch && vercelMatch[1]) {
    return vercelMatch[1];
  }

  // Match AGENT followed by digits (e.g., AGENT227 -> 227)
  const agentMatch = str.match(/AGENT(\d+)/i);
  if (agentMatch && agentMatch[1]) {
    return agentMatch[1];
  }

  return null;
};

/**
 * Check if the transaction ID belongs to a physical VERCEL ticket
 */
export const isVercelTicket = (transId) => {
  if (!transId) return false;
  return /VERCEL/i.test(String(transId));
};

/**
 * Get base transaction ID without the VERCEL/Agent suffix
 * e.g., '022226-UOOKNZNNVERCEL227' -> '022226-UOOKNZNN'
 */
export const getBaseTransId = (transId) => {
  if (!transId) return '';
  const cleaned = cleanTransId(transId);
  return cleaned.replace(/VERCEL\d*/i, '');
};

/**
 * Get Bet Code Description (Target vs Rambolito)
 */
export const getBetTypeLabel = (betCode, rambolito) => {
  if (betCode) return betCode.toUpperCase();
  return rambolito ? 'RAMBOLITO (RS3)' : 'TARGET (TS3)';
};
