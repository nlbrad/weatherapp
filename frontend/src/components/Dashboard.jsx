import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, 
  Plus, 
  Moon, 
  Sun as SunIcon,
  Activity,
  Bell,
  Settings,
  RefreshCw,
  Zap
} from 'lucide-react';
import WeatherCard from './WeatherCard';

/**
 * Enhanced Dashboard - Systems Monitor Aesthetic
 * Features: Dark mode, real-time updates, professional metrics
 */
const Dashboard = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark'); // dark, midnight, aurora
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load locations and weather data
  useEffect(() => {
    loadLocations();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const response = await fetch('/api/getuserlocations?userId=user123');
      const data = await response.json();
      
      // Fetch weather for each location
      const locationsWithWeather = await Promise.all(
        data.map(async (location) => {
          const weatherRes = await fetch(
            `/api/getweather?city=${location.locationName}&country=${location.country}`
          );
          const weather = await weatherRes.json();
          return { ...location, weather };
        })
      );
      
      setLocations(locationsWithWeather);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await loadLocations();
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDelete = async (location) => {
    if (window.confirm(`Remove ${location.locationName}?`)) {
      // TODO: API call to delete
      setLocations(locations.filter(l => l.locationName !== location.locationName));
    }
  };

  const handleEdit = (location) => {
    // TODO: Open edit modal
    console.log('Edit:', location);
  };

  const toggleTheme = () => {
    const themes = ['dark', 'midnight', 'aurora'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
    document.documentElement.classList.remove(...themes);
    document.documentElement.classList.add(nextTheme);
  };

  // Theme configurations
  const themeConfig = {
    dark: { bg: 'bg-dark-bg', accent: 'text-primary' },
    midnight: { bg: 'bg-[#0a0a0a]', accent: 'text-accent-purple' },
    aurora: { bg: 'bg-gradient-to-br from-dark-bg via-accent-purple/5 to-primary/5', accent: 'text-primary' }
  };

  return (
    <div className={`min-h-screen ${themeConfig[theme].bg} text-white transition-all duration-500`}>
      {/* Top Navigation Bar */}
      <nav className="bg-dark-surface border-b border-dark-border backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-primary to-accent-purple rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Weather Intelligence</h1>
                <p className="text-xs text-gray-400">Systems Monitor</p>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center space-x-6">
              {/* Live Status */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
                <span className="text-sm text-gray-400">
                  Live • {locations.length} locations
                </span>
              </div>

              {/* Last Update */}
              <div className="text-xs text-gray-500">
                Last update: {lastRefresh.toLocaleTimeString()}
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="p-2 hover:bg-dark-elevated rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-dark-elevated rounded-lg transition-colors"
                  title="Toggle theme"
                >
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <SunIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                <button
                  className="p-2 hover:bg-dark-elevated rounded-lg transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5 text-gray-400" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full" />
                </button>

                <button
                  className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg font-medium transition-colors flex items-center space-x-2"
                  title="Add location"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-dark-surface border border-dark-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Locations</p>
                <p className="text-3xl font-bold font-mono mt-1">{locations.length}</p>
              </div>
              <Cloud className="w-8 h-8 text-primary opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-surface border border-dark-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Alerts</p>
                <p className="text-3xl font-bold font-mono mt-1 text-accent-green">
                  {locations.filter(l => l.alertsEnabled).length}
                </p>
              </div>
              <Bell className="w-8 h-8 text-accent-green opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-surface border border-dark-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Avg Temperature</p>
                <p className="text-3xl font-bold font-mono mt-1">
                  {locations.length > 0 
                    ? (locations.reduce((sum, l) => sum + (l.weather?.temp || 0), 0) / locations.length).toFixed(1)
                    : '0.0'
                  }°C
                </p>
              </div>
              <Zap className="w-8 h-8 text-accent-orange opacity-50" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-dark-surface border border-dark-border rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">System Status</p>
                <p className="text-lg font-bold text-accent-green mt-1">
                  Operational
                </p>
              </div>
              <Activity className="w-8 h-8 text-accent-green opacity-50" />
            </div>
          </motion.div>
        </div>

        {/* Weather Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading weather data...</p>
            </div>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-20">
            <Cloud className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No locations yet</h3>
            <p className="text-gray-500 mb-6">Add your first location to start monitoring weather</p>
            <button className="px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg font-medium transition-colors inline-flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Location</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {locations.map((location) => (
                <WeatherCard
                  key={`${location.locationName}-${location.country}`}
                  location={location}
                  weather={location.weather}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Weather Intelligence System v2.0</p>
            <p>Auto-refresh enabled • 30s interval</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
