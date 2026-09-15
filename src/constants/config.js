export const SERVER_PRESETS = [
  {
    id: 'stl-ldn',
    name: 'STL LDN',
    description: 'Lanao del Norte Operations',
    baseUrl: 'https://stl-ldn-api.com',
    token: 'Bearer 66338|o1q9x0mgbaggRwxR4yub7WIhSKMzW49aXVtgHmNy',
  },
  {
    id: 'stl-mandaue',
    name: 'STL Mandaue',
    description: 'Mandaue City Operations',
    baseUrl: 'https://stl-mandaue-api.com',
    token: 'Bearer 2860|OCyU72t1DzxdBeSjj3izVKCIcCwHkqNbwjRlxHp5',
  },
];

export const APP_CONFIG = {
  appName: 'STL QR Scanner Terminal',
  version: '1.0.2',
  buildNumber: '100',

  // Server Environments (uses 1st preset as default)
  serverPresets: SERVER_PRESETS,
  defaultBaseUrl: SERVER_PRESETS[0].baseUrl,
  defaultToken: SERVER_PRESETS[0].token,

  endpoints: {
    claimLookup: '/api/accountant/claim', // GET /api/accountant/claim/{id}
    claimExecute: '/api/accountant/claim', // PUT /api/accountant/claim/{id}
    unclaimedReceipts: '/api/accountant/UnclaimedReceipts', // GET /api/accountant/UnclaimedReceipts?isClaim=0
  },

  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: '@stl_scanner_auth_token',
    BASE_URL: '@stl_scanner_base_url',
    CLAIM_HISTORY: '@stl_scanner_claim_history',
    OFFLINE_QUEUE: '@stl_scanner_offline_queue',
    USER_SETTINGS: '@stl_scanner_user_settings',
  },

  // Scanning Settings Defaults
  scanner: {
    cooldownMs: 1500, // Cooldown between consecutive scans
    vibrateOnScan: true,
    soundOnScan: true,
    autoOpenDetails: true,
  }
};

