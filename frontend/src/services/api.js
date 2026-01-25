/**
 * API Service - Weather Alert System
 * 
 * All API calls to the backend
 * Updated with location search and geocoding
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Weather API
export const weatherAPI = {
  getWeather: async (city, country = '') => {
    const url = country 
      ? `${API_BASE_URL}/getweather?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
      : `${API_BASE_URL}/getweather?city=${encodeURIComponent(city)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch weather');
    return response.json();
  },

  getForecast: async (city, country = '') => {
    const url = country 
      ? `${API_BASE_URL}/getforecast?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`
      : `${API_BASE_URL}/getforecast?city=${encodeURIComponent(city)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch forecast');
    return response.json();
  },

  // NEW: Search locations with autocomplete
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

  // Alias for compatibility
  getUserLocations: async (userId) => {
    const url = `${API_BASE_URL}/getuserlocations?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch locations');
    return response.json();
  },

  // UPDATED: Now accepts lat/lon
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

// Alerts API
export const alertsAPI = {
  checkAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/checkalerts`);
    if (!response.ok) throw new Error('Failed to trigger alert check');
    return response.json();
  }
};

export default {
  weatherAPI,
  locationsAPI,
  alertsAPI
};