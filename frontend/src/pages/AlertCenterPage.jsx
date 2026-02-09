/**
 * AlertCenterPage.jsx - Primary Home Page (Alert-First Design)
 * 
 * THE hub for all alert management.
 * 
 * Features:
 * - Quick stats (active alerts, Telegram status)
 * - All alert types with enable/disable AND customization
 * - REAL alert history from API
 * - Setup prompts if not configured
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, Sun, Star, AlertTriangle, Sparkles, Clock, Send, 
  Check, ChevronRight, Loader, RefreshCw, MapPin,
  Thermometer, X, Edit2, CheckCircle, AlertCircle, History, Zap,
  Newspaper, Plus, Trash2
} from 'lucide-react';
import { useAuth } from '../auth';
import { locationsAPI, preferencesAPI, alertsAPI } from '../services/api';

// API base URL for test alerts
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// Alert type definitions with defaults
const ALERT_TYPES = {
  dailyForecast: {
    id: 'dailyForecast',
    name: 'Daily Forecast',
    icon: Sun,
    color: '#F59E0B',
    bgColor: 'bg-amber-500/20',
    description: 'Morning weather briefing',
    defaultTime: '07:00',
    timeLabel: 'Delivery time',
    hasTime: true,
  },
  newsDigest: {
    id: 'newsDigest',
    name: 'News Digest',
    icon: Newspaper,
    color: '#10B981',
    bgColor: 'bg-emerald-500/20',
    description: 'Irish, World, Tech, Finance, Crypto, Science + Markets',
    hasMultipleTimes: true,  // Can set multiple delivery times
    defaultTimes: ['07:30', '18:00'],
    maxTimes: 6,  // Max times per day
  },
  cryptoDigest: {
    id: 'cryptoDigest',
    name: 'Crypto Digest',
    icon: Newspaper,  // Or use a different icon like DollarSign
    color: '#F59E0B',  // Bitcoin orange
    bgColor: 'bg-amber-500/20',
    description: 'Crypto news, market prices, DeFi metrics & sentiment',
    hasMultipleTimes: true,  // Multiple delivery times like news digest
    defaultTimes: ['08:00', '20:00'],  // Default times (morning & evening)
    maxTimes: 6,  // Max 6 times per day
  },
  stargazingAlerts: {
    id: 'stargazingAlerts',
    name: "Tonight's Sky",
    icon: Star,
    color: '#06B6D4',
    bgColor: 'bg-cyan-500/20',
    description: 'Stargazing conditions report',
    defaultTime: '18:00',
    timeLabel: 'Delivery time',
    hasTime: true,
    hasThreshold: true,
    thresholdLabel: 'Min SkyScore',
    thresholdDefault: 65,
  },
  weatherWarnings: {
    id: 'weatherWarnings',
    name: 'Weather Warnings',
    icon: AlertTriangle,
    color: '#EF4444',
    bgColor: 'bg-red-500/20',
    description: 'Met Éireann severe weather alerts',
    timeLabel: 'Real-time',
    hasTime: false,
  },
  auroraAlerts: {
    id: 'auroraAlerts',
    name: 'Aurora Alerts',
    icon: Sparkles,
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/20',
    description: 'Northern Lights notifications',
    timeLabel: 'Real-time',
    hasTime: false,
    hasThreshold: true,
    thresholdLabel: 'Min AuroraScore',
    thresholdDefault: 50,
  },
  temperatureAlerts: {
    id: 'temperatureAlerts',
    name: 'Temperature Alerts',
    icon: Thermometer,
    color: '#3B82F6',
    bgColor: 'bg-blue-500/20',
    description: 'Outside your comfort range',
    timeLabel: 'Real-time',
    hasTime: false,
  },
};

// Map API alert types to our config
const ALERT_TYPE_MAP = {
  'daily-forecast': 'dailyForecast',
  'news-digest': 'newsDigest',
  'crypto-digest': 'cryptoDigest',  // NEW
  'tonights-sky': 'stargazingAlerts',
  'weather-warning': 'weatherWarnings',
  'aurora': 'auroraAlerts',
  'temperature': 'temperatureAlerts',
};

const AlertCenterPage = () => {
  const { getUserId } = useAuth();
  const userId = getUserId();

  // State
  const [preferences, setPreferences] = useState(null);
  const [primaryLocation, setPrimaryLocation] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit modal state
  const [editingAlert, setEditingAlert] = useState(null);
  const [editValues, setEditValues] = useState({});
  
  // Test alert state
  const [testingAlert, setTestingAlert] = useState(null);
  const [testResult, setTestResult] = useState(null);

  /**
   * Send a test alert
   */
  const sendTestAlert = async (alertType) => {
    // Check if Telegram is configured
    if (!preferences?.telegramChatId) {
      setTestResult({ type: alertType, success: false, message: 'Set up Telegram first in Preferences' });
      setTimeout(() => setTestResult(null), 4000);
      return;
    }

    // Check if location is set
    if (!primaryLocation) {
      setTestResult({ type: alertType, success: false, message: 'Add a location first' });
      setTimeout(() => setTestResult(null), 4000);
      return;
    }

    setTestingAlert(alertType);
    setTestResult(null);

    try {
      const chatId = preferences.telegramChatId;
      const lat = primaryLocation.latitude;
      const lon = primaryLocation.longitude;
      const location = primaryLocation.locationName;

      let endpoint = '';
      let body = {};

      switch (alertType) {
        case 'dailyForecast':
          endpoint = `${API_BASE_URL}/daily-forecast`;
          body = { chatId, lat, lon, locationName: location, force: true };
          break;
        case 'newsDigest':
          endpoint = `${API_BASE_URL}/news-digest`;
          body = { chatId, force: true };
          break;
        case 'cryptoDigest':  // NEW CASE
          endpoint = `${API_BASE_URL}/crypto-digest`;
          body = { chatId, force: true };
          break;
        case 'stargazingAlerts':
          endpoint = `${API_BASE_URL}/tonights-sky`;
          body = { chatId, lat, lon, locationName: location, force: true };
          break;
        case 'weatherWarnings':
          endpoint = `${API_BASE_URL}/weather-warning`;
          body = { chatId, force: true };
          break;
        case 'auroraAlerts':
          endpoint = `${API_BASE_URL}/aurora-alert`;
          body = { chatId, lat, lon, locationName: location, force: true };
          break;
        default:
          throw new Error('Unknown alert type');
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success || data.messageSent) {
        setTestResult({ type: alertType, success: true, message: 'Test sent! Check Telegram' });
      } else {
        const errorMsg = data.error || 'Failed to send';
        setTestResult({ type: alertType, success: false, message: errorMsg });
      }
    } catch (err) {
      console.error('Test alert error:', err);
      setTestResult({ type: alertType, success: false, message: 'Network error: ' + err.message });
    } finally {
      setTestingAlert(null);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  /**
   * Load all user data
   */
  const loadData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch preferences
      let prefsData = { 
        alertTypes: {},
        telegramEnabled: false,
        telegramChatId: '',
      };
      try {
        const result = await preferencesAPI.getPreferences(userId);
        if (result.preferences) {
          prefsData = result.preferences;
        }
      } catch (err) {
        console.log('No preferences found, using defaults');
      }
      setPreferences(prefsData);

      // Fetch locations
      try {
        const locsData = await locationsAPI.getUserLocations(userId);
        if (locsData.locations && locsData.locations.length > 0) {
          const primary = locsData.locations.find(l => l.isPrimary) || locsData.locations[0];
          setPrimaryLocation(primary);
        }
      } catch (err) {
        console.log('No locations found');
      }

      // Fetch alert history (NEW!)
      try {
        const historyData = await alertsAPI.getAlertHistory(userId, 10);
        if (historyData.alerts) {
          setAlertHistory(historyData.alerts);
        }
      } catch (err) {
        console.log('No alert history found');
        setAlertHistory([]);
      }

    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Toggle an alert on/off
   */
  const toggleAlert = async (alertId) => {
    const currentValue = preferences?.alertTypes?.[alertId] ?? false;
    
    // Optimistic update
    setPreferences(prev => ({
      ...prev,
      alertTypes: {
        ...prev.alertTypes,
        [alertId]: !currentValue,
      }
    }));

    try {
      await preferencesAPI.savePreferences(userId, {
        ...preferences,
        alertTypes: {
          ...preferences.alertTypes,
          [alertId]: !currentValue,
        },
      });
    } catch (err) {
      console.error('Failed to toggle alert:', err);
      // Revert on error
      setPreferences(prev => ({
        ...prev,
        alertTypes: {
          ...prev.alertTypes,
          [alertId]: currentValue,
        }
      }));
    }
  };

  /**
   * Open edit modal for an alert
   */
  const openEditModal = (alertType) => {
    const config = ALERT_TYPES[alertType];
    setEditingAlert(alertType);
    
    if (config.hasMultipleTimes) {
      // Get the correct time key based on alert type
      const timeKey = alertType === 'newsDigest' ? 'newsDigestTimes' : 'cryptoDigestTimes';
      const savedTimes = preferences?.[timeKey] || config.defaultTimes || ['07:30', '18:00'];
      
      setEditValues({
        times: Array.isArray(savedTimes) ? [...savedTimes] : ['07:30', '18:00'],
      });
    } else {
      setEditValues({
        time: preferences?.[`${alertType}Time`] || config.defaultTime || '07:00',
        threshold: preferences?.[`${alertType}Threshold`] || config.thresholdDefault || 65,
      });
    }
  };

  /**
   * Save alert customization
   */
  const saveAlertSettings = async () => {
    setSaving(true);
    try {
      const config = ALERT_TYPES[editingAlert];
      let updates;
      
      if (config.hasMultipleTimes) {
        // Handle multiple times (newsDigest OR cryptoDigest)
        const sortedTimes = [...editValues.times].sort();
        const timeKey = editingAlert === 'newsDigest' ? 'newsDigestTimes' : 'cryptoDigestTimes';
        
        updates = {
          ...preferences,
          [timeKey]: sortedTimes,
        };
      } else {
        updates = {
          ...preferences,
          [`${editingAlert}Time`]: editValues.time,
          [`${editingAlert}Threshold`]: editValues.threshold,
        };
      }
      
      await preferencesAPI.savePreferences(userId, updates);
      setPreferences(updates);
      setEditingAlert(null);
    } catch (err) {
      console.error('Failed to save alert settings:', err);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Add a new time slot for news digest
   */
  const addTimeSlot = () => {
    const config = ALERT_TYPES[editingAlert];
    if (editValues.times.length < (config.maxTimes || 6)) {
      setEditValues(prev => ({
        ...prev,
        times: [...prev.times, '12:00'],
      }));
    }
  };

  /**
   * Remove a time slot
   */
  const removeTimeSlot = (index) => {
    if (editValues.times.length > 1) {
      setEditValues(prev => ({
        ...prev,
        times: prev.times.filter((_, i) => i !== index),
      }));
    }
  };

  /**
   * Update a specific time slot
   */
  const updateTimeSlot = (index, value) => {
    setEditValues(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? value : t),
    }));
  };

  // Calculate stats
  const activeAlerts = Object.entries(preferences?.alertTypes || {})
    .filter(([_, enabled]) => enabled).length;
  
  const telegramConfigured = preferences?.telegramEnabled && preferences?.telegramChatId;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============================================ */}
      {/* SETUP PROMPTS */}
      {/* ============================================ */}
      
      {/* No Location Warning */}
      {!primaryLocation && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-300 font-medium">No location set</p>
            <p className="text-amber-400/70 text-sm">Add a location to start receiving weather alerts.</p>
          </div>
          <Link 
            to="/locations/new"
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-400 transition-colors"
          >
            Add Location
          </Link>
        </div>
      )}

      {/* Telegram Not Configured */}
      {!telegramConfigured && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start gap-3">
          <Send className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-slate-300 font-medium">Notifications not set up</p>
            <p className="text-slate-500 text-sm">Connect Telegram to receive your alerts.</p>
          </div>
          <Link 
            to="/preferences"
            className="px-4 py-2 bg-[#0088cc] text-white text-sm font-medium rounded-lg hover:bg-[#0077b5] transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Set Up
          </Link>
        </div>
      )}

      {/* ============================================ */}
      {/* QUICK STATS */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Alerts */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Bell className="w-4 h-4" />
            Active Alerts
          </div>
          <p className="text-2xl font-bold text-white">{activeAlerts}</p>
          <p className="text-slate-500 text-xs">of {Object.keys(ALERT_TYPES).length} available</p>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Send className="w-4 h-4" />
            Notifications
          </div>
          {telegramConfigured ? (
            <>
              <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Connected
              </p>
              <p className="text-slate-500 text-xs">via Telegram</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-500">Not Set Up</p>
              <Link to="/preferences" className="text-cyan-400 text-xs hover:underline">
                Configure →
              </Link>
            </>
          )}
        </div>

        {/* Primary Location */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            Location
          </div>
          {primaryLocation ? (
            <>
              <p className="text-lg font-bold text-white truncate">{primaryLocation.locationName}</p>
              <p className="text-slate-500 text-xs">{primaryLocation.country}</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-500">None</p>
              <Link to="/locations/new" className="text-cyan-400 text-xs hover:underline">
                Add location →
              </Link>
            </>
          )}
        </div>

        {/* Alerts Sent */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <History className="w-4 h-4" />
            Recent
          </div>
          <p className="text-2xl font-bold text-white">{alertHistory.length}</p>
          <p className="text-slate-500 text-xs">alerts this week</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* ALERT LIST */}
      {/* ============================================ */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Your Alerts
          </h2>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {Object.values(ALERT_TYPES).map(alert => {
            const Icon = alert.icon;
            const isEnabled = preferences?.alertTypes?.[alert.id] ?? false;
            const customTime = preferences?.[`${alert.id}Time`] || alert.defaultTime;
            const customThreshold = preferences?.[`${alert.id}Threshold`] || alert.thresholdDefault;

            return (
              <div 
                key={alert.id}
                className="px-5 py-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors"
              >
                {/* Icon */}
                <div 
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.bgColor}`}
                >
                  <Icon className="w-6 h-6" style={{ color: alert.color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium">{alert.name}</h3>
                  <p className="text-slate-500 text-sm">{alert.description}</p>
                  
                  {/* Settings Preview */}
                  {isEnabled && (
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {alert.hasMultipleTimes && (
                        <span className="text-xs text-slate-400">
                          🕐 {(preferences?.[alert.id === 'newsDigest' ? 'newsDigestTimes' : 'cryptoDigestTime'] || alert.defaultTimes || []).join(', ')}
                        </span>
                      )}
                      {alert.hasTime && !alert.hasMultipleTimes && (
                        <span className="text-xs text-slate-400">
                          🕐 {customTime}
                        </span>
                      )}
                      {!alert.hasTime && !alert.hasMultipleTimes && alert.timeLabel && (
                        <span className="text-xs text-slate-400">
                          ⚡ {alert.timeLabel}
                        </span>
                      )}
                      {alert.hasThreshold && (
                        <span className="text-xs text-slate-400">
                          📊 {alert.thresholdLabel}: {customThreshold}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Test Result Feedback */}
                  {testResult && testResult.type === alert.id && (
                    <div className={`text-xs mt-1 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {testResult.success ? '✓' : '✗'} {testResult.message}
                    </div>
                  )}
                </div>

                {/* Test Button */}
                <button
                  onClick={() => sendTestAlert(alert.id)}
                  disabled={testingAlert === alert.id}
                  className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded-lg transition-colors disabled:opacity-50"
                  title="Send test alert"
                >
                  {testingAlert === alert.id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                </button>

                {/* Edit Button */}
                {isEnabled && (alert.hasTime || alert.hasThreshold || alert.hasMultipleTimes) && (
                  <button
                    onClick={() => openEditModal(alert.id)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    title="Customize"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}

                {/* Toggle */}
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className={`w-14 h-8 rounded-full transition-colors relative flex-shrink-0 ${
                    isEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span 
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${
                      isEnabled ? 'left-7' : 'left-1'
                    }`} 
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* RECENT HISTORY - NOW REAL DATA! */}
      {/* ============================================ */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Alerts
          </h2>
          <Link 
            to="/alerts/history"
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {alertHistory.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {alertHistory.slice(0, 5).map((item, index) => {
              // Map API type to our config
              const mappedType = ALERT_TYPE_MAP[item.type] || item.type;
              const alertConfig = ALERT_TYPES[mappedType];
              const Icon = alertConfig?.icon || Bell;
              
              return (
                <div key={item.id || index} className="px-5 py-3 flex items-center gap-3">
                  <div 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${alertConfig?.bgColor || 'bg-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" style={{ color: alertConfig?.color || '#94a3b8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{item.title || alertConfig?.name || 'Alert'}</p>
                    <p className="text-slate-500 text-xs">{item.timeAgo || formatTimeAgo(item.sentAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Sent
                    </p>
                    {item.location && (
                      <p className="text-slate-500 text-xs">{item.location}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No alerts sent yet</p>
            <p className="text-slate-600 text-sm mt-1">
              Enable alerts above to start receiving notifications
            </p>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* EDIT MODAL */}
      {/* ============================================ */}
      {editingAlert && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Customize {ALERT_TYPES[editingAlert]?.name}
              </h3>
              <button
                onClick={() => setEditingAlert(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Multiple Times Setting (News Digest) */}
              {ALERT_TYPES[editingAlert]?.hasMultipleTimes && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm text-slate-400">
                      Delivery Times ({editValues.times?.length || 0} per day)
                    </label>
                    {(editValues.times?.length || 0) < (ALERT_TYPES[editingAlert]?.maxTimes || 6) && (
                      <button
                        onClick={addTimeSlot}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <Plus className="w-3 h-3" />
                        Add time
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {editValues.times?.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateTimeSlot(index, e.target.value)}
                          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                        />
                        {editValues.times.length > 1 && (
                          <button
                            onClick={() => removeTimeSlot(index)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-slate-500 text-xs mt-3">
                    Add up to {ALERT_TYPES[editingAlert]?.maxTimes || 6} delivery times. Times are in your local timezone.
                  </p>
                </div>
              )}

              {/* Time Setting (for single-time alerts) */}
              {ALERT_TYPES[editingAlert]?.hasTime && !ALERT_TYPES[editingAlert]?.hasMultipleTimes && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {ALERT_TYPES[editingAlert]?.timeLabel || 'Time'}
                  </label>
                  <input
                    type="time"
                    value={editValues.time}
                    onChange={(e) => setEditValues(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              )}

              {/* Threshold Setting */}
              {ALERT_TYPES[editingAlert]?.hasThreshold && (
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {ALERT_TYPES[editingAlert]?.thresholdLabel || 'Threshold'}
                  </label>
                  <input
                    type="number"
                    value={editValues.threshold}
                    onChange={(e) => setEditValues(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
                  />
                  {editingAlert === 'stargazingAlerts' && (
                    <p className="text-slate-500 text-xs mt-1">
                      SkyScore 0-100. Higher = better conditions. Recommended: 65+
                    </p>
                  )}
                  {editingAlert === 'auroraAlerts' && (
                    <p className="text-slate-500 text-xs mt-1">
                      AuroraScore 0-100. Factors in Kp, clouds, darkness. Recommended: 50+
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setEditingAlert(null)}
                className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAlertSettings}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2"
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
      )}
    </div>
  );
};

/**
 * Format time ago (fallback if API doesn't provide it)
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}

export default AlertCenterPage;
