// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Helper function for API calls
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Weather API
export const weatherAPI = {
  // Get current weather for a city
  getWeather: async (city, country) => {
    const params = new URLSearchParams({ city, country });
    return fetchAPI(`/GetWeather?${params}`);
  },
};

// User Locations API
export const locationsAPI = {
  // Get all locations for a user
  getUserLocations: async (userId) => {
    const params = new URLSearchParams({ userId });
    return fetchAPI(`/GetUserLocations?${params}`);
  },

  // Save a new location
  saveLocation: async (locationData) => {
    return fetchAPI('/SaveUserLocation', {
      method: 'POST',
      body: JSON.stringify(locationData),
    });
  },
};

// Alerts API
export const alertsAPI = {
  // Manually trigger alert check
  checkAlerts: async () => {
    return fetchAPI('/CheckAlerts');
  },
};