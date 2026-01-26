import React from 'react';
import { motion } from 'framer-motion';
import { Moon, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * MoonWidget - Moon phase, moonrise/moonset times
 * 
 * Features:
 * - Moon phase visualization
 * - Moonrise/moonset times
 * - Illumination percentage
 * - Phase name and description
 * - Next full/new moon indicator
 */

const MoonWidget = ({ forecast }) => {
  // Moon phase calculation
  const getMoonPhase = () => {
    const date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    const day = date.getDate();
    
    if (month < 3) {
      year--;
      month += 12;
    }
    
    month++;
    const c = 365.25 * year;
    const e = 30.6 * month;
    let jd = c + e + day - 694039.09;
    jd /= 29.5305882;
    const b_initial = parseInt(jd);
    jd -= b_initial;
    let b = Math.round(jd * 8);
    
    if (b >= 8) b = 0;
    
    // Calculate days until next full moon and new moon
    const daysInCycle = 29.5305882;
    const currentPhaseDay = jd * daysInCycle;
    const daysToFull = currentPhaseDay < 14.76 ? 14.76 - currentPhaseDay : daysInCycle - currentPhaseDay + 14.76;
    const daysToNew = currentPhaseDay < daysInCycle ? daysInCycle - currentPhaseDay : 0;
    
    return {
      phase: b,
      illumination: Math.abs(jd < 0.5 ? jd * 2 : (1 - jd) * 2),
      name: ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 
             'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'][b],
      description: [
        'Moon not visible',
        'Moon is growing, less than half lit',
        'Right half of moon is lit',
        'Moon is almost full',
        'Entire moon is visible',
        'Moon is shrinking, still mostly lit',
        'Left half of moon is lit',
        'Moon is almost gone'
      ][b],
      emoji: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][b],
      daysToFull: Math.round(daysToFull),
      daysToNew: Math.round(daysToNew)
    };
  };

  const moonPhase = getMoonPhase();
  
  // Get timezone from forecast
  const timezone = forecast?.current?.timezone || 'UTC';
  
  // Get moonrise/moonset from forecast if available
  const today = forecast?.daily?.[0];
  const moonrise = today?.moonrise ? new Date(today.moonrise) : null;
  const moonset = today?.moonset ? new Date(today.moonset) : null;
  
  // Check if moon is currently visible (simplified - between moonrise and moonset)
  const now = new Date();
  const isMoonVisible = moonrise && moonset ? 
    (moonrise < moonset ? (now >= moonrise && now <= moonset) : (now >= moonrise || now <= moonset)) 
    : null;

  // Calculate approximate moon rise/set directions
  // Moon rises in the east (varies between NE and SE) and sets in the west (varies between NW and SW)
  // This is a simplified approximation based on lunar cycle
  const getMoonDirection = (isRising) => {
    // The moon's rising/setting azimuth varies throughout the lunar month
    // Full moon rises around ESE, sets WSW
    // New moon behavior is similar to sun
    const phase = moonPhase.phase;
    
    if (isRising) {
      // Moonrise directions (eastern horizon)
      const directions = ['E', 'ENE', 'ENE', 'E', 'ESE', 'ESE', 'E', 'ENE'];
      const azimuths = ['90°', '67°', '67°', '90°', '112°', '112°', '90°', '67°'];
      return { dir: directions[phase], azimuth: azimuths[phase] };
    } else {
      // Moonset directions (western horizon)
      const directions = ['W', 'WNW', 'WNW', 'W', 'WSW', 'WSW', 'W', 'WNW'];
      const azimuths = ['270°', '293°', '293°', '270°', '248°', '248°', '270°', '293°'];
      return { dir: directions[phase], azimuth: azimuths[phase] };
    }
  };

  const moonriseDir = getMoonDirection(true);
  const moonsetDir = getMoonDirection(false);

  // Helper to format time in location's timezone
  const formatTimeInZone = (date) => {
    if (!date) return '--:--';
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
      transition={{ delay: 0.7 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Moon className="w-5 h-5 text-blue-400" />
              Moon
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Lunar phase and visibility
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {moonPhase.name}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-6">
          {/* Moon Phase Visualization */}
          <div className="flex flex-col items-center">
            {/* Moon visual */}
            <div className="relative w-28 h-28 mb-3">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full bg-blue-400/10 blur-md" />
              
              {/* Moon background */}
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-inner overflow-hidden">
                {/* Moon surface texture */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-3 w-4 h-4 rounded-full bg-gray-600/50" />
                  <div className="absolute top-8 right-4 w-3 h-3 rounded-full bg-gray-600/50" />
                  <div className="absolute bottom-6 left-6 w-5 h-5 rounded-full bg-gray-600/50" />
                  <div className="absolute bottom-4 right-3 w-2 h-2 rounded-full bg-gray-600/50" />
                </div>
                
                {/* Shadow overlay based on phase */}
                <div 
                  className="absolute inset-0 bg-dark-bg transition-all duration-1000"
                  style={{
                    clipPath: moonPhase.phase < 4
                      ? `inset(0 ${(1 - moonPhase.illumination) * 100}% 0 0)`
                      : `inset(0 0 0 ${(1 - moonPhase.illumination) * 100}%)`
                  }}
                />
              </div>
              
              {/* Phase emoji overlay */}
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-90">
                {moonPhase.emoji}
              </div>
            </div>
            
            {/* Illumination */}
            <p className="text-sm text-gray-400">
              <span className="text-white font-bold">{Math.round(moonPhase.illumination * 100)}%</span> illuminated
            </p>
          </div>

          {/* Moon Info */}
          <div className="flex-1">
            {/* Phase description */}
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1">Current Phase</p>
              <p className="text-lg font-semibold text-white">{moonPhase.name}</p>
              <p className="text-sm text-gray-500 mt-1">{moonPhase.description}</p>
            </div>

            {/* Moonrise/Moonset times */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-gray-400">Moonrise</p>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{moonriseDir.dir}</span>
                </div>
                <p className="text-lg font-bold text-white font-mono">
                  {formatTimeInZone(moonrise)}
                </p>
                <p className="text-xs text-gray-500">{moonriseDir.azimuth} azimuth</p>
              </div>

              <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ArrowDown className="w-4 h-4 text-blue-400" />
                    <p className="text-xs text-gray-400">Moonset</p>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{moonsetDir.dir}</span>
                </div>
                <p className="text-lg font-bold text-white font-mono">
                  {formatTimeInZone(moonset)}
                </p>
                <p className="text-xs text-gray-500">{moonsetDir.azimuth} azimuth</p>
              </div>
            </div>

            {/* Next phases */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌕</span>
                <div>
                  <p className="text-xs text-gray-500">Full Moon</p>
                  <p className="text-white font-semibold">
                    {moonPhase.daysToFull === 0 ? 'Today!' : `in ${moonPhase.daysToFull} days`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🌑</span>
                <div>
                  <p className="text-xs text-gray-500">New Moon</p>
                  <p className="text-white font-semibold">
                    {moonPhase.daysToNew === 0 ? 'Today!' : `in ${moonPhase.daysToNew} days`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Moon visibility status */}
        {isMoonVisible !== null && (
          <div className="mt-4 pt-4 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Moon visibility:</span>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                isMoonVisible 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {isMoonVisible ? '🌙 Visible now' : '👀 Below horizon'}
              </span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MoonWidget;