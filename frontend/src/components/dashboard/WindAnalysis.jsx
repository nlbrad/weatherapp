import React from 'react';
import { motion } from 'framer-motion';
import { Wind, AlertTriangle } from 'lucide-react';
import gustHistory from '../../services/gustHistory';

/**
 * WindAnalysis - Dashboard Widget with Sticky Gusts
 * 
 * Features:
 * - Original wind compass with direction
 * - "Sticky gusts" - keeps showing last gust for up to 3 hours
 * - Two states:
 *   1. Has gust: "Gusts: 45.2 km/h" (normal display)
 *   2. No gust: "Holding steady" (no bar)
 * 
 * Props:
 * - wind: { speed, direction, gust } - Wind data object
 * - lat: Latitude (for gust history tracking)
 * - lon: Longitude (for gust history tracking)
 */

// Helper function to convert degrees to compass direction
const getCompassDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
};

// Describe wind conditions based on speed (Beaufort scale)
const getWindDescription = (speed) => {
  if (speed < 1) return { text: 'Calm', level: 0 };
  if (speed < 6) return { text: 'Light Air', level: 1 };
  if (speed < 12) return { text: 'Light Breeze', level: 2 };
  if (speed < 20) return { text: 'Gentle Breeze', level: 3 };
  if (speed < 29) return { text: 'Moderate Breeze', level: 4 };
  if (speed < 39) return { text: 'Fresh Breeze', level: 5 };
  if (speed < 50) return { text: 'Strong Breeze', level: 6 };
  if (speed < 62) return { text: 'Near Gale', level: 7 };
  if (speed < 75) return { text: 'Gale', level: 8 };
  if (speed < 89) return { text: 'Strong Gale', level: 9 };
  if (speed < 103) return { text: 'Storm', level: 10 };
  return { text: 'Violent Storm', level: 11 };
};

// Get color based on wind level
const getWindColor = (level) => {
  const colors = [
    '#10B981', // 0-1: Calm/Light - Green
    '#10B981', // 2: Light Breeze - Green
    '#22D3EE', // 3: Gentle - Cyan
    '#06B6D4', // 4: Moderate - Cyan
    '#F59E0B', // 5: Fresh - Orange
    '#F59E0B', // 6: Strong - Orange
    '#EF4444', // 7+: Gale/Storm - Red
    '#EF4444',
    '#DC2626',
    '#DC2626',
    '#991B1B',
    '#7F1D1D'
  ];
  return colors[Math.min(level, colors.length - 1)];
};

const WindAnalysis = ({ wind, lat, lon, className = '' }) => {
  // Extract wind properties with defaults
  const speed = wind?.speed || 0;
  const direction = wind?.direction || 0;
  const rawGust = wind?.gust;
  
  // Get gust state using the history service
  const currentGust = typeof rawGust === 'number' && rawGust > 0 ? rawGust : null;
  const gustState = gustHistory.getGustState(lat, lon, currentGust, speed);
  
  const windCondition = getWindDescription(speed);
  const windColor = getWindColor(windCondition.level);
  
  // Calculate gust-related values
  const hasGust = gustState.hasGust;
  const gustSpeed = gustState.gustSpeed;
  const gustCondition = hasGust ? getWindDescription(gustSpeed) : null;
  const gustColor = hasGust ? getWindColor(gustCondition.level) : null;
  
  // Check if gusts are significant (more than 10% higher than sustained speed)
  const hasSignificantGust = hasGust && gustSpeed > speed * 1.1;
  const gustDifference = hasGust && speed > 0 ? ((gustSpeed - speed) / speed * 100).toFixed(0) : 0;
  
  // For the comparison bar
  const maxSpeed = Math.max(speed, hasGust ? gustSpeed : 0, 30);
  const speedPercent = (speed / maxSpeed) * 100;
  const gustPercent = hasGust ? (gustSpeed / maxSpeed) * 100 : 0;

  // Compass dimensions
  const radius = 65;
  const centerX = radius + 10;
  const centerY = radius + 10;

  return (
    <motion.div 
      className={`bg-dark-surface border border-dark-border rounded-xl p-4 h-full ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-dark-elevated rounded-lg">
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Wind Analysis</h3>
            <p className="text-xs text-gray-400">{windCondition.text}</p>
          </div>
        </div>
        
        {/* Gust warning badge */}
        {hasSignificantGust && gustCondition && gustCondition.level >= 5 && (
          <motion.div
            className="flex items-center space-x-1 px-2 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <AlertTriangle className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-orange-400">Gusty</span>
          </motion.div>
        )}
      </div>

      {/* Wind Compass */}
      <div className="flex flex-col items-center space-y-3 mb-4">
        <div className="relative w-40 h-40">
          <svg 
            width="100%" 
            height="100%"
            viewBox={`0 0 ${(radius + 10) * 2} ${(radius + 10) * 2}`}
          >
            {/* Outer circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#374151"
              strokeWidth="1.5"
              opacity="0.4"
            />

            {/* Tick marks around the edge - 72 ticks, every 5 degrees */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = (i * 5) * (Math.PI / 180);
              const isMajor = i % 6 === 0;
              const isCardinal = i % 18 === 0;
              
              const innerRadius = isCardinal ? radius - 10 : isMajor ? radius - 6 : radius - 3;
              const outerRadius = radius;
              
              const x1 = centerX + Math.sin(angle) * innerRadius;
              const y1 = centerY - Math.cos(angle) * innerRadius;
              const x2 = centerX + Math.sin(angle) * outerRadius;
              const y2 = centerY - Math.cos(angle) * outerRadius;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isCardinal ? '#10B981' : '#4B5563'}
                  strokeWidth={isCardinal ? 1.5 : 0.5}
                  opacity={isCardinal ? 0.8 : 0.3}
                />
              );
            })}

            {/* Cardinal direction labels */}
            <text x={centerX} y={centerY - radius + 18} textAnchor="middle" className="text-xs font-bold fill-white">
              N
            </text>
            <text x={centerX + radius - 12} y={centerY + 5} textAnchor="middle" className="text-xs font-medium fill-gray-500">
              E
            </text>
            <text x={centerX} y={centerY + radius - 8} textAnchor="middle" className="text-xs font-medium fill-gray-500">
              S
            </text>
            <text x={centerX - radius + 12} y={centerY + 5} textAnchor="middle" className="text-xs font-medium fill-gray-500">
              W
            </text>
          </svg>

          {/* Rotating arrow */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }}
            animate={{ rotate: direction + 180 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <svg width="70%" height="70%" viewBox="0 0 100 100">
              <line
                x1="50"
                y1="10"
                x2="50"
                y2="90"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M 50 5 L 44 18 L 50 15 L 56 18 Z"
                fill="#10B981"
              />
              <circle
                cx="50"
                cy="90"
                r="4"
                fill="#10B981"
                opacity="0.6"
              />
            </svg>
          </motion.div>

          {/* Center pivot point */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full border border-green-400" />
          </div>
        </div>

        {/* Speed and direction below compass */}
        <div className="text-center">
          <p className="text-sm font-semibold text-white">Wind</p>
          <div className="h-0.5 w-full mt-1 rounded-full bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500" />
          <div className="mt-2 space-y-0.5">
            <p className="text-lg font-bold font-mono text-white">
              {speed.toFixed(1)} <span className="text-sm text-gray-400">km/h</span>
            </p>
            <p className="text-xs">
              <span className="font-bold text-cyan-400">
                {getCompassDirection(direction)}
              </span>
              <span className="text-gray-500 ml-1">
                ({direction}°)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Speed vs Gust Comparison */}
      <div className="bg-dark-elevated rounded-lg p-3 space-y-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400 font-medium">Speed vs Gusts</span>
        </div>
        
        {/* Speed bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Speed</span>
            <span className="text-xs font-mono font-semibold text-white">
              {speed.toFixed(1)} km/h
            </span>
          </div>
          <div className="h-2 bg-dark-border rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: windColor }}
              initial={{ width: 0 }}
              animate={{ width: `${speedPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        
        {/* Gust bar - two states: has gust or holding steady */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-400">Gusts</span>
            
            {hasGust ? (
              <span className="text-xs font-mono font-semibold" style={{ color: gustColor }}>
                {gustSpeed.toFixed(1)} km/h
                {hasSignificantGust && (
                  <span className="text-gray-500 ml-1">(+{gustDifference}%)</span>
                )}
              </span>
            ) : (
              <span className="text-xs text-gray-500 italic">Holding steady</span>
            )}
          </div>
          
          <div className="h-2 bg-dark-border rounded-full overflow-hidden">
            {hasGust ? (
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: gustColor }}
                initial={{ width: 0 }}
                animate={{ width: `${gustPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            ) : (
              <div className="h-full w-0" />
            )}
          </div>
        </div>
      </div>

      {/* Gust Alert - shown when significant */}
      {hasSignificantGust && parseInt(gustDifference) > 25 && (
        <motion.div
          className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300">
              Gusts {gustDifference}% above sustained wind.
            </p>
          </div>
        </motion.div>
      )}

      {/* Beaufort Scale indicator */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-500">Beaufort Scale</span>
        <span className="font-semibold" style={{ color: windColor }}>
          {windCondition.level} - {windCondition.text}
        </span>
      </div>
    </motion.div>
  );
};

export default WindAnalysis;