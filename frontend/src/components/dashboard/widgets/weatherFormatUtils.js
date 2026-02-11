/**
 * weatherFormatUtils.js - Shared formatting utilities for weather widgets
 *
 * Centralizes duplicated emoji mapping, color scales, and formatting functions
 * used across multiple dashboard widgets.
 */

// Weather condition → emoji mapping (day/night aware via OpenWeather icon code suffix)
export const getWeatherEmoji = (condition, icon) => {
  const isNight = icon?.endsWith('n');
  const c = (condition || '').toLowerCase();
  if (c.includes('thunder')) return '⛈️';
  if (c.includes('drizzle')) return '🌧️';
  if (c.includes('rain')) return '🌧️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return '🌫️';
  if (c.includes('cloud')) return isNight ? '☁️' : '⛅';
  if (c.includes('clear')) return isNight ? '🌙' : '☀️';
  return isNight ? '🌙' : '🌤️';
};

// Temperature → hex color (consistent gradient scale)
export const getTempColor = (temp) => {
  if (temp <= -10) return '#a78bfa'; // violet-400
  if (temp <= 0) return '#818cf8';   // indigo-400
  if (temp <= 5) return '#60a5fa';   // blue-400
  if (temp <= 10) return '#22d3ee';  // cyan-400
  if (temp <= 15) return '#34d399';  // emerald-400
  if (temp <= 20) return '#a3e635';  // lime-400
  if (temp <= 25) return '#fbbf24';  // amber-400
  if (temp <= 30) return '#f97316';  // orange-500
  if (temp <= 35) return '#ef4444';  // red-500
  return '#dc2626';                  // red-600
};

// Precipitation probability (0-1) → hex color
export const getPrecipColor = (pop) => {
  if (pop <= 0.2) return '#475569';  // slate-600 (negligible)
  if (pop <= 0.4) return '#60a5fa';  // blue-400
  if (pop <= 0.6) return '#3b82f6';  // blue-500
  if (pop <= 0.8) return '#8b5cf6';  // violet-500
  return '#a855f7';                  // purple-500
};

// Wind speed (km/h) → descriptor + color
export const getWindInfo = (speed) => {
  if (speed < 1) return { text: 'Calm', color: '#10b981' };
  if (speed < 12) return { text: 'Light', color: '#10b981' };
  if (speed < 29) return { text: 'Moderate', color: '#22d3ee' };
  if (speed < 50) return { text: 'Strong', color: '#f59e0b' };
  if (speed < 75) return { text: 'Gale', color: '#ef4444' };
  return { text: 'Storm', color: '#dc2626' };
};

// Wind degree (0-360) → 8-point compass
export const getWindDir = (deg) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
};

// ISO string → "18" (hour only, 24h format)
export const formatHour = (isoString, timezone) => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit', hour12: false, timeZone: timezone || 'UTC',
  }).replace(/^24/, '00');
};

// ISO string → "Wed"
export const formatDay = (isoString, timezone) => {
  return new Date(isoString).toLocaleDateString('en-US', {
    weekday: 'short', timeZone: timezone || 'UTC',
  });
};

// ISO string → "Feb 12"
export const formatDate = (isoString, timezone) => {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: timezone || 'UTC',
  });
};

// UV index → severity label + color
export const getUVInfo = (uvi) => {
  if (uvi <= 2) return { label: 'Low', color: '#10b981' };
  if (uvi <= 5) return { label: 'Mod', color: '#fbbf24' };
  if (uvi <= 7) return { label: 'High', color: '#f97316' };
  if (uvi <= 10) return { label: 'V.High', color: '#ef4444' };
  return { label: 'Extreme', color: '#a855f7' };
};
