import React from 'react';
import { motion } from 'framer-motion';
import { Wind, TrendingUp, Gauge } from 'lucide-react';
import WindCompass from '../WindCompass';

/**
 * WindAnalysis - Large wind widget for dashboard
 * 
 * Features:
 * - Large WindCompass (reused from Phase 2.1)
 * - Wind speed with status
 * - Direction with cardinal point
 * - Wind strength indicator
 */

const WindAnalysis = ({ wind }) => {
  // Determine wind strength category
  const getWindStrength = (speed) => {
    if (speed < 5) return { label: 'Calm', color: 'text-green-400', desc: 'Light breeze' };
    if (speed < 15) return { label: 'Gentle', color: 'text-blue-400', desc: 'Moderate wind' };
    if (speed < 25) return { label: 'Fresh', color: 'text-accent-orange', desc: 'Strong wind' };
    if (speed < 40) return { label: 'Strong', color: 'text-accent-red', desc: 'Very strong' };
    return { label: 'Gale', color: 'text-red-600', desc: 'Dangerous winds' };
  };

  // Get compass direction name (16-point)
  const getCompassDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(((degrees % 360) / 22.5));
    return directions[index % 16];
  };

  const windStrength = getWindStrength(wind.speed);
  const compassDir = getCompassDirection(wind.direction);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              Wind Analysis
            </h3>
            <p className="text-sm text-gray-400 mt-1">Current conditions</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${windStrength.color}`}>
              {windStrength.label}
            </p>
            <p className="text-xs text-gray-500">{windStrength.desc}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Large Wind Compass */}
          <div className="flex flex-col items-center justify-center">
            <WindCompass
              speed={wind.speed}
              direction={wind.direction}
              size="large"
            />
          </div>

          {/* Right: Wind Stats */}
          <div className="flex flex-col justify-center space-y-6">
            {/* Speed */}
            <div className="bg-dark-elevated border border-dark-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Wind Speed</span>
                <Gauge className="w-4 h-4 text-gray-500" />
              </div>
              <p className="text-3xl font-bold font-mono text-white">
                {wind.speed.toFixed(1)} <span className="text-lg text-gray-400">km/h</span>
              </p>
              <div className="mt-3">
                {/* Speed bar indicator */}
                <div className="w-full bg-dark-border rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent-green via-primary to-accent-orange rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((wind.speed / 50) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0</span>
                  <span>25</span>
                  <span>50+ km/h</span>
                </div>
              </div>
            </div>

            {/* Direction */}
            <div className="bg-dark-elevated border border-dark-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Direction</span>
                <TrendingUp className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-white">
                  {compassDir}
                </p>
                <p className="text-lg font-mono text-gray-400">
                  {wind.direction}°
                </p>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Wind from the {compassDir.toLowerCase()}
              </p>
            </div>

            {/* Additional Info */}
            <div className="bg-dark-elevated border border-dark-border rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2">Wind Status</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Strength:</span>
                  <span className={`font-semibold ${windStrength.color}`}>
                    {windStrength.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Category:</span>
                  <span className="text-white">
                    {wind.speed < 1.5 ? 'Still' : 
                     wind.speed < 5 ? 'Light Air' :
                     wind.speed < 11 ? 'Light Breeze' :
                     wind.speed < 19 ? 'Gentle Breeze' :
                     wind.speed < 28 ? 'Moderate' :
                     wind.speed < 38 ? 'Fresh' :
                     wind.speed < 49 ? 'Strong' : 'Gale'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WindAnalysis;