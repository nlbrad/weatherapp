/**
 * GustHistory - Tracks recent gust data per location
 * 
 * Purpose: OpenWeather only reports wind_gust when gusts are occurring.
 * This creates a jarring UX when gusts appear/disappear frequently.
 * 
 * Solution: Keep showing the last reported gust until:
 * - It's 3 hours old, OR
 * - The current wind speed exceeds the stored gust (no longer makes sense)
 * 
 * Logic:
 * - API reports gust > wind speed → show it, save it
 * - API stops reporting → keep showing saved gust IF it's still > wind speed
 * - Saved gust <= wind speed → show "Holding steady" (gust no longer relevant)
 * - After 3 hours → show "Holding steady"
 */

const STORAGE_KEY = 'gust_history_v1';

const CONFIG = {
  MAX_AGE_HOURS: 3,           // Reset after 3 hours
  MAX_ENTRIES: 20,            // Max locations to track
};

// In-memory cache
let gustCache = new Map();

/**
 * Initialize from localStorage
 */
const initialize = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      Object.entries(parsed).forEach(([key, value]) => {
        gustCache.set(key, value);
      });
      console.log(`💨 Gust history loaded: ${gustCache.size} locations`);
    }
  } catch (e) {
    console.warn('Failed to load gust history:', e);
  }
};

/**
 * Persist to localStorage
 */
const persist = () => {
  try {
    const obj = Object.fromEntries(gustCache);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn('Failed to persist gust history:', e);
  }
};

/**
 * Generate cache key from coordinates
 * Returns null if coordinates are invalid
 */
const getKey = (lat, lon) => {
  // Validate coordinates
  if (lat === undefined || lat === null || lon === undefined || lon === null) {
    console.warn('💨 Gust history: Missing lat/lon coordinates');
    return null;
  }
  
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  
  if (isNaN(latNum) || isNaN(lonNum)) {
    console.warn('💨 Gust history: Invalid lat/lon coordinates', lat, lon);
    return null;
  }
  
  return `${latNum.toFixed(4)},${lonNum.toFixed(4)}`;
};

/**
 * Check if stored gust is still valid (within 3 hours)
 */
const isGustValid = (entry) => {
  if (!entry) return false;
  
  const ageHours = (Date.now() - entry.recordedAt) / (1000 * 60 * 60);
  
  if (ageHours > CONFIG.MAX_AGE_HOURS) {
    console.log(`💨 Gust expired (${ageHours.toFixed(1)}h old)`);
    return false;
  }
  
  return true;
};

/**
 * Cleanup old entries
 */
const cleanup = () => {
  if (gustCache.size <= CONFIG.MAX_ENTRIES) return;
  
  const entries = Array.from(gustCache.entries())
    .sort((a, b) => b[1].recordedAt - a[1].recordedAt);
  
  gustCache = new Map(entries.slice(0, CONFIG.MAX_ENTRIES));
  persist();
};

/**
 * Gust History API
 */
const gustHistory = {
  /**
   * Record a new gust reading
   * Call this whenever the API returns a gust value
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude  
   * @param {number} gustSpeed - Gust speed in km/h
   */
  record: (lat, lon, gustSpeed) => {
    const key = getKey(lat, lon);
    
    // Don't record if we can't generate a valid key
    if (!key) {
      console.warn('💨 Cannot record gust: invalid coordinates');
      return;
    }
    
    const entry = {
      gustSpeed,
      recordedAt: Date.now(),
    };
    
    gustCache.set(key, entry);
    persist();
    cleanup();
    
    console.log(`💨 Gust recorded for ${key}: ${gustSpeed} km/h`);
  },

  /**
   * Get gust info for a location
   * Returns either the gust speed or null if expired/none
   * 
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {number} currentGust - Current gust from API (null if not reported)
   * @param {number} currentWindSpeed - Current sustained wind speed
   * @returns {object} { hasGust: boolean, gustSpeed: number|null }
   */
  getGustState: (lat, lon, currentGust, currentWindSpeed) => {
    const key = getKey(lat, lon);
    
    // If we can't generate a valid key, don't use gust history
    if (!key) {
      // Still show live gust if API is reporting one
      if (typeof currentGust === 'number' && currentGust > 0 && currentGust > currentWindSpeed) {
        return {
          hasGust: true,
          gustSpeed: currentGust,
        };
      }
      return {
        hasGust: false,
        gustSpeed: null,
      };
    }
    
    // If API is reporting a gust right now AND it's higher than wind speed
    if (typeof currentGust === 'number' && currentGust > 0 && currentGust > currentWindSpeed) {
      gustHistory.record(lat, lon, currentGust);
      
      return {
        hasGust: true,
        gustSpeed: currentGust,
      };
    }
    
    // Check if we have a valid stored gust (within 3 hours)
    const stored = gustCache.get(key);
    
    // Only use stored gust if it's still higher than current wind speed
    if (stored && isGustValid(stored) && stored.gustSpeed > currentWindSpeed) {
      return {
        hasGust: true,
        gustSpeed: stored.gustSpeed,
      };
    }
    
    // No valid gust data (or gust is now lower than wind speed)
    return {
      hasGust: false,
      gustSpeed: null,
    };
  },

  /**
   * Clear gust history for a location
   */
  clear: (lat, lon) => {
    const key = getKey(lat, lon);
    if (key) {
      gustCache.delete(key);
      persist();
    }
  },

  /**
   * Clear all gust history
   */
  clearAll: () => {
    gustCache.clear();
    localStorage.removeItem(STORAGE_KEY);
    console.log('💨 Gust history cleared');
  },

  /**
   * Get stats (for debugging)
   */
  stats: () => {
    return {
      size: gustCache.size,
      entries: Array.from(gustCache.entries()).map(([key, value]) => ({
        key,
        gustSpeed: value.gustSpeed,
        ageMinutes: Math.round((Date.now() - value.recordedAt) / (1000 * 60)),
      })),
    };
  },
};

// Initialize on load
initialize();

export default gustHistory;