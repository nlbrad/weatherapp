import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, Leaf, Sun, Cloud, CloudSun } from 'lucide-react';

/**
 * QuickStatsBar - Top row of key metrics on dashboard
 * 
 * Shows 7 main stats in 2 rows:
 * Row 1: Temperature, Humidity, Wind, Air Quality
 * Row 2: UV Index, Cloud Cover, Current Conditions
 * 
 * Enhanced with wind chill info and contextual messages
 */

const QuickStatsBar = ({ weather, forecast }) => {
  // Calculate wind chill effect
  const getWindChillMessage = () => {
    const temp = weather.temp;
    const feelsLike = weather.feelsLike;
    const diff = temp - feelsLike;
    
    if (diff > 3) {
      return { message: '🌬️ Wind making it feel colder', color: 'text-blue-400' };
    } else if (diff < -2) {
      return { message: '☀️ Sun making it feel warmer', color: 'text-orange-400' };
    } else if (diff > 1) {
      return { message: 'Slight wind chill', color: 'text-gray-400' };
    }
    return { message: 'Feels accurate', color: 'text-gray-500' };
  };

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

  // Get UV index info
  const getUVInfo = () => {
    const uvi = forecast?.current?.uvi || forecast?.daily?.[0]?.uvi || 0;
    
    if (uvi <= 2) return { level: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/20', advice: 'No protection needed' };
    if (uvi <= 5) return { level: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', advice: 'Wear sunscreen' };
    if (uvi <= 7) return { level: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20', advice: 'Cover up & sunscreen' };
    if (uvi <= 10) return { level: 'Very High', color: 'text-red-400', bgColor: 'bg-red-500/20', advice: 'Avoid midday sun' };
    return { level: 'Extreme', color: 'text-purple-400', bgColor: 'bg-purple-500/20', advice: 'Stay indoors if possible' };
  };

  // Get cloud cover info
  const getCloudInfo = () => {
    const clouds = weather.clouds || forecast?.current?.clouds || 0;
    
    if (clouds <= 10) return { label: 'Clear', icon: '☀️', color: 'text-yellow-400' };
    if (clouds <= 25) return { label: 'Mostly Clear', icon: '🌤️', color: 'text-yellow-300' };
    if (clouds <= 50) return { label: 'Partly Cloudy', icon: '⛅', color: 'text-gray-300' };
    if (clouds <= 75) return { label: 'Mostly Cloudy', icon: '🌥️', color: 'text-gray-400' };
    if (clouds <= 90) return { label: 'Cloudy', icon: '☁️', color: 'text-gray-400' };
    return { label: 'Overcast', icon: '☁️', color: 'text-gray-500' };
  };

  // Get weather icon based on condition
  const getWeatherIcon = () => {
    const condition = weather.condition?.toLowerCase() || '';
    const icon = weather.icon || '';
    
    // Check if night (icon ends with 'n')
    const isNight = icon.endsWith('n');
    
    if (condition.includes('clear')) return isNight ? '🌙' : '☀️';
    if (condition.includes('cloud')) return '☁️';
    if (condition.includes('rain') || condition.includes('drizzle')) return '🌧️';
    if (condition.includes('thunder')) return '⛈️';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('mist') || condition.includes('fog')) return '🌫️';
    if (condition.includes('haze')) return '😶‍🌫️';
    return '🌤️';
  };

  const windChillInfo = getWindChillMessage();
  const uvInfo = getUVInfo();
  const cloudInfo = getCloudInfo();
  const uvValue = forecast?.current?.uvi || forecast?.daily?.[0]?.uvi || 0;
  const cloudValue = weather.clouds || forecast?.current?.clouds || 0;

  // All stats in order - Current Conditions first
  const allStats = [
    {
      id: 'condition',
      label: 'Current Conditions',
      value: weather.condition || 'Unknown',
      subValue: weather.description || '',
      emoji: getWeatherIcon(),
      icon: CloudSun,
      color: 'text-white'
    },
    {
      id: 'temp',
      label: 'Temperature',
      value: `${weather.temp.toFixed(1)}°`,
      subValue: `Feels ${weather.feelsLike.toFixed(1)}°`,
      extraInfo: windChillInfo.message,
      extraColor: windChillInfo.color,
      icon: Thermometer,
      color: 'text-accent-orange'
    },
    {
      id: 'humidity',
      label: 'Humidity',
      value: `${weather.humidity}%`,
      subValue: weather.humidity > 80 ? 'High humidity' : weather.humidity < 30 ? 'Low humidity' : 'Normal',
      icon: Droplets,
      color: 'text-blue-400'
    },
    {
      id: 'wind',
      label: 'Wind Speed',
      value: `${weather.wind.speed} km/h`,
      subValue: getWindDirection(weather.wind.direction),
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
    },
    {
      id: 'uv',
      label: 'UV Index',
      value: uvValue.toFixed(1),
      subValue: uvInfo.level,
      extraInfo: uvInfo.advice,
      extraColor: uvInfo.color,
      icon: Sun,
      color: uvInfo.color,
      bgHighlight: uvInfo.bgColor
    },
    {
      id: 'clouds',
      label: 'Cloud Cover',
      value: `${cloudValue}%`,
      subValue: cloudInfo.label,
      emoji: cloudInfo.icon,
      icon: Cloud,
      color: cloudInfo.color
    }
  ];

  return (
    <div className="mb-6">
      {/* All Stats in One Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {allStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-dark-surface border border-dark-border rounded-xl p-3 
                       hover:border-primary/30 transition-all duration-300
                       ${stat.bgHighlight || ''}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-1.5 bg-dark-elevated rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {stat.emoji && (
                  <span className="text-xl">{stat.emoji}</span>
                )}
              </div>
              
              <div>
                <p className="text-xl font-bold font-mono text-white mb-0.5 capitalize truncate">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 truncate">{stat.label}</p>
                <p className="text-xs text-gray-500 truncate">{stat.subValue}</p>
                {stat.extraInfo && (
                  <p className={`text-xs mt-0.5 truncate ${stat.extraColor}`}>{stat.extraInfo}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function for wind direction
function getWindDirection(degrees) {
  if (degrees === undefined || degrees === null) return 'Unknown';
  
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return `${directions[index]} (${degrees}°)`;
}

export default QuickStatsBar;