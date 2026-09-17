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
 * Format standard Date to all-numbers format YYYY-MM-DD (e.g. 2026-09-17)
 * Eliminates month names (Sep, Oct, etc.) across the entire app
 */
export const formatDate = (dateVal) => {
  if (!dateVal || dateVal === 'null' || dateVal === 'undefined' || dateVal === 'N/A') return null;
  try {
    const formatted = formatClaimDate(dateVal);
    if (formatted) {
      return formatted.split(' ')[0];
    }
  } catch {
    // fallback
  }
  return String(dateVal);
};

const MONTH_MAP = {
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', sept: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
};

/**
 * Format Claim Date to all-numbers format 'YYYY-MM-DD HH:mm' (e.g. 2026-09-02 13:56)
 * Handles ISO dates, Date objects, timestamps, standard dates, and month-name formats (e.g. Sep-02-26 13:56)
 */
export const formatClaimDate = (dateVal) => {
  if (!dateVal || dateVal === 'null' || dateVal === 'undefined') return '';
  try {
    if (dateVal instanceof Date) {
      if (isNaN(dateVal.getTime())) return '';
      const year = dateVal.getFullYear();
      const month = String(dateVal.getMonth() + 1).padStart(2, '0');
      const day = String(dateVal.getDate()).padStart(2, '0');
      const hours = String(dateVal.getHours()).padStart(2, '0');
      const minutes = String(dateVal.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    if (typeof dateVal === 'number') {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'N/A') return '';

      // 1. Exact match: YYYY-MM-DD HH:mm
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
      }

      // 2. Exact match: YYYY-MM-DD HH:mm:ss
      const ymdhmsMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
      if (ymdhmsMatch) {
        return `${ymdhmsMatch[1]}-${ymdhmsMatch[2]}-${ymdhmsMatch[3]} ${ymdhmsMatch[4]}:${ymdhmsMatch[5]}`;
      }

      // 3. Month Name First: e.g., 'Sep-02-26 13:56', 'Sep-04-26 14:44', 'Sep 02, 2026 13:56', 'September 2, 2026 1:56 PM'
      const monthFirstMatch = trimmed.match(/^([A-Za-z]+)[-\s/]+(\d{1,2})[-\s/,]+(\d{2,4})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::\d{1,2})?(?:\s*(AM|PM))?)?/i);
      if (monthFirstMatch) {
        const monthKey = monthFirstMatch[1].toLowerCase();
        const monthNum = MONTH_MAP[monthKey];
        if (monthNum) {
          const dayNum = monthFirstMatch[2].padStart(2, '0');
          let rawYear = monthFirstMatch[3];
          if (rawYear.length === 2) {
            rawYear = `20${rawYear}`;
          }
          let hourStr = monthFirstMatch[4] || '00';
          let minStr = monthFirstMatch[5] || '00';
          const ampm = monthFirstMatch[6];

          if (ampm) {
            let h = parseInt(hourStr, 10);
            if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
            if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
            hourStr = String(h);
          }

          return `${rawYear}-${monthNum}-${dayNum} ${hourStr.padStart(2, '0')}:${minStr.padStart(2, '0')}`;
        }
      }

      // 4. Day First with Month Name: e.g., '02-Sep-26 13:56', '02-Sep-2026 13:56', '2 September 2026 13:56'
      const dayFirstMatch = trimmed.match(/^(\d{1,2})[-\s/]+([A-Za-z]+)[-\s/,]+(\d{2,4})(?:[T\s]+(\d{1,2}):(\d{1,2})(?::\d{1,2})?(?:\s*(AM|PM))?)?/i);
      if (dayFirstMatch) {
        const monthKey = dayFirstMatch[2].toLowerCase();
        const monthNum = MONTH_MAP[monthKey];
        if (monthNum) {
          const dayNum = dayFirstMatch[1].padStart(2, '0');
          let rawYear = dayFirstMatch[3];
          if (rawYear.length === 2) {
            rawYear = `20${rawYear}`;
          }
          let hourStr = dayFirstMatch[4] || '00';
          let minStr = dayFirstMatch[5] || '00';
          const ampm = dayFirstMatch[6];

          if (ampm) {
            let h = parseInt(hourStr, 10);
            if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
            if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
            hourStr = String(h);
          }

          return `${rawYear}-${monthNum}-${dayNum} ${hourStr.padStart(2, '0')}:${minStr.padStart(2, '0')}`;
        }
      }

      // 5. Slash/Hyphen numeric: e.g., '2026/09/01 17:38', '2026-9-1 17:38'
      const slashYMD = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{1,2}))?/);
      if (slashYMD) {
        const y = slashYMD[1];
        const m = slashYMD[2].padStart(2, '0');
        const d = slashYMD[3].padStart(2, '0');
        const h = (slashYMD[4] || '00').padStart(2, '0');
        const min = (slashYMD[5] || '00').padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${min}`;
      }

      // 6. Generic Date fallback
      const normalizedStr = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
      const parsed = new Date(normalizedStr);
      if (!isNaN(parsed.getTime())) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        const hours = String(parsed.getHours()).padStart(2, '0');
        const minutes = String(parsed.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }

      const parsedDirect = new Date(trimmed);
      if (!isNaN(parsedDirect.getTime())) {
        const year = parsedDirect.getFullYear();
        const month = String(parsedDirect.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDirect.getDate()).padStart(2, '0');
        const hours = String(parsedDirect.getHours()).padStart(2, '0');
        const minutes = String(parsedDirect.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
      }
    }

    return String(dateVal || '');
  } catch {
    return String(dateVal || '');
  }
};

export const formatDateTime = formatClaimDate;

/**
 * Clean & Normalize Scanned Transaction ID / QR Code Value
 * Supports physical hard copy tickets, receipts, URLs, JSON payloads, and VERCEL agent IDs (e.g., 022226-UOOKNZNNVERCEL227)
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
      const possibleAgent = parsed.agentId || parsed.agent || parsed.agent_id;
      if (possibleKey) {
        str = String(possibleKey).trim();
        if (possibleAgent && !str.toUpperCase().includes('VERCEL')) {
          str = `${str}VERCEL${possibleAgent}`;
        }
      }
    } catch {
      // Ignore JSON error, continue with string extraction
    }
  }

  // 2. Handle URL query parameters if present (e.g. ?id=..., ?transId=..., ?agent=...)
  if (str.includes('?')) {
    const queryPart = str.split('?')[1];
    if (queryPart) {
      const params = queryPart.split('&');
      let foundId = '';
      let foundAgent = '';
      for (const param of params) {
        const [k, v] = param.split('=');
        const key = (k || '').toLowerCase();
        if (['id', 'transid', 'transactionid', 'code', 'ticket', 't'].includes(key) && v) {
          foundId = decodeURIComponent(v);
        }
        if (['agent', 'agentid', 'agent_id', 'a'].includes(key) && v) {
          foundAgent = decodeURIComponent(v);
        }
      }
      if (foundId) {
        str = foundId;
        if (foundAgent && !str.toUpperCase().includes('VERCEL')) {
          str = `${str}VERCEL${foundAgent}`;
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

  // Detect Agent ID from raw input if separate (e.g., from hard copy receipt scan: "TRANS: 022226-UOOKNZNN AGENT: 227")
  const rawAgentMatch = String(rawInput).match(/(?:VERCEL|AGENT)[_\s#:.-]*(\d+)/i);
  const rawAgentId = rawAgentMatch ? rawAgentMatch[1] : null;

  // 4. Extract standard transaction ID pattern
  // Matches: 022226-UOOKNZNNVERCEL227, 022226-UOOKNZNN-VERCEL227, 022226-UOOKNZNN_VERCEL227
  const vercelComboMatch = str.match(/(\d{6}-[A-Za-z0-9]+)[-_:\s]?(VERCEL\d+)/i);
  if (vercelComboMatch) {
    str = `${vercelComboMatch[1].toUpperCase()}${vercelComboMatch[2].toUpperCase()}`;
  } else {
    const patternMatch = str.match(/(\d{6}-[A-Za-z0-9]+)/);
    if (patternMatch) {
      str = patternMatch[1].toUpperCase();
      if (rawAgentId && !str.includes('VERCEL')) {
        str = `${str}VERCEL${rawAgentId}`;
      }
    }
  }

  // Strip quotes and extra symbols, return uppercase
  return str.replace(/['"`]/g, '').trim().toUpperCase();
};

/**
 * Extract Agent ID number from VERCEL transaction ID or other formats
 * e.g., '022226-UOOKNZNNVERCEL227' -> '227'
 *       '022226-UOOKNZNN-VERCEL227' -> '227'
 *       '022226-UOOKNZNN AGENT 227' -> '227'
 *       'AGENT: 227' -> '227'
 */
export const extractAgentFromTransId = (transId) => {
  if (!transId) return null;
  const str = String(transId).trim().toUpperCase();

  // Match VERCEL followed by digits (e.g., VERCEL227 -> 227, VERCEL-227 -> 227, VERCEL #227 -> 227, VERCEL: 227 -> 227)
  const vercelMatch = str.match(/VERCEL[_\s#:.-]*(\d+)/i);
  if (vercelMatch && vercelMatch[1]) {
    return vercelMatch[1];
  }

  // Match AGENT followed by digits (e.g., AGENT227 -> 227, AGENT #227 -> 227)
  const agentMatch = str.match(/AGENT[_\s#:.-]*(\d+)/i);
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
 *       '022226-UOOKNZNN-VERCEL227' -> '022226-UOOKNZNN'
 */
export const getBaseTransId = (transId) => {
  if (!transId) return '';
  const cleaned = cleanTransId(transId);
  return cleaned.replace(/[-_]?VERCEL\d*/i, '').replace(/[-_]?AGENT\d*/i, '');
};

/**
 * Ensure transaction ID includes VERCEL and Agent ID for hard copy / physical receipts
 * e.g., ('022226-UOOKNZNN', '227') -> '022226-UOOKNZNNVERCEL227'
 */
export const formatVercelTransId = (transId, agentId) => {
  if (!transId) return '';
  const cleaned = cleanTransId(transId);
  const extractedAgent = agentId || extractAgentFromTransId(cleaned);
  if (!extractedAgent) return cleaned;
  const base = getBaseTransId(cleaned);
  return `${base}VERCEL${extractedAgent}`;
};

/**
 * Format Supervisor / Username Display
 * Converts usernames (e.g. 'spvr-molly' -> '@spvr-molly') or numeric IDs ('12' -> 'Supervisor #12')
 * and falls back cleanly without redundant prefixes
 */
export const formatSupervisorDisplay = (username, supervisor, agentId) => {
  let rawName = null;

  if (username && String(username).trim() && String(username) !== 'null' && String(username) !== 'undefined') {
    rawName = String(username).trim();
  } else if (supervisor && String(supervisor).trim() && String(supervisor) !== 'null' && String(supervisor) !== 'undefined') {
    rawName = String(supervisor).trim();
  }

  if (!rawName) {
    return agentId ? `Agent POS #${agentId}` : 'UNASSIGNED';
  }

  if (rawName.startsWith('@')) {
    return rawName;
  }
  if (rawName.startsWith('Supervisor') || rawName.startsWith('Agent')) {
    return rawName;
  }
  if (/^\d+$/.test(rawName)) {
    return `Supervisor #${rawName}`;
  }
  return `@${rawName}`;
};

/**
 * Get Bet Code Description (Target vs Rambolito)
 */
export const getBetTypeLabel = (betCode, rambolito) => {
  if (betCode) return betCode.toUpperCase();
  if (rambolito === true || rambolito === '1' || rambolito === 1) return 'RAMBOLITO';
  return 'TARGET';
};
