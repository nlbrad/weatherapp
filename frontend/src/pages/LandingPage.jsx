import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, Plus, Loader, Settings, MapPin, AlertTriangle, 
  Thermometer, Droplets, Wind, Sun, Moon, ArrowRight,
  TrendingUp, TrendingDown, CloudRain, Snowflake, X,
  RefreshCw, Star
} from 'lucide-react';
import { weatherAPI, locationsAPI } from '../services/api';
import weatherCache from '../services/weatherCache';
import LocationSearch from '../components/LocationSearch';

/**
 * LandingPage - Enhanced hybrid design
 * 
 * Features:
 * - Hero featured location
 * - Quick comparison stats
 * - Active alerts banner
 * - Compact location cards with day/night styling
 */

const LandingPage = () => {
  const navigate = useNavigate();
  const userId = 'user123';

  const [locations, setLocations] = useState([]);
  const [primaryLocationName, setPrimaryLocationName] = useState(() => {
    // Load from localStorage or null
    return localStorage.getItem('primaryLocation') || null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ 
    name: '', 
    country: '',
    latitude: null,
    longitude: null,
    minTemp: 0,
    maxTemp: 30
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  // Set a location as primary
  const setAsPrimary = (locationName) => {
    setPrimaryLocationName(locationName);
    localStorage.setItem('primaryLocation', locationName);
  };

  // Sort locations so primary is first
  const getSortedLocations = () => {
    if (!primaryLocationName || locations.length === 0) return locations;
    
    const primaryIndex = locations.findIndex(
      loc => loc.locationName === primaryLocationName
    );
    
    if (primaryIndex === -1) return locations;
    
    const sorted = [...locations];
    const [primary] = sorted.splice(primaryIndex, 1);
    return [primary, ...sorted];
  };

  const sortedLocations = getSortedLocations();

  const loadLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationsAPI.getUserLocations(userId);
      
      const failedLocations = []; // Track locations that fail to load
      
      const locationsWithWeather = await Promise.all(
        data.locations.map(async (loc) => {
          try {
            // Skip locations without coordinates
            if (!loc.latitude || !loc.longitude) {
              console.warn(`⚠️ ${loc.locationName} missing coordinates`);
              failedLocations.push(loc);
              return null;
            }
            
            // Use weatherCache for efficient data fetching
            const weatherData = await weatherCache.get(loc.latitude, loc.longitude);
            
            return {
              locationName: loc.locationName,
              country: loc.country,
              latitude: loc.latitude,
              longitude: loc.longitude,
              alertsEnabled: loc.alertsEnabled,
              minTemp: loc.minTemp,
              maxTemp: loc.maxTemp,
              weather: {
                temp: weatherData.current.temp,
                feelsLike: weatherData.current.feelsLike,
                tempMin: weatherData.daily[0]?.tempMin || weatherData.current.temp - 2,
                tempMax: weatherData.daily[0]?.tempMax || weatherData.current.temp + 2,
                humidity: weatherData.current.humidity,
                pressure: weatherData.current.pressure,
                condition: weatherData.current.condition,
                description: weatherData.current.description,
                icon: weatherData.current.icon,
                visibility: weatherData.current.visibility / 1000 || 10, // Convert to km
                clouds: weatherData.current.clouds || 0,
                uvi: weatherData.current.uvi,
                wind: {
                  speed: weatherData.current.windSpeed,
                  direction: weatherData.current.windDeg
                },
                airQuality: weatherData.airQuality
              },
              forecast: {
                current: {
                  timezone: weatherData.timezone,
                  sunrise: weatherData.current.sunrise,
                  sunset: weatherData.current.sunset,
                },
                hourly: weatherData.hourly,
                daily: weatherData.daily,
                alerts: weatherData.alerts || []
              }
            };
          } catch (err) {
            console.error(`Failed to fetch weather for ${loc.locationName}:`, err);
            failedLocations.push(loc);
            return null;
          }
        })
      );
      
      // Auto-cleanup: Delete locations that consistently fail
      if (failedLocations.length > 0) {
        console.warn(`🧹 Found ${failedLocations.length} broken location(s):`, 
          failedLocations.map(l => `${l.locationName} (lat: ${l.latitude}, lon: ${l.longitude})`));
        
        for (const failedLoc of failedLocations) {
          console.log(`🗑️ Auto-removing broken location: ${failedLoc.locationName}`);
          try {
            await locationsAPI.deleteLocation(userId, failedLoc.locationName);
            console.log(`✅ Deleted: ${failedLoc.locationName}`);
          } catch (deleteErr) {
            console.error(`❌ Failed to auto-delete ${failedLoc.locationName}:`, deleteErr);
          }
        }
      }
      
      setLocations(locationsWithWeather.filter(loc => loc !== null));
    } catch (err) {
      setError('Failed to load locations. Make sure the backend is running.');
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Expose cleanup function to window for manual cleanup via console
  useEffect(() => {
    window.cleanupBrokenLocations = async () => {
      console.log('🧹 Starting manual cleanup...');
      const data = await locationsAPI.getUserLocations(userId);
      console.log(`Found ${data.locations.length} total locations`);
      
      for (const loc of data.locations) {
        try {
          await weatherAPI.getWeather(loc.locationName, loc.country, loc.latitude, loc.longitude);
          console.log(`✅ ${loc.locationName} - OK`);
        } catch (err) {
          console.log(`❌ ${loc.locationName} - BROKEN, deleting...`);
          try {
            await locationsAPI.deleteLocation(userId, loc.locationName);
            console.log(`🗑️ Deleted: ${loc.locationName}`);
          } catch (delErr) {
            console.error(`Failed to delete: ${delErr}`);
          }
        }
      }
      console.log('🧹 Cleanup complete! Refreshing...');
      window.location.reload();
    };
    
    console.log('💡 Tip: Run window.cleanupBrokenLocations() to remove broken locations');
  }, []);

  const refreshData = async () => {
    setRefreshing(true);
    // Force refresh all cached data
    for (const loc of locations) {
      if (loc.latitude && loc.longitude) {
        await weatherCache.refresh(loc.latitude, loc.longitude);
      }
    }
    await loadLocations();
    setRefreshing(false);
  };

  const addLocation = async () => {
    if (!newLocation.name) {
      alert('Please search and select a location');
      return;
    }

    if (!newLocation.latitude || !newLocation.longitude) {
      alert('Location coordinates not found. Please select a location from the search results.');
      return;
    }

    try {
      setSaving(true);
      await locationsAPI.saveLocation({
        userId: userId,
        locationName: newLocation.name,
        country: newLocation.country,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        alertsEnabled: true,
        minTemp: parseInt(newLocation.minTemp),
        maxTemp: parseInt(newLocation.maxTemp),
      });
      
      // Fetch weather using cache
      try {
        const weatherData = await weatherCache.get(newLocation.latitude, newLocation.longitude);
        
        const newLocationWithWeather = {
          locationName: newLocation.name,
          country: newLocation.country,
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
          alertsEnabled: true,
          minTemp: parseInt(newLocation.minTemp),
          maxTemp: parseInt(newLocation.maxTemp),
          weather: {
            temp: weatherData.current.temp,
            feelsLike: weatherData.current.feelsLike,
            tempMin: weatherData.daily[0]?.tempMin || weatherData.current.temp - 2,
            tempMax: weatherData.daily[0]?.tempMax || weatherData.current.temp + 2,
            humidity: weatherData.current.humidity,
            pressure: weatherData.current.pressure,
            condition: weatherData.current.condition,
            description: weatherData.current.description,
            icon: weatherData.current.icon,
            visibility: weatherData.current.visibility / 1000 || 10,
            clouds: weatherData.current.clouds || 0,
            uvi: weatherData.current.uvi,
            wind: {
              speed: weatherData.current.windSpeed,
              direction: weatherData.current.windDeg
            },
            airQuality: weatherData.airQuality
          },
          forecast: {
            current: {
              timezone: weatherData.timezone,
              sunrise: weatherData.current.sunrise,
              sunset: weatherData.current.sunset,
            },
            hourly: weatherData.hourly,
            daily: weatherData.daily,
            alerts: weatherData.alerts || []
          }
        };
        
        // Append to end of list
        setLocations([...locations, newLocationWithWeather]);
      } catch (err) {
        console.error('Failed to fetch weather for new location:', err);
        // Fallback: reload all locations
        await loadLocations();
      }
      
      setNewLocation({ name: '', country: '', latitude: null, longitude: null, minTemp: 0, maxTemp: 30 });
      setShowAddLocation(false);
    } catch (err) {
      alert('Failed to save location. Please try again.');
      console.error('Error saving location:', err);
    } finally {
      setSaving(false);
    }
  };

  const removeLocation = async (locationToRemove) => {
    if (window.confirm(`Remove ${locationToRemove.locationName}?`)) {
      try {
        await locationsAPI.deleteLocation(userId, locationToRemove.locationName);
        setLocations(locations.filter(
          loc => loc.locationName !== locationToRemove.locationName
        ));
      } catch (error) {
        console.error('Error deleting location:', error);
        alert('Failed to delete location. Please try again.');
      }
    }
  };

  // Get alert severity color based on event name
  const getAlertSeverity = (event) => {
    const eventLower = event?.toLowerCase() || '';
    
    // Red - Extreme/Dangerous
    if (eventLower.includes('hurricane') || 
        eventLower.includes('tornado') || 
        eventLower.includes('extreme') ||
        eventLower.includes('emergency') ||
        eventLower.includes('tsunami')) {
      return { bg: 'bg-red-600', border: 'border-red-500/50', hoverBorder: 'hover:border-red-400/70' };
    }
    
    // Orange - Severe
    if (eventLower.includes('severe') || 
        eventLower.includes('storm') ||
        eventLower.includes('flood') ||
        eventLower.includes('blizzard') ||
        eventLower.includes('ice')) {
      return { bg: 'bg-orange-600', border: 'border-orange-500/50', hoverBorder: 'hover:border-orange-400/70' };
    }
    
    // Yellow - Warning
    if (eventLower.includes('warning') || 
        eventLower.includes('wind') ||
        eventLower.includes('rain') ||
        eventLower.includes('snow') ||
        eventLower.includes('fog') ||
        eventLower.includes('frost')) {
      return { bg: 'bg-yellow-600', border: 'border-yellow-500/50', hoverBorder: 'hover:border-yellow-400/70' };
    }
    
    // Blue - Advisory/Watch (default)
    return { bg: 'bg-blue-600', border: 'border-blue-500/50', hoverBorder: 'hover:border-blue-400/70' };
  };

  // Get weather emoji based on condition and time
  const getWeatherEmoji = (condition, icon) => {
    const isNight = icon?.endsWith('n');
    const cond = condition?.toLowerCase() || '';
    
    if (cond.includes('clear')) return isNight ? '🌙' : '☀️';
    if (cond.includes('cloud')) return isNight ? '☁️' : '⛅';
    if (cond.includes('rain') || cond.includes('drizzle')) return '🌧️';
    if (cond.includes('thunder')) return '⛈️';
    if (cond.includes('snow')) return '❄️';
    if (cond.includes('mist') || cond.includes('fog')) return '🌫️';
    return isNight ? '🌙' : '🌤️';
  };

  // Get local time for a location
  const getLocalTime = (timezone) => {
    if (!timezone) return null;
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    });
  };

  // Check if it's night at location
  const isNightTime = (icon) => icon?.endsWith('n');

  // Calculate comparison stats
  const getComparisonStats = () => {
    if (locations.length === 0) return null;
    
    const warmest = locations.reduce((max, loc) => 
      loc.weather.temp > max.weather.temp ? loc : max, locations[0]);
    const coldest = locations.reduce((min, loc) => 
      loc.weather.temp < min.weather.temp ? loc : min, locations[0]);
    const wettest = locations.reduce((max, loc) => 
      loc.weather.humidity > max.weather.humidity ? loc : max, locations[0]);
    const windiest = locations.reduce((max, loc) => 
      loc.weather.wind.speed > max.weather.wind.speed ? loc : max, locations[0]);
    
    return { warmest, coldest, wettest, windiest };
  };

  const stats = getComparisonStats();
  const heroLocation = sortedLocations[0];
  const otherLocations = sortedLocations.slice(1);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-400">Loading your locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-surface border-b border-dark-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Cloud className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Weather Alert System</h1>
                <p className="text-xs text-gray-500">Real-time monitoring</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                disabled={refreshing}
                className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAddLocation(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg
                         hover:bg-primary-dark transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Location</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent-red/10 border border-accent-red/30 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-accent-red" />
              <p className="text-accent-red">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Add Location Modal */}
        <AnimatePresence>
          {showAddLocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddLocation(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-dark-surface border border-dark-border rounded-2xl p-6 w-full max-w-lg"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Add New Location</h2>
                  <button
                    onClick={() => setShowAddLocation(false)}
                    className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Search Location
                    </label>
                    <LocationSearch 
                      onSelect={(location) => {
                        setNewLocation({
                          ...newLocation,
                          name: location.name,
                          country: location.country,
                          latitude: location.lat,
                          longitude: location.lon
                        });
                      }}
                      placeholder="Start typing a city name..."
                    />
                    
                    {newLocation.name && (
                      <div className="mt-3 p-3 bg-dark-elevated border border-primary/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-white font-medium">{newLocation.name}</span>
                          {newLocation.country && (
                            <span className="text-gray-400">, {newLocation.country}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowAddLocation(false);
                        setNewLocation({ name: '', country: '', latitude: null, longitude: null, minTemp: 0, maxTemp: 30 });
                      }}
                      className="px-4 py-2 bg-dark-elevated text-gray-300 rounded-lg 
                               hover:bg-dark-border transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addLocation}
                      disabled={saving || !newLocation.name}
                      className="px-6 py-2 bg-primary text-white rounded-lg 
                               hover:bg-primary-dark transition-colors font-medium
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? 'Adding...' : 'Add Location'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {locations.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 bg-dark-surface border border-dark-border rounded-full 
                          flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No locations yet</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Add your first location to start monitoring weather conditions and receive alerts.
            </p>
            <button
              onClick={() => setShowAddLocation(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl
                       hover:bg-primary-dark transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Your First Location
            </button>
          </motion.div>
        )}

        {/* Main Content */}
        {locations.length > 0 && (
          <>
            {/* Quick Comparison Bar */}
            {locations.length > 1 && stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
              >
                <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-accent-orange" />
                    <span className="text-xs text-gray-400">Warmest</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.warmest.locationName}</p>
                  <p className="text-sm text-accent-orange">{stats.warmest.weather.temp.toFixed(0)}°C</p>
                </div>
                
                <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Coldest</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.coldest.locationName}</p>
                  <p className="text-sm text-blue-400">{stats.coldest.weather.temp.toFixed(0)}°C</p>
                </div>
                
                <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-400">Most Humid</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.wettest.locationName}</p>
                  <p className="text-sm text-blue-400">{stats.wettest.weather.humidity}%</p>
                </div>
                
                <div className="bg-dark-surface border border-dark-border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-gray-400">Windiest</span>
                  </div>
                  <p className="text-lg font-bold text-white">{stats.windiest.locationName}</p>
                  <p className="text-sm text-green-400">{stats.windiest.weather.wind.speed.toFixed(1)} km/h</p>
                </div>
              </motion.div>
            )}

            {/* Hero Location */}
            {heroLocation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`group relative overflow-hidden rounded-2xl mb-6 cursor-pointer
                          ${isNightTime(heroLocation.weather.icon) 
                            ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900' 
                            : 'bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400'}`}
                onClick={() => navigate(`/dashboard/${heroLocation.locationName.toLowerCase()}-${heroLocation.country.toLowerCase()}`)}
              >
                {/* Alert Banner if active */}
                {heroLocation.forecast?.alerts && heroLocation.forecast.alerts.length > 0 && (() => {
                  const severity = getAlertSeverity(heroLocation.forecast.alerts[0].event);
                  return (
                  <div className={`${severity.bg}/90 px-4 py-2 flex items-center gap-2`}>
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span className="text-sm font-medium text-white">
                      {heroLocation.forecast.alerts[0].event}
                    </span>
                    {heroLocation.forecast.alerts.length > 1 && (
                      <span className="text-xs text-white/70">
                        +{heroLocation.forecast.alerts.length - 1} more
                      </span>
                    )}
                  </div>
                  );
                })()}

                {/* Delete button for hero */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLocation(heroLocation);
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/30 backdrop-blur-sm rounded-lg
                           opacity-0 group-hover:opacity-100 hover:bg-accent-red/50 
                           transition-all text-white/70 hover:text-white z-10"
                  title="Delete location"
                  style={{ top: heroLocation.forecast?.alerts?.length > 0 ? '3rem' : '1rem' }}
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-10 right-10 text-[200px]">
                    {getWeatherEmoji(heroLocation.weather.condition, heroLocation.weather.icon)}
                  </div>
                </div>
                
                <div className="relative p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm text-white/70">Primary Location</span>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-1">
                        {heroLocation.locationName}, {heroLocation.country}
                      </h2>
                      {heroLocation.forecast?.current?.timezone && (
                        <p className="text-white/60 text-sm">
                          🕐 {getLocalTime(heroLocation.forecast.current.timezone)} local time
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-6xl mb-2">
                        {getWeatherEmoji(heroLocation.weather.condition, heroLocation.weather.icon)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-7xl font-bold text-white">
                        {heroLocation.weather.temp.toFixed(0)}°
                      </p>
                      <p className="text-xl text-white/80 capitalize mt-1">
                        {heroLocation.weather.description}
                      </p>
                      {heroLocation.forecast?.daily?.[0] && (
                        <p className="text-white/60 mt-1">
                          H: {Math.round(heroLocation.forecast.daily[0].tempMax)}° 
                          L: {Math.round(heroLocation.forecast.daily[0].tempMin)}°
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-6 text-white/80">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-5 h-5" />
                          <span>{heroLocation.weather.humidity}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wind className="w-5 h-5" />
                          <span>{heroLocation.weather.wind.speed.toFixed(1)} km/h</span>
                        </div>
                      </div>
                      
                      <button
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm
                                 rounded-lg text-white hover:bg-white/30 transition-colors"
                      >
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other Locations Grid */}
            {otherLocations.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-white mb-4">Other Locations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherLocations.map((location, index) => {
                    const alertSeverity = location.forecast?.alerts?.length > 0 
                      ? getAlertSeverity(location.forecast.alerts[0].event) 
                      : null;
                    
                    return (
                    <motion.div
                      key={`${location.locationName}-${location.country}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.05 }}
                      className={`group relative overflow-hidden rounded-xl cursor-pointer
                                border transition-all duration-300 hover:scale-[1.02]
                                ${alertSeverity
                                  ? `bg-dark-surface ${alertSeverity.border} ${alertSeverity.hoverBorder}`
                                  : isNightTime(location.weather.icon)
                                    ? 'bg-dark-surface border-blue-900/50 hover:border-blue-700/50'
                                    : 'bg-dark-surface border-dark-border hover:border-primary/50'}`}
                      onClick={() => navigate(`/dashboard/${location.locationName.toLowerCase()}-${location.country.toLowerCase()}`)}
                    >
                      {/* Alert strip if active warning */}
                      {alertSeverity ? (
                        <div className={`${alertSeverity.bg} px-3 py-1.5 flex items-center gap-2`}>
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span className="text-xs font-medium text-white truncate">
                            {location.forecast.alerts[0].event}
                          </span>
                        </div>
                      ) : (
                        /* Night/Day indicator strip */
                        <div className={`absolute top-0 left-0 right-0 h-1 
                                      ${isNightTime(location.weather.icon) 
                                        ? 'bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900'
                                        : 'bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400'}`} 
                        />
                      )}
                      
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-lg font-semibold text-white">
                              {location.locationName}
                            </h4>
                            <p className="text-sm text-gray-400">{location.country}</p>
                            {location.forecast?.current?.timezone && (
                              <p className="text-xs text-gray-500 mt-1">
                                {getLocalTime(location.forecast.current.timezone)}
                                {isNightTime(location.weather.icon) ? ' 🌙' : ' ☀️'}
                              </p>
                            )}
                          </div>
                          <div className="text-4xl">
                            {getWeatherEmoji(location.weather.condition, location.weather.icon)}
                          </div>
                        </div>
                        
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-4xl font-bold text-white">
                              {location.weather.temp.toFixed(0)}°
                            </p>
                            <p className="text-sm text-gray-400 capitalize">
                              {location.weather.description}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            <span className="flex items-center gap-1">
                              <Droplets className="w-4 h-4" />
                              {location.weather.humidity}%
                            </span>
                            <span className="flex items-center gap-1">
                              <Wind className="w-4 h-4" />
                              {location.weather.wind.speed.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action buttons - show on hover */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {/* Set as Primary button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAsPrimary(location.locationName);
                          }}
                          className="p-1.5 bg-dark-elevated/80 rounded-lg hover:bg-primary/30 
                                   transition-all text-gray-400 hover:text-primary"
                          title="Set as primary"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                        
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLocation(location);
                          }}
                          className="p-1.5 bg-dark-elevated/80 rounded-lg hover:bg-accent-red/20 
                                   transition-all text-gray-400 hover:text-accent-red"
                          title="Delete location"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                  })}
                  
                  {/* Add Location Card */}
                  <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + otherLocations.length * 0.05 }}
                    onClick={() => setShowAddLocation(true)}
                    className="flex flex-col items-center justify-center p-8 rounded-xl
                             border-2 border-dashed border-dark-border
                             hover:border-primary/50 hover:bg-dark-surface/50
                             transition-all duration-300 min-h-[180px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border
                                  flex items-center justify-center mb-3">
                      <Plus className="w-6 h-6 text-gray-400" />
                    </div>
                    <span className="text-gray-400 font-medium">Add Location</span>
                  </motion.button>
                </div>
              </>
            )}

            {/* Single location - show add prompt */}
            {locations.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center py-8"
              >
                <p className="text-gray-400 mb-4">Add more locations to compare weather conditions</p>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-dark-surface border border-dark-border
                           rounded-lg text-gray-300 hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Location
                </button>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default LandingPage;