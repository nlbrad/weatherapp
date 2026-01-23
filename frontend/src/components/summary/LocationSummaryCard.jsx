import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Trash2, 
  ArrowRight,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Sun as SunIcon,
  Wind,
  Droplets
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * LocationSummaryCard - Compact card for landing page
 * 
 * Shows:
 * - Location name & country
 * - Current temperature & feels like
 * - Weather condition with icon
 * - Quick health indicator (air quality + alerts)
 * - Mini wind indicator
 * - "View Dashboard" button
 */

const LocationSummaryCard = ({ location, weather, onDelete }) => {
  const navigate = useNavigate();

  // Generate location ID for routing
  const locationId = `${location.locationName}-${location.country}`.toLowerCase();

  // Get weather icon
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

  const WeatherIcon = getWeatherIcon(weather.condition);

  // Calculate visibility status (we have this data!)
  const getVisibilityStatus = () => {
    const vis = weather.visibility || 10; // km
    
    // Visibility ranges
    if (vis >= 10) return { status: 'excellent', label: 'Clear' };      // 10+ km
    if (vis >= 5) return { status: 'good', label: 'Good' };             // 5-10 km
    if (vis >= 2) return { status: 'moderate', label: 'Hazy' };         // 2-5 km
    return { status: 'poor', label: 'Foggy' };                          // < 2 km
  };

  const healthColors = {
    excellent: 'bg-accent-green/20 border-accent-green/40 text-accent-green',
    good: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
    moderate: 'bg-accent-orange/20 border-accent-orange/40 text-accent-orange',
    poor: 'bg-gray-500/20 border-gray-500/40 text-gray-400'
  };

  const visibilityInfo = getVisibilityStatus();

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
      <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-white">
              {location.locationName}
            </h3>
            <p className="text-xs text-gray-500">{location.country}</p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(location);
          }}
          className="p-1.5 hover:bg-dark-elevated rounded-lg transition-colors"
          title="Remove location"
        >
          <Trash2 className="w-4 h-4 text-gray-500 hover:text-accent-red" />
        </button>
      </div>

      {/* Main Weather Display */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          {/* Weather Icon & Temp */}
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-dark-elevated rounded-lg border border-dark-border">
              <WeatherIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold font-mono text-white">
                {weather.temp.toFixed(1)}°
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {weather.description}
              </p>
            </div>
          </div>

          {/* Feels Like (compact) */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Feels</p>
            <p className="text-lg font-bold font-mono text-gray-300">
              {weather.feelsLike.toFixed(1)}°
            </p>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Humidity */}
          <div className="flex items-center space-x-1.5 px-2 py-1.5 bg-dark-elevated rounded-lg">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-mono text-white">{weather.humidity}%</span>
          </div>

          {/* Wind */}
          <div className="flex items-center space-x-1.5 px-2 py-1.5 bg-dark-elevated rounded-lg">
            <Wind className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-mono text-white">{weather.wind.speed} km/h</span>
          </div>

          {/* Visibility Indicator */}
          <div className={`flex items-center justify-center px-2 py-1.5 rounded-lg border ${healthColors[visibilityInfo.status]}`}>
            <span className="text-xs font-semibold whitespace-nowrap">
              {visibilityInfo.label}
            </span>
          </div>
        </div>

        {/* View Dashboard Button */}
        <button
          onClick={() => navigate(`/dashboard/${locationId}`)}
          className="w-full py-2.5 px-4 bg-primary/10 hover:bg-primary/20 
                     border border-primary/30 hover:border-primary/50
                     rounded-lg transition-all duration-200
                     flex items-center justify-center space-x-2
                     group"
        >
          <span className="text-sm font-semibold text-primary">View Dashboard</span>
          <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

          {/* Alert Status Footer - Shows ON or OFF */}
    <div className="px-4 py-2 bg-dark-elevated border-t border-dark-border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Alerts</span>
        {location.alertsEnabled ? (
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary">ON</span>
          </div>
        ) : (
          <span className="text-xs font-semibold text-gray-500">OFF</span>
        )}
      </div>
    </div>
    </motion.div>
  );
};

export default LocationSummaryCard;