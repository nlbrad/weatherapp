/**
 * Widget Registry - Central manifest for all dashboard widgets
 *
 * Each widget declares its metadata, sizing constraints, and data requirements.
 * Components are lazy-loaded via React.lazy() for code splitting.
 */

import React from 'react';

// Lazy-loaded widget components
const lazyWidget = (importFn) => React.lazy(importFn);

export const WIDGET_REGISTRY = {
  // === Weather ===
  'current-conditions': {
    id: 'current-conditions',
    name: 'Current Conditions',
    description: 'Temperature, conditions, feels like, and forecast summary',
    icon: 'CloudSun',
    category: 'weather',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 12, h: 5 },
    component: lazyWidget(() => import('./widgets/CurrentConditionsWidget')),
    dataRequirements: ['weather', 'forecast'],
  },
  'wind': {
    id: 'wind',
    name: 'Wind',
    description: 'Wind speed, direction compass, and gusts',
    icon: 'Wind',
    category: 'weather',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 3 },
    maxSize: { w: 6, h: 7 },
    component: lazyWidget(() => import('./widgets/WindWidget')),
    dataRequirements: ['weather', 'location'],
  },
  'weather-map': {
    id: 'weather-map',
    name: 'Weather Map',
    description: 'Interactive Windy.com weather map',
    icon: 'Map',
    category: 'weather',
    defaultSize: { w: 8, h: 7 },
    minSize: { w: 6, h: 5 },
    maxSize: { w: 12, h: 10 },
    component: lazyWidget(() => import('./widgets/WeatherMapWidget')),
    dataRequirements: ['location'],
  },
  'weather-alerts': {
    id: 'weather-alerts',
    name: 'Weather Alerts',
    description: 'Active weather warnings and advisories',
    icon: 'AlertTriangle',
    category: 'weather',
    defaultSize: { w: 12, h: 1 },
    minSize: { w: 6, h: 1 },
    maxSize: { w: 12, h: 4 },
    component: lazyWidget(() => import('./widgets/WeatherAlertsWidget')),
    dataRequirements: ['forecast'],
  },
  'precipitation': {
    id: 'precipitation',
    name: 'Precipitation',
    description: 'Rain/snow probability timeline for the next 24 hours',
    icon: 'CloudRain',
    category: 'weather',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
    maxSize: { w: 8, h: 5 },
    component: lazyWidget(() => import('./widgets/PrecipitationWidget')),
    dataRequirements: ['forecast'],
  },
  'pressure-trend': {
    id: 'pressure-trend',
    name: 'Pressure & Visibility',
    description: 'Barometric pressure, visibility, and dew point',
    icon: 'Gauge',
    category: 'weather',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    component: lazyWidget(() => import('./widgets/PressureTrendWidget')),
    dataRequirements: ['weather'],
  },

  // === Forecast ===
  'hourly-forecast': {
    id: 'hourly-forecast',
    name: '24-Hour Forecast',
    description: 'Hourly conditions, temperature, rain, wind, and humidity',
    icon: 'Clock',
    category: 'forecast',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 7 },
    component: lazyWidget(() => import('./widgets/HourlyForecastWidget')),
    dataRequirements: ['forecast'],
  },
  'temperature-forecast': {
    id: 'temperature-forecast',
    name: '7-Day Forecast',
    description: '7-day outlook with temperature range, rain, wind, and conditions',
    icon: 'Calendar',
    category: 'forecast',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 7 },
    component: lazyWidget(() => import('./widgets/TemperatureForecastWidget')),
    dataRequirements: ['forecast'],
  },

  // === Astronomy ===
  'sun': {
    id: 'sun',
    name: 'Sun',
    description: 'Sunrise, sunset, and daylight hours',
    icon: 'Sun',
    category: 'astronomy',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 5 },
    component: lazyWidget(() => import('./widgets/SunWidget')),
    dataRequirements: ['forecast'],
  },
  'moon': {
    id: 'moon',
    name: 'Moon',
    description: 'Moon phase, illumination, rise/set times',
    icon: 'Moon',
    category: 'astronomy',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 5 },
    component: lazyWidget(() => import('./widgets/MoonWidget')),
    dataRequirements: ['forecast'],
  },
  'aurora-watch': {
    id: 'aurora-watch',
    name: 'Aurora Watch',
    description: 'Northern lights viewing conditions and Kp index',
    icon: 'Sparkles',
    category: 'astronomy',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: lazyWidget(() => import('./widgets/AuroraWatchWidget')),
    dataRequirements: ['scores'],
    scoreEndpoint: 'aurora',
  },
  'stargazing': {
    id: 'stargazing',
    name: 'Stargazing',
    description: 'Sky darkness score and best viewing conditions',
    icon: 'Star',
    category: 'astronomy',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: lazyWidget(() => import('./widgets/StargazingWidget')),
    dataRequirements: ['scores'],
    scoreEndpoint: 'sky',
  },

  // === Health & Safety ===
  'air-quality': {
    id: 'air-quality',
    name: 'Air Quality',
    description: 'Air quality index and key pollutants',
    icon: 'Wind',
    category: 'health',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: lazyWidget(() => import('./widgets/AirQualityWidget')),
    dataRequirements: ['weather'],
  },
  'uv-index': {
    id: 'uv-index',
    name: 'UV Index',
    description: 'Current UV level with protection advice',
    icon: 'Sun',
    category: 'health',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    component: lazyWidget(() => import('./widgets/UVIndexWidget')),
    dataRequirements: ['weather', 'forecast'],
  },
  'comfort-index': {
    id: 'comfort-index',
    name: 'Comfort Index',
    description: 'Feels-like temperature, humidity, and comfort level',
    icon: 'Thermometer',
    category: 'health',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    component: lazyWidget(() => import('./widgets/ComfortIndexWidget')),
    dataRequirements: ['weather'],
  },

  // === Activities ===
  'outdoor-activities': {
    id: 'outdoor-activities',
    name: 'Outdoor Activities',
    description: 'Activity scores for hiking, cycling, running, and more',
    icon: 'Mountain',
    category: 'activities',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 8, h: 6 },
    component: lazyWidget(() => import('./widgets/OutdoorActivitiesWidget')),
    dataRequirements: ['scores'],
    scoreEndpoint: 'outdoor',
  },
  'swimming-marine': {
    id: 'swimming-marine',
    name: 'Swimming & Marine',
    description: 'Sea swimming conditions, water temp, and wave data',
    icon: 'Waves',
    category: 'activities',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    maxSize: { w: 6, h: 6 },
    component: lazyWidget(() => import('./widgets/SwimmingMarineWidget')),
    dataRequirements: ['scores'],
    scoreEndpoint: 'swimming',
  },
};

export const WIDGET_CATEGORIES = {
  weather: { label: 'Weather', icon: 'Cloud', color: 'text-cyan-400' },
  forecast: { label: 'Forecast', icon: 'Calendar', color: 'text-blue-400' },
  astronomy: { label: 'Astronomy', icon: 'Star', color: 'text-purple-400' },
  health: { label: 'Health & Safety', icon: 'Heart', color: 'text-green-400' },
  activities: { label: 'Activities', icon: 'Mountain', color: 'text-orange-400' },
};

// Default layout for large screens (12 columns)
export const DEFAULT_LAYOUTS = {
  lg: [
    // Row 0-1: Alerts banner
    { i: 'weather-alerts', x: 0, y: 0, w: 12, h: 1 },
    // Row 1-3: Current conditions + Wind + UV (all same height, no gaps)
    { i: 'current-conditions', x: 0, y: 1, w: 6, h: 3 },
    { i: 'wind', x: 6, y: 1, w: 3, h: 3 },
    { i: 'uv-index', x: 9, y: 1, w: 3, h: 3 },
    // Row 4-10: Weather Map prominent full width
    { i: 'weather-map', x: 0, y: 4, w: 12, h: 7 },
    // Row 11-14: Forecasts side by side
    { i: 'hourly-forecast', x: 0, y: 11, w: 6, h: 4 },
    { i: 'temperature-forecast', x: 6, y: 11, w: 6, h: 4 },
    // Row 15-17: Air quality + Sun + Moon (3 equal columns)
    { i: 'air-quality', x: 0, y: 15, w: 4, h: 3 },
    { i: 'sun', x: 4, y: 15, w: 4, h: 3 },
    { i: 'moon', x: 8, y: 15, w: 4, h: 3 },
  ],
  md: [
    { i: 'weather-alerts', x: 0, y: 0, w: 8, h: 1 },
    { i: 'current-conditions', x: 0, y: 1, w: 5, h: 3 },
    { i: 'wind', x: 5, y: 1, w: 3, h: 3 },
    { i: 'weather-map', x: 0, y: 4, w: 8, h: 7 },
    { i: 'hourly-forecast', x: 0, y: 11, w: 8, h: 4 },
    { i: 'temperature-forecast', x: 0, y: 15, w: 8, h: 4 },
    { i: 'air-quality', x: 0, y: 19, w: 4, h: 3 },
    { i: 'uv-index', x: 4, y: 19, w: 4, h: 3 },
    { i: 'sun', x: 0, y: 22, w: 4, h: 3 },
    { i: 'moon', x: 4, y: 22, w: 4, h: 3 },
  ],
  sm: [
    { i: 'weather-alerts', x: 0, y: 0, w: 4, h: 1 },
    { i: 'current-conditions', x: 0, y: 1, w: 4, h: 3 },
    { i: 'weather-map', x: 0, y: 4, w: 4, h: 6 },
    { i: 'hourly-forecast', x: 0, y: 10, w: 4, h: 4 },
    { i: 'temperature-forecast', x: 0, y: 14, w: 4, h: 4 },
    { i: 'wind', x: 0, y: 18, w: 2, h: 4 },
    { i: 'uv-index', x: 2, y: 18, w: 2, h: 3 },
    { i: 'air-quality', x: 0, y: 22, w: 4, h: 3 },
    { i: 'sun', x: 0, y: 25, w: 2, h: 3 },
    { i: 'moon', x: 2, y: 25, w: 2, h: 3 },
  ],
  xs: [
    { i: 'weather-alerts', x: 0, y: 0, w: 2, h: 1 },
    { i: 'current-conditions', x: 0, y: 1, w: 2, h: 3 },
    { i: 'weather-map', x: 0, y: 4, w: 2, h: 6 },
    { i: 'hourly-forecast', x: 0, y: 10, w: 2, h: 4 },
    { i: 'temperature-forecast', x: 0, y: 14, w: 2, h: 4 },
    { i: 'wind', x: 0, y: 18, w: 2, h: 4 },
    { i: 'uv-index', x: 0, y: 22, w: 2, h: 3 },
    { i: 'air-quality', x: 0, y: 25, w: 2, h: 3 },
    { i: 'sun', x: 0, y: 28, w: 2, h: 3 },
    { i: 'moon', x: 0, y: 31, w: 2, h: 3 },
  ],
};

export const DEFAULT_ENABLED_WIDGETS = [
  'weather-alerts', 'current-conditions', 'wind', 'uv-index',
  'hourly-forecast', 'temperature-forecast', 'weather-map',
  'air-quality', 'sun', 'moon',
];

export const GRID_CONFIG = {
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480 },
  cols: { lg: 12, md: 8, sm: 4, xs: 2 },
  rowHeight: 60,
  margin: [16, 16],
};
