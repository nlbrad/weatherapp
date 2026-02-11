import React from 'react';
import { motion } from 'framer-motion';
import { Sunrise, Sunset, Sun, Clock } from 'lucide-react';

/**
 * SunWidget - Sunrise, sunset times with visual sun arc
 * 
 * Features:
 * - Sunrise/sunset times
 * - Visual arc showing sun position throughout day
 * - Day length calculation
 * - Golden hour indicators
 * - Current sun position
 */

const SunWidget = ({ forecast }) => {
  if (!forecast || !forecast.current || !forecast.daily?.[0]) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400">Sun data unavailable</p>
      </div>
    );
  }

  const today = forecast.daily[0];
  const timezone = forecast.current?.timezone || 'UTC';
  
  // Parse times (these are already in UTC from API)
  const sunrise = new Date(today.sunrise);
  const sunset = new Date(today.sunset);
  
  // Get current time in the location's timezone
  const now = new Date();
  
  // Calculate day length
  const dayLengthMs = sunset - sunrise;
  const dayLengthHours = Math.floor(dayLengthMs / (1000 * 60 * 60));
  const dayLengthMinutes = Math.floor((dayLengthMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Calculate night length
  const nightLengthMs = (24 * 60 * 60 * 1000) - dayLengthMs;
  const nightLengthHours = Math.floor(nightLengthMs / (1000 * 60 * 60));
  const nightLengthMinutes = Math.floor((nightLengthMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Calculate sun position (0 to 1, where 0 is sunrise, 1 is sunset)
  const sunProgress = now >= sunrise && now <= sunset
    ? (now - sunrise) / (sunset - sunrise)
    : now < sunrise ? 0 : 1;
  
  const isDaytime = now >= sunrise && now <= sunset;
  
  // Calculate golden hour times (roughly 1 hour after sunrise and 1 hour before sunset)
  const goldenMorningEnd = new Date(sunrise.getTime() + 60 * 60 * 1000);
  const goldenEveningStart = new Date(sunset.getTime() - 60 * 60 * 1000);
  
  // Check if currently in golden hour
  const isGoldenHour = (now >= sunrise && now <= goldenMorningEnd) || 
                       (now >= goldenEveningStart && now <= sunset);

  // Calculate solar noon (midpoint between sunrise and sunset)
  const solarNoon = new Date(sunrise.getTime() + dayLengthMs / 2);

  // Helper to format time in location's timezone
  const formatTimeInZone = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-accent-orange" />
              Sun
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Daylight hours and position
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isGoldenHour && (
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ✨ Golden Hour
              </span>
            )}
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              isDaytime 
                ? 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {isDaytime ? '☀️ Daytime' : '🌙 Nighttime'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Sun Arc Visualization */}
        <div className="relative h-36 mb-6">
          <svg className="w-full h-full" viewBox="0 0 200 110">
            {/* Sky gradient background */}
            <defs>
              <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isDaytime ? '#1e3a5f' : '#0a0a1a'} />
                <stop offset="100%" stopColor={isDaytime ? '#2d4a6f' : '#1a1a2e'} />
              </linearGradient>
            </defs>
            <rect x="10" y="5" width="180" height="90" rx="8" fill="url(#skyGradient)" opacity="0.3" />
            
            {/* Horizon line */}
            <line x1="20" y1="90" x2="180" y2="90" stroke="#444" strokeWidth="1" strokeDasharray="4,4" />
            <text x="185" y="93" fontSize="8" fill="#666">horizon</text>
            
            {/* Arc path background */}
            <path
              d="M 20 90 Q 100 5 180 90"
              fill="none"
              stroke="#333"
              strokeWidth="2"
            />
            
            {/* Daylight arc (filled portion) */}
            {isDaytime && (
              <path
                d="M 20 90 Q 100 5 180 90"
                fill="none"
                stroke="url(#sunArcGradient)"
                strokeWidth="4"
                strokeDasharray={`${sunProgress * 175}, 175`}
                strokeLinecap="round"
              />
            )}
            
            {/* Sun arc gradient */}
            <defs>
              <linearGradient id="sunArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
            </defs>
            
            {/* Solar noon marker */}
            <line x1="100" y1="5" x2="100" y2="15" stroke="#fbbf24" strokeWidth="1" opacity="0.5" />
            <text x="100" y="22" fontSize="7" fill="#fbbf24" textAnchor="middle" opacity="0.7">noon</text>
            
            {/* Sun position indicator */}
            {isDaytime && (
              <g>
                {/* Sun glow */}
                <circle
                  cx={20 + sunProgress * 160}
                  cy={90 - Math.sin(sunProgress * Math.PI) * 80}
                  r="12"
                  fill="#f97316"
                  opacity="0.3"
                >
                  <animate
                    attributeName="r"
                    values="12;16;12"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </circle>
                {/* Sun core */}
                <circle
                  cx={20 + sunProgress * 160}
                  cy={90 - Math.sin(sunProgress * Math.PI) * 80}
                  r="8"
                  fill="#fbbf24"
                  stroke="#f97316"
                  strokeWidth="2"
                />
              </g>
            )}
            
            {/* Sunrise marker - East */}
            <text x="20" y="105" fontSize="9" fill="#888" textAnchor="middle" fontWeight="500">E</text>
            
            {/* Sunset marker - West */}
            <text x="180" y="105" fontSize="9" fill="#888" textAnchor="middle" fontWeight="500">W</text>
          </svg>
        </div>

        {/* Sun times grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-slate-800 border border-slate-800 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sunrise className="w-4 h-4 text-accent-orange" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Sunrise</p>
            <p className="text-lg font-bold text-white font-mono">
              {formatTimeInZone(sunrise)}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-800 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sun className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Solar Noon</p>
            <p className="text-lg font-bold text-white font-mono">
              {formatTimeInZone(solarNoon)}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-800 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Sunset className="w-4 h-4 text-accent-orange" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Sunset</p>
            <p className="text-lg font-bold text-white font-mono">
              {formatTimeInZone(sunset)}
            </p>
          </div>

          <div className="bg-slate-800 border border-slate-800 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-accent-green" />
            </div>
            <p className="text-xs text-slate-400 mb-1">Daylight</p>
            <p className="text-lg font-bold text-white font-mono">
              {dayLengthHours}h {dayLengthMinutes}m
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-400">
              <span className="text-slate-500">Night length:</span>{' '}
              <span className="text-white font-mono">{nightLengthHours}h {nightLengthMinutes}m</span>
            </div>
            <div className="text-slate-400">
              <span className="text-slate-500">Golden hour:</span>{' '}
              <span className="text-amber-400 font-mono">
                {formatTimeInZone(sunrise)}-{formatTimeInZone(goldenMorningEnd)}, {formatTimeInZone(goldenEveningStart)}-{formatTimeInZone(sunset)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SunWidget;