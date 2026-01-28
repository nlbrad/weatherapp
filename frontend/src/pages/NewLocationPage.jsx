/**
 * NewLocationPage.jsx - Add New Location
 * 
 * Uses existing LocationSearch component to find locations
 * and save them for alerts.
 * 
 * Features:
 * - Location search with autocomplete
 * - Geolocation support ("Use my location")
 * - Alert threshold configuration
 * - Set as primary option
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, ArrowLeft, Save, Loader, AlertCircle,
  Thermometer, Bell, Star, Check
} from 'lucide-react';
import { useAuth } from '../auth';
import { locationsAPI } from '../services/api';
import LocationSearch from '../components/LocationSearch';

const NewLocationPage = () => {
  const navigate = useNavigate();
  const { getUserId } = useAuth();
  const userId = getUserId();

  // Selected location from search
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Alert settings
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [minTemp, setMinTemp] = useState(0);
  const [maxTemp, setMaxTemp] = useState(30);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle location selection from search
   */
  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
    setSelectedLocation({
      name: location.name || location.displayName?.split(',')[0] || 'Unknown',
      country: location.country || '',
      latitude: location.lat,
      longitude: location.lon,
      displayName: location.displayName || `${location.name}, ${location.country}`,
    });
    setError(null);
  };

  /**
   * Save the location
   */
  const handleSave = async () => {
    if (!selectedLocation) {
      setError('Please select a location first');
      return;
    }

    if (!selectedLocation.latitude || !selectedLocation.longitude) {
      setError('Location is missing coordinates. Please search again.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await locationsAPI.saveLocation({
        userId,
        locationName: selectedLocation.name,
        country: selectedLocation.country,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        alertsEnabled,
        isPrimary,
        minTemp,
        maxTemp,
      });

      setSuccess(true);
      
      // Navigate back after brief delay
      setTimeout(() => {
        navigate('/locations');
      }, 1500);

    } catch (err) {
      console.error('Failed to save location:', err);
      setError('Failed to save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Location Added!</h2>
        <p className="text-slate-400">
          {selectedLocation?.displayName} has been added to your locations.
        </p>
        <p className="text-slate-500 text-sm mt-4">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/locations')}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Locations
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Add Location</h1>
        <p className="text-slate-400">
          Search for a city to receive weather alerts for that location.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Location Search */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
        <label className="block text-white font-medium mb-3">
          <MapPin className="w-4 h-4 inline mr-2 text-cyan-400" />
          Search Location
        </label>
        
        <LocationSearch 
          onSelect={handleLocationSelect}
          placeholder="Search for a city..."
        />

        {/* Selected Location Preview */}
        {selectedLocation && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{selectedLocation.name}</p>
                <p className="text-slate-400 text-sm">
                  {selectedLocation.country && `${selectedLocation.country} • `}
                  {selectedLocation.latitude?.toFixed(4)}, {selectedLocation.longitude?.toFixed(4)}
                </p>
              </div>
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}
      </div>

      {/* Alert Settings */}
      {selectedLocation && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            Alert Settings
          </h3>

          {/* Enable Alerts Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Enable Alerts</p>
              <p className="text-slate-500 text-sm">Receive notifications for this location</p>
            </div>
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                alertsEnabled ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span 
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                  alertsEnabled ? 'left-6' : 'left-1'
                }`} 
              />
            </button>
          </div>

          {/* Set as Primary Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Set as Primary
              </p>
              <p className="text-slate-500 text-sm">Use as your main alert location</p>
            </div>
            <button
              onClick={() => setIsPrimary(!isPrimary)}
              className={`w-12 h-7 rounded-full transition-colors relative ${
                isPrimary ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span 
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                  isPrimary ? 'left-6' : 'left-1'
                }`} 
              />
            </button>
          </div>

          {/* Temperature Thresholds */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-white mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              Temperature Alerts
            </p>
            <p className="text-slate-500 text-sm mb-4">
              Get notified when temperature goes outside this range
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Min Temperature</label>
                <div className="relative">
                  <input
                    type="number"
                    value={minTemp}
                    onChange={(e) => setMinTemp(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">°C</span>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Max Temperature</label>
                <div className="relative">
                  <input
                    type="number"
                    value={maxTemp}
                    onChange={(e) => setMaxTemp(parseInt(e.target.value) || 30)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">°C</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!selectedLocation || saving}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
      >
        {saving ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            Add Location
          </>
        )}
      </button>

      {/* Help Text */}
      <p className="text-center text-slate-500 text-sm">
        You can add multiple locations and set different alert thresholds for each.
      </p>
    </div>
  );
};

export default NewLocationPage;
