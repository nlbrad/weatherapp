/**
 * AlertCenterPage.jsx - Primary Home Page (Alert-First Design)
 * 
 * THE hub for all alert management.
 * 
 * Features:
 * - Quick stats (active alerts, Telegram status)
 * - All alert types with enable/disable AND customization
 * - Recent alert history
 * - Setup prompts if not configured
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bell, Sun, Star, AlertTriangle, Sparkles, Clock, Send, 
  Check, ChevronRight, Loader, RefreshCw, MapPin, Settings,
  Thermometer, X, Edit2, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../auth';
import { locationsAPI, preferencesAPI } from '../services/api';

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
    thresholdUnit: '',
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
    timeLabel: 'Real-time (Kp ≥ 5)',
    hasTime: false,
    hasThreshold: true,
    thresholdLabel: 'Min Kp Index',
    thresholdDefault: 5,
    thresholdUnit: '',
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

// Mock recent history - replace with real API
const mockHistory = [
  { id: 1, type: 'dailyForecast', time: 'Today 7:00 AM', status: 'Delivered', location: 'Dublin' },
  { id: 2, type: 'stargazingAlerts', time: 'Yesterday 6:00 PM', status: 'Score: 72', location: 'Dublin' },
  { id: 3, type: 'weatherWarnings', time: 'Yesterday 2:14 PM', status: 'Yellow Wind', location: 'Ireland' },
];

const AlertCenterPage = () => {
  const navigate = useNavigate();
  const { getUserId } = useAuth();
  const userId = getUserId();

  // State
  const [preferences, setPreferences] = useState(null);
  const [primaryLocation, setPrimaryLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Edit modal state
  const [editingAlert, setEditingAlert] = useState(null);
  const [editValues, setEditValues] = useState({});

  /**
   * Load user data
   */
  const loadData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

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

    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data');
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
    setEditValues({
      time: preferences?.[`${alertType}Time`] || config.defaultTime || '07:00',
      threshold: preferences?.[`${alertType}Threshold`] || config.thresholdDefault || 65,
    });
  };

  /**
   * Save alert customization
   */
  const saveAlertSettings = async () => {
    setSaving(true);
    try {
      const updates = {
        ...preferences,
        [`${editingAlert}Time`]: editValues.time,
        [`${editingAlert}Threshold`]: editValues.threshold,
      };
      
      await preferencesAPI.savePreferences(userId, updates);
      setPreferences(updates);
      setEditingAlert(null);
    } catch (err) {
      console.error('Failed to save alert settings:', err);
    } finally {
      setSaving(false);
    }
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

        {/* Next Alert */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <Clock className="w-4 h-4" />
            Next Alert
          </div>
          {preferences?.alertTypes?.dailyForecast ? (
            <>
              <p className="text-lg font-bold text-white">
                {preferences?.dailyForecastTime || '07:00'}
              </p>
              <p className="text-slate-500 text-xs">Daily Forecast</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-slate-500">—</p>
              <p className="text-slate-500 text-xs">No scheduled alerts</p>
            </>
          )}
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
                    <div className="flex items-center gap-3 mt-1">
                      {alert.hasTime && (
                        <span className="text-xs text-slate-400">
                          🕐 {customTime}
                        </span>
                      )}
                      {!alert.hasTime && (
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
                </div>

                {/* Edit Button */}
                {isEnabled && (alert.hasTime || alert.hasThreshold) && (
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
      {/* RECENT HISTORY */}
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

        {mockHistory.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {mockHistory.map(item => {
              const alertConfig = ALERT_TYPES[item.type];
              const Icon = alertConfig?.icon || Bell;
              
              return (
                <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                  <div 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${alertConfig?.bgColor || 'bg-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" style={{ color: alertConfig?.color || '#94a3b8' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{alertConfig?.name || 'Alert'}</p>
                    <p className="text-slate-500 text-xs">{item.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 text-sm flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {item.status}
                    </p>
                    <p className="text-slate-500 text-xs">{item.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-slate-500">No alerts sent yet</p>
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
              {/* Time Setting */}
              {ALERT_TYPES[editingAlert]?.hasTime && (
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
                      SkyScore 0-100. Higher = better conditions.
                    </p>
                  )}
                  {editingAlert === 'auroraAlerts' && (
                    <p className="text-slate-500 text-xs mt-1">
                      Kp Index 0-9. Higher = stronger aurora. 5+ visible in Ireland.
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

export default AlertCenterPage;