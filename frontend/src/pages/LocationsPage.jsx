/**
 * LocationsPage.jsx - Weather Locations
 *
 * Shows all user locations with live weather summaries.
 * Each card includes: current conditions, today's forecast,
 * upcoming hours, and location management actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Bell, BellOff, ChevronRight, Loader,
  RefreshCw, Trash2, Plus, AlertCircle, Thermometer,
  Droplets, Wind, Eye, ArrowUp, ArrowDown, Sun
} from 'lucide-react';
import { useAuth } from '../auth';
import { locationsAPI, weatherAPI } from '../services/api';
import { getWeatherEmoji, getTempColor } from '../components/dashboard/widgets/weatherFormatUtils';

const LocationsPage = () => {
  const navigate = useNavigate();
  const { getUserId } = useAuth();
  const userId = getUserId();

  // State
  const [locations, setLocations] = useState([]);
  const [weatherData, setWeatherData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load user locations
   */
  const loadLocations = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await locationsAPI.getUserLocations(userId);
      setLocations(data.locations || []);

      // Fetch weather for each location (in parallel)
      const weatherPromises = (data.locations || []).map(async (loc) => {
        if (loc.latitude && loc.longitude) {
          try {
            const weather = await weatherAPI.getWeatherData(
              loc.latitude,
              loc.longitude,
              { country: loc.country }
            );
            return { key: `${loc.locationName}-${loc.country}`, data: weather };
          } catch {
            return { key: `${loc.locationName}-${loc.country}`, data: null };
          }
        }
        return { key: `${loc.locationName}-${loc.country}`, data: null };
      });

      const weatherResults = await Promise.all(weatherPromises);
      const weatherMap = {};
      weatherResults.forEach(result => {
        weatherMap[result.key] = result.data;
      });
      setWeatherData(weatherMap);

    } catch (err) {
      console.error('Failed to load locations:', err);
      setError('Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Load on mount
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  /**
   * Set location as primary
   */
  const setPrimary = async (location) => {
    try {
      setLocations(prev => prev.map(loc => ({
        ...loc,
        isPrimary: loc.locationName === location.locationName && loc.country === location.country
      })));

      await locationsAPI.saveLocation({
        userId,
        ...location,
        isPrimary: true,
      });

      loadLocations(true);
    } catch (err) {
      console.error('Failed to set primary:', err);
      loadLocations(true);
    }
  };

  /**
   * Toggle alerts for location
   */
  const toggleAlerts = async (location) => {
    try {
      setLocations(prev => prev.map(loc =>
        loc.locationName === location.locationName && loc.country === location.country
          ? { ...loc, alertsEnabled: !loc.alertsEnabled }
          : loc
      ));

      await locationsAPI.saveLocation({
        userId,
        ...location,
        alertsEnabled: !location.alertsEnabled,
      });
    } catch (err) {
      console.error('Failed to toggle alerts:', err);
      loadLocations(true);
    }
  };

  /**
   * Delete location
   */
  const deleteLocation = async (location) => {
    if (!window.confirm(`Delete ${location.locationName}? This cannot be undone.`)) {
      return;
    }

    try {
      await locationsAPI.deleteLocation(userId, location.locationName);
      setLocations(prev => prev.filter(loc =>
        !(loc.locationName === location.locationName && loc.country === location.country)
      ));
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete location.');
    }
  };

  /**
   * Navigate to dashboard for location
   */
  const viewDashboard = (location) => {
    const locationId = `${location.locationName.toLowerCase().replace(/\s+/g, '-')}-${location.country.toLowerCase()}`;
    navigate(`/dashboard/${locationId}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {locations.length} location{locations.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => loadLocations(true)}
          disabled={refreshing}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Empty State */}
      {locations.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
          <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No Locations Yet</h3>
          <p className="text-slate-400 text-sm mb-6">
            Add a location to see weather and start receiving alerts.
          </p>
          <button
            onClick={() => navigate('/locations/new')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium px-6 py-3 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Your First Location
          </button>
        </div>
      )}

      {/* Location Cards */}
      <div className="space-y-5">
        {locations.map(location => {
          const weatherKey = `${location.locationName}-${location.country}`;
          const weather = weatherData[weatherKey];

          return (
            <LocationWeatherCard
              key={weatherKey}
              location={location}
              weather={weather}
              onSetPrimary={setPrimary}
              onToggleAlerts={toggleAlerts}
              onDelete={deleteLocation}
              onViewDashboard={viewDashboard}
            />
          );
        })}
      </div>

      {/* Add Location CTA */}
      {locations.length > 0 && (
        <div className="text-center pt-4">
          <button
            onClick={() => navigate('/locations/new')}
            className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add Another Location
          </button>
        </div>
      )}
    </div>
  );
};


/**
 * LocationWeatherCard - Individual location card with weather summary
 */
function LocationWeatherCard({ location, weather, onSetPrimary, onToggleAlerts, onDelete, onViewDashboard }) {
  const current = weather?.current;
  const daily = weather?.daily;
  const hourly = weather?.hourly;
  const alerts = weather?.alerts;
  const today = daily?.[0];

  const emoji = current ? getWeatherEmoji(current.condition, current.icon) : null;
  const tempColor = current ? getTempColor(current.temp) : null;

  // Get next 6 hours for mini forecast
  const upcomingHours = (hourly || []).slice(0, 6);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
      {/* Active weather alerts banner */}
      {alerts && alerts.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-amber-400 text-xs font-medium truncate">
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}: {alerts[0].event}
          </p>
        </div>
      )}

      <div className="p-5">
        {/* Header: Location name + badges */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            location.isPrimary
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-700 text-slate-400'
          }`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold truncate">
                {location.locationName}, {location.country}
              </h3>
              {location.isPrimary && (
                <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                  PRIMARY
                </span>
              )}
            </div>
            <p className="text-slate-500 text-xs flex items-center gap-2">
              {location.alertsEnabled ? (
                <>
                  <Bell className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Alerts enabled</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3 h-3" />
                  <span>Alerts disabled</span>
                </>
              )}
            </p>
          </div>

          {/* Current temp - large display */}
          {current && (
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl">{emoji}</span>
                <span className="text-3xl font-bold text-white" style={{ color: tempColor }}>
                  {Math.round(current.temp)}°
                </span>
              </div>
              <p className="text-slate-500 text-xs capitalize mt-0.5">{current.description}</p>
            </div>
          )}
        </div>

        {/* Weather Summary Grid */}
        {current && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {/* Feels Like */}
            <div className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Thermometer className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Feels like</span>
              </div>
              <p className="text-white text-sm font-semibold">{Math.round(current.feelsLike)}°C</p>
            </div>

            {/* Humidity */}
            <div className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Droplets className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Humidity</span>
              </div>
              <p className="text-white text-sm font-semibold">{current.humidity}%</p>
            </div>

            {/* Wind */}
            <div className="bg-slate-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Wind className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Wind</span>
              </div>
              <p className="text-white text-sm font-semibold">{Math.round(current.windSpeed)} km/h</p>
            </div>

            {/* Today's Hi / Lo */}
            {today ? (
              <div className="bg-slate-800/50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sun className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Hi / Lo</span>
                </div>
                <p className="text-white text-sm font-semibold flex items-center gap-1">
                  <ArrowUp className="w-3 h-3 text-orange-400" />
                  {Math.round(today.tempMax)}°
                  <span className="text-slate-600 mx-0.5">/</span>
                  <ArrowDown className="w-3 h-3 text-blue-400" />
                  {Math.round(today.tempMin)}°
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Visibility</span>
                </div>
                <p className="text-white text-sm font-semibold">{(current.visibility / 1000).toFixed(0)} km</p>
              </div>
            )}
          </div>
        )}

        {/* Mini Hourly Forecast - next 6 hours */}
        {upcomingHours.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Next hours</p>
            <div className="flex gap-1.5 overflow-x-auto">
              {upcomingHours.map((hour, i) => {
                const hourTime = new Date(hour.dt);
                const hourLabel = hourTime.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }).replace(/^24/, '00');
                const hourEmoji = getWeatherEmoji(hour.condition, hour.icon);
                const rainChance = Math.round((hour.pop || 0) * 100);

                return (
                  <div key={i} className="flex-1 min-w-[48px] bg-slate-800/40 rounded-lg py-2 px-1 text-center">
                    <p className="text-[10px] text-slate-500 font-mono">{hourLabel}</p>
                    <p className="text-sm my-0.5">{hourEmoji}</p>
                    <p className="text-xs font-semibold text-white">{Math.round(hour.temp)}°</p>
                    {rainChance > 0 && (
                      <p className="text-[9px] text-blue-400 mt-0.5">{rainChance}%</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-Day Outlook */}
        {daily && daily.length > 1 && (
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">3-day outlook</p>
            <div className="space-y-1">
              {daily.slice(1, 4).map((day, i) => {
                const dayDate = new Date(day.dt);
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dayEmoji = getWeatherEmoji(day.condition, day.icon);
                const rainChance = Math.round((day.pop || 0) * 100);

                return (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <span className="text-xs text-slate-400 w-8 font-medium">{dayName}</span>
                    <span className="text-sm">{dayEmoji}</span>
                    <span className="text-xs text-slate-500 capitalize flex-1 truncate">{day.description}</span>
                    {rainChance > 0 && (
                      <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5" />{rainChance}%
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs w-16 justify-end">
                      <span className="text-orange-400 font-medium">{Math.round(day.tempMax)}°</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-blue-400 font-medium">{Math.round(day.tempMin)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No weather data fallback */}
        {!current && (
          <div className="bg-slate-800/30 rounded-lg p-4 text-center mb-4">
            <p className="text-slate-500 text-sm">Weather data unavailable</p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
          {!location.isPrimary && (
            <button
              onClick={() => onSetPrimary(location)}
              className="text-slate-400 hover:text-amber-400 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
            >
              <Star className="w-4 h-4" />
              Set Primary
            </button>
          )}

          <button
            onClick={() => onToggleAlerts(location)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
              location.alertsEnabled
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            {location.alertsEnabled ? (
              <>
                <BellOff className="w-4 h-4" />
                Disable Alerts
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                Enable Alerts
              </>
            )}
          </button>

          <button
            onClick={() => onDelete(location)}
            className="text-slate-400 hover:text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>

          <button
            onClick={() => onViewDashboard(location)}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors flex items-center gap-1"
          >
            Full Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationsPage;
