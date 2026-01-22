import React, { useState, useEffect } from 'react';
import { Cloud, Plus, Trash2, Settings, MapPin, AlertCircle, Loader } from 'lucide-react';
import { weatherAPI, locationsAPI, alertsAPI } from './services/api';
import WeatherCard from './components/WeatherCard';

export default function WeatherAlertApp() {
  const userId = 'user123';
  
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
  const [activeTab, setActiveTab] = useState('dashboard');
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
              // Weather info (complete structure for WeatherCard)
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
                airQuality: weatherData.airQuality // Include air quality data
              }
            };
          } catch (err) {
            console.error(`Failed to fetch weather for ${loc.locationName}:`, err);
            return null; // Filter out failed locations
          }
        })
      );
      
      // Filter out nulls (failed API calls)
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

  const removeLocation = async (location) => {
    if (window.confirm(`Remove ${location.locationName}?`)) {
      // Note: Add delete API call here when endpoint is ready
      setLocations(locations.filter(loc => loc.locationName !== location.locationName));
    }
  };

  const editLocation = (location) => {
    // TODO: Open edit modal
    console.log('Edit location:', location);
    alert('Edit functionality coming soon!');
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
    <div className="min-h-screen bg-dark-bg p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-10 h-10 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-white">Weather Alert System</h1>
                <p className="text-gray-400">Get WhatsApp alerts for weather changes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={triggerAlertCheck}
                className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-colors"
                title="Manually check for alerts"
              >
                Check Alerts Now
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="p-3 rounded-lg hover:bg-dark-elevated transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent-red" />
            <p className="text-accent-red">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg mb-6">
          <div className="flex border-b border-dark-border">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'alerts'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Alert Settings
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Your Locations</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadLocations}
                  className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg hover:bg-dark-border transition-colors"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowAddLocation(!showAddLocation)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Location
                </button>
              </div>
            </div>

            {/* Add Location Form */}
            {showAddLocation && (
              <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Add New Location</h3>
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
                <div className="flex justify-end gap-2">
                  <button
                    onClick={addLocation}
                    disabled={saving}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark 
                             transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLocation(false);
                      setNewLocation({ name: '', country: '', minTemp: 0, maxTemp: 30 });
                    }}
                    className="bg-dark-elevated text-gray-300 px-6 py-2 rounded-lg 
                             hover:bg-dark-border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-gray-400">Loading locations...</span>
              </div>
            )}

            {/* No Locations State */}
            {!loading && locations.length === 0 && (
              <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg p-12 text-center">
                <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No locations yet</h3>
                <p className="text-gray-500 mb-4">Add your first location to start receiving weather alerts</p>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Add Location
                </button>
              </div>
            )}

            {/* Enhanced Weather Cards */}
            {!loading && locations.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {locations.map((location) => (
                  <WeatherCard
                    key={`${location.locationName}-${location.country}`}
                    location={location}
                    weather={location.weather}
                    onDelete={removeLocation}
                    onEdit={editLocation}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alert Settings Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Alert Preferences</h2>
            
            <div className="space-y-6">
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                <p className="text-primary">
                  Temperature thresholds are set individually for each location when you add them.
                  Use the edit button on each weather card to modify alert settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">
                  Alert Types (Coming Soon)
                </label>
                <div className="space-y-3">
                  {['Heavy Rain', 'Storm Warning', 'Extreme Temperature', 'High Wind', 'Snow'].map(alert => (
                    <label key={alert} className="flex items-center gap-3 cursor-not-allowed opacity-50">
                      <input
                        type="checkbox"
                        disabled
                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-gray-400">{alert}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-dark-surface border border-dark-border rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+353 1234 5678"
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-gray-500 placeholder-gray-600
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled
                />
                <p className="text-sm text-gray-500 mt-2">
                  Phone number configuration is currently managed in the backend settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Check Frequency
                </label>
                <select 
                  className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg 
                           text-gray-500
                           focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled
                >
                  <option>Every hour (Current)</option>
                  <option>Every 3 hours</option>
                  <option>Every 6 hours</option>
                  <option>Twice daily</option>
                  <option>Once daily</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  Automatic checks run every hour. Use "Check Alerts Now" button for manual checks.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 bg-dark-elevated rounded-lg border border-dark-border">
                <div>
                  <div className="font-semibold text-white">Connection Status</div>
                  <div className="text-sm text-gray-400">Backend API</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${error ? 'bg-accent-red' : 'bg-accent-green'}`}></div>
                  <span className="text-sm text-gray-400">{error ? 'Disconnected' : 'Connected'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}