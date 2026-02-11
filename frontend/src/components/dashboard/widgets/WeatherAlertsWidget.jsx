import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react';

/**
 * WeatherAlertsWidget - Active weather warnings
 */

const getSeverity = (event) => {
  const e = (event || '').toLowerCase();
  if (e.includes('hurricane') || e.includes('tornado') || e.includes('extreme') || e.includes('emergency'))
    return { color: 'bg-red-600', border: 'border-red-500', icon: '🔴' };
  if (e.includes('severe') || e.includes('storm') || e.includes('flood') || e.includes('blizzard'))
    return { color: 'bg-orange-600', border: 'border-orange-500', icon: '🟠' };
  if (e.includes('warning') || e.includes('wind') || e.includes('rain') || e.includes('snow') || e.includes('frost'))
    return { color: 'bg-yellow-600', border: 'border-yellow-500', icon: '🟡' };
  return { color: 'bg-blue-600', border: 'border-blue-500', icon: '🔵' };
};

const WeatherAlertsWidget = ({ forecast }) => {
  const [expanded, setExpanded] = useState(false);
  const alerts = forecast?.alerts;

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm h-full">
        <AlertTriangle className="w-4 h-4" />
        No active weather alerts
      </div>
    );
  }

  const timezone = forecast?.current?.timezone || 'UTC';
  const formatTime = (iso) => new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: timezone
  });

  const severities = alerts.map(a => getSeverity(a.event));
  const mostSevere = severities.reduce((max, s) => {
    const order = { 'bg-red-600': 4, 'bg-orange-600': 3, 'bg-yellow-600': 2, 'bg-blue-600': 1 };
    return (order[s.color] || 0) > (order[max.color] || 0) ? s : max;
  }, severities[0]);

  return (
    <div className={`-m-3 rounded-xl overflow-hidden ${mostSevere.color} ${mostSevere.border} border h-full flex flex-col`}>
      <div className="px-3 py-2 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-white" />
          <p className="font-semibold text-white text-sm">
            {alerts.length === 1 ? alerts[0].event : `${alerts.length} Weather Alerts`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span>{mostSevere.icon}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
        </div>
      </div>

      {expanded && (
        <div className="bg-black/20 flex-1 overflow-auto">
          {alerts.map((alert, idx) => (
            <div key={idx} className="px-3 py-2 border-t border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <span>{getSeverity(alert.event).icon}</span>
                <h4 className="font-semibold text-white text-sm">{alert.event}</h4>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/70 mb-1">
                <Clock className="w-3 h-3" />
                {formatTime(alert.start)} – {formatTime(alert.end)}
              </div>
              {alert.description && (
                <p className="text-xs text-white/70 leading-relaxed line-clamp-3">{alert.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(WeatherAlertsWidget);
