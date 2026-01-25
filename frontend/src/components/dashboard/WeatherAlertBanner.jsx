import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';

/**
 * WeatherAlertBanner - Displays active weather warnings
 * 
 * Features:
 * - Color-coded by severity
 * - Expandable details
 * - Multiple alerts support
 * - Auto-detects severity from event name
 */

const WeatherAlertBanner = ({ alerts, timezone }) => {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState([]);

  if (!alerts || alerts.length === 0) return null;

  // Filter out dismissed alerts
  const activeAlerts = alerts.filter((_, idx) => !dismissed.includes(idx));
  
  if (activeAlerts.length === 0) return null;

  // Determine severity based on event name keywords
  const getSeverity = (event) => {
    const eventLower = event.toLowerCase();
    
    // Red - Extreme/Dangerous
    if (eventLower.includes('hurricane') || 
        eventLower.includes('tornado') || 
        eventLower.includes('extreme') ||
        eventLower.includes('emergency') ||
        eventLower.includes('tsunami')) {
      return { level: 'extreme', color: 'bg-red-600', border: 'border-red-500', text: 'text-red-100', icon: '🔴' };
    }
    
    // Orange - Severe
    if (eventLower.includes('severe') || 
        eventLower.includes('storm') ||
        eventLower.includes('flood') ||
        eventLower.includes('blizzard') ||
        eventLower.includes('ice')) {
      return { level: 'severe', color: 'bg-orange-600', border: 'border-orange-500', text: 'text-orange-100', icon: '🟠' };
    }
    
    // Yellow - Warning
    if (eventLower.includes('warning') || 
        eventLower.includes('wind') ||
        eventLower.includes('rain') ||
        eventLower.includes('snow') ||
        eventLower.includes('fog') ||
        eventLower.includes('frost')) {
      return { level: 'warning', color: 'bg-yellow-600', border: 'border-yellow-500', text: 'text-yellow-100', icon: '🟡' };
    }
    
    // Blue - Advisory/Watch
    return { level: 'advisory', color: 'bg-blue-600', border: 'border-blue-500', text: 'text-blue-100', icon: '🔵' };
  };

  // Format time in location's timezone
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'UTC'
    });
  };

  // Get most severe alert for banner color
  const severities = activeAlerts.map(a => getSeverity(a.event));
  const mostSevere = severities.reduce((max, s) => {
    const order = { extreme: 4, severe: 3, warning: 2, advisory: 1 };
    return order[s.level] > order[max.level] ? s : max;
  }, severities[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 rounded-xl overflow-hidden border ${mostSevere.border} ${mostSevere.color}`}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-white" />
          <div>
            <p className="font-semibold text-white">
              {activeAlerts.length === 1 
                ? activeAlerts[0].event 
                : `${activeAlerts.length} Weather Alerts Active`}
            </p>
            {activeAlerts.length === 1 && (
              <p className="text-sm text-white/70">
                Until {formatTime(activeAlerts[0].end)}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-2xl">{mostSevere.icon}</span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-white/70" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/70" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/20"
          >
            {activeAlerts.map((alert, idx) => {
              const severity = getSeverity(alert.event);
              // Detect if alert is non-English (contains non-ASCII characters)
              const isNonEnglish = /[^\x00-\x7F]/.test(alert.event) || /[^\x00-\x7F]/.test(alert.description || '');
              
              return (
                <div 
                  key={idx}
                  className="px-4 py-4 border-t border-white/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span>{severity.icon}</span>
                      <h4 className="font-semibold text-white">{alert.event}</h4>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissed([...dismissed, alerts.indexOf(alert)]);
                      }}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </button>
                  </div>
                  
                  {isNonEnglish && (
                    <p className="text-xs text-yellow-300/70 mb-2 italic">
                      ⚠️ Alert displayed in local language from regional weather service
                    </p>
                  )}
                  
                  {alert.sender && (
                    <p className="text-sm text-white/60 mb-2">
                      <Info className="w-3 h-3 inline mr-1" />
                      Source: {alert.sender}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-white/70 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.start)} - {formatTime(alert.end)}
                    </span>
                  </div>
                  
                  {alert.description && (
                    <div className="bg-black/20 rounded-lg p-3 max-h-60 overflow-y-auto">
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                        {alert.description}
                      </p>
                    </div>
                  )}
                  
                  {alert.tags && alert.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {alert.tags.map((tag, tagIdx) => (
                        <span 
                          key={tagIdx}
                          className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/70"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WeatherAlertBanner;