// lib/api-config.ts
export const API_CONFIG = {
  mediaStack: {
    key: process.env.REACT_APP_MEDIASTACK_KEY,
    baseUrl: 'http://api.mediastack.com/v1/news',
    cacheTTL: 30 * 60 * 1000, // 30 mins
  },
  serpStack: {
    key: process.env.REACT_APP_SERPSTACK_KEY,
    baseUrl: 'http://api.serpstack.com/search',
    cacheTTL: 60 * 60 * 1000, // 1 hour
  },
  userStack: {
    key: process.env.REACT_APP_USERSTACK_KEY,
    baseUrl: 'http://api.userstack.com',
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  ipStack: {
    key: process.env.REACT_APP_IPSTACK_KEY,
    baseUrl: 'http://api.ipstack.com',
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  numVerify: {
    key: process.env.REACT_APP_NUMVERIFY_KEY,
    baseUrl: 'http://apilayer.net/numverify',
    cacheTTL: 0, // No cache for phone validation
  },
};

export function getApiKey(service: keyof typeof API_CONFIG) {
  const key = API_CONFIG[service].key;
  if (!key) {
    throw new Error(`API Key for ${service} is missing. Please add it to your environment variables.`);
  }
  return key;
}
