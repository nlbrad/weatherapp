import React from 'react';
import { AlertTriangle, Clock, Shield } from 'lucide-react';

/**
 * WeatherAlertsWidget - Active weather warnings
 *
 * Uses OpenWeather alerts (works for all locations worldwide).
 * MeteoAlarm is used separately for Telegram notifications (Ireland only).
 *
 * Alert details are shown by default — no collapsed state.
 */

const SEVERITY_COLORS = {
  red:    { bg: 'bg-red-600',    border: 'border-red-500',    badge: 'bg-red-500',    icon: '🔴' },
  orange: { bg: 'bg-orange-600', border: 'border-orange-500', badge: 'bg-orange-500', icon: '🟠' },
  yellow: { bg: 'bg-yellow-600', border: 'border-yellow-500', badge: 'bg-yellow-500', icon: '🟡' },
  blue:   { bg: 'bg-blue-600',   border: 'border-blue-500',   badge: 'bg-blue-500',   icon: '🔵' },
};

const SEVERITY_LEVEL_MAP = { 4: 'red', 3: 'orange', 2: 'yellow', 1: 'blue' };

const getSeverity = (alert) => {
  // Use MeteoAlarm severityLevel directly if available
  if (alert.severityLevel && SEVERITY_LEVEL_MAP[alert.severityLevel]) {
    return SEVERITY_COLORS[SEVERITY_LEVEL_MAP[alert.severityLevel]];
  }
  // Fallback: infer from event text (OpenWeather alerts)
  const e = (alert.event || '').toLowerCase();
  if (e.includes('red') || e.includes('hurricane') || e.includes('tornado') || e.includes('extreme') || e.includes('emergency'))
    return SEVERITY_COLORS.red;
  if (e.includes('orange') || e.includes('severe') || e.includes('storm') || e.includes('flood') || e.includes('blizzard'))
    return SEVERITY_COLORS.orange;
  if (e.includes('warning') || e.includes('wind') || e.includes('rain') || e.includes('snow') || e.includes('frost') || e.includes('thunder'))
    return SEVERITY_COLORS.yellow;
  return SEVERITY_COLORS.blue;
};

const WeatherAlertsWidget = ({ forecast }) => {
  const alerts = forecast?.alerts;

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm h-full">
        <Shield className="w-4 h-4" />
        No active weather alerts
      </div>
    );
  }

  const timezone = forecast?.timezone || forecast?.current?.timezone || 'UTC';
  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: timezone
      });
    } catch {
      return new Date(iso).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    }
  };

  // Find the most severe alert for the banner colour
  const severities = alerts.map(a => getSeverity(a));
  const severityOrder = { 'bg-red-600': 4, 'bg-orange-600': 3, 'bg-yellow-600': 2, 'bg-blue-600': 1 };
  const mostSevere = severities.reduce((max, s) =>
    (severityOrder[s.bg] || 0) > (severityOrder[max.bg] || 0) ? s : max
  , severities[0]);

  return (
    <div className={`-m-3 rounded-xl overflow-hidden ${mostSevere.bg} ${mostSevere.border} border h-full flex flex-col`}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
        <p className="font-semibold text-white text-sm">
          {alerts.length === 1 ? alerts[0].event : `${alerts.length} Weather Alerts`}
        </p>
        <span className="ml-auto">{mostSevere.icon}</span>
      </div>

      {/* Alert details — always visible */}
      <div className="bg-black/20 flex-1 overflow-y-auto">
        {alerts.map((alert, idx) => {
          const sev = getSeverity(alert);
          return (
            <div key={idx} className="px-3 py-2.5 border-t border-white/10">
              {/* Alert title + severity badge */}
              <div className="flex items-start gap-2 mb-1.5">
                <span className="mt-0.5 flex-shrink-0">{sev.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-sm leading-snug">{alert.event}</h4>
                  {alert.sender && (
                    <p className="text-[11px] text-white/50 mt-0.5">{alert.sender}</p>
                  )}
                </div>
              </div>

              {/* Time range */}
              <div className="flex items-center gap-1.5 text-xs text-white/70 mb-1.5 ml-6">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{formatTime(alert.start)} – {formatTime(alert.end)}</span>
              </div>

              {/* Full description — no truncation */}
              {alert.description && (
                <p className="text-xs text-white/75 leading-relaxed whitespace-pre-line ml-6">
                  {alert.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(WeatherAlertsWidget);
