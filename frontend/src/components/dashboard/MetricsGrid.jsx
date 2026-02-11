import React from 'react';
import { motion } from 'framer-motion';
import { Gauge, Eye, Cloud, Thermometer } from 'lucide-react';

/**
 * MetricsGrid - Additional weather metrics
 * 
 * Shows:
 * - Pressure (with trend indicator)
 * - Visibility (with status)
 * - Temperature range (min/max)
 * - Feels like (with difference)
 */

const MetricsGrid = ({ weather }) => {
  // Determine pressure status
  const getPressureStatus = (pressure) => {
    if (pressure < 1000) return { label: 'Low', color: 'text-blue-400', trend: '↓' };
    if (pressure > 1020) return { label: 'High', color: 'text-accent-orange', trend: '↑' };
    return { label: 'Normal', color: 'text-accent-green', trend: '→' };
  };

  // Determine visibility status
  const getVisibilityStatus = (visibility) => {
    if (visibility >= 10) return { label: 'Clear', color: 'text-accent-green' };
    if (visibility >= 5) return { label: 'Good', color: 'text-blue-400' };
    if (visibility >= 2) return { label: 'Hazy', color: 'text-accent-orange' };
    return { label: 'Foggy', color: 'text-slate-400' };
  };

  const pressureStatus = getPressureStatus(weather.pressure);
  const visibilityStatus = getVisibilityStatus(weather.visibility || 10);
  
  // Calculate temperature difference (feels like vs actual)
  const tempDifference = weather.feelsLike - weather.temp;
  const feelsStatus = tempDifference > 2 ? 'Warmer' : tempDifference < -2 ? 'Colder' : 'Similar';

  const metrics = [
    {
      id: 'pressure',
      label: 'Pressure',
      value: weather.pressure,
      unit: 'hPa',
      subValue: pressureStatus.label,
      subColor: pressureStatus.color,
      icon: Gauge,
      iconColor: 'text-cyan-500',
      trend: pressureStatus.trend
    },
    {
      id: 'visibility',
      label: 'Visibility',
      value: weather.visibility || 10,
      unit: 'km',
      subValue: visibilityStatus.label,
      subColor: visibilityStatus.color,
      icon: Eye,
      iconColor: 'text-blue-400'
    },
    {
      id: 'tempRange',
      label: 'Temperature Range',
      value: `${weather.tempMin.toFixed(0)}° - ${weather.tempMax.toFixed(0)}°`,
      unit: '',
      subValue: `${(weather.tempMax - weather.tempMin).toFixed(1)}° variation`,
      subColor: 'text-slate-400',
      icon: Thermometer,
      iconColor: 'text-accent-orange'
    },
    {
      id: 'feelsLike',
      label: 'Feels Like',
      value: weather.feelsLike.toFixed(1),
      unit: '°C',
      subValue: `${feelsStatus} (${tempDifference > 0 ? '+' : ''}${tempDifference.toFixed(1)}°)`,
      subColor: Math.abs(tempDifference) > 2 ? 'text-accent-orange' : 'text-accent-green',
      icon: Thermometer,
      iconColor: 'text-accent-red'
    }
  ];

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Additional Metrics</h3>
        <p className="text-sm text-slate-400">Detailed weather information</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 
                       hover:border-primary/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 bg-slate-800 rounded-lg ${metric.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {metric.trend && (
                  <span className="text-2xl text-slate-500">{metric.trend}</span>
                )}
              </div>

              {/* Value */}
              <div className="mb-2">
                <p className="text-2xl font-bold font-mono text-white">
                  {metric.value}
                  {metric.unit && (
                    <span className="text-sm text-slate-400 ml-1">{metric.unit}</span>
                  )}
                </p>
              </div>

              {/* Label */}
              <p className="text-xs text-slate-400 mb-1">{metric.label}</p>

              {/* Sub Value */}
              <p className={`text-xs font-medium ${metric.subColor}`}>
                {metric.subValue}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Additional Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 bg-slate-900/50 border border-slate-800 rounded-2xl p-4"
      >
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-slate-300 mb-2">
              <span className="font-semibold text-white">Current Conditions:</span> {weather.description}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Humidity:</span> 
                <span className="text-white ml-1">{weather.humidity}%</span>
              </div>
              <div>
                <span className="text-slate-500">Pressure:</span> 
                <span className="text-white ml-1">{weather.pressure} hPa</span>
              </div>
              <div>
                <span className="text-slate-500">Wind:</span> 
                <span className="text-white ml-1">{weather.wind.speed} km/h</span>
              </div>
              <div>
                <span className="text-slate-500">Visibility:</span> 
                <span className="text-white ml-1">{weather.visibility || 10} km</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MetricsGrid;