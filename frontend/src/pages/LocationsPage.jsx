/**
 * LocationsPage.jsx - Alert Locations Management
 * 
 * Focuses on managing locations FOR ALERTS (not just weather viewing).
 * Dashboard access is secondary (via "View Dashboard" link).
 * 
 * Features:
 * - List of saved locations
 * - Set primary alert location
 * - Enable/disable alerts per location
 * - Quick weather preview
 * - Link to full dashboard (secondary)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Star, Bell, BellOff, ChevronRight, Loader, 
  RefreshCw, Trash2, Plus, AlertCircle, Thermometer,
  CloudRain, Wind
} from 'lucide-react';
import { useAuth } from '../auth';
import { locationsAPI, weatherAPI } from '../services/api';

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
              loc.longitude
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
      // Optimistic update
      setLocations(prev => prev.map(loc => ({
        ...loc,
        isPrimary: loc.locationName === location.locationName && loc.country === location.country
      })));

      await locationsAPI.saveLocation({
        userId,
        ...location,
        isPrimary: true,
      });

      // Reload to ensure consistency
      loadLocations(true);
    } catch (err) {
      console.error('Failed to set primary:', err);
      loadLocations(true); // Reload to revert
    }
  };

  /**
   * Toggle alerts for location
   */
  const toggleAlerts = async (location) => {
    try {
      // Optimistic update
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
      loadLocations(true); // Reload to revert
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
          <p className="text-slate-400">Loading locations...</p>
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
          {locations.length} location{locations.length !== 1 ? 's' : ''} configured for alerts
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
            Add a location to start receiving weather alerts.
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
      <div className="space-y-4">
        {locations.map(location => {
          const weatherKey = `${location.locationName}-${location.country}`;
          const weather = weatherData[weatherKey];

          return (
            <div 
              key={weatherKey}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  location.isPrimary 
                    ? 'bg-amber-500/20 text-amber-400' 
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  <MapPin className="w-6 h-6" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-semibold truncate">
                      {location.locationName}, {location.country}
                    </h3>
                    {location.isPrimary && (
                      <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full flex-shrink-0">
                        PRIMARY
                      </span>
                    )}
                  </div>
                  
                  {/* Alert Status */}
                  <p className="text-slate-500 text-sm flex items-center gap-2">
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

                {/* Weather Preview */}
                {weather && (
                  <div className="text-right hidden sm:block">
                    <p className="text-white text-2xl font-bold">
                      {Math.round(weather.current?.temp || 0)}°C
                    </p>
                    <p className="text-slate-500 text-sm capitalize">
                      {weather.current?.description || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>

              {/* Weather Details (Mobile) */}
              {weather && (
                <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 sm:hidden">
                  <div className="text-center">
                    <Thermometer className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-white font-medium">{Math.round(weather.current?.temp || 0)}°C</p>
                  </div>
                  <div className="text-center">
                    <CloudRain className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-white font-medium">{weather.current?.humidity || 0}%</p>
                  </div>
                  <div className="text-center">
                    <Wind className="w-4 h-4 text-slate-500 mx-auto mb-1" />
                    <p className="text-white font-medium">{Math.round((weather.current?.windSpeed || 0) * 3.6)} km/h</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                {!location.isPrimary && (
                  <button 
                    onClick={() => setPrimary(location)}
                    className="text-slate-400 hover:text-amber-400 text-sm px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                  >
                    <Star className="w-4 h-4" />
                    Set Primary
                  </button>
                )}
                
                <button 
                  onClick={() => toggleAlerts(location)}
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
                  onClick={() => deleteLocation(location)}
                  className="text-slate-400 hover:text-red-400 text-sm px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>

                <button 
                  onClick={() => viewDashboard(location)}
                  className="ml-auto text-cyan-400 hover:text-cyan-300 text-sm px-3 py-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors flex items-center gap-1"
                >
                  View Dashboard
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
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

export default LocationsPage;
