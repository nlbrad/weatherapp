import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Cloud } from 'lucide-react';
import { weatherAPI, locationsAPI } from '../services/api';
import QuickStatsBar from '../components/dashboard/QuickStatsBar';
import WindAnalysis from '../components/dashboard/WindAnalysis';
import AirQualityBreakdown from '../components/dashboard/AirQualityBreakdown';
import MetricsGrid from '../components/dashboard/MetricsGrid';
import TemperatureForecast from '../components/dashboard/TemperatureForecast';
import HourlyForecast from '../components/dashboard/HourlyForecast';

/**
 * DashboardPage - Full dashboard view for single location
 * 
 * Phase 2.2: Empty shell with basic layout
 * Phase 2.3: Will add widgets (charts, gauges, etc.)
 * 
 * Route: /dashboard/:locationId
 * Example: /dashboard/dublin-ie
 */

const DashboardPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const userId = 'user123'; // TODO: Replace with real auth

  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Parse locationId (format: "dublin-ie")
  const parseLocationId = (id) => {
    const parts = id.split('-');
    const country = parts.pop().toUpperCase();
    const name = parts.join('-').split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    return { name, country };
  };

  useEffect(() => {
    loadDashboard();
  }, [locationId]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const { name, country } = parseLocationId(locationId);

      // Load location settings
      const locationsData = await locationsAPI.getUserLocations(userId);
      const locationSettings = locationsData.locations.find(
        loc => loc.locationName.toLowerCase() === name.toLowerCase() && 
               loc.country === country
      );

      if (!locationSettings) {
        setError('Location not found');
        return;
      }

      // Load weather data
      const weatherData = await weatherAPI.getWeather(name, country);

      // Load forecast data
      const forecastData = await weatherAPI.getForecast(name, country);

      setLocation({
        locationName: locationSettings.locationName,
        country: locationSettings.country,
        alertsEnabled: locationSettings.alertsEnabled,
        minTemp: locationSettings.minTemp,
        maxTemp: locationSettings.maxTemp,
      });

      setWeather({
        temp: weatherData.weather.temp,
        feelsLike: weatherData.weather.feelsLike,
        tempMin: weatherData.weather.tempMin,
        tempMax: weatherData.weather.tempMax,
        humidity: weatherData.weather.humidity,
        pressure: weatherData.weather.pressure,
        condition: weatherData.weather.condition,
        description: weatherData.weather.description,
        visibility: weatherData.weather.visibility || 10,
        wind: {
          speed: weatherData.wind.speed,
          direction: weatherData.wind.direction
        },
        airQuality: weatherData.airQuality
      });

      setForecast(forecastData);

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !location || !weather) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {error || 'Location not found'}
          </h2>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg 
                     hover:bg-primary-dark transition-colors"
          >
            Back to Locations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-sm border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back Button & Breadcrumb */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
                title="Back to locations"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                  <span>Locations</span>
                  <span>/</span>
                  <span className="text-white">{location.locationName}</span>
                </div>
                <h1 className="text-2xl font-bold text-white">
                  {location.locationName}, {location.country}
                </h1>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboard}
                className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                         hover:bg-dark-border transition-colors text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* QuickStats Bar */}
        <QuickStatsBar weather={weather} />

        {/* Forecast Charts - Full Width at Top */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          {/* Temperature Forecast - Full Version */}
          {forecast && <TemperatureForecast forecast={forecast} />}

          {/* Hourly Forecast - Full Version */}
          {forecast && <HourlyForecast forecast={forecast} />}
        </div>

        {/* Detail Widgets Row: Wind + Air Quality + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Wind Analysis - Compact */}
          <WindAnalysis wind={weather.wind} />
          
          {/* Air Quality - Compact Summary */}
          <AirQualityBreakdown airQuality={weather.airQuality} compact={true} />
          
          {/* Metrics Grid - Compact */}
          <div className="bg-dark-surface border border-dark-border rounded-xl p-4" style={{ minHeight: '320px' }}>
            <h3 className="text-sm font-semibold text-white mb-4">Additional Metrics</h3>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Pressure</span>
                <span className="text-sm font-mono text-white">{weather.pressure} hPa</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Visibility</span>
                <span className="text-sm font-mono text-white">{weather.visibility} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Temp Range</span>
                <span className="text-sm font-mono text-white">{weather.tempMin.toFixed(0)}° - {weather.tempMax.toFixed(0)}°</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Feels Like</span>
                <span className="text-sm font-mono text-white">{weather.feelsLike.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Humidity</span>
                <span className="text-sm font-mono text-white">{weather.humidity}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Wind Speed</span>
                <span className="text-sm font-mono text-white">{weather.wind.speed} km/h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Wind Direction</span>
                <span className="text-sm font-mono text-white">{weather.wind.direction}°</span>
              </div>
            </div>
            
            {/* Current Condition */}
            <div className="mt-auto pt-4 border-t border-dark-border">
              <p className="text-xs text-gray-400 mb-1">Current Condition</p>
              <p className="text-sm text-white capitalize font-medium">{weather.description}</p>
              <p className="text-xs text-gray-500 mt-2">Last updated: Just now</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;