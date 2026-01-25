import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Sun, Cloud, CloudSun, Gauge } from 'lucide-react';

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

  // Check if it's night
  const isNight = weather.icon?.endsWith('n') || false;

  // Get UV index info - 0 at night since there's no sun
  const getUVInfo = () => {
    // UV is always 0 at night
    if (isNight) {
      return { level: 'None', color: 'text-gray-500', bgColor: 'bg-gray-500/10', advice: 'No UV at night' };
    }
    
    const uvi = forecast?.current?.uvi || forecast?.daily?.[0]?.uvi || 0;
    
    if (uvi <= 2) return { level: 'Low', color: 'text-green-400', bgColor: 'bg-green-500/20', advice: 'No protection needed' };
    if (uvi <= 5) return { level: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', advice: 'Wear sunscreen' };
    if (uvi <= 7) return { level: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/20', advice: 'Cover up & sunscreen' };
    if (uvi <= 10) return { level: 'Very High', color: 'text-red-400', bgColor: 'bg-red-500/20', advice: 'Avoid midday sun' };
    return { level: 'Extreme', color: 'text-purple-400', bgColor: 'bg-purple-500/20', advice: 'Stay indoors if possible' };
  };

  // Get cloud cover info - day/night aware
  const getCloudInfo = () => {
    const clouds = weather.clouds || forecast?.current?.clouds || 0;
    
    if (clouds <= 10) return { label: 'Clear', icon: isNight ? '🌙' : '☀️', color: isNight ? 'text-blue-300' : 'text-yellow-400' };
    if (clouds <= 25) return { label: 'Mostly Clear', icon: isNight ? '🌙' : '🌤️', color: isNight ? 'text-blue-300' : 'text-yellow-300' };
    if (clouds <= 50) return { label: 'Partly Cloudy', icon: isNight ? '☁️' : '⛅', color: 'text-gray-300' };
    if (clouds <= 75) return { label: 'Mostly Cloudy', icon: '🌥️', color: 'text-gray-400' };
    if (clouds <= 90) return { label: 'Cloudy', icon: '☁️', color: 'text-gray-400' };
    return { label: 'Overcast', icon: '☁️', color: 'text-gray-500' };
  };

  // Get weather icon based on condition - day/night aware
  const getWeatherIcon = () => {
    const condition = weather.condition?.toLowerCase() || '';
    const icon = weather.icon || '';
    
    // Check if night (icon ends with 'n')
    const isNight = icon.endsWith('n');
    
    if (condition.includes('clear')) return isNight ? '🌙' : '☀️';
    if (condition.includes('cloud')) return isNight ? '☁️' : '⛅';
    if (condition.includes('rain') || condition.includes('drizzle')) return '🌧️';
    if (condition.includes('thunder')) return '⛈️';
    if (condition.includes('snow')) return '❄️';
    if (condition.includes('mist') || condition.includes('fog')) return '🌫️';
    if (condition.includes('haze')) return '😶‍🌫️';
    return isNight ? '🌙' : '🌤️';
  };

  // Get smart "what's next" summary from forecast
  const getUpcomingWeather = () => {
    if (!forecast?.hourly || forecast.hourly.length < 6) return null;
    
    const currentCondition = weather.condition?.toLowerCase() || '';
    const upcoming = forecast.hourly.slice(1, 7);
    
    // Check for precipitation in upcoming hours
    const precipHours = upcoming.filter(h => h.pop > 0.3);
    const hasUpcomingPrecip = precipHours.length > 0;
    
    // Check what type of precip is expected
    const getExpectedPrecipType = () => {
      const avgTemp = upcoming.reduce((sum, h) => sum + h.temp, 0) / upcoming.length;
      if (avgTemp <= 0) return 'snow';
      if (avgTemp <= 2) return 'sleet';
      return 'rain';
    };
    
    // Check if current condition will continue
    const isCurrentlySnowing = currentCondition.includes('snow');
    const isCurrentlyRaining = currentCondition.includes('rain') || currentCondition.includes('drizzle');
    const isCurrentlyClear = currentCondition.includes('clear');
    const isCurrentlyCloudy = currentCondition.includes('cloud');
    
    // Check when conditions might change
    const conditionChanges = upcoming.findIndex(h => {
      const cond = h.condition?.toLowerCase() || '';
      if (isCurrentlySnowing && !cond.includes('snow')) return true;
      if (isCurrentlyRaining && !cond.includes('rain') && !cond.includes('drizzle')) return true;
      if (isCurrentlyClear && !cond.includes('clear')) return true;
      return false;
    });
    
    // Smart messaging based on current + forecast
    if (isCurrentlySnowing) {
      if (conditionChanges === -1 || conditionChanges > 4) {
        return { text: 'Snow continuing', icon: '❄️' };
      } else {
        return { text: `Clearing in ~${conditionChanges * 3}h`, icon: '🌤️' };
      }
    }
    
    if (isCurrentlyRaining) {
      if (conditionChanges === -1 || conditionChanges > 4) {
        return { text: 'Rain continuing', icon: '🌧️' };
      } else {
        return { text: `Easing in ~${conditionChanges * 3}h`, icon: '🌤️' };
      }
    }
    
    if (hasUpcomingPrecip) {
      const precipType = getExpectedPrecipType();
      const hoursUntil = upcoming.findIndex(h => h.pop > 0.3) + 1;
      const precipIcon = precipType === 'snow' ? '❄️' : precipType === 'sleet' ? '🌨️' : '🌧️';
      return { text: `${precipType.charAt(0).toUpperCase() + precipType.slice(1)} in ~${hoursUntil * 3}h`, icon: precipIcon };
    }
    
    // Temperature trend
    const tempDiff = upcoming[5]?.temp - weather.temp;
    if (Math.abs(tempDiff) > 3) {
      if (tempDiff > 0) {
        return { text: `Warming to ${Math.round(upcoming[5]?.temp)}°`, icon: '📈' };
      } else {
        return { text: `Cooling to ${Math.round(upcoming[5]?.temp)}°`, icon: '📉' };
      }
    }
    
    if (isCurrentlyClear) {
      return { text: 'Staying clear', icon: '✨' };
    }
    
    if (isCurrentlyCloudy) {
      return { text: 'Clouds persisting', icon: '☁️' };
    }
    
    return { text: 'Conditions stable', icon: '→' };
  };

  const windChillInfo = getWindChillMessage();
  const uvInfo = getUVInfo();
  const cloudInfo = getCloudInfo();
  const uvValue = isNight ? 0 : (forecast?.current?.uvi || forecast?.daily?.[0]?.uvi || 0);
  const cloudValue = weather.clouds || forecast?.current?.clouds || 0;
  const upcoming = getUpcomingWeather();
  const todayForecast = forecast?.daily?.[0];

  // Get visibility label
  const getVisibilityLabel = () => {
    const vis = weather.visibility || 10;
    if (vis >= 10) return 'Clear';
    if (vis >= 5) return 'Good';
    if (vis >= 2) return 'Moderate';
    if (vis >= 1) return 'Poor';
    return 'Very Poor';
  };

  // All stats in order - Current Conditions first (redesigned)
  const allStats = [
    {
      id: 'condition',
      label: weather.description || weather.condition,
      subValue: todayForecast ? `H:${Math.round(todayForecast.tempHigh)}° L:${Math.round(todayForecast.tempLow)}°` : '',
      extraInfo: upcoming?.text,
      extraIcon: upcoming?.icon,
      visibilityInfo: `👁 ${weather.visibility || 10}km ${getVisibilityLabel()}`,
      emoji: getWeatherIcon(),
      icon: CloudSun,
      color: 'text-white',
      isCondition: true
    },
    {
      id: 'temp',
      label: 'Temperature',
      value: `${weather.temp.toFixed(1)}°`,
      subValue: `Feels ${weather.feelsLike.toFixed(1)}°`,
      dewPoint: forecast?.current?.dew_point ? `${forecast.current.dew_point.toFixed(0)}°` : null,
      extraInfo: windChillInfo.message,
      extraColor: windChillInfo.color,
      icon: Thermometer,
      color: 'text-accent-orange',
      isTemp: true
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
      id: 'pressure',
      label: 'Pressure',
      value: `${weather.pressure}`,
      subValue: weather.pressure > 1020 ? 'High (fair)' : weather.pressure < 1010 ? 'Low (unsettled)' : 'Normal',
      extraInfo: 'hPa',
      extraColor: 'text-gray-500',
      icon: Gauge,
      color: weather.pressure > 1020 ? 'text-green-400' : weather.pressure < 1010 ? 'text-yellow-400' : 'text-gray-400'
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
      {/* All Stats in One Row - 6 widgets */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
              {stat.isCondition ? (
                /* Special layout for Current Conditions */
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-3xl">{stat.emoji}</span>
                    <p className="text-lg text-white font-semibold capitalize">{stat.label}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 font-mono">{stat.subValue}</p>
                    <p className="text-xs text-gray-500">{stat.visibilityInfo}</p>
                  </div>
                  {stat.extraInfo && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      <span>{stat.extraIcon}</span> 
                      <span>{stat.extraInfo}</span>
                    </p>
                  )}
                </>
              ) : stat.isTemp ? (
                /* Special layout for Temperature */
                <>
                  <div className="flex items-start justify-between mb-1">
                    <div className={`p-1.5 bg-dark-elevated rounded-lg ${stat.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {stat.dewPoint && (
                      <span className="text-xs text-gray-500">
                        Dew <span className="text-gray-400 font-mono">{stat.dewPoint}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold font-mono text-white mb-0.5">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-400">{stat.subValue}</p>
                  {stat.extraInfo && (
                    <p className={`text-xs mt-1 truncate ${stat.extraColor}`}>{stat.extraInfo}</p>
                  )}
                </>
              ) : (
                /* Standard layout for other stats */
                <>
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
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStatsBar;