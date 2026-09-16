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
 * Format Claim Date to 'YYYY-MM-DD HH:mm' (e.g. 2026-09-02 11:34)
 */
export const formatClaimDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    let d;
    if (dateVal instanceof Date) {
      d = dateVal;
    } else if (typeof dateVal === 'number') {
      d = new Date(dateVal);
    } else if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed) return '';
      // If already in exact YYYY-MM-DD HH:mm format
      if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      const normalizedStr = trimmed.includes(' ') && !trimmed.includes('T') ? trimmed.replace(' ', 'T') : trimmed;
      const parsed = new Date(normalizedStr);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      } else {
        d = new Date(trimmed);
      }
    } else {
      d = new Date(dateVal);
    }

    if (d && !isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    if (typeof dateVal === 'string') {
      const match = dateVal.match(/(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{1,2})/);
      if (match) {
        const y = match[1];
        const m = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        const h = match[4].padStart(2, '0');
        const min = match[5].padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
      }
    }
    return String(dateVal);
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
