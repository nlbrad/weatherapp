import React from 'react';
import { motion } from 'framer-motion';
import { Wind } from 'lucide-react';

/**
 * AirQualityBreakdown - Redesigned Air Quality Widget
 * 
 * Features:
 * - Intuitive 0-100 score (higher = better)
 * - Color-coded circular gauge
 * - Key pollutants with simple status
 * - Practical advice
 * - Compact design
 */

const AirQualityBreakdown = ({ airQuality, compact = false }) => {
  if (!airQuality || !airQuality.components) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
      >
        <p className="text-slate-400 text-sm">Air quality data unavailable</p>
      </motion.div>
    );
  }

  const { components } = airQuality;

  // Calculate a 0-100 score where 100 = excellent, 0 = hazardous
  // Based on WHO guidelines for each pollutant
  const calculateScore = () => {
    // WHO safe limits (µg/m³)
    const limits = {
      pm25: 15,    // WHO 2021 guideline
      pm10: 45,    // WHO 2021 guideline
      o3: 100,     // 8-hour mean
      no2: 25,     // WHO 2021 guideline
      so2: 40,     // 24-hour guideline
      co: 4000     // WHO guideline
    };

    // Calculate individual scores (100 = at or below limit, decreases as pollution increases)
    const scores = {
      pm25: Math.max(0, 100 - (components.pm25 / limits.pm25) * 50),
      pm10: Math.max(0, 100 - (components.pm10 / limits.pm10) * 50),
      o3: Math.max(0, 100 - (components.o3 / limits.o3) * 50),
      no2: Math.max(0, 100 - (components.no2 / limits.no2) * 50),
      so2: Math.max(0, 100 - (components.so2 / limits.so2) * 50),
      co: Math.max(0, 100 - (components.co / limits.co) * 50)
    };

    // Weight by health impact (PM2.5 and O3 are most important)
    const weights = { pm25: 0.35, pm10: 0.15, o3: 0.25, no2: 0.15, so2: 0.05, co: 0.05 };
    
    const weightedScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  };

  const score = calculateScore();

  // Get rating based on score (intuitive naming)
  const getRating = (score) => {
    if (score >= 80) return { 
      label: 'Excellent', 
      emoji: '😊',
      color: 'text-green-400',
      bgColor: 'bg-green-500',
      ringColor: 'stroke-green-400',
      advice: 'Perfect for all outdoor activities',
      activities: ['Running', 'Cycling', 'Kids play']
    };
    if (score >= 60) return { 
      label: 'Good', 
      emoji: '🙂',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500',
      ringColor: 'stroke-emerald-400',
      advice: 'Great for outdoor activities',
      activities: ['Exercise', 'Walking', 'Sports']
    };
    if (score >= 40) return { 
      label: 'Moderate', 
      emoji: '😐',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500',
      ringColor: 'stroke-yellow-400',
      advice: 'Fine for most people',
      activities: ['Light exercise', 'Short walks']
    };
    if (score >= 20) return { 
      label: 'Poor', 
      emoji: '😷',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500',
      ringColor: 'stroke-orange-400',
      advice: 'Sensitive groups take care',
      activities: ['Stay indoors if sensitive']
    };
    return { 
      label: 'Hazardous', 
      emoji: '🚫',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      ringColor: 'stroke-red-500',
      advice: 'Avoid outdoor activities',
      activities: ['Stay indoors']
    };
  };

  const rating = getRating(score);

  // Key pollutants status
  const getPollutantStatus = (value, limit) => {
    const ratio = value / limit;
    if (ratio <= 0.5) return { status: 'Low', color: 'text-green-400', icon: '✓' };
    if (ratio <= 1) return { status: 'OK', color: 'text-emerald-400', icon: '✓' };
    if (ratio <= 2) return { status: 'High', color: 'text-yellow-400', icon: '!' };
    return { status: 'V.High', color: 'text-red-400', icon: '⚠' };
  };

  const keyPollutants = [
    { 
      name: 'PM2.5', 
      label: 'Fine Particles',
      value: components.pm25, 
      limit: 15
    },
    { 
      name: 'PM10', 
      label: 'Dust & Pollen',
      value: components.pm10, 
      limit: 45
    },
    { 
      name: 'O₃', 
      label: 'Ozone',
      value: components.o3, 
      limit: 100
    },
    { 
      name: 'NO₂', 
      label: 'Traffic',
      value: components.no2, 
      limit: 25
    }
  ];

  // SVG gauge calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-500" />
            Air Quality
          </h3>
          <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${rating.color} bg-slate-800 border border-slate-800`}>
            {rating.label}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Score Circle + Status - Compact Row */}
        <div className="flex items-center gap-4 mb-4">
          {/* Circular Score Gauge */}
          <div className="relative flex-shrink-0">
            <svg width="88" height="88" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                stroke="#2D3748"
                strokeWidth="6"
              />
              {/* Score arc */}
              <circle
                cx="44"
                cy="44"
                r={radius}
                fill="none"
                className={rating.ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dashoffset 1s ease-out' }}
              />
            </svg>
            {/* Score in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-bold ${rating.color}`}>{score}</span>
              <span className="text-[10px] text-slate-500">/ 100</span>
            </div>
          </div>

          {/* Status & Advice */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{rating.emoji}</span>
              <span className={`text-base font-bold ${rating.color}`}>{rating.label}</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">{rating.advice}</p>
            <div className="flex flex-wrap gap-1">
              {rating.activities.slice(0, 3).map((activity, i) => (
                <span 
                  key={i}
                  className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Key Pollutants - 2x2 Compact Grid */}
        <div className="grid grid-cols-2 gap-2">
          {keyPollutants.map((pollutant) => {
            const status = getPollutantStatus(pollutant.value, pollutant.limit);
            return (
              <div 
                key={pollutant.name}
                className="bg-slate-800 border border-slate-800 rounded-lg px-3 py-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-500">{pollutant.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-white font-mono">
                        {pollutant.value.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-500">µg/m³</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-400">{pollutant.name}</span>
                    <p className={`text-xs font-bold ${status.color}`}>
                      {status.icon} {status.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom info */}
        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">
            WHO guidelines
          </span>
          <span className="text-[10px] text-slate-500">
            Higher score = Better air
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default AirQualityBreakdown;