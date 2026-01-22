import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Cloud, 
  Plus, 
  Moon, 
  Sun as SunIcon,
  Activity,
  Bell,
  Settings,
  RefreshCw,
  Zap,
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
  CloudRain,
  Sparkles
} from 'lucide-react';

/**
 * COMPLETE DASHBOARD MOCKUP - Phase 2 Final Vision
 * 
 * This is what your dashboard will look like when Phase 2 is complete!
 * 
 * Features Shown:
 * 1. Dark theme with multiple variants
 * 2. Live status indicators
 * 3. Stats overview cards
 * 4. Enhanced weather cards with:
 *    - Circular metric gauges (temp, humidity, wind)
 *    - Linear progress bars (pressure, visibility)
 *    - Status indicators (air quality, alerts)
 *    - Real-time updates
 * 5. Theme switcher
 * 6. Auto-refresh system
 */

// MetricGauge Component (simplified for mockup)
const MetricGauge = ({ label, value, min, max, unit, color, size = 'small' }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const radius = size === 'small' ? 40 : 55;
  const strokeWidth = size === 'small' ? 6 : 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    primary: 'stroke-primary',
    purple: 'stroke-accent-purple',
    green: 'stroke-accent-green',
    orange: 'stroke-accent-orange',
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className={`relative ${size === 'small' ? 'w-28 h-28' : 'w-36 h-36'}`}>
        <svg className="transform -rotate-90" width="100%" height="100%" viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}>
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-dark-border opacity-30"
          />
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={colorMap[color]}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              strokeDasharray: circumference,
              filter: 'drop-shadow(0 0 8px currentColor)',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div 
            className={`${size === 'small' ? 'text-2xl' : 'text-3xl'} font-bold font-mono text-white`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {value.toFixed(1)}
          </motion.div>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
      </div>
      <p className="text-xs font-medium text-gray-300 text-center">{label}</p>
    </div>
  );
};

// LinearMetric Component (simplified for mockup)
const LinearMetric = ({ label, value, min, max, unit, color, icon: Icon }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const colorMap = {
    primary: 'bg-primary',
    purple: 'bg-accent-purple',
    green: 'bg-accent-green',
    orange: 'bg-accent-orange',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <span className="text-sm font-mono font-bold text-white">{value}{unit}</span>
      </div>
      <div className="relative h-2 bg-dark-border rounded-full overflow-hidden">
        <motion.div
          className={`absolute left-0 top-0 h-full ${colorMap[color]} rounded-full shadow-lg`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
};

// StatusIndicator Component (simplified for mockup)
const StatusIndicator = ({ status, label, description }) => {
  const statusConfig = {
    excellent: { color: 'status-excellent', bg: 'bg-status-excellent/10', border: 'border-status-excellent/30', text: 'Excellent' },
    good: { color: 'status-good', bg: 'bg-status-good/10', border: 'border-status-good/30', text: 'Good' },
    moderate: { color: 'status-moderate', bg: 'bg-status-moderate/10', border: 'border-status-moderate/30', text: 'Moderate' },
  };

  const config = statusConfig[status];

  return (
    <div className={`px-4 py-3 rounded-lg border ${config.bg} ${config.border} backdrop-blur-sm`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-300">{label}</p>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${config.bg} text-${config.color} border ${config.border}`}>
          {config.text}
        </span>
      </div>
      {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    </div>
  );
};

// Main Dashboard Component
const DashboardMockup = () => {
  const [theme, setTheme] = useState('dark');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - simulating what your real data will look like
  const mockLocations = [
    {
      id: 1,
      locationName: 'Dublin',
      country: 'IE',
      weather: {
        temp: 12.5,
        feelsLike: 10.3,
        tempMin: 11.0,
        tempMax: 14.0,
        humidity: 82,
        pressure: 1013,
        condition: 'Clouds',
        description: 'broken clouds',
        wind: { speed: 4.5, direction: 230 }
      },
      alertsEnabled: true,
      minTemp: 5,
      maxTemp: 25
    },
    {
      id: 2,
      locationName: 'London',
      country: 'GB',
      weather: {
        temp: 9.0,
        feelsLike: 7.2,
        tempMin: 8.0,
        tempMax: 11.0,
        humidity: 75,
        pressure: 1015,
        condition: 'Clear',
        description: 'clear sky',
        wind: { speed: 3.2, direction: 180 }
      },
      alertsEnabled: false,
      minTemp: 0,
      maxTemp: 30
    },
    {
      id: 3,
      locationName: 'Paris',
      country: 'FR',
      weather: {
        temp: 14.2,
        feelsLike: 13.8,
        tempMin: 12.0,
        tempMax: 16.0,
        humidity: 68,
        pressure: 1018,
        condition: 'Rain',
        description: 'light rain',
        wind: { speed: 5.8, direction: 270 }
      },
      alertsEnabled: true,
      minTemp: 10,
      maxTemp: 30
    }
  ];

  const toggleTheme = () => {
    const themes = ['dark', 'midnight', 'aurora'];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const refreshData = () => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Auto-refresh every 30 seconds (simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg text-white transition-all duration-500">
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
                  Live • {mockLocations.length} locations
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
                <p className="text-3xl font-bold font-mono mt-1">{mockLocations.length}</p>
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
                  {mockLocations.filter(l => l.alertsEnabled).length}
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
                  {(mockLocations.reduce((sum, l) => sum + l.weather.temp, 0) / mockLocations.length).toFixed(1)}°C
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

        {/* Enhanced Weather Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mockLocations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden
                         hover:border-primary/30 transition-all duration-300
                         shadow-lg hover:shadow-primary/10"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-dark-elevated to-dark-surface px-6 py-4 border-b border-dark-border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <h3 className="text-xl font-bold text-white">
                        {location.locationName}
                      </h3>
                      <span className="text-sm text-gray-400 font-mono">
                        {location.country}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                        <span className="text-xs text-gray-400">
                          Live • Updated {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-dark-elevated rounded-lg transition-colors" title="Edit">
                      <Edit className="w-4 h-4 text-gray-400 hover:text-primary" />
                    </button>
                    <button className="p-2 hover:bg-dark-elevated rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4 text-gray-400 hover:text-accent-red" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6">
                {/* Primary Weather Display */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-4 bg-dark-elevated rounded-xl border border-dark-border">
                      {location.weather.condition === 'Rain' ? (
                        <CloudRain className="w-12 h-12 text-primary" />
                      ) : (
                        <Cloud className="w-12 h-12 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-5xl font-bold font-mono text-white">
                        {location.weather.temp.toFixed(1)}°
                      </p>
                      <p className="text-gray-400 text-sm mt-1 capitalize">
                        {location.weather.description}
                      </p>
                    </div>
                  </div>

                  {/* Feels Like */}
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Feels like</p>
                    <p className="text-3xl font-bold text-gray-300 font-mono">
                      {location.weather.feelsLike.toFixed(1)}°
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(location.weather.feelsLike - location.weather.temp).toFixed(1)}° difference
                    </p>
                  </div>
                </div>

                {/* Metric Gauges Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <MetricGauge
                    label="Temperature"
                    value={location.weather.temp}
                    min={location.weather.tempMin - 5}
                    max={location.weather.tempMax + 5}
                    unit="°C"
                    color="primary"
                    size="small"
                  />
                  <MetricGauge
                    label="Humidity"
                    value={location.weather.humidity}
                    min={0}
                    max={100}
                    unit="%"
                    color="purple"
                    size="small"
                  />
                  <MetricGauge
                    label="Wind"
                    value={location.weather.wind.speed}
                    min={0}
                    max={50}
                    unit="km/h"
                    color="green"
                    size="small"
                  />
                </div>

                {/* Linear Metrics */}
                <div className="space-y-4 mb-6">
                  <LinearMetric
                    label="Pressure"
                    value={location.weather.pressure}
                    min={980}
                    max={1040}
                    unit=" hPa"
                    color="orange"
                    icon={Gauge}
                  />
                  
                  <LinearMetric
                    label="Visibility"
                    value={10}
                    min={0}
                    max={10}
                    unit=" km"
                    color="primary"
                    icon={Eye}
                  />
                </div>

                {/* Status Indicators */}
                <div className="space-y-3">
                  <StatusIndicator
                    status={location.weather.humidity < 70 ? 'excellent' : 'good'}
                    label="Air Quality"
                    description={`Humidity: ${location.weather.humidity}% • Pressure: ${location.weather.pressure} hPa`}
                  />

                  {location.alertsEnabled && (
                    <StatusIndicator
                      status="good"
                      label="Alerts Active"
                      description={`${location.minTemp}°C - ${location.maxTemp}°C threshold`}
                    />
                  )}
                </div>

                {/* Additional Details */}
                <div className="mt-6 pt-6 border-t border-dark-border">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Compass className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Wind:</span>
                      <span className="text-white font-mono">
                        {location.weather.wind.direction}° {location.weather.wind.speed} km/h
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Range:</span>
                      <span className="text-white font-mono">
                        {location.weather.tempMin}° - {location.weather.tempMax}°
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Northern Lights Widget Preview (Phase 2.3) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-gradient-to-br from-accent-purple/10 to-primary/10 
                     border border-accent-purple/30 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-accent-purple" />
              <div>
                <h3 className="text-lg font-bold text-white">Northern Lights Forecast</h3>
                <p className="text-sm text-gray-400">Coming in Phase 2.3 ✨</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-full text-sm font-bold">
              Kp Index: 5
            </span>
          </div>
          <p className="text-gray-300 text-sm">
            Aurora visibility predictions for your locations • Real-time geomagnetic activity monitoring
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-dark-border bg-dark-surface">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Weather Intelligence System v2.0 - Phase 2 Complete</p>
            <p>Auto-refresh enabled • 30s interval</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardMockup;