import React, { useState, useEffect } from 'react';
import { Cloud, Plus, Trash2, Settings, MapPin, AlertCircle, Loader } from 'lucide-react';
import { weatherAPI, locationsAPI, alertsAPI } from './services/api';

export default function WeatherAlertApp() {
  // For demo purposes, using a hardcoded userId
  // In production, this would come from authentication
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

  // Load user's locations on mount
  useEffect(() => {
    loadLocations();
  }, []);

  // Fetch locations from backend
  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationsAPI.getUserLocations(userId);
      
      // Fetch current weather for each location
      const locationsWithWeather = await Promise.all(
        data.locations.map(async (loc) => {
          try {
            const weather = await weatherAPI.getWeather(loc.locationName, loc.country);
            return {
              id: `${loc.locationName}-${loc.country}`,
              name: loc.locationName,
              country: loc.country,
              temp: weather.weather.temp,
              condition: weather.weather.description,
              alerts: loc.alertsEnabled,
              minTemp: loc.minTemp,
              maxTemp: loc.maxTemp,
            };
          } catch (err) {
            console.error(`Failed to fetch weather for ${loc.locationName}:`, err);
            return {
              id: `${loc.locationName}-${loc.country}`,
              name: loc.locationName,
              country: loc.country,
              temp: '--',
              condition: 'Unable to load',
              alerts: loc.alertsEnabled,
              minTemp: loc.minTemp,
              maxTemp: loc.maxTemp,
            };
          }
        })
      );
      
      setLocations(locationsWithWeather);
    } catch (err) {
      setError('Failed to load locations. Make sure the backend is running.');
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a new location
  const addLocation = async () => {
    if (!newLocation.name || !newLocation.country) {
      alert('Please enter both city name and country code');
      return;
    }

    try {
      setSaving(true);
      
      // Save to backend
      await locationsAPI.saveLocation({
        userId: userId,
        locationName: newLocation.name,
        country: newLocation.country,
        alertsEnabled: true,
        minTemp: parseInt(newLocation.minTemp),
        maxTemp: parseInt(newLocation.maxTemp),
      });

      // Reload locations to get the updated list
      await loadLocations();
      
      // Reset form
      setNewLocation({ name: '', country: '', minTemp: 0, maxTemp: 30 });
      setShowAddLocation(false);
    } catch (err) {
      alert('Failed to save location. Please try again.');
      console.error('Error saving location:', err);
    } finally {
      setSaving(false);
    }
  };

  // Remove a location
  const removeLocation = async (locationToRemove) => {
    // Note: We don't have a delete endpoint yet, so we'll just remove from UI
    // In a full implementation, you'd call a backend delete endpoint here
    setLocations(locations.filter(loc => loc.id !== locationToRemove.id));
  };

  // Toggle alerts for a location
  const toggleAlerts = async (locationId) => {
    const location = locations.find(loc => loc.id === locationId);
    if (!location) return;

    try {
      // Update in backend
      await locationsAPI.saveLocation({
        userId: userId,
        locationName: location.name,
        country: location.country,
        alertsEnabled: !location.alerts,
        minTemp: location.minTemp,
        maxTemp: location.maxTemp,
      });

      // Update local state
      setLocations(locations.map(loc => 
        loc.id === locationId ? { ...loc, alerts: !loc.alerts } : loc
      ));
    } catch (err) {
      alert('Failed to update alert settings');
      console.error('Error toggling alerts:', err);
    }
  };

  // Manually trigger alert check
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-10 h-10 text-blue-500" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Weather Alert System</h1>
                <p className="text-gray-600">Get WhatsApp alerts for weather changes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={triggerAlertCheck}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                title="Manually check for alerts"
              >
                Check Alerts Now
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'alerts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Alert Settings
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'settings'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
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
              <h2 className="text-2xl font-bold text-gray-800">Your Locations</h2>
              <div className="flex gap-3">
                <button
                  onClick={loadLocations}
                  className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Refresh'}
                </button>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Location
                </button>
              </div>
            </div>

            {/* Add Location Form */}
            {showAddLocation && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Add New Location</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="City name"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Country code (e.g., IE)"
                    value={newLocation.country}
                    onChange={(e) => setNewLocation({ ...newLocation, country: e.target.value.toUpperCase() })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Min temp (°C)"
                    value={newLocation.minTemp}
                    onChange={(e) => setNewLocation({ ...newLocation, minTemp: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max temp (°C)"
                    value={newLocation.maxTemp}
                    onChange={(e) => setNewLocation({ ...newLocation, maxTemp: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addLocation}
                    disabled={saving}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                  >
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLocation(false);
                      setNewLocation({ name: '', country: '', minTemp: 0, maxTemp: 30 });
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-12">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading locations...</span>
              </div>
            )}

            {/* Location Cards */}
            {!loading && locations.length === 0 && (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No locations yet</h3>
                <p className="text-gray-500 mb-4">Add your first location to start receiving weather alerts</p>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Location
                </button>
              </div>
            )}

            {!loading && locations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map(location => (
                  <div key={location.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <div>
                          <h3 className="text-xl font-semibold text-gray-800">{location.name}</h3>
                          <p className="text-sm text-gray-500">{location.country}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeLocation(location)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-4xl font-bold text-gray-800 mb-2">
                        {typeof location.temp === 'number' ? `${location.temp.toFixed(1)}°C` : location.temp}
                      </div>
                      <div className="text-gray-600 capitalize">{location.condition}</div>
                      <div className="text-sm text-gray-500 mt-2">
                        Alerts: {location.minTemp}°C - {location.maxTemp}°C
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-600">WhatsApp Alerts</span>
                      <button
                        onClick={() => toggleAlerts(location.id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          location.alerts ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            location.alerts ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Alert Settings Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Alert Preferences</h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800">
                  Temperature thresholds are set individually for each location when you add them.
                  Edit a location's card to modify its alert settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Alert Types (Coming Soon)
                </label>
                <div className="space-y-3">
                  {['Heavy Rain', 'Storm Warning', 'Extreme Temperature', 'High Wind', 'Snow'].map(alert => (
                    <label key={alert} className="flex items-center gap-3 cursor-pointer opacity-50">
                      <input
                        type="checkbox"
                        disabled
                        className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{alert}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  WhatsApp Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+353 1234 5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled
                />
                <p className="text-sm text-gray-500 mt-2">
                  Phone number configuration is currently managed in the backend settings.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Check Frequency
                </label>
                <select 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-semibold text-gray-800">Connection Status</div>
                  <div className="text-sm text-gray-600">Backend API</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600">{error ? 'Disconnected' : 'Connected'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}