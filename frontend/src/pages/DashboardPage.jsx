import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader, Cloud } from 'lucide-react';
import { locationsAPI } from '../services/api';
import weatherCache from '../services/weatherCache';
import QuickStatsBar from '../components/dashboard/QuickStatsBar';
import WindAnalysis from '../components/dashboard/WindAnalysis';
import AirQualityBreakdown from '../components/dashboard/AirQualityBreakdown';
import MetricsGrid from '../components/dashboard/MetricsGrid';
import TemperatureForecast from '../components/dashboard/TemperatureForecast';
import HourlyForecast from '../components/dashboard/HourlyForecast';
import SunWidget from '../components/dashboard/SunWidget';
import MoonWidget from '../components/dashboard/MoonWidget';
import WeatherMapWidget from '../components/dashboard/WeatherMapWidget';
import WeatherAlertBanner from '../components/dashboard/WeatherAlertBanner';

/**
 * DashboardPage - Full dashboard view for single location
 * 
 * OPTIMIZED VERSION:
 * - Uses weatherCache for smart caching (10 min TTL)
 * - Single API call (GetWeatherData) instead of multiple
 * - Background refresh for stale data
 * - Auto-refresh every 10 minutes
 * 
 * Route: /dashboard/:locationId
 * Example: /dashboard/dublin-ie
 */

const DashboardPage = () => {
  const { locationId } = useParams();
  const navigate = useNavigate();
  const userId = 'user123'; // TODO: Replace with real auth

  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Parse locationId (format: "dublin-ie")
  const parseLocationId = (id) => {
    const parts = id.split('-');
    const country = parts.pop().toUpperCase();
    const name = parts.join('-').split('-').map(w => 
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    return { name, country };
  };

  // Load dashboard data
  const loadDashboard = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { name, country } = parseLocationId(locationId);

      // Load location settings from database
      const locationsData = await locationsAPI.getUserLocations(userId);
      const locationSettings = locationsData.locations.find(
        loc => loc.locationName.toLowerCase() === name.toLowerCase() && 
               loc.country === country
      );

      if (!locationSettings) {
        setError('Location not found');
        return;
      }

      if (!locationSettings.latitude || !locationSettings.longitude) {
        setError('Location missing coordinates. Please delete and re-add this location.');
        return;
      }

      // Get weather data from cache (or fetch if needed)
      const data = await weatherCache.get(
        locationSettings.latitude,
        locationSettings.longitude,
        { forceRefresh }
      );

      setLocation({
        locationName: locationSettings.locationName,
        country: locationSettings.country,
        latitude: locationSettings.latitude,
        longitude: locationSettings.longitude,
        alertsEnabled: locationSettings.alertsEnabled,
        minTemp: locationSettings.minTemp,
        maxTemp: locationSettings.maxTemp,
      });

      setWeatherData(data);
      setLastUpdated(new Date(data.fetchedAt));

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationId, userId]);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing dashboard...');
      loadDashboard(true);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

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
  if (error || !location || !weatherData) {
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

  // Transform weatherData to the format components expect
  const weather = {
    temp: weatherData.current.temp,
    feelsLike: weatherData.current.feelsLike,
    humidity: weatherData.current.humidity,
    pressure: weatherData.current.pressure,
    condition: weatherData.current.condition,
    description: weatherData.current.description,
    icon: weatherData.current.icon,
    visibility: (weatherData.current.visibility || 10000) / 1000,
    clouds: weatherData.current.clouds || 0,
    wind: {
      speed: weatherData.current.windSpeed || 0,
      direction: weatherData.current.windDeg || 0,
      gust: weatherData.current.windGust || 0
    },
    airQuality: weatherData.airQuality
  };

  const forecast = {
    current: {
      timezone: weatherData.timezone,
      sunrise: weatherData.current.sunrise,
      sunset: weatherData.current.sunset,
    },
    // Transform hourly data - dt is already ISO string, rename to time
    hourly: weatherData.hourly.map(h => ({
      time: h.dt, // Already ISO string from API
      temp: h.temp,
      feelsLike: h.feelsLike,
      humidity: h.humidity,
      pop: h.pop,
      rain: h.rain,
      snow: h.snow,
      condition: h.condition,
      description: h.description,
      icon: h.icon,
      windSpeed: h.windSpeed
    })),
    // Transform daily data - dt is already ISO string, rename fields
    daily: weatherData.daily.map(d => ({
      date: d.dt, // Already ISO string from API
      tempHigh: d.tempMax,
      tempLow: d.tempMin,
      humidity: d.humidity,
      pop: d.pop,
      rain: d.rain,
      snow: d.snow,
      condition: d.condition,
      description: d.description,
      icon: d.icon,
      uvi: d.uvi,
      sunrise: d.sunrise,
      sunset: d.sunset,
      moonrise: d.moonrise,
      moonset: d.moonset,
      moonPhase: d.moonPhase
    })),
    alerts: weatherData.alerts || [],
    location: { lat: location.latitude, lon: location.longitude }
  };

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
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-white">
                    {location.locationName}, {location.country}
                  </h1>
                  <div className="flex items-center gap-2 px-3 py-1 bg-dark-elevated rounded-lg border border-dark-border">
                    <span className="text-gray-400 text-sm">🕐</span>
                    <span className="text-white font-mono text-lg">
                      {new Date().toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false,
                        timeZone: forecast?.current?.timezone || 'UTC'
                      })}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {new Date().toLocaleDateString('en-US', { 
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        timeZone: forecast?.current?.timezone || 'UTC'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Updated {Math.round((Date.now() - lastUpdated.getTime()) / 60000)} min ago
                </span>
              )}
              <button
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
                className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                         hover:bg-dark-border transition-colors text-sm font-medium
                         disabled:opacity-50"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Weather Alerts - Show if any active */}
        {forecast?.alerts && forecast.alerts.length > 0 && (
          <WeatherAlertBanner 
            alerts={forecast.alerts} 
            timezone={forecast?.current?.timezone}
          />
        )}

        {/* QuickStats Bar - Pass forecast for UV Index */}
        <QuickStatsBar weather={weather} forecast={forecast} />

        {/* Weather Map + Wind Analysis - Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
          {/* Weather Map - Takes 3 columns */}
          <div className="xl:col-span-3">
            <WeatherMapWidget 
              lat={location.latitude} 
              lon={location.longitude}
              locationName={location.locationName}
            />
          </div>
          
          {/* Wind Analysis - Takes 1 column */}
          <div className="xl:col-span-1">
            <WindAnalysis wind={weather.wind}
            lat={location.latitude}
            lon={location.longitude} />
          </div>
        </div>

        {/* Forecast Charts - Full Width */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
          {/* 24-Hour Forecast - First Position */}
          <HourlyForecast forecast={forecast} />

          {/* 7-Day Temperature Forecast - Second Position */}
          <TemperatureForecast forecast={forecast} />
        </div>

        {/* Bottom Row: Air Quality + Sun + Moon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Air Quality - Compact Summary */}
          <AirQualityBreakdown airQuality={weather.airQuality} compact={true} />

          {/* Sun Widget */}
          <SunWidget forecast={forecast} />
          
          {/* Moon Widget */}
          <MoonWidget forecast={forecast} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;