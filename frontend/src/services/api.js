const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Weather API calls
const getWeather = async (city, country = '') => {
  try {
    const url = country 
      ? `${API_BASE_URL}/getweather?city=${city}&country=${country}`
      : `${API_BASE_URL}/getweather?city=${city}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw error;
  }
};

const getForecast = async (city, country = '') => {
  try {
    const url = country 
      ? `${API_BASE_URL}/getforecast?city=${city}&country=${country}`
      : `${API_BASE_URL}/getforecast?city=${city}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw error;
  }
};

export const weatherAPI = {
  getWeather,
  getForecast
};

// Locations API calls
const getUserLocations = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/getuserlocations?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
};

const saveLocation = async (locationData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/saveuserlocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
};

export const locationsAPI = {
  getUserLocations,
  saveLocation
};

// Alerts API calls
const checkAlerts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/checkalerts`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking alerts:', error);
    throw error;
  }
};

export const alertsAPI = {
  checkAlerts
};