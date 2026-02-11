/**
 * PreferencesPage.jsx - User Settings
 * 
 * Simplified to focus on:
 * 1. Telegram Setup (how to receive alerts)
 * 2. Quiet Hours (when NOT to send)
 * 3. Display Settings (units)
 * 
 * Alert type toggles are on the Alert Center (home) page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Send, Loader, Check, Copy, ExternalLink, AlertCircle,
  Clock, Moon, Volume2, VolumeX, Settings, ChevronDown, ChevronUp,
  ArrowLeft, CheckCircle
} from 'lucide-react';
import { useAuth } from '../auth';
import { preferencesAPI } from '../services/api';

// Telegram bot username - update this to your bot
const TELEGRAM_BOT_USERNAME = 'OmniAlert';

const PreferencesPage = () => {
  const { getUserId } = useAuth();
  const userId = getUserId();

  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showTelegramSetup, setShowTelegramSetup] = useState(false);
  const [testingSend, setTestingSend] = useState(false);

  // Preferences State
  const [preferences, setPreferences] = useState({
    // Telegram
    telegramEnabled: false,
    telegramChatId: '',
    
    // Quiet Hours
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '07:00',

    // Display
    temperatureUnit: 'celsius',
    windSpeedUnit: 'kmh',
  });

  /**
   * Load preferences from API
   */
  const loadPreferences = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  /**
   * Save preferences
   */
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await preferencesAPI.savePreferences(userId, preferences);
      
      setSuccessMessage('Preferences saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update a preference value
   */
  const updatePref = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Copy to clipboard
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('Copied!');
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  /**
   * Send test Telegram message
   */
  const sendTestMessage = async () => {
    if (!preferences.telegramChatId) {
      setError('Please enter your Telegram Chat ID first');
      return;
    }

    try {
      setTestingSend(true);
      setError(null);
      
      await preferencesAPI.sendTestTelegram(preferences.telegramChatId);
      
      setSuccessMessage('Test message sent! Check Telegram.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to send test message:', err);
      setError('Failed to send. Check your Chat ID.');
    } finally {
      setTestingSend(false);
    }
  };

  // Telegram status
  const telegramConfigured = preferences.telegramEnabled && preferences.telegramChatId;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Back to Alert Center */}
      <Link 
        to="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Alert Center
      </Link>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-400 text-sm">{successMessage}</p>
        </div>
      )}

      {/* ================================================ */}
      {/* TELEGRAM SETUP */}
      {/* ================================================ */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0088cc]/20 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-[#0088cc]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Telegram Notifications</h2>
              <p className="text-slate-400 text-sm">How you'll receive alerts</p>
            </div>
          </div>
          
          {/* Status Badge */}
          {telegramConfigured && (
            <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Connected
            </span>
          )}
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white">Enable Telegram</span>
          <button
            role="switch"
            aria-checked={preferences.telegramEnabled}
            aria-label="Enable Telegram notifications"
            onClick={() => updatePref('telegramEnabled', !preferences.telegramEnabled)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              preferences.telegramEnabled ? 'bg-cyan-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                preferences.telegramEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {preferences.telegramEnabled && (
          <div className="space-y-4 pt-4 border-t border-slate-800">
            {/* Setup Instructions */}
            <button
              onClick={() => setShowTelegramSetup(!showTelegramSetup)}
              className="w-full flex items-center justify-between p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              <span>📋 How to get your Chat ID</span>
              {showTelegramSetup ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTelegramSetup && (
              <div className="p-4 bg-slate-800/30 rounded-lg space-y-3 text-sm">
                <p className="text-slate-300">1. Open Telegram and search for:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-slate-900 rounded text-cyan-400">
                    @{TELEGRAM_BOT_USERNAME}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`@${TELEGRAM_BOT_USERNAME}`)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                <p className="text-slate-300">2. Start a chat and send <code className="text-cyan-400">/start</code></p>
                <p className="text-slate-300">3. The bot will reply with your Chat ID - paste it below</p>
                <div className="pt-2">
                  <a
                    href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300"
                  >
                    Open in Telegram <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                {/* Alternative method */}
                <div className="pt-3 mt-3 border-t border-slate-700">
                  <p className="text-slate-400 text-xs">
                    💡 <strong>Alternative:</strong> Search for <code className="text-cyan-400">@userinfobot</code> in Telegram - it shows your ID instantly.
                  </p>
                </div>
              </div>
            )}

            {/* Chat ID Input */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Your Chat ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={preferences.telegramChatId}
                  onChange={(e) => updatePref('telegramChatId', e.target.value)}
                  placeholder="e.g. 123456789"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                <button
                  onClick={sendTestMessage}
                  disabled={testingSend || !preferences.telegramChatId}
                  className="px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {testingSend ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Test
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                We'll send a test message to verify it's working.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ================================================ */}
      {/* QUIET HOURS */}
      {/* ================================================ */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Moon className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Quiet Hours</h2>
            <p className="text-slate-400 text-sm">Pause non-urgent alerts while you sleep</p>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {preferences.quietHoursEnabled ? (
              <VolumeX className="w-5 h-5 text-purple-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-white">Enable Quiet Hours</span>
          </div>
          <button
            role="switch"
            aria-checked={preferences.quietHoursEnabled}
            aria-label="Enable quiet hours"
            onClick={() => updatePref('quietHoursEnabled', !preferences.quietHoursEnabled)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              preferences.quietHoursEnabled ? 'bg-purple-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${
                preferences.quietHoursEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {preferences.quietHoursEnabled && (
          <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">From</label>
              <input
                type="time"
                value={preferences.quietHoursStart}
                onChange={(e) => updatePref('quietHoursStart', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <span className="text-slate-500 mt-5">to</span>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1">Until</label>
              <input
                type="time"
                value={preferences.quietHoursEnd}
                onChange={(e) => updatePref('quietHoursEnd', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        )}

        <p className="text-slate-500 text-xs mt-4">
          ⚠️ Severe weather warnings will always come through, even during quiet hours.
        </p>
      </section>

      {/* ================================================ */}
      {/* DISPLAY SETTINGS */}
      {/* ================================================ */}
      <section className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Display Settings</h2>
            <p className="text-slate-400 text-sm">Units and formatting</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Temperature</label>
            <select
              value={preferences.temperatureUnit}
              onChange={(e) => updatePref('temperatureUnit', e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            >
              <option value="celsius">Celsius (°C)</option>
              <option value="fahrenheit">Fahrenheit (°F)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Wind Speed</label>
            <select
              value={preferences.windSpeedUnit}
              onChange={(e) => updatePref('windSpeedUnit', e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
            >
              <option value="kmh">km/h</option>
              <option value="mph">mph</option>
              <option value="ms">m/s</option>
              <option value="knots">knots</option>
            </select>
          </div>
        </div>
      </section>

      {/* ================================================ */}
      {/* SAVE BUTTON */}
      {/* ================================================ */}
      <button
        onClick={savePreferences}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
      >
        {saving ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="w-5 h-5" />
            Save Preferences
          </>
        )}
      </button>

      {/* Footer note */}
      <p className="text-center text-slate-600 text-sm">
        Manage your alerts on the <Link to="/" className="text-cyan-400 hover:underline">Alert Center</Link> page.
      </p>
    </div>
  );
};

export default PreferencesPage;