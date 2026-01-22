import React from 'react';
import { motion } from 'framer-motion';

/**
 * LinearMetric - Horizontal progress bar with gradients
 * 
 * Perfect for:
 * - Pressure (brown/orange)
 * - Visibility (blue/cyan)
 * - UV Index (yellow/orange)
 * - Cloud Cover (gray/white)
 */

const LinearMetric = ({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  unit = '', 
  gradientColors = ['#8B5CF6', '#06B6D4', '#EAB308'], // purple → cyan → yellow
  icon: Icon,
  showValue = true
}) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Create unique gradient ID
  const gradientId = `linear-gradient-${label.replace(/\s/g, '-')}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        {showValue && (
          <span className="text-sm font-mono font-bold text-white">
            {value}{unit}
          </span>
        )}
      </div>

      {/* Progress bar container */}
      <div className="relative h-2.5 bg-dark-border rounded-full overflow-hidden">
        {/* Background gradient at 20% opacity */}
        <div 
          className="absolute inset-0 opacity-20 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${gradientColors.join(', ')})`
          }}
        />
        
        {/* Animated progress fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            background: `linear-gradient(90deg, ${gradientColors.join(', ')})`
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

export default LinearMetric;