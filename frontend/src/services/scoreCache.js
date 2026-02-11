/**
 * ScoreCache - Caching service for score API responses
 *
 * Same pattern as weatherCache.js: in-memory Map + localStorage + TTL.
 * Caches aurora, sky, outdoor, and swimming score data.
 */

const CACHE_CONFIG = {
  TTL_MINUTES: 10,
  STALE_MINUTES: 30,
  MAX_ENTRIES: 40,
  STORAGE_KEY: 'score_cache_v1',
};

let memoryCache = new Map();

// Initialize from localStorage
const initializeCache = () => {
  try {
    const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]) => {
        memoryCache.set(key, value);
      });
    }
  } catch (e) {
    console.warn('Failed to load score cache:', e);
  }
};

const persistCache = () => {
  try {
    const obj = Object.fromEntries(memoryCache);
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to persist score cache:', e);
  }
};

const getCacheKey = (endpoint, lat, lon) => {
  return `${endpoint}_${parseFloat(lat).toFixed(4)}_${parseFloat(lon).toFixed(4)}`;
};

const isFresh = (entry) => {
  if (!entry || !entry._cachedAt) return false;
  const age = Date.now() - entry._cachedAt;
  return age < CACHE_CONFIG.TTL_MINUTES * 60 * 1000;
};

const isUsable = (entry) => {
  if (!entry || !entry._cachedAt) return false;
  const age = Date.now() - entry._cachedAt;
  return age < CACHE_CONFIG.STALE_MINUTES * 60 * 1000;
};

const cleanupCache = () => {
  if (memoryCache.size <= CACHE_CONFIG.MAX_ENTRIES) return;
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => (b[1]._cachedAt || 0) - (a[1]._cachedAt || 0));
  memoryCache = new Map(entries.slice(0, CACHE_CONFIG.MAX_ENTRIES));
  persistCache();
};

const scoreCache = {
  get: async (endpoint, lat, lon, fetchFn, options = {}) => {
    const { forceRefresh = false } = options;
    const key = getCacheKey(endpoint, lat, lon);
    const cached = memoryCache.get(key);

    if (!forceRefresh && cached && isFresh(cached)) {
      return cached;
    }

    if (!forceRefresh && cached && isUsable(cached)) {
      // Return stale data, refresh in background
      fetchFn().then(data => {
        const entry = { ...data, _cachedAt: Date.now() };
        memoryCache.set(key, entry);
        persistCache();
      }).catch(() => {});
      return cached;
    }

    try {
      const data = await fetchFn();
      const entry = { ...data, _cachedAt: Date.now() };
      memoryCache.set(key, entry);
      persistCache();
      cleanupCache();
      return entry;
    } catch (error) {
      // Return stale data if available, otherwise throw
      if (cached) return cached;
      throw error;
    }
  },

  clear: () => {
    memoryCache.clear();
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
  },
};

initializeCache();

export default scoreCache;
