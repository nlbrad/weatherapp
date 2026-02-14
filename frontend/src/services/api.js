/**
 * API Service - Weather Alert System
 * 
 * All API calls to the backend
 * 
 * UPDATED: Added getAlertHistory to alertsAPI
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Weather API
export const weatherAPI = {
  /**
   * Get ALL weather data in a single call (preferred method)
   * Returns: current, hourly, daily, airQuality, alerts
   */
  getWeatherData: async (lat, lon, options = {}) => {
    if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
      throw new Error('Valid lat/lon coordinates required');
    }

    let url = `${API_BASE_URL}/GetWeatherData?lat=${lat}&lon=${lon}`;
    if (options.country) url += `&country=${encodeURIComponent(options.country)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather data');
    return response.json();
  },

  // Legacy: Get weather - supports city/country OR lat/lon
  getWeather: async (city, country = '', lat = null, lon = null) => {
    let url;
    
    const hasValidCoords = lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
    
    if (hasValidCoords) {
      url = `${API_BASE_URL}/getweather?lat=${lat}&lon=${lon}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;
    } else {
      url = country 
        ? `${API_BASE_URL}/getweather?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
        : `${API_BASE_URL}/getweather?city=${encodeURIComponent(city)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather');
    return response.json();
  },

  // Legacy: Get forecast
  getForecast: async (city, country = '', lat = null, lon = null) => {
    let url;
    
    const hasValidCoords = lat && lon && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
    
    if (hasValidCoords) {
      url = `${API_BASE_URL}/getforecast?lat=${lat}&lon=${lon}`;
      if (city) url += `&city=${encodeURIComponent(city)}`;
      if (country) url += `&country=${encodeURIComponent(country)}`;
    } else {
      url = country 
        ? `${API_BASE_URL}/getforecast?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
        : `${API_BASE_URL}/getforecast?city=${encodeURIComponent(city)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch forecast');
    return response.json();
  },

  // Search locations with autocomplete
  searchLocations: async (query, limit = 6) => {
    if (!query || query.length < 2) return { locations: [] };
    
    const url = `${API_BASE_URL}/searchlocations?query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search locations');
    return response.json();
  }
};

// Locations API
export const locationsAPI = {
  getLocations: async (userId) => {
    const url = `${API_BASE_URL}/getuserlocations?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  getUserLocations: async (userId) => {
    const url = `${API_BASE_URL}/getuserlocations?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  saveLocation: async (locationData) => {
    const response = await fetch(`${API_BASE_URL}/saveuserlocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData),
    });
    if (!response.ok) throw new Error('Failed to save location');
    return response.json();
  },

  deleteLocation: async (userId, locationName) => {
    const url = `${API_BASE_URL}/deleteuserlocation?userId=${encodeURIComponent(userId)}&locationName=${encodeURIComponent(locationName)}`;
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete location');
    return response.json();
  }
};

// Alerts API - UPDATED with getAlertHistory
export const alertsAPI = {
  // Trigger alert check (for testing)
  checkAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/checkalerts`);
    if (!response.ok) throw new Error('Failed to trigger alert check');
    return response.json();
  },

  // NEW: Get alert history for a user
  getAlertHistory: async (userId, limit = 20, alertType = null) => {
    let url = `${API_BASE_URL}/alert-history?userId=${encodeURIComponent(userId)}&limit=${limit}`;
    if (alertType) {
      url += `&type=${encodeURIComponent(alertType)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      // Return empty on error (API might not exist yet)
      console.warn('Alert history API not available');
      return { alerts: [] };
    }
    return response.json();
  }
};

// Preferences API - User settings and notification preferences
export const preferencesAPI = {
  // Get user preferences
  getPreferences: async (userId) => {
    const url = `${API_BASE_URL}/userpreferences?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch preferences');
    return response.json();
  },

  // Save user preferences
  savePreferences: async (userId, preferences) => {
    const response = await fetch(`${API_BASE_URL}/userpreferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, preferences }),
    });
    if (!response.ok) throw new Error('Failed to save preferences');
    return response.json();
  },

  // Send test Telegram message
  sendTestTelegram: async (chatId) => {
    const response = await fetch(`${API_BASE_URL}/telegram/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: chatId,
        message: '🧪 *Test Message*\n\nYour Telegram notifications are working! ✅\n\n_Sent from OmniAlert_'
      }),
    });
    if (!response.ok) throw new Error('Failed to send test message');
    return response.json();
  },

  // Send test WhatsApp message (uses existing endpoint)
  sendTestWhatsApp: async (phoneNumber) => {
    const response = await fetch(`${API_BASE_URL}/testwhatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        message: '🧪 Test Message\n\nYour WhatsApp notifications are working! ✅\n\nSent from OmniAlert'
      }),
    });
    if (!response.ok) throw new Error('Failed to send test message');
    return response.json();
  }
};

// Scores API - Aurora, sky, outdoor, swimming score endpoints
export const scoresAPI = {
  getAuroraScore: async (lat, lon) => {
    const url = `${API_BASE_URL}/aurora-score?lat=${lat}&lon=${lon}&windows=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch aurora score');
    return response.json();
  },

  getSkyScore: async (lat, lon) => {
    const url = `${API_BASE_URL}/tonights-sky?lat=${lat}&lon=${lon}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch sky score');
    return response.json();
  },

  getOutdoorScore: async (lat, lon, activity = 'default') => {
    const url = `${API_BASE_URL}/outdoor-score?lat=${lat}&lon=${lon}&activity=${encodeURIComponent(activity)}&windows=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch outdoor score');
    return response.json();
  },

  getSwimmingScore: async (lat, lon) => {
    const url = `${API_BASE_URL}/swimming-score?lat=${lat}&lon=${lon}&windows=true`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch swimming score');
    return response.json();
  },
};

// Re-export crypto API from its own module
export { cryptoAPI } from './cryptoAPI';

export default {
  weatherAPI,
  locationsAPI,
  alertsAPI,
  preferencesAPI,
  scoresAPI,
};
