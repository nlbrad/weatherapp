import React from 'react';
import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';
import WindCompass from '../WindCompass';

/**
 * WindAnalysis - Refined wind widget
 * 
 * Features:
 * - Original WindCompass design
 * - Consistent Beaufort scale (no conflicting labels)
 * - Arrow points direction wind is BLOWING TO
 */

const WindAnalysis = ({ wind }) => {
  // Beaufort Scale - single source of truth
  const getBeaufortScale = (speed) => {
    // Speed in km/h
    if (speed < 1) return { force: 0, name: 'Calm', color: 'text-gray-400', effect: 'Smoke rises vertically' };
    if (speed < 6) return { force: 1, name: 'Light Air', color: 'text-green-400', effect: 'Smoke drifts slowly' };
    if (speed < 12) return { force: 2, name: 'Light Breeze', color: 'text-green-400', effect: 'Leaves rustle' };
    if (speed < 20) return { force: 3, name: 'Gentle Breeze', color: 'text-blue-400', effect: 'Leaves in motion' };
    if (speed < 29) return { force: 4, name: 'Moderate Breeze', color: 'text-blue-400', effect: 'Small branches sway' };
    if (speed < 39) return { force: 5, name: 'Fresh Breeze', color: 'text-yellow-400', effect: 'Small trees sway' };
    if (speed < 50) return { force: 6, name: 'Strong Breeze', color: 'text-orange-400', effect: 'Large branches move' };
    if (speed < 62) return { force: 7, name: 'Near Gale', color: 'text-orange-500', effect: 'Whole trees sway' };
    if (speed < 75) return { force: 8, name: 'Gale', color: 'text-red-400', effect: 'Twigs break off' };
    if (speed < 89) return { force: 9, name: 'Strong Gale', color: 'text-red-500', effect: 'Branches break' };
    if (speed < 103) return { force: 10, name: 'Storm', color: 'text-red-600', effect: 'Trees uprooted' };
    if (speed < 118) return { force: 11, name: 'Violent Storm', color: 'text-purple-500', effect: 'Widespread damage' };
    return { force: 12, name: 'Hurricane', color: 'text-purple-600', effect: 'Devastation' };
  };

  const beaufort = getBeaufortScale(wind.speed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden h-full"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Wind className="w-5 h-5 text-primary" />
            Wind
          </h3>
          <div className={`px-2 py-1 rounded-md text-xs font-semibold ${beaufort.color} bg-dark-elevated`}>
            {beaufort.name}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col items-center">
        {/* Original Compass */}
        <div className="mb-4">
          <WindCompass
            speed={wind.speed}
            direction={wind.direction}
            size="large"
            showBlowingDirection={true}
          />
        </div>

        {/* Speed bar */}
        <div className="w-full mb-4">
          <div className="w-full bg-dark-border rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                beaufort.force <= 2 ? 'bg-green-500' :
                beaufort.force <= 4 ? 'bg-blue-500' :
                beaufort.force <= 6 ? 'bg-yellow-500' :
                beaufort.force <= 8 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min((wind.speed / 60) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Beaufort info */}
        <div className="w-full bg-dark-elevated border border-dark-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Beaufort Scale</span>
            <span className={`text-sm font-bold ${beaufort.color}`}>Force {beaufort.force}</span>
          </div>
          <p className="text-xs text-gray-400">{beaufort.effect}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default WindAnalysis;