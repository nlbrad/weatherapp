import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin,
  Trash2,
  Edit,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Compass,
  TrendingUp,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun as SunIcon
} from 'lucide-react';
import MetricGauge from './MetricGauge';
import LinearMetric from './LinearMetric';
import StatusIndicator from './StatusIndicator';
import WindCompass from './WindCompass';

/**
 * Enhanced WeatherCard - Complete with gradient components
 * 
 * Shows:
 * - Main weather display (temp, condition)
 * - 3 circular gauges (temp, humidity, wind)
 * - 2 linear metrics (pressure, visibility)
 * - 2 status indicators (air quality, alerts)
 * - Additional details footer
 */

const WeatherCard = ({ location, weather, onDelete, onEdit }) => {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Update timestamp periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Get weather icon based on condition
  const getWeatherIcon = (condition) => {
    const icons = {
      'Clear': SunIcon,
      'Clouds': Cloud,
      'Rain': CloudRain,
      'Drizzle': CloudRain,
      'Snow': CloudSnow,
      'Thunderstorm': CloudLightning,
      'Mist': Cloud,
      'Fog': Cloud,
    };
    return icons[condition] || Cloud;
  };

  const WeatherIcon = getWeatherIcon(weather?.condition);

  // Determine air quality status from real AQI data
  const getAirQualityStatus = () => {
    if (!weather.airQuality || !weather.airQuality.aqi) {
      return 'good'; // Default if no data
    }
    
    const aqi = weather.airQuality.aqi;
    
    // OpenWeather AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    // Map to our status badge colors
    if (aqi === 1) return 'excellent'; // Good = green badge
    if (aqi === 2) return 'good';      // Fair = blue badge  
    if (aqi === 3) return 'moderate';  // Moderate = orange badge
    if (aqi === 4) return 'poor';      // Poor = red badge
    if (aqi === 5) return 'critical';  // Very Poor = dark red badge
    
    return 'good';
  };

  // Get AQI level text - use OpenWeather's exact labels
  const getAQIText = () => {
    if (!weather.airQuality || !weather.airQuality.aqi) return 'Unknown';
    
    const aqiLabels = {
      1: 'Good',      // Keep OpenWeather's label
      2: 'Fair',      // Keep OpenWeather's label
      3: 'Moderate',  // Keep OpenWeather's label
      4: 'Poor',      // Keep OpenWeather's label
      5: 'Very Poor'  // Keep OpenWeather's label
    };
    
    return aqiLabels[weather.airQuality.aqi] || 'Unknown';
  };

  // Get air quality description
  const getAQIDescription = () => {
    if (!weather.airQuality || !weather.airQuality.components) {
      return 'Air quality data unavailable';
    }
    
    const { pm25, pm10 } = weather.airQuality.components;
    return `PM2.5: ${pm25?.toFixed(1) || 'N/A'} • PM10: ${pm10?.toFixed(1) || 'N/A'} • AQI: ${getAQIText()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden
                 hover:border-primary/30 transition-all duration-300
                 shadow-lg hover:shadow-primary/10"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-dark-elevated to-dark-surface px-6 py-4 border-b border-dark-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold text-white">
                {location.locationName}
              </h3>
              {location.country && (
                <span className="text-sm text-gray-400 font-mono">
                  {location.country}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-2">
              {/* Live indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="text-xs text-gray-400">
                  Live • {lastUpdate.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit?.(location)}
              className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
              title="Edit location"
            >
              <Edit className="w-4 h-4 text-gray-400 hover:text-primary" />
            </button>
            <button
              onClick={() => onDelete?.(location)}
              className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
              title="Delete location"
            >
              <Trash2 className="w-4 h-4 text-gray-400 hover:text-accent-red" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Primary Weather Display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-dark-elevated rounded-xl border border-dark-border">
              <WeatherIcon className="w-12 h-12 text-primary" />
            </div>
            <div>
              <p className="text-5xl font-bold font-mono text-white">
                {weather.temp.toFixed(1)}°
              </p>
              <p className="text-gray-400 text-sm mt-1 capitalize">
                {weather.description}
              </p>
            </div>
          </div>

          {/* Feels Like */}
          <div className="text-right">
            <p className="text-sm text-gray-400">Feels like</p>
            <p className="text-3xl font-bold text-gray-300 font-mono">
              {weather.feelsLike.toFixed(1)}°
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {(weather.feelsLike - weather.temp).toFixed(1)}° difference
            </p>
          </div>
        </div>

        {/* Metric Gauges Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MetricGauge
            label="Temperature"
            value={weather.temp}
            min={-10}
            max={40}
            unit="°C"
            gradientColors={['#EF4444', '#F59E0B', '#EAB308']} // red → orange → yellow
            icon={Thermometer}
            size="small"
          />
          <MetricGauge
            label="Humidity"
            value={weather.humidity}
            min={0}
            max={100}
            unit="%"
            gradientColors={['#06B6D4', '#3B82F6', '#8B5CF6']} // cyan → blue → purple
            icon={Droplets}
            size="small"
          />
          <WindCompass
            speed={weather.wind.speed}
            direction={weather.wind.direction}
            min={0}
            max={50}
            unit="km/h"
            gradientColors={['#10B981', '#06B6D4', '#3B82F6']} // green → cyan → blue
            size="small"
          />
        </div>

        {/* Linear Metrics */}
        <div className="space-y-4 mb-6">
          <LinearMetric
            label="Pressure"
            value={weather.pressure}
            min={950}
            max={1050}
            unit=" hPa"
            gradientColors={['#78350F', '#92400E', '#B45309']} // brown/earth
            icon={Gauge}
          />
          
          <LinearMetric
            label="Visibility"
            value={weather.visibility || 10}
            min={0}
            max={40}
            unit=" km"
            gradientColors={['#06B6D4', '#3B82F6', '#8B5CF6']} // cyan → blue → purple
            icon={Eye}
          />
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          <StatusIndicator
            status={getAirQualityStatus()}
            label="Air Quality"
            description={getAQIDescription()}
          />

          {location.alertsEnabled && (
            <div className="px-4 py-3 rounded-lg border border-primary/30 bg-primary/10 backdrop-blur-sm">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-300">Alerts Active</p>
                    <span className="text-xs font-mono text-primary">
                      ON
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {location.minTemp}°C - {location.maxTemp}°C threshold
                  </p>
                </div>
              </div>
              {/* Simple underline */}
              <div className="h-0.5 w-full mt-2 rounded-full bg-primary/30" />
            </div>
          )}
        </div>

        {/* Additional Details */}
        <div className="mt-6 pt-6 border-t border-dark-border">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Wind:</span>
              <span className="text-white font-mono">
                {weather.wind.direction}° {weather.wind.speed} km/h
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Range:</span>
              <span className="text-white font-mono">
                {weather.tempMin}° - {weather.tempMax}°
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherCard;