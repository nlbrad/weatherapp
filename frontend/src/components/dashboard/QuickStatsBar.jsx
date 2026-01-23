import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, Leaf } from 'lucide-react';

/**
 * QuickStatsBar - Top row of key metrics on dashboard
 * 
 * Shows 4 main stats:
 * - Temperature (current)
 * - Humidity
 * - Wind speed
 * - Air quality
 * 
 * Clean, minimal design with icons
 */

const QuickStatsBar = ({ weather }) => {
  // Get air quality label
  const getAirQualityLabel = () => {
    if (!weather.airQuality || !weather.airQuality.aqi) return 'Unknown';
    
    const aqiLabels = {
      1: 'Good',
      2: 'Fair',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };
    
    return aqiLabels[weather.airQuality.aqi] || 'Unknown';
  };

  // Get air quality color
  const getAirQualityColor = () => {
    if (!weather.airQuality || !weather.airQuality.aqi) return 'text-gray-400';
    
    const aqi = weather.airQuality.aqi;
    if (aqi === 1) return 'text-accent-green';
    if (aqi === 2) return 'text-blue-400';
    if (aqi === 3) return 'text-accent-orange';
    return 'text-accent-red';
  };

  const stats = [
    {
      id: 'temp',
      label: 'Temperature',
      value: `${weather.temp.toFixed(1)}°`,
      subValue: `Feels ${weather.feelsLike.toFixed(1)}°`,
      icon: Thermometer,
      color: 'text-accent-orange'
    },
    {
      id: 'humidity',
      label: 'Humidity',
      value: `${weather.humidity}%`,
      subValue: weather.humidity > 80 ? 'High' : weather.humidity < 30 ? 'Low' : 'Normal',
      icon: Droplets,
      color: 'text-blue-400'
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      value: `${weather.wind.speed} km/h`,
      subValue: `${weather.wind.direction}°`,
      icon: Wind,
      color: 'text-accent-green'
    },
    {
      id: 'air',
      label: 'Air Quality',
      value: getAirQualityLabel(),
      subValue: weather.airQuality ? `AQI ${weather.airQuality.aqi}` : 'No data',
      icon: Leaf,
      color: getAirQualityColor()
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-dark-surface border border-dark-border rounded-xl p-4 
                     hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 bg-dark-elevated rounded-lg ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            
            <div>
              <p className="text-2xl font-bold font-mono text-white mb-1">
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className="text-xs text-gray-500">{stat.subValue}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default QuickStatsBar;