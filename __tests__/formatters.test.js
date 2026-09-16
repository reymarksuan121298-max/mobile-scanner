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

