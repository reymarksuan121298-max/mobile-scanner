import {
  cleanTransId,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
  formatVercelTransId,
  formatSupervisorDisplay,
  formatCurrency,
  formatDrawTime,
  formatClaimDate,
} from '../src/utils/formatters';

describe('Vercel Physical Ticket & Transaction ID Parsing', () => {
  test('cleans raw transaction ID with VERCEL and Agent number', () => {
    const raw = '022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(raw)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('cleans hyphenated and underscored VERCEL agent codes from hard copy receipts', () => {
    expect(cleanTransId('022226-UOOKNZNN-VERCEL227')).toBe('022226-UOOKNZNNVERCEL227');
    expect(cleanTransId('022226-UOOKNZNN_VERCEL227')).toBe('022226-UOOKNZNNVERCEL227');
    expect(cleanTransId('022226-UOOKNZNN VERCEL 227')).toBe('022226-UOOKNZNNVERCEL227');
    expect(cleanTransId('022226-UOOKNZNN AGENT 227')).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts agent ID from VERCEL transaction ID', () => {
    expect(extractAgentFromTransId('022226-UOOKNZNNVERCEL227')).toBe('227');
    expect(extractAgentFromTransId('022226-UOOKNZNN-VERCEL227')).toBe('227');
    expect(extractAgentFromTransId('022226-UOOKNZNN VERCEL 05')).toBe('05');
    expect(extractAgentFromTransId('022226-UOOKNZNNVERCEL05')).toBe('05');
    expect(extractAgentFromTransId('081626-OIAC4DXG')).toBe(null);
  });

  test('identifies VERCEL tickets correctly', () => {
    expect(isVercelTicket('022226-UOOKNZNNVERCEL227')).toBe(true);
    expect(isVercelTicket('022226-UOOKNZNN-VERCEL227')).toBe(true);
    expect(isVercelTicket('081626-OIAC4DXG')).toBe(false);
  });

  test('gets base transaction ID without VERCEL suffix', () => {
    expect(getBaseTransId('022226-UOOKNZNNVERCEL227')).toBe('022226-UOOKNZNN');
    expect(getBaseTransId('022226-UOOKNZNN-VERCEL227')).toBe('022226-UOOKNZNN');
    expect(getBaseTransId('081626-OIAC4DXG')).toBe('081626-OIAC4DXG');
  });

  test('formats VERCEL transaction ID with agent ID', () => {
    expect(formatVercelTransId('022226-UOOKNZNN', '227')).toBe('022226-UOOKNZNNVERCEL227');
    expect(formatVercelTransId('022226-UOOKNZNNVERCEL227', '227')).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from URL query parameters', () => {
    const url = 'https://stl-mandaue.vercel.app/claim?id=022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(url)).toBe('022226-UOOKNZNNVERCEL227');

    const urlWithAgent = 'https://stl-mandaue.vercel.app/claim?id=022226-UOOKNZNN&agent=227';
    expect(cleanTransId(urlWithAgent)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from URL path', () => {
    const url = 'https://stl-mandaue.vercel.app/ticket/022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(url)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from JSON payload', () => {
    const jsonStr = JSON.stringify({ transactionId: '022226-UOOKNZNNVERCEL227' });
    expect(cleanTransId(jsonStr)).toBe('022226-UOOKNZNNVERCEL227');

    const jsonWithAgent = JSON.stringify({ transactionId: '022226-UOOKNZNN', agentId: '227' });
    expect(cleanTransId(jsonWithAgent)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from printed ticket text / hard copy receipt scan', () => {
    const ticketText = 'STL MANDAUE\nTRANS: 022226-UOOKNZNNVERCEL227\nBET: 100';
    expect(cleanTransId(ticketText)).toBe('022226-UOOKNZNNVERCEL227');

    const receiptSeparate = 'STL MANDAUE\nTRANS: 022226-UOOKNZNN\nAGENT: 227\nBET: 100';
    expect(cleanTransId(receiptSeparate)).toBe('022226-UOOKNZNNVERCEL227');
  });
});

describe('Supervisor / Username Formatting', () => {
  test('formats supervisor username with @ prefix', () => {
    expect(formatSupervisorDisplay(null, 'spvr-molly', '87')).toBe('@spvr-molly');
    expect(formatSupervisorDisplay('molly', null, '87')).toBe('@molly');
    expect(formatSupervisorDisplay(null, '@spvr-molly', '87')).toBe('@spvr-molly');
  });

  test('formats numeric supervisor ID with Supervisor # prefix', () => {
    expect(formatSupervisorDisplay(null, '12', '87')).toBe('Supervisor #12');
    expect(formatSupervisorDisplay(null, 'Supervisor #12', '87')).toBe('Supervisor #12');
  });

  test('falls back to Agent POS # when supervisor is unassigned', () => {
    expect(formatSupervisorDisplay(null, null, '87')).toBe('Agent POS #87');
    expect(formatSupervisorDisplay(null, null, null)).toBe('UNASSIGNED');
  });
});

describe('Claim Date Formatting (Uniform All-Numbers Format)', () => {
  test('formats month-abbreviation dates like Sep-02-26 13:56 to uniform numbers format', () => {
    expect(formatClaimDate('Sep-02-26 13:56')).toBe('2026-09-02 13:56');
    expect(formatClaimDate('Sep-04-26 14:44')).toBe('2026-09-04 14:44');
    expect(formatClaimDate('Jan-15-26 09:30')).toBe('2026-01-15 09:30');
    expect(formatClaimDate('Dec-31-26 23:59')).toBe('2026-12-31 23:59');
  });

  test('formats 4-digit year month-abbreviation dates', () => {
    expect(formatClaimDate('Sep-02-2026 13:56')).toBe('2026-09-02 13:56');
    expect(formatClaimDate('02-Sep-2026 13:56')).toBe('2026-09-02 13:56');
    expect(formatClaimDate('Sep 02, 2026 13:56')).toBe('2026-09-02 13:56');
  });

  test('preserves already formatted YYYY-MM-DD HH:mm dates', () => {
    expect(formatClaimDate('2026-09-01 17:38')).toBe('2026-09-01 17:38');
    expect(formatClaimDate('2026-09-01 14:52')).toBe('2026-09-01 14:52');
  });

  test('formats YYYY-MM-DD HH:mm:ss to YYYY-MM-DD HH:mm', () => {
    expect(formatClaimDate('2026-09-01 17:38:45')).toBe('2026-09-01 17:38');
    expect(formatClaimDate('2026-09-01T17:38:45.000Z')).toBe('2026-09-01 17:38');
  });

  test('handles null, undefined, empty, and invalid inputs gracefully', () => {
    expect(formatClaimDate(null)).toBe('');
    expect(formatClaimDate(undefined)).toBe('');
    expect(formatClaimDate('')).toBe('');
    expect(formatClaimDate('null')).toBe('');
    expect(formatClaimDate('N/A')).toBe('');
  });
});

