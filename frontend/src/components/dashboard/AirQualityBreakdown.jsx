import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, AlertTriangle, Info } from 'lucide-react';

/**
 * AirQualityBreakdown - Detailed air quality panel
 * 
 * Shows:
 * - Overall AQI status
 * - Individual pollutant levels (PM2.5, PM10, O3, NO2, SO2, CO)
 * - Color-coded bars
 * - Health recommendations
 */

const AirQualityBreakdown = ({ airQuality, compact = false }) => {
  // If no air quality data
  if (!airQuality || !airQuality.components) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Leaf className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Air Quality</h3>
        </div>
        <p className="text-gray-400 text-sm">Air quality data unavailable</p>
      </motion.div>
    );
  }

  // Get AQI info
  const getAQIInfo = (aqi) => {
    const aqiData = {
      1: { 
        label: 'Good', 
        color: 'text-accent-green',
        bgColor: 'bg-accent-green/20',
        borderColor: 'border-accent-green/40',
        description: 'Air quality is satisfactory',
        recommendation: 'Enjoy outdoor activities!'
      },
      2: { 
        label: 'Fair', 
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/20',
        borderColor: 'border-blue-400/40',
        description: 'Air quality is acceptable',
        recommendation: 'Sensitive individuals should consider reducing prolonged outdoor exertion'
      },
      3: { 
        label: 'Moderate', 
        color: 'text-accent-orange',
        bgColor: 'bg-accent-orange/20',
        borderColor: 'border-accent-orange/40',
        description: 'Air quality is moderately polluted',
        recommendation: 'Sensitive groups should limit prolonged outdoor activities'
      },
      4: { 
        label: 'Poor', 
        color: 'text-accent-red',
        bgColor: 'bg-accent-red/20',
        borderColor: 'border-accent-red/40',
        description: 'Air quality may affect health',
        recommendation: 'Everyone should reduce outdoor exertion. Sensitive groups avoid outdoor activities'
      },
      5: { 
        label: 'Very Poor', 
        color: 'text-red-600',
        bgColor: 'bg-red-600/20',
        borderColor: 'border-red-600/40',
        description: 'Air quality is very unhealthy',
        recommendation: 'Everyone should avoid outdoor activities'
      }
    };
    return aqiData[aqi] || aqiData[1];
  };

  const aqiInfo = getAQIInfo(airQuality.aqi);
  const { components } = airQuality;

  // If compact mode, show summary only
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-dark-surface border border-dark-border rounded-xl p-4"
        style={{ minHeight: '320px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            Air Quality
          </h3>
          <div className={`px-3 py-1 rounded-lg border text-xs font-bold ${aqiInfo.borderColor} ${aqiInfo.bgColor} ${aqiInfo.color}`}>
            AQI {airQuality.aqi} • {aqiInfo.label}
          </div>
        </div>

        {/* All Pollutants in Compact Mode */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">PM2.5</span>
            <span className="font-mono text-white">{components.pm25.toFixed(1)} µg/m³</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">PM10</span>
            <span className="font-mono text-white">{components.pm10.toFixed(1)} µg/m³</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">O₃ (Ozone)</span>
            <span className="font-mono text-white">{components.o3.toFixed(1)} µg/m³</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">NO₂</span>
            <span className="font-mono text-white">{components.no2.toFixed(1)} µg/m³</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">SO₂</span>
            <span className="font-mono text-white">{components.so2.toFixed(1)} µg/m³</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">CO</span>
            <span className="font-mono text-white">{components.co.toFixed(1)} µg/m³</span>
          </div>
        </div>

        {/* Status */}
        <div className={`mt-auto p-3 rounded-lg ${aqiInfo.bgColor} border ${aqiInfo.borderColor}`}>
          <p className={`text-xs font-medium ${aqiInfo.color} mb-1`}>
            {aqiInfo.description}
          </p>
          <p className="text-xs text-gray-300">
            {aqiInfo.recommendation.substring(0, 80)}...
          </p>
        </div>
      </motion.div>
    );
  }

  // Pollutant configurations with safe ranges (WHO guidelines)
  const pollutants = [
    {
      id: 'pm25',
      name: 'PM2.5',
      value: components.pm25,
      unit: 'µg/m³',
      description: 'Fine particles',
      maxSafe: 25, // WHO guideline
      maxScale: 100,
      color: 'from-accent-green to-accent-orange'
    },
    {
      id: 'pm10',
      name: 'PM10',
      value: components.pm10,
      unit: 'µg/m³',
      description: 'Coarse particles',
      maxSafe: 50, // WHO guideline
      maxScale: 150,
      color: 'from-blue-400 to-accent-orange'
    },
    {
      id: 'o3',
      name: 'O₃',
      value: components.o3,
      unit: 'µg/m³',
      description: 'Ozone',
      maxSafe: 100, // WHO guideline
      maxScale: 200,
      color: 'from-accent-green to-accent-red'
    },
    {
      id: 'no2',
      name: 'NO₂',
      value: components.no2,
      unit: 'µg/m³',
      description: 'Nitrogen dioxide',
      maxSafe: 40, // WHO guideline
      maxScale: 200,
      color: 'from-primary to-accent-orange'
    },
    {
      id: 'so2',
      name: 'SO₂',
      value: components.so2,
      unit: 'µg/m³',
      description: 'Sulfur dioxide',
      maxSafe: 20, // WHO guideline
      maxScale: 100,
      color: 'from-accent-green to-accent-red'
    },
    {
      id: 'co',
      name: 'CO',
      value: components.co,
      unit: 'µg/m³',
      description: 'Carbon monoxide',
      maxSafe: 4000, // WHO guideline
      maxScale: 10000,
      color: 'from-blue-400 to-accent-red'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-white">Air Quality</h3>
              <p className="text-sm text-gray-400">Pollutant levels</p>
            </div>
          </div>
          {/* Overall AQI Badge */}
          <div className={`px-4 py-2 rounded-lg border ${aqiInfo.borderColor} ${aqiInfo.bgColor}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${aqiInfo.color}`}>
                AQI {airQuality.aqi}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className={`text-sm font-semibold ${aqiInfo.color}`}>
                {aqiInfo.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Status Banner */}
        <div className={`p-4 rounded-lg border ${aqiInfo.borderColor} ${aqiInfo.bgColor} mb-6`}>
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 ${aqiInfo.color} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`font-semibold ${aqiInfo.color} mb-1`}>
                {aqiInfo.description}
              </p>
              <p className="text-sm text-gray-300">
                {aqiInfo.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Pollutants Grid */}
        <div className="space-y-4">
          {pollutants.map((pollutant, index) => {
            const percentage = Math.min((pollutant.value / pollutant.maxScale) * 100, 100);
            const isAboveSafe = pollutant.value > pollutant.maxSafe;

            return (
              <motion.div
                key={pollutant.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-dark-elevated border border-dark-border rounded-lg p-4"
              >
                {/* Pollutant Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">
                        {pollutant.name}
                      </span>
                      {isAboveSafe && (
                        <AlertTriangle className="w-4 h-4 text-accent-orange" />
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {pollutant.description}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono text-white">
                      {pollutant.value.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">{pollutant.unit}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <div className="w-full bg-dark-border rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${pollutant.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  
                  {/* Safe threshold indicator */}
                  {pollutant.maxSafe < pollutant.maxScale && (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-gray-600"
                      style={{ left: `${(pollutant.maxSafe / pollutant.maxScale) * 100}%` }}
                      title={`Safe limit: ${pollutant.maxSafe} ${pollutant.unit}`}
                    />
                  )}
                </div>

                {/* Scale labels */}
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0</span>
                  <span className="text-gray-600">
                    Safe: {pollutant.maxSafe}
                  </span>
                  <span>{pollutant.maxScale}+ {pollutant.unit}</span>
                </div>

                {/* Warning if above safe */}
                {isAboveSafe && (
                  <p className="text-xs text-accent-orange mt-2">
                    Above WHO recommended limit
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-dark-elevated border border-dark-border rounded-lg">
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Data source:</strong> OpenWeather Air Pollution API • 
            <strong className="text-gray-300 ml-2">Guidelines:</strong> WHO Air Quality Standards
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AirQualityBreakdown;