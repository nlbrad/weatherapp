import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  Bell,
  MessageCircle,
  Send,
  Smartphone,
  Moon,
  Sun,
  Star,
  CloudRain,
  Thermometer,
  Wind,
  Loader,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Info
} from 'lucide-react';
import { preferencesAPI, locationsAPI } from '../services/api';
import LocationSearch from '../components/LocationSearch';

/**
 * SettingsPage - User preferences and notification settings
 * 
 * Sections:
 * 1. Notification Channels (WhatsApp, Telegram)
 * 2. Alert Location (NEW)
 * 3. Alert Types (what to be notified about)
 * 4. Quiet Hours (when not to send)
 * 5. Display Preferences (units, theme)
 */

const SettingsPage = () => {
  const navigate = useNavigate();
  const userId = 'user123'; // TODO: Replace with real auth

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [testingSend, setTestingSend] = useState(null);

  // Location state (NEW)
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // SkyScore info tooltip state (NEW)
  const [showSkyScoreInfo, setShowSkyScoreInfo] = useState(false);

  // Preferences state
  const [preferences, setPreferences] = useState({
    telegramEnabled: false,
    telegramChatId: '',
    whatsappEnabled: false,
    whatsappNumber: '',
    preferredChannel: 'telegram',

    alertTypes: {
      dailyForecast: true,
      weatherWarnings: true,
      temperatureAlerts: true,
      stargazingAlerts: false,
      auroraAlerts: false,
      rainAlerts: false,
    },

    morningForecastTime: '07:00',
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',

    stargazingThreshold: 70,

    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
    timeFormat: '24h',
  });

  // Load preferences and location on mount
  useEffect(() => {
    loadPreferences();
    loadUserLocation();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await preferencesAPI.getPreferences(userId);
      if (data.preferences) {
        setPreferences(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user location (NEW)
  const loadUserLocation = async () => {
    try {
      setLoadingLocation(true);
      const data = await locationsAPI.getLocations(userId);
      if (data.locations && data.locations.length > 0) {
        const primary = data.locations.find(l => l.isPrimary) || data.locations[0];
        setUserLocation(primary);
      }
    } catch (err) {
      console.error('Failed to load location:', err);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Save user location (NEW)
  const saveUserLocation = async (location) => {
    try {
      await locationsAPI.saveLocation({
        userId: userId,
        locationName: location.name,
        country: location.country,
        latitude: location.lat,
        longitude: location.lon,
        alertsEnabled: true,
        isPrimary: true
      });
      
      setUserLocation({
        locationName: location.name,
        country: location.country,
        latitude: location.lat,
        longitude: location.lon
      });
      setShowLocationSearch(false);
      setSuccessMessage('Location updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to save location');
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await preferencesAPI.savePreferences(userId, preferences);
      
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const sendTestMessage = async (channel) => {
    try {
      setTestingSend(channel);
      setError(null);

      if (channel === 'telegram') {
        if (!preferences.telegramChatId) {
          setError('Please enter your Telegram Chat ID first');
          return;
        }
        await preferencesAPI.sendTestTelegram(preferences.telegramChatId);
        setSuccessMessage('Test message sent to Telegram!');
      } else if (channel === 'whatsapp') {
        if (!preferences.whatsappNumber) {
          setError('Please enter your WhatsApp number first');
          return;
        }
        await preferencesAPI.sendTestWhatsApp(preferences.whatsappNumber);
        setSuccessMessage('Test message sent to WhatsApp!');
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error(`Failed to send test ${channel} message:`, err);
      setError(`Failed to send test message. Check your ${channel} settings.`);
    } finally {
      setTestingSend(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('Copied to clipboard!');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  const updatePref = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const updateAlertType = (type, enabled) => {
    setPreferences(prev => ({
      ...prev,
      alertTypes: { ...prev.alertTypes, [type]: enabled }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-surface/95 backdrop-blur-sm border-b border-dark-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-bold text-white">Settings</h1>
              </div>
            </div>
            <button
              onClick={savePreferences}
              disabled={saving}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark 
                       transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-3xl mx-auto px-6">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-green-400" />
            <p className="text-green-400">{successMessage}</p>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ============================================ */}
        {/* NOTIFICATION CHANNELS */}
        {/* ============================================ */}
        <section className="bg-dark-surface border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Notification Channels</h2>
          </div>

          {/* Telegram */}
          <div className="mb-6 p-4 bg-dark-elevated rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#0088cc]/20 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-[#0088cc]" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Telegram</h3>
                  <p className="text-sm text-gray-400">Free, instant delivery</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.telegramEnabled}
                  onChange={(e) => updatePref('telegramEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border rounded-full peer 
                              peer-checked:bg-primary peer-checked:after:translate-x-full
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                              after:bg-white after:rounded-full after:h-5 after:w-5 
                              after:transition-all"></div>
              </label>
            </div>

            {preferences.telegramEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <button
                  onClick={() => setShowTelegramSetup(!showTelegramSetup)}
                  className="w-full flex items-center justify-between p-3 bg-dark-bg rounded-lg
                           text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <span>📋 Setup Instructions</span>
                  {showTelegramSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showTelegramSetup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-dark-bg rounded-lg space-y-3"
                  >
                    <p className="text-sm text-gray-300">1. Open Telegram and search for:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-dark-surface rounded text-primary text-sm">
                        @WeatherAlertDublinBot
                      </code>
                      <button
                        onClick={() => copyToClipboard('@WeatherAlertDublinBot')}
                        className="p-2 hover:bg-dark-surface rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-300">2. Start a chat and send <code className="text-primary">/start</code></p>
                    <p className="text-sm text-gray-300">3. The bot will reply with your Chat ID - paste it below</p>
                    <a
                      href="https://t.me/WeatherAlertDublinBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Open in Telegram <ExternalLink className="w-3 h-3" />
                    </a>
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Chat ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={preferences.telegramChatId}
                      onChange={(e) => updatePref('telegramChatId', e.target.value)}
                      placeholder="e.g. 123456789"
                      className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg
                               text-white placeholder-gray-500
                               focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <button
                      onClick={() => sendTestMessage('telegram')}
                      disabled={testingSend === 'telegram' || !preferences.telegramChatId}
                      className="px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0088cc]/80
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {testingSend === 'telegram' ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Test
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#25D366]/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-medium text-white">WhatsApp</h3>
                  <p className="text-sm text-gray-400">Coming soon</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer opacity-50">
                <input
                  type="checkbox"
                  checked={preferences.whatsappEnabled}
                  onChange={(e) => updatePref('whatsappEnabled', e.target.checked)}
                  disabled
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border rounded-full peer 
                              peer-checked:bg-primary peer-checked:after:translate-x-full
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                              after:bg-white after:rounded-full after:h-5 after:w-5 
                              after:transition-all"></div>
              </label>
            </div>
          </div>

          {/* Preferred Channel */}
          {(preferences.telegramEnabled || preferences.whatsappEnabled) && (
            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">
                Preferred Channel
              </label>
              <select
                value={preferences.preferredChannel}
                onChange={(e) => updatePref('preferredChannel', e.target.value)}
                className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Both</option>
              </select>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* ALERT LOCATION (NEW) */}
        {/* ============================================ */}
        <section className="bg-dark-surface border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white">Alert Location</h2>
          </div>
          
          <p className="text-sm text-gray-400 mb-4">
            Weather alerts will be based on this location.
          </p>
          
          {loadingLocation ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Loading location...</span>
            </div>
          ) : userLocation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-dark-elevated rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{userLocation.locationName}</h3>
                    <p className="text-sm text-gray-400">
                      {userLocation.country && `${userLocation.country} · `}
                      {userLocation.latitude?.toFixed(2)}°N, {Math.abs(userLocation.longitude)?.toFixed(2)}°W
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLocationSearch(true)}
                  className="px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  Change
                </button>
              </div>
              
              {showLocationSearch && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-dark-elevated rounded-lg border border-dark-border"
                >
                  <label className="block text-sm text-gray-400 mb-2">
                    Search for a new location
                  </label>
                  <LocationSearch
                    onSelect={(location) => saveUserLocation(location)}
                    placeholder="Start typing a city name..."
                  />
                  <button
                    onClick={() => setShowLocationSearch(false)}
                    className="mt-3 text-sm text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-dark-elevated rounded-lg border border-dashed border-dark-border">
              <p className="text-gray-400 mb-3">No location set. Add one to receive weather alerts.</p>
              <LocationSearch
                onSelect={(location) => saveUserLocation(location)}
                placeholder="Search for your city..."
              />
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-4">
            💡 You can manage multiple locations from the main dashboard.
          </p>
        </section>

        {/* ============================================ */}
        {/* ALERT TYPES */}
        {/* ============================================ */}
        <section className="bg-dark-surface border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Alert Types</h2>
          </div>

          <div className="space-y-4">
            {/* Daily Forecast */}
            <AlertTypeToggle
              icon={<Sun className="w-5 h-5 text-yellow-400" />}
              title="Daily Forecast"
              description="Morning weather summary"
              enabled={preferences.alertTypes.dailyForecast}
              onChange={(v) => updateAlertType('dailyForecast', v)}
            />

            {/* Weather Warnings */}
            <AlertTypeToggle
              icon={<AlertCircle className="w-5 h-5 text-red-400" />}
              title="Weather Warnings"
              description="Met Éireann severe weather alerts"
              enabled={preferences.alertTypes.weatherWarnings}
              onChange={(v) => updateAlertType('weatherWarnings', v)}
            />

            {/* Temperature Alerts */}
            <AlertTypeToggle
              icon={<Thermometer className="w-5 h-5 text-blue-400" />}
              title="Temperature Alerts"
              description="When temp crosses your thresholds"
              enabled={preferences.alertTypes.temperatureAlerts}
              onChange={(v) => updateAlertType('temperatureAlerts', v)}
            />

            {/* Stargazing Alerts - UPDATED with info tooltip */}
            <AlertTypeToggle
              icon={<Moon className="w-5 h-5 text-purple-400" />}
              title="Stargazing Alerts"
              description="When skies are clear for stargazing"
              enabled={preferences.alertTypes.stargazingAlerts}
              onChange={(v) => updateAlertType('stargazingAlerts', v)}
              badge="New"
            />

            {preferences.alertTypes.stargazingAlerts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="ml-12 p-4 bg-dark-elevated rounded-lg"
              >
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm text-gray-400">
                    Minimum SkyScore to alert
                  </label>
                  
                  {/* Info Icon with Tooltip */}
                  <div className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setShowSkyScoreInfo(true)}
                      onMouseLeave={() => setShowSkyScoreInfo(false)}
                      onClick={() => setShowSkyScoreInfo(!showSkyScoreInfo)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    
                    {showSkyScoreInfo && (
                      <div className="absolute left-6 top-0 z-50 w-72 p-4 bg-dark-surface border border-dark-border rounded-lg shadow-xl">
                        <h4 className="font-semibold text-white mb-2">SkyScore Explained</h4>
                        <p className="text-sm text-gray-400 mb-3">
                          SkyScore rates stargazing conditions from 0-100 based on:
                        </p>
                        <ul className="text-sm text-gray-400 space-y-1 mb-3">
                          <li>• <span className="text-gray-300">Cloud cover</span> (40%)</li>
                          <li>• <span className="text-gray-300">Moon brightness</span> (25%)</li>
                          <li>• <span className="text-gray-300">Humidity</span> (15%)</li>
                          <li>• <span className="text-gray-300">Wind speed</span> (10%)</li>
                          <li>• <span className="text-gray-300">Visibility</span> (10%)</li>
                        </ul>
                        <div className="text-xs space-y-1 border-t border-dark-border pt-2">
                          <div className="flex justify-between">
                            <span className="text-purple-400">90-100:</span>
                            <span className="text-gray-300">Exceptional ✨</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">80-89:</span>
                            <span className="text-gray-300">Excellent</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">65-79:</span>
                            <span className="text-gray-300">Good</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">50-64:</span>
                            <span className="text-gray-300">Fair</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">35-49:</span>
                            <span className="text-gray-300">Poor</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-purple-400">0-34:</span>
                            <span className="text-gray-300">Bad</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="20"
                    max="95"
                    step="5"
                    value={preferences.stargazingThreshold}
                    onChange={(e) => updatePref('stargazingThreshold', parseInt(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-white font-medium w-12 text-center">
                    {preferences.stargazingThreshold}
                  </span>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  {preferences.stargazingThreshold >= 80 
                    ? "🌟 Only excellent conditions - fewer alerts"
                    : preferences.stargazingThreshold >= 65
                    ? "⭐ Good conditions - balanced alerts"
                    : preferences.stargazingThreshold >= 50
                    ? "☁️ Fair conditions - more frequent alerts"
                    : "🔔 All viewable conditions - most alerts"
                  }
                </p>
              </motion.div>
            )}

            {/* Aurora Alerts */}
            <AlertTypeToggle
              icon={<Star className="w-5 h-5 text-green-400" />}
              title="Northern Lights"
              description="Aurora borealis visibility alerts"
              enabled={preferences.alertTypes.auroraAlerts}
              onChange={(v) => updateAlertType('auroraAlerts', v)}
              badge="New"
            />

            {/* Rain Alerts */}
            <AlertTypeToggle
              icon={<CloudRain className="w-5 h-5 text-blue-400" />}
              title="Rain Alerts"
              description="When rain is expected"
              enabled={preferences.alertTypes.rainAlerts}
              onChange={(v) => updateAlertType('rainAlerts', v)}
              badge="Coming Soon"
              disabled
            />
          </div>
        </section>

        {/* ============================================ */}
        {/* TIMING */}
        {/* ============================================ */}
        <section className="bg-dark-surface border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Timing</h2>
          </div>

          <div className="space-y-6">
            {/* Morning Forecast Time */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Morning Forecast Time
              </label>
              <input
                type="time"
                value={preferences.morningForecastTime}
                onChange={(e) => updatePref('morningForecastTime', e.target.value)}
                className="px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Quiet Hours */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">Quiet Hours</h3>
                <p className="text-sm text-gray-400">Don't send alerts during these hours</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHoursEnabled}
                  onChange={(e) => updatePref('quietHoursEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border rounded-full peer 
                              peer-checked:bg-primary peer-checked:after:translate-x-full
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                              after:bg-white after:rounded-full after:h-5 after:w-5 
                              after:transition-all"></div>
              </label>
            </div>

            {preferences.quietHoursEnabled && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4"
              >
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => updatePref('quietHoursStart', e.target.value)}
                    className="px-3 py-2 bg-dark-bg border border-dark-border rounded-lg
                             text-white text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
                <span className="text-gray-500 mt-5">to</span>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Until</label>
                  <input
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => updatePref('quietHoursEnd', e.target.value)}
                    className="px-3 py-2 bg-dark-bg border border-dark-border rounded-lg
                             text-white text-sm focus:ring-2 focus:ring-primary"
                  />
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* ============================================ */}
        {/* DISPLAY PREFERENCES */}
        {/* ============================================ */}
        <section className="bg-dark-surface border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Display</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Temperature</label>
              <select
                value={preferences.temperatureUnit}
                onChange={(e) => updatePref('temperatureUnit', e.target.value)}
                className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Wind Speed</label>
              <select
                value={preferences.windSpeedUnit}
                onChange={(e) => updatePref('windSpeedUnit', e.target.value)}
                className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="kmh">km/h</option>
                <option value="mph">mph</option>
                <option value="ms">m/s</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Format</label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => updatePref('timeFormat', e.target.value)}
                className="w-full px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                         text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="24h">24-hour</option>
                <option value="12h">12-hour (AM/PM)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Save Button (bottom) */}
        <div className="flex justify-end pt-4">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark 
                     transition-colors disabled:opacity-50 flex items-center gap-2 font-medium"
          >
            {saving ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * AlertTypeToggle - Reusable toggle component for alert types
 */
const AlertTypeToggle = ({ icon, title, description, enabled, onChange, badge, disabled }) => (
  <div className={`flex items-center justify-between p-4 bg-dark-elevated rounded-lg ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-dark-bg rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white">{title}</h3>
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              badge === 'New' 
                ? 'bg-primary/20 text-primary' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-dark-border rounded-full peer 
                    peer-checked:bg-primary peer-checked:after:translate-x-full
                    peer-disabled:cursor-not-allowed
                    after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                    after:bg-white after:rounded-full after:h-5 after:w-5 
                    after:transition-all"></div>
    </label>
  </div>
);

export default SettingsPage;