import {
  cleanTransId,
  extractAgentFromTransId,
  isVercelTicket,
  getBaseTransId,
  formatCurrency,
  formatDrawTime,
} from '../src/utils/formatters';

describe('Vercel Physical Ticket & Transaction ID Parsing', () => {
  test('cleans raw transaction ID with VERCEL and Agent number', () => {
    const raw = '022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(raw)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts agent ID from VERCEL transaction ID', () => {
    expect(extractAgentFromTransId('022226-UOOKNZNNVERCEL227')).toBe('227');
    expect(extractAgentFromTransId('022226-UOOKNZNNVERCEL05')).toBe('05');
    expect(extractAgentFromTransId('081626-OIAC4DXG')).toBe(null);
  });

  test('identifies VERCEL tickets correctly', () => {
    expect(isVercelTicket('022226-UOOKNZNNVERCEL227')).toBe(true);
    expect(isVercelTicket('081626-OIAC4DXG')).toBe(false);
  });

  test('gets base transaction ID without VERCEL suffix', () => {
    expect(getBaseTransId('022226-UOOKNZNNVERCEL227')).toBe('022226-UOOKNZNN');
    expect(getBaseTransId('081626-OIAC4DXG')).toBe('081626-OIAC4DXG');
  });

  test('extracts transaction ID from URL query parameters', () => {
    const url = 'https://stl-mandaue.vercel.app/claim?id=022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(url)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from URL path', () => {
    const url = 'https://stl-mandaue.vercel.app/ticket/022226-UOOKNZNNVERCEL227';
    expect(cleanTransId(url)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from JSON payload', () => {
    const jsonStr = JSON.stringify({ transactionId: '022226-UOOKNZNNVERCEL227' });
    expect(cleanTransId(jsonStr)).toBe('022226-UOOKNZNNVERCEL227');
  });

  test('extracts transaction ID from printed ticket text', () => {
    const ticketText = 'STL MANDAUE\nTRANS: 022226-UOOKNZNNVERCEL227\nBET: 100';
    expect(cleanTransId(ticketText)).toBe('022226-UOOKNZNNVERCEL227');
  });
});
