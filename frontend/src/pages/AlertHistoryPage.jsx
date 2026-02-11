/**
 * AlertHistoryPage.jsx - Full Alert History
 *
 * Shows all sent notifications grouped by date with:
 * - Summary stats (total, today, this week)
 * - Filter by alert type
 * - Chronological timeline grouped by date
 * - Expandable detail view per alert
 *
 * Route: /alerts/history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, Sun, Star, AlertTriangle, Sparkles, Clock,
  Check, ChevronDown, ChevronRight, Loader, RefreshCw,
  MapPin, Filter, History, Calendar, Newspaper, Zap,
  Thermometer, ArrowLeft, Info
} from 'lucide-react';
import { useAuth } from '../auth';
import { alertsAPI } from '../services/api';

/**
 * Alert type display configuration
 * Mirrors AlertCenterPage definitions for consistency
 */
const ALERT_TYPES = {
  'daily-forecast': {
    name: 'Daily Forecast',
    icon: Sun,
    color: '#F59E0B',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    chipBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    chipActive: 'bg-amber-500 text-white border-amber-500',
  },
  'news-digest': {
    name: 'News Digest',
    icon: Newspaper,
    color: '#10B981',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/40',
    chipBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    chipActive: 'bg-emerald-500 text-white border-emerald-500',
  },
  'crypto-digest': {
    name: 'Crypto Digest',
    icon: Zap,
    color: '#F59E0B',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/40',
    chipBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    chipActive: 'bg-amber-500 text-white border-amber-500',
  },
  'tonights-sky': {
    name: "Tonight's Sky",
    icon: Star,
    color: '#06B6D4',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/40',
    chipBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    chipActive: 'bg-cyan-500 text-white border-cyan-500',
  },
  'weather-warning': {
    name: 'Weather Warning',
    icon: AlertTriangle,
    color: '#EF4444',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    chipBg: 'bg-red-500/10 text-red-400 border-red-500/30',
    chipActive: 'bg-red-500 text-white border-red-500',
  },
  aurora: {
    name: 'Aurora Alert',
    icon: Sparkles,
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/40',
    chipBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    chipActive: 'bg-purple-500 text-white border-purple-500',
  },
  temperature: {
    name: 'Temperature Alert',
    icon: Thermometer,
    color: '#F97316',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    chipBg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    chipActive: 'bg-orange-500 text-white border-orange-500',
  },
};

/**
 * Severity badge colors for weather warnings
 */
const SEVERITY_COLORS = {
  Red: 'bg-red-500/20 text-red-400 border-red-500/30',
  Orange: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

/**
 * Group alerts by date heading (Today, Yesterday, date)
 */
function groupByDate(alerts) {
  const groups = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  for (const alert of alerts) {
    const date = new Date(alert.sentAt);
    const dateStr = date.toDateString();

    let label;
    if (dateStr === today) {
      label = 'Today';
    } else if (dateStr === yesterdayStr) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-IE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }

    if (!groups[label]) {
      groups[label] = { label, date, alerts: [] };
    }
    groups[label].alerts.push(alert);
  }

  // Return as array sorted newest first
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

/**
 * Compute stats from alert list
 */
function computeStats(alerts) {
  const now = new Date();
  const todayStr = now.toDateString();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let today = 0;
  let thisWeek = 0;
  const byType = {};

  for (const alert of alerts) {
    const date = new Date(alert.sentAt);
    if (date.toDateString() === todayStr) today++;
    if (date >= weekAgo) thisWeek++;
    byType[alert.type] = (byType[alert.type] || 0) + 1;
  }

  return { total: alerts.length, today, thisWeek, byType };
}

const AlertHistoryPage = () => {
  const { getUserId } = useAuth();
  const userId = getUserId();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // null = all
  const [expandedId, setExpandedId] = useState(null);

  /**
   * Load alert history
   */
  const loadHistory = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await alertsAPI.getAlertHistory(userId, 100, activeFilter);
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to load alert history:', err);
      setError('Failed to load alert history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, activeFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = computeStats(alerts);
  const grouped = groupByDate(alerts);

  // Determine which types exist in the data (for filter chips)
  const availableTypes = [...new Set(alerts.map(a => a.type))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading alert history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Alert Center
      </Link>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ============================================ */}
      {/* STATS BAR */}
      {/* ============================================ */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-slate-500 text-xs">total alerts</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{stats.today}</p>
          <p className="text-slate-500 text-xs">today</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{stats.thisWeek}</p>
          <p className="text-slate-500 text-xs">this week</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* FILTERS + REFRESH */}
      {/* ============================================ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />

          {/* "All" chip */}
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              activeFilter === null
                ? 'bg-slate-200 text-slate-900 border-slate-300'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
            }`}
          >
            All
          </button>

          {/* Type chips */}
          {availableTypes.map(type => {
            const config = ALERT_TYPES[type];
            if (!config) return null;
            const isActive = activeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(isActive ? null : type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isActive ? config.chipActive : config.chipBg
                } hover:opacity-90`}
              >
                {config.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => loadHistory(true)}
          disabled={refreshing}
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ============================================ */}
      {/* TIMELINE */}
      {/* ============================================ */}
      {alerts.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">
            {activeFilter ? 'No alerts of this type' : 'No Alert History Yet'}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {activeFilter
              ? 'Try clearing the filter or check back later.'
              : 'Alerts will appear here once your enabled notifications are triggered.'}
          </p>
          {!activeFilter && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm"
            >
              Configure alerts
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.label}>
              {/* Date heading */}
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-medium text-slate-400">{group.label}</h3>
                <span className="text-xs text-slate-600">
                  {group.alerts.length} alert{group.alerts.length !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 border-t border-slate-800" />
              </div>

              {/* Alert cards for this date */}
              <div className="space-y-2">
                {group.alerts.map(alert => {
                  const config = ALERT_TYPES[alert.type] || {
                    name: alert.type,
                    icon: Bell,
                    color: '#94a3b8',
                    bgColor: 'bg-slate-700',
                    borderColor: 'border-slate-700',
                  };
                  const Icon = config.icon;
                  const isExpanded = expandedId === alert.id;
                  const sentDate = new Date(alert.sentAt);

                  return (
                    <button
                      key={alert.id}
                      onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                      className={`w-full text-left bg-slate-900/50 border rounded-xl transition-colors hover:border-slate-600 ${
                        isExpanded ? config.borderColor : 'border-slate-800'
                      }`}
                    >
                      {/* Main row */}
                      <div className="px-4 py-3 flex items-center gap-3">
                        {/* Type icon */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${config.bgColor}`}
                        >
                          <Icon className="w-4 h-4" style={{ color: config.color }} />
                        </div>

                        {/* Title + meta */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {alert.title && !alert.title.startsWith('undefined ')
                              ? alert.title
                              : config.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-slate-500 text-xs">
                              {sentDate.toLocaleTimeString('en-IE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </span>
                            {alert.location && (
                              <>
                                <span className="text-slate-700 text-xs">|</span>
                                <span className="text-slate-500 text-xs flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {alert.location}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right side: badges + status */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Severity badge for weather warnings */}
                          {alert.severity && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                SEVERITY_COLORS[alert.severity] ||
                                'bg-slate-700 text-slate-400 border-slate-600'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          )}

                          {/* Score badge */}
                          {alert.score != null && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                              {alert.score}
                            </span>
                          )}

                          {/* Sent status */}
                          <span className="text-emerald-400">
                            <Check className="w-4 h-4" />
                          </span>

                          {/* Expand chevron */}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-slate-800 mx-3 mb-1">
                          <div className="space-y-2 mt-2">
                            {/* Summary */}
                            {alert.summary && (
                              <div className="flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                                <p className="text-slate-400 text-sm">{alert.summary}</p>
                              </div>
                            )}

                            {/* Metadata row */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {sentDate.toLocaleString('en-IE', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                {config.name}
                              </span>
                              {alert.score != null && (
                                <span>Score: {alert.score}/100</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertHistoryPage;
