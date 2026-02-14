/**
 * WeatherCache - Smart caching service for weather data
 * 
 * Features:
 * - In-memory cache for instant access
 * - localStorage persistence for page reloads
 * - TTL (Time To Live) - data expires after X minutes
 * - Background refresh - update without blocking UI
 * - Single API call per location
 * 
 * Usage:
 *   const data = await weatherCache.get(lat, lon);
 *   weatherCache.refresh(lat, lon); // Force refresh
 *   weatherCache.clear(); // Clear all cache
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Cache configuration
const CACHE_CONFIG = {
  TTL_MINUTES: 10,           // Data considered fresh for 10 minutes
  STALE_MINUTES: 30,         // Data usable but should refresh after 30 minutes
  MAX_ENTRIES: 20,           // Maximum locations to cache
  STORAGE_KEY: 'weather_cache_v1',
};

// In-memory cache for fastest access
let memoryCache = new Map();

// Initialize from localStorage on load
const initializeCache = () => {
  try {
    const stored = localStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]) => {
        memoryCache.set(key, value);
      });
      console.log(`📦 Weather cache initialized: ${memoryCache.size} locations`);
    }
  } catch (e) {
    console.warn('Failed to load weather cache:', e);
  }
};

// Persist cache to localStorage
const persistCache = () => {
  try {
    const obj = Object.fromEntries(memoryCache);
    localStorage.setItem(CACHE_CONFIG.STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to persist weather cache:', e);
  }
};

// Generate cache key from coordinates
const getCacheKey = (lat, lon) => {
  return `${parseFloat(lat).toFixed(4)},${parseFloat(lon).toFixed(4)}`;
};

// Check if data is fresh (within TTL)
const isFresh = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < CACHE_CONFIG.TTL_MINUTES * 60 * 1000;
};

// Check if data is stale but usable
const isUsable = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const age = Date.now() - new Date(entry.fetchedAt).getTime();
  return age < CACHE_CONFIG.STALE_MINUTES * 60 * 1000;
};

// Fetch fresh data from API
const fetchWeatherData = async (lat, lon, country) => {
  console.log(`🌐 Fetching weather for ${lat}, ${lon}${country ? ` (${country})` : ''}`);
  let url = `${API_BASE_URL}/GetWeatherData?lat=${lat}&lon=${lon}`;
  if (country) {
    url += `&country=${encodeURIComponent(country)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
};

// Clean up old entries if cache is too large
const cleanupCache = () => {
  if (memoryCache.size <= CACHE_CONFIG.MAX_ENTRIES) return;
  
  // Sort by fetchedAt and remove oldest
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => new Date(b[1].fetchedAt) - new Date(a[1].fetchedAt));
  
  memoryCache = new Map(entries.slice(0, CACHE_CONFIG.MAX_ENTRIES));
  persistCache();
  console.log(`🧹 Cache cleaned: ${memoryCache.size} entries`);
};

/**
 * Weather Cache API
 */
const weatherCache = {
  /**
   * Get weather data for a location
   * Returns cached data if fresh, otherwise fetches new data
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {object} options - { forceRefresh: boolean, backgroundRefresh: boolean }
   * @returns {Promise<object>} Weather data
   */
  get: async (lat, lon, options = {}) => {
    const { forceRefresh = false, backgroundRefresh = true, country = null } = options;
    const key = getCacheKey(lat, lon);
    const cached = memoryCache.get(key);

    // Force refresh requested
    if (forceRefresh) {
      console.log(`🔄 Force refresh for ${key}`);
      const data = await fetchWeatherData(lat, lon, country);
      memoryCache.set(key, data);
      persistCache();
      cleanupCache();
      return data;
    }

    // Return fresh cached data immediately
    if (cached && isFresh(cached)) {
      console.log(`✅ Cache hit (fresh) for ${key}`);
      return cached;
    }

    // Return stale cached data but refresh in background
    if (cached && isUsable(cached)) {
      console.log(`⏳ Cache hit (stale) for ${key}, refreshing in background`);

      if (backgroundRefresh) {
        // Refresh in background without blocking
        fetchWeatherData(lat, lon, country)
          .then(data => {
            memoryCache.set(key, data);
            persistCache();
            console.log(`🔄 Background refresh complete for ${key}`);
          })
          .catch(err => console.warn(`Background refresh failed for ${key}:`, err));
      }

      return cached;
    }

    // No usable cache, must fetch
    console.log(`❌ Cache miss for ${key}, fetching...`);
    const data = await fetchWeatherData(lat, lon, country);
    memoryCache.set(key, data);
    persistCache();
    cleanupCache();
    return data;
  },

  /**
   * Force refresh data for a location
   */
  refresh: async (lat, lon) => {
    return weatherCache.get(lat, lon, { forceRefresh: true });
  },

  /**
   * Check if we have cached data for a location
   */
  has: (lat, lon) => {
    const key = getCacheKey(lat, lon);
    return memoryCache.has(key) && isUsable(memoryCache.get(key));
  },

  /**
   * Get cached data without fetching (returns null if not cached)
   */
  peek: (lat, lon) => {
    const key = getCacheKey(lat, lon);
    const cached = memoryCache.get(key);
    return isUsable(cached) ? cached : null;
  },

  /**
   * Get age of cached data in minutes
   */
  getAge: (lat, lon) => {
    const key = getCacheKey(lat, lon);
    const cached = memoryCache.get(key);
    if (!cached || !cached.fetchedAt) return null;
    return Math.round((Date.now() - new Date(cached.fetchedAt).getTime()) / 60000);
  },

  /**
   * Clear all cached data
   */
  clear: () => {
    memoryCache.clear();
    localStorage.removeItem(CACHE_CONFIG.STORAGE_KEY);
    console.log('🗑️ Weather cache cleared');
  },

  /**
   * Get cache stats
   */
  stats: () => {
    const entries = Array.from(memoryCache.entries());
    return {
      size: memoryCache.size,
      locations: entries.map(([key, value]) => ({
        key,
        age: Math.round((Date.now() - new Date(value.fetchedAt).getTime()) / 60000),
        fresh: isFresh(value),
      })),
    };
  },

  /**
   * Prefetch weather for multiple locations
   * Useful for landing page to load all locations efficiently
   */
  prefetchMany: async (locations) => {
    console.log(`📥 Prefetching ${locations.length} locations...`);
    
    const results = await Promise.allSettled(
      locations.map(loc => weatherCache.get(loc.latitude, loc.longitude, { country: loc.country }))
    );

    const success = results.filter(r => r.status === 'fulfilled').length;
    console.log(`📥 Prefetch complete: ${success}/${locations.length} succeeded`);
    
    return results;
  },
};

// Initialize on load
initializeCache();

export default weatherCache;