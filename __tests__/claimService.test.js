import { claimService } from '../src/services/claimService';
import apiClient from '../src/services/api';

jest.mock('../src/services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('claimService Ticket Verification & Claim Status', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('does not match unrelated ticket for the same teller when claimLookup returns empty', async () => {
    // 1. claimLookup returns empty
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/api/accountant/claim/091226-UAUJPNNH')) {
        return Promise.resolve({ data: { message: 'Bet data!', data: [] } });
      }
      if (url.includes('/api/accountant/UnclaimedReceipts')) {
        // Returns receipts for Jimmy Anchero from today with a DIFFERENT transaction ID
        return Promise.resolve({
          data: {
            data: [
              {
                transactionId: '091626-IAUI6BKD',
                tellerId: 371,
                fullName: 'Jimmy Anchero',
                betNo: '304',
                winAmount: 833,
                isClaim: 0,
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    const result = await claimService.lookupTicket('091226-UAUJPNNH');
    expect(result.found).toBe(false);
    expect(result.message).toContain('No active winning bet ticket found');
  });

  test('correctly identifies already claimed ticket when isClaim is 1', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/api/accountant/claim/091426-OAAO3XNQ')) {
        return Promise.resolve({
          data: {
            message: 'Bet data!',
            data: [
              {
                transactionId: '091426-OAAO3XNQ',
                betNo: '601',
                betAmount: 100,
                winAmount: 50000,
                betCode: 'TS3',
                isClaim: 1,
                claimDate: '2026-09-14 15:52',
                fullName: 'Jimmy Anchero',
                created_at: '2026-09-14 13:43:06',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await claimService.lookupTicket('091426-OAAO3XNQ');
    expect(result.found).toBe(true);
    expect(result.isClaimed).toBe(true);
    expect(result.totalWinAmount).toBe(50000);
    expect(result.claimDate).toBe('2026-09-14 15:52');
  });

  test('correctly identifies unclaimed winning ticket', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/api/accountant/claim/091626-IAUI6BKD')) {
        return Promise.resolve({
          data: {
            message: 'Bet data!',
            data: [
              {
                transactionId: '091626-IAUI6BKD',
                betNo: '304',
                betAmount: 10,
                winAmount: 833,
                betCode: 'RS3',
                isClaim: 0,
                claimDate: null,
                fullName: 'Jimmy Anchero',
                created_at: '2026-09-16 13:35:52',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await claimService.lookupTicket('091626-IAUI6BKD');
    expect(result.found).toBe(true);
    expect(result.isClaimed).toBe(false);
    expect(result.totalWinAmount).toBe(833);
    expect(result.betNo).toBe('304');
  });

  test('normalizes month-abbreviated claim dates from cloud database to all numbers format', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('/api/accountant/claim/090226-TEST1234')) {
        return Promise.resolve({
          data: {
            message: 'Bet data!',
            data: [
              {
                transactionId: '090226-TEST1234',
                betNo: '123',
                betAmount: 50,
                winAmount: 25000,
                betCode: 'TS3',
                isClaim: 1,
                claimDate: 'Sep-02-26 13:56',
                fullName: 'Outlet 1',
                created_at: '2026-09-02 10:00:00',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    const result = await claimService.lookupTicket('090226-TEST1234');
    expect(result.found).toBe(true);
    expect(result.isClaimed).toBe(true);
    expect(result.claimDate).toBe('2026-09-02 13:56');
  });

  test('executeClaim sends all-numbers formatted claimDate in cloud API payload', async () => {
    let capturedPayload = null;
    apiClient.put.mockImplementation((url, payload) => {
      capturedPayload = payload;
      return Promise.resolve({
        data: {
          success: true,
          message: 'Bet claimed successfully.',
        },
      });
    });

    const res = await claimService.executeClaim('091726-TESTABCD');
    expect(res.success).toBe(true);
    expect(capturedPayload).toBeTruthy();
    expect(capturedPayload.isClaim).toBe(1);
    expect(capturedPayload.claimDate).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/);
    expect(capturedPayload.claim_date).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/);
    expect(res.claimDate).toMatch(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/);
  });
});
