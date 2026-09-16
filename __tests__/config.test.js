import { APP_CONFIG } from '../src/constants/config';

describe('APP_CONFIG and API Endpoints', () => {
  test('has correct default STL Mandaue base URL and Bearer token', () => {
    expect(APP_CONFIG.defaultBaseUrl).toBe('https://stl-mandaue-api.com');
    expect(APP_CONFIG.defaultToken).toBe('Bearer 2860|OCyU72t1DzxdBeSjj3izVKCIcCwHkqNbwjRlxHp5');
  });

  test('has correct API endpoint definitions', () => {
    expect(APP_CONFIG.endpoints.unclaimedReceipts).toBe('/api/accountant/UnclaimedReceipts');
    expect(APP_CONFIG.endpoints.claimLookup).toBe('/api/accountant/claim');
    expect(APP_CONFIG.endpoints.claimExecute).toBe('/api/accountant/claim');
  });

  test('provides server preset for Mandaue', () => {
    expect(Array.isArray(APP_CONFIG.serverPresets)).toBe(true);
    const mandauePreset = APP_CONFIG.serverPresets.find(p => p.id === 'stl-mandaue');
    expect(mandauePreset).toBeDefined();
    expect(mandauePreset.baseUrl).toBe('https://stl-mandaue-api.com');
    expect(mandauePreset.token).toBe('Bearer 2860|OCyU72t1DzxdBeSjj3izVKCIcCwHkqNbwjRlxHp5');
  });
});
