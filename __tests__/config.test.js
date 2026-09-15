import { APP_CONFIG } from '../src/constants/config';

describe('APP_CONFIG and API Endpoints', () => {
  test('has correct default STL LDN base URL and Bearer token', () => {
    expect(APP_CONFIG.defaultBaseUrl).toBe('https://stl-ldn-api.com');
    expect(APP_CONFIG.defaultToken).toBe('Bearer 66338|o1q9x0mgbaggRwxR4yub7WIhSKMzW49aXVtgHmNy');
  });

  test('has correct API endpoint definitions', () => {
    expect(APP_CONFIG.endpoints.unclaimedReceipts).toBe('/api/accountant/UnclaimedReceipts');
    expect(APP_CONFIG.endpoints.claimLookup).toBe('/api/accountant/claim');
    expect(APP_CONFIG.endpoints.claimExecute).toBe('/api/accountant/claim');
  });

  test('provides server presets for LDN and Mandaue', () => {
    expect(Array.isArray(APP_CONFIG.serverPresets)).toBe(true);
    const ldnPreset = APP_CONFIG.serverPresets.find(p => p.id === 'stl-ldn');
    expect(ldnPreset).toBeDefined();
    expect(ldnPreset.baseUrl).toBe('https://stl-ldn-api.com');
    expect(ldnPreset.token).toBe('Bearer 66338|o1q9x0mgbaggRwxR4yub7WIhSKMzW49aXVtgHmNy');
  });
});
