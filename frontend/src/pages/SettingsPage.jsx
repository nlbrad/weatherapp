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
  ChevronUp
} from 'lucide-react';
import { preferencesAPI } from '../services/api';

/**
 * SettingsPage - User preferences and notification settings
 * 
 * Sections:
 * 1. Notification Channels (WhatsApp, Telegram)
 * 2. Alert Types (what to be notified about)
 * 3. Quiet Hours (when not to send)
 * 4. Display Preferences (units, theme)
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
  const [testingSend, setTestingSend] = useState(null); // 'telegram' | 'whatsapp' | null

  // Preferences state
  const [preferences, setPreferences] = useState({
    // Notification channels
    telegramEnabled: false,
    telegramChatId: '',
    whatsappEnabled: false,
    whatsappNumber: '',
    preferredChannel: 'telegram', // 'telegram' | 'whatsapp' | 'both'

    // Alert types
    alertTypes: {
      dailyForecast: true,
      weatherWarnings: true,
      temperatureAlerts: true,
      stargazingAlerts: false,
      auroraAlerts: false,
      rainAlerts: false,
    },

    // Timing
    morningForecastTime: '07:00',
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',

    // Thresholds
    stargazingThreshold: 70,

    // Display
    temperatureUnit: 'celsius', // 'celsius' | 'fahrenheit'
    windSpeedUnit: 'kmh', // 'kmh' | 'mph' | 'ms'
    timeFormat: '24h', // '12h' | '24h'
  });

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
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
      // Use defaults if load fails - that's okay for new users
    } finally {
      setLoading(false);
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

  // Update a single preference
  const updatePref = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  // Update alert type
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
                {/* Setup Instructions Toggle */}
                <button
                  onClick={() => setShowTelegramSetup(!showTelegramSetup)}
                  className="w-full flex items-center justify-between p-3 bg-dark-bg rounded-lg
                           text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <span>📋 Setup Instructions</span>
                  {showTelegramSetup ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showTelegramSetup && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-dark-bg rounded-lg space-y-3 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">1</span>
                      <div>
                        <p className="text-gray-300">Open Telegram and search for:</p>
                        <code className="block mt-1 px-2 py-1 bg-dark-elevated rounded text-primary">
                          @YourWeatherBot
                        </code>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">2</span>
                      <p className="text-gray-300">Click <strong>Start</strong> to begin</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">3</span>
                      <p className="text-gray-300">The bot will send you your <strong>Chat ID</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs font-bold">4</span>
                      <p className="text-gray-300">Paste the Chat ID below</p>
                    </div>
                  </motion.div>
                )}

                {/* Chat ID Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Telegram Chat ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={preferences.telegramChatId}
                      onChange={(e) => updatePref('telegramChatId', e.target.value)}
                      placeholder="e.g. 123456789"
                      className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg
                               text-white placeholder-gray-500 focus:ring-2 focus:ring-primary 
                               focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => sendTestMessage('telegram')}
                      disabled={testingSend === 'telegram' || !preferences.telegramChatId}
                      className="px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0088cc]/80
                               transition-colors disabled:opacity-50 flex items-center gap-2"
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
                  <p className="text-sm text-gray-400">Requires Twilio setup</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.whatsappEnabled}
                  onChange={(e) => updatePref('whatsappEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border rounded-full peer 
                              peer-checked:bg-[#25D366] peer-checked:after:translate-x-full
                              after:content-[''] after:absolute after:top-0.5 after:left-[2px]
                              after:bg-white after:rounded-full after:h-5 after:w-5 
                              after:transition-all"></div>
              </label>
            </div>

            {preferences.whatsappEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    WhatsApp Number (with country code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={preferences.whatsappNumber}
                      onChange={(e) => updatePref('whatsappNumber', e.target.value)}
                      placeholder="e.g. +353871234567"
                      className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg
                               text-white placeholder-gray-500 focus:ring-2 focus:ring-[#25D366] 
                               focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => sendTestMessage('whatsapp')}
                      disabled={testingSend === 'whatsapp' || !preferences.whatsappNumber}
                      className="px-4 py-2 bg-[#25D366] text-white rounded-lg hover:bg-[#25D366]/80
                               transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {testingSend === 'whatsapp' ? (
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

            {/* Stargazing Alerts */}
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
                <label className="block text-sm text-gray-400 mb-2">
                  Minimum SkyScore to alert (0-100)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
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
                  Higher = fewer alerts, but better conditions
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
              badge="Coming Soon"
              disabled
            />

            {/* Rain Alerts */}
            <AlertTypeToggle
              icon={<CloudRain className="w-5 h-5 text-cyan-400" />}
              title="Rain Alerts"
              description="Alert before rain starts"
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
            <Moon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Timing</h2>
          </div>

          {/* Morning Forecast Time */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">
              Morning Forecast Time
            </label>
            <input
              type="time"
              value={preferences.morningForecastTime}
              onChange={(e) => updatePref('morningForecastTime', e.target.value)}
              className="px-4 py-2 bg-dark-elevated border border-dark-border rounded-lg
                       text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Quiet Hours */}
          <div className="p-4 bg-dark-elevated rounded-lg">
            <div className="flex items-center justify-between mb-4">
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
            {/* Temperature Unit */}
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

            {/* Wind Speed Unit */}
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

            {/* Time Format */}
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
                    after:bg-white after:rounded-full after:h-5 after-5 
                    after:transition-all"></div>
    </label>
  </div>
);

export default SettingsPage;