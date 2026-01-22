import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Plus, Loader, Settings as SettingsIcon } from 'lucide-react';
import { weatherAPI, locationsAPI, alertsAPI } from '../services/api';
import LocationSummaryCard from '../components/summary/LocationSummaryCard';

/**
 * LandingPage - Main view with location summary cards
 * 
 * Features:
 * - Grid of compact summary cards
 * - Add location button
 * - Top navigation
 * - Refresh functionality
 */

const LandingPage = () => {
  const navigate = useNavigate();
  const userId = 'user123'; // TODO: Replace with real auth

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ 
    name: '', 
    country: '',
    minTemp: 0,
    maxTemp: 30
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationsAPI.getUserLocations(userId);
      
      const locationsWithWeather = await Promise.all(
        data.locations.map(async (loc) => {
          try {
            const weatherData = await weatherAPI.getWeather(loc.locationName, loc.country);
            return {
              // Location info
              locationName: loc.locationName,
              country: loc.country,
              alertsEnabled: loc.alertsEnabled,
              minTemp: loc.minTemp,
              maxTemp: loc.maxTemp,
              // Weather info
              weather: {
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
              }
            };
          } catch (err) {
            console.error(`Failed to fetch weather for ${loc.locationName}:`, err);
            return null;
          }
        })
      );
      
      setLocations(locationsWithWeather.filter(loc => loc !== null));
    } catch (err) {
      setError('Failed to load locations. Make sure the backend is running.');
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLocation = async () => {
    if (!newLocation.name || !newLocation.country) {
      alert('Please enter both city name and country code');
      return;
    }

    try {
      setSaving(true);
      
      await locationsAPI.saveLocation({
        userId: userId,
        locationName: newLocation.name,
        country: newLocation.country,
        alertsEnabled: true,
        minTemp: parseInt(newLocation.minTemp),
        maxTemp: parseInt(newLocation.maxTemp),
      });

      await loadLocations();
      
      setNewLocation({ name: '', country: '', minTemp: 0, maxTemp: 30 });
      setShowAddLocation(false);
    } catch (err) {
      alert('Failed to save location. Please try again.');
      console.error('Error saving location:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeLocation = async (locationToRemove) => {
    if (window.confirm(`Remove ${locationToRemove.locationName}?`)) {
      // TODO: Add delete API endpoint
      setLocations(locations.filter(
        loc => loc.locationName !== locationToRemove.locationName || 
               loc.country !== locationToRemove.country
      ));
    }
  };

  const triggerAlertCheck = async () => {
    try {
      await alertsAPI.checkAlerts();
      alert('Alert check triggered! Check your WhatsApp for any alerts.');
    } catch (err) {
      alert('Failed to trigger alert check');
      console.error('Error triggering alerts:', err);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-sm border-b border-dark-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <Cloud className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-white">Weather Alert System</h1>
                <p className="text-sm text-gray-400">Your personal weather intelligence</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={triggerAlertCheck}
                className="px-4 py-2 bg-accent-green text-white rounded-lg 
                         hover:bg-accent-green/80 transition-colors text-sm font-medium"
              >
                Check Alerts
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
                title="Settings"
              >
                <SettingsIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Your Locations</h2>
            <p className="text-sm text-gray-400 mt-1">
              {locations.length} location{locations.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadLocations}
              className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                       hover:bg-dark-border transition-colors text-sm font-medium"
            >
              Refresh
            </button>
            <button
              onClick={() => setShowAddLocation(!showAddLocation)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg 
                       hover:bg-primary-dark transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Location
            </button>
          </div>
        </div>

        {/* Add Location Form */}
        {showAddLocation && (
          <div className="bg-dark-surface border border-dark-border rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Add New Location</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  City Name
                </label>
                <input
                  type="text"
                  placeholder="Dublin"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-white placeholder-gray-500
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Country Code
                </label>
                <input
                  type="text"
                  placeholder="IE"
                  value={newLocation.country}
                  onChange={(e) => setNewLocation({...newLocation, country: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-white placeholder-gray-500
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Min Temp (°C)
                </label>
                <input
                  type="number"
                  value={newLocation.minTemp}
                  onChange={(e) => setNewLocation({...newLocation, minTemp: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-white
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Temp (°C)
                </label>
                <input
                  type="number"
                  value={newLocation.maxTemp}
                  onChange={(e) => setNewLocation({...newLocation, maxTemp: e.target.value})}
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-white
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddLocation(false);
                  setNewLocation({ name: '', country: '', minTemp: 0, maxTemp: 30 });
                }}
                className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                         hover:bg-dark-border transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addLocation}
                disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg 
                         hover:bg-primary-dark transition-colors text-sm font-medium
                         disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Location'}
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 mb-6">
            <p className="text-accent-red">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-400">Loading your locations...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && locations.length === 0 && (
          <div className="bg-dark-surface border border-dark-border rounded-xl p-12 text-center">
            <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No locations yet</h3>
            <p className="text-gray-500 mb-6">Add your first location to start tracking weather</p>
            <button
              onClick={() => setShowAddLocation(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg 
                       hover:bg-primary-dark transition-colors font-medium"
            >
              Add Your First Location
            </button>
          </div>
        )}

        {/* Location Cards Grid */}
        {!loading && locations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
              <LocationSummaryCard
                key={`${location.locationName}-${location.country}`}
                location={location}
                weather={location.weather}
                onDelete={removeLocation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
