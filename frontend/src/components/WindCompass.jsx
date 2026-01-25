import React from 'react';
import { motion } from 'framer-motion';

/**
 * WindCompass - Balanced design with detail
 * 
 * Features:
 * - Tick marks for visual interest
 * - Large arrow extending beyond circle
 * - Clean center (no text)
 * - Speed and direction below
 */

// Helper function to convert degrees to compass direction
const getCompassDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
};

const WindCompass = ({ 
  speed, 
  direction, 
  size = 'small'
}) => {
  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-40 h-40',
    large: 'w-52 h-52'
  };

  const radius = size === 'small' ? 50 : size === 'large' ? 80 : 65;
  const centerX = radius + 10;
  const centerY = radius + 10;

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className={`relative ${sizeClasses[size]}`}>
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

          {/* Tick marks around the edge */}
          {Array.from({ length: 72 }).map((_, i) => {
            const angle = (i * 5) * (Math.PI / 180);
            const isMajor = i % 6 === 0; // Every 30 degrees
            const isCardinal = i % 18 === 0; // Every 90 degrees (N, E, S, W)
            
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

        {/* Large rotating arrow - extends beyond circle */}
        {/* Arrow points the direction wind is BLOWING TO */}
        {/* Wind direction 90° (E) means wind FROM East, blowing TO West, so arrow points West */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ rotate: 0 }}
          animate={{ rotate: direction + 180 }} // +180 to show where wind blows TO
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <svg width="70%" height="70%" viewBox="0 0 100 100">
            {/* Arrow shaft - longer, extends to edges */}
            <line
              x1="50"
              y1="10"
              x2="50"
              y2="90"
              stroke="#10B981"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Arrowhead - larger */}
            <path
              d="M 50 5 L 44 18 L 50 15 L 56 18 Z"
              fill="#10B981"
            />
            {/* Arrow tail - circle at bottom */}
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

      {/* Speed and direction below */}
      <div className="text-center">
        <p className="text-sm font-semibold text-white">Wind</p>
        <div className="h-0.5 w-full mt-1 rounded-full bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500" />
        <div className="mt-2 space-y-0.5">
          <p className="text-lg font-bold font-mono text-white">
            {speed.toFixed(1)} <span className="text-sm text-gray-400">km/h</span>
          </p>
          <p className="text-xs text-gray-500">
            from <span className="font-bold text-cyan-400">{getCompassDirection(direction)}</span>
            <span className="ml-1">({direction}°)</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WindCompass;