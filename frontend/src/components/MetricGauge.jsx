import React from 'react';
import { motion } from 'framer-motion';

/**
 * MetricGauge - Final Version (Vibrant Gradients, No Glow)
 * 
 * Perfect balance:
 * - Multi-color gradients ✅
 * - Clean, crisp look ✅
 * - No neon glow effects ✅
 * - Professional but colorful ✅
 * - Wind direction arrow support ✅
 */

// Helper function to convert degrees to compass direction
const getCompassDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(((degrees % 360) / 22.5));
  return directions[index % 16];
};

const MetricGauge = ({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  unit = '', 
  gradientColors = ['#8B5CF6', '#06B6D4', '#EAB308'], // purple → cyan → yellow
  icon: Icon,
  size = 'medium',
  windDirection = null // Add wind direction parameter
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  const radius = size === 'small' ? 40 : size === 'large' ? 70 : 55;
  const strokeWidth = size === 'small' ? 8 : size === 'large' ? 12 : 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;

  const sizeClasses = {
    small: 'w-32 h-32',
    medium: 'w-40 h-40',
    large: 'w-52 h-52'
  };

  const textSizeClasses = {
    small: 'text-2xl',
    medium: 'text-3xl',
    large: 'text-4xl'
  };

  // Create unique gradient ID for this gauge
  const gradientId = `gradient-${label.replace(/\s/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg 
          className="transform -rotate-90" 
          width="100%" 
          height="100%"
          viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}
        >
          {/* Define gradient */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {gradientColors.map((color, index) => (
                <stop 
                  key={index}
                  offset={`${(index / (gradientColors.length - 1)) * 100}%`} 
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Background circle - subtle gradient at 20% opacity */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            className="opacity-20"
          />
          
          {/* Animated progress circle with gradient - NO GLOW */}
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke={`url(#${gradientId})`}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>

        {/* Center content - clean, no glow */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {windDirection !== null ? (
            // Wind direction arrow (replaces icon for wind gauge)
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              style={{ 
                transform: `rotate(${windDirection}deg)`,
                color: gradientColors[0]
              }}
              className="mb-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15 10H9L12 2Z" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </motion.div>
          ) : Icon ? (
            // Regular icon for non-wind gauges
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Icon 
                className="w-6 h-6 mb-2" 
                style={{ color: gradientColors[0] }} 
              />
            </motion.div>
          ) : null}
          <motion.div 
            className={`${textSizeClasses[size]} font-bold font-mono text-white`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {value.toFixed(1)}
          </motion.div>
          <span 
            className="text-sm font-medium"
            style={{ color: gradientColors[1] }}
          >
            {unit}
          </span>
        </div>
      </div>

      {/* Label with gradient underline */}
      <div className="text-center">
        <p className="text-sm font-semibold text-white">{label}</p>
        <div 
          className="h-0.5 w-full mt-1 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradientColors.join(', ')})`,
          }}
        />
        <p className="text-xs text-gray-400 mt-1">
          {windDirection !== null ? (
            // Show compass direction for wind
            <span className="font-semibold" style={{ color: gradientColors[1] }}>
              {getCompassDirection(windDirection)}
            </span>
          ) : (
            // Show range for other metrics
            `${min}—${max}${unit}`
          )}
        </p>
      </div>
    </div>
  );
};

export default MetricGauge;