import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Cloud } from 'lucide-react';
import { weatherAPI, locationsAPI } from '../services/api';

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
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Phase 2.2: Empty shell with placeholder */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-12 text-center">
          <Cloud className="w-20 h-20 text-primary mx-auto mb-6 opacity-50" />
          <h2 className="text-2xl font-bold text-white mb-3">
            Dashboard Coming Soon
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            We're building amazing dashboard widgets for {location.locationName}. 
            Charts, forecasts, and detailed metrics will appear here in Phase 2.3!
          </p>

          {/* Current Weather Preview (so it's not completely empty) */}
          <div className="bg-dark-elevated border border-dark-border rounded-lg p-6 max-w-sm mx-auto">
            <p className="text-sm text-gray-400 mb-2">Current Weather</p>
            <p className="text-5xl font-bold font-mono text-white mb-2">
              {weather.temp.toFixed(1)}°
            </p>
            <p className="text-gray-300 capitalize mb-4">{weather.description}</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Feels</p>
                <p className="text-white font-mono">{weather.feelsLike.toFixed(1)}°</p>
              </div>
              <div>
                <p className="text-gray-500">Humidity</p>
                <p className="text-white font-mono">{weather.humidity}%</p>
              </div>
              <div>
                <p className="text-gray-500">Wind</p>
                <p className="text-white font-mono">{weather.wind.speed} km/h</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-8 px-6 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                     hover:bg-dark-border transition-colors"
          >
            Back to Summary View
          </button>
        </div>

        {/* TODO Phase 2.3: Add widgets here */}
        {/* 
        - QuickStatsBar
        - TemperatureForecast chart
        - HourlyForecast chart
        - WindAnalysis with compass
        - AirQualityBreakdown
        - etc.
        */}
      </div>
    </div>
  );
};

export default DashboardPage;
