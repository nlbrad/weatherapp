import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader, Cloud, RefreshCw, MapPin, Clock, Settings2, Check } from 'lucide-react';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useAuth } from '../auth';
import { locationsAPI, scoresAPI } from '../services/api';
import weatherCache from '../services/weatherCache';
import scoreCache from '../services/scoreCache';
import useDashboardLayout from '../hooks/useDashboardLayout';
import WidgetWrapper from '../components/dashboard/WidgetWrapper';
import WidgetCatalog from '../components/dashboard/WidgetCatalog';
import { WIDGET_REGISTRY, GRID_CONFIG } from '../components/dashboard/widgetRegistry';

/**
 * DashboardPage - Customizable widget-based dashboard for a location
 *
 * Route: /dashboard/:locationId
 */
const DashboardPage = () => {
  const { locationId } = useParams();
  const { getUserId } = useAuth();
  const userId = getUserId();

  const [location, setLocation] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [scoreData, setScoreData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const { ref: gridContainerRef, width: containerWidth } = useContainerWidth({ initialWidth: 1400 });

  const {
    layouts,
    enabledWidgets,
    isLoaded: layoutLoaded,
    handleLayoutChange,
    addWidget,
    removeWidget,
    resetLayout,
  } = useDashboardLayout(locationId, userId);

  // Parse locationId (format: "dublin-ie")
  const parseLocationId = (id) => {
    const parts = id.split('-');
    const country = parts.pop().toUpperCase();
    const name = parts.join('-').split('-').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1)
    ).join(' ');
    return { name, country };
  };

  // Load weather data
  const loadDashboard = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { name, country } = parseLocationId(locationId);

      const locationsData = await locationsAPI.getUserLocations(userId);
      const locationSettings = locationsData.locations.find(
        loc => loc.locationName.toLowerCase() === name.toLowerCase() &&
               loc.country === country
      );

      if (!locationSettings) {
        setError('Location not found');
        return;
      }

      if (!locationSettings.latitude || !locationSettings.longitude) {
        setError('Location missing coordinates. Please delete and re-add this location.');
        return;
      }

      const data = await weatherCache.get(
        locationSettings.latitude,
        locationSettings.longitude,
        { forceRefresh }
      );

      setLocation({
        locationName: locationSettings.locationName,
        country: locationSettings.country,
        latitude: locationSettings.latitude,
        longitude: locationSettings.longitude,
        alertsEnabled: locationSettings.alertsEnabled,
        minTemp: locationSettings.minTemp,
        maxTemp: locationSettings.maxTemp,
      });

      setWeatherData(data);
      setLastUpdated(new Date(data.fetchedAt));

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [locationId, userId]);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  // Fetch score data for enabled score-based widgets
  useEffect(() => {
    if (!location || !enabledWidgets.length) return;

    const scoreEndpoints = new Set();
    enabledWidgets.forEach(widgetId => {
      const config = WIDGET_REGISTRY[widgetId];
      if (config?.scoreEndpoint) {
        scoreEndpoints.add(config.scoreEndpoint);
      }
    });

    if (scoreEndpoints.size === 0) return;

    const fetchScores = async () => {
      const { latitude: lat, longitude: lon } = location;
      const fetchers = {
        aurora: () => scoresAPI.getAuroraScore(lat, lon),
        sky: () => scoresAPI.getSkyScore(lat, lon),
        outdoor: () => scoresAPI.getOutdoorScore(lat, lon),
        swimming: () => scoresAPI.getSwimmingScore(lat, lon),
      };

      const results = {};
      const promises = Array.from(scoreEndpoints).map(async (endpoint) => {
        try {
          const data = await scoreCache.get(endpoint, lat, lon, fetchers[endpoint]);
          results[endpoint] = data;
        } catch (e) {
          console.warn(`Failed to fetch ${endpoint} score:`, e);
          results[endpoint] = { error: true };
        }
      });

      await Promise.allSettled(promises);
      setScoreData(results);
    };

    fetchScores();
  }, [location, enabledWidgets]);

  // Transform weatherData for widget props
  const weather = useMemo(() => {
    if (!weatherData) return null;
    return {
      temp: weatherData.current.temp,
      feelsLike: weatherData.current.feelsLike,
      humidity: weatherData.current.humidity,
      pressure: weatherData.current.pressure,
      condition: weatherData.current.condition,
      description: weatherData.current.description,
      icon: weatherData.current.icon,
      visibility: (weatherData.current.visibility || 10000) / 1000,
      clouds: weatherData.current.clouds || 0,
      wind: {
        speed: weatherData.current.windSpeed || 0,
        direction: weatherData.current.windDeg || 0,
        gust: weatherData.current.windGust || 0,
      },
      airQuality: weatherData.airQuality,
    };
  }, [weatherData]);

  const forecast = useMemo(() => {
    if (!weatherData || !location) return null;
    return {
      current: {
        timezone: weatherData.timezone,
        sunrise: weatherData.current.sunrise,
        sunset: weatherData.current.sunset,
        uvi: weatherData.current.uvi,
        dew_point: weatherData.current.dew_point,
        clouds: weatherData.current.clouds,
      },
      hourly: weatherData.hourly.map(h => ({
        time: h.dt,
        temp: h.temp,
        feelsLike: h.feelsLike,
        humidity: h.humidity,
        pressure: h.pressure,
        clouds: h.clouds,
        pop: h.pop,
        rain: h.rain,
        snow: h.snow,
        condition: h.condition,
        description: h.description,
        icon: h.icon,
        windSpeed: h.windSpeed,
        windDeg: h.windDeg,
      })),
      daily: weatherData.daily.map(d => ({
        date: d.dt,
        tempHigh: d.tempMax,
        tempLow: d.tempMin,
        tempMorn: d.tempMorn,
        tempDay: d.tempDay,
        tempEve: d.tempEve,
        tempNight: d.tempNight,
        feelsLikeDay: d.feelsLikeDay,
        feelsLikeNight: d.feelsLikeNight,
        humidity: d.humidity,
        pressure: d.pressure,
        clouds: d.clouds,
        windSpeed: d.windSpeed,
        windDeg: d.windDeg,
        pop: d.pop,
        rain: d.rain,
        snow: d.snow,
        condition: d.condition,
        description: d.description,
        icon: d.icon,
        uvi: d.uvi,
        sunrise: d.sunrise,
        sunset: d.sunset,
        moonrise: d.moonrise,
        moonset: d.moonset,
        moonPhase: d.moonPhase,
      })),
      alerts: weatherData.alerts || [],
      location: { lat: location.latitude, lon: location.longitude },
    };
  }, [weatherData, location]);

  // Get props for a specific widget based on its data requirements
  const getWidgetProps = useCallback((widgetId) => {
    const config = WIDGET_REGISTRY[widgetId];
    if (!config) return {};

    const props = {};
    if (config.dataRequirements.includes('weather')) props.weather = weather;
    if (config.dataRequirements.includes('forecast')) props.forecast = forecast;
    if (config.dataRequirements.includes('location') && location) {
      props.location = {
        lat: location.latitude,
        lon: location.longitude,
        name: location.locationName,
      };
    }
    if (config.dataRequirements.includes('scores') && config.scoreEndpoint) {
      props.scoreData = scoreData[config.scoreEndpoint] || null;
    }
    return props;
  }, [weather, forecast, location, scoreData]);

  // Loading state
  if (loading || !layoutLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !location || !weatherData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Cloud className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {error || 'Location not found'}
          </h2>
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 mt-4 text-cyan-400 hover:text-cyan-300 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Locations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Location header bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/locations"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">
                {location.locationName}, {location.country}
              </h2>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date().toLocaleTimeString('en-IE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                  timeZone: forecast?.current?.timezone || 'UTC',
                })}
                {' '}
                {new Date().toLocaleDateString('en-IE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  timeZone: forecast?.current?.timezone || 'UTC',
                })}
              </span>
              {lastUpdated && (
                <span className="text-slate-600 text-xs">
                  Updated {Math.round((Date.now() - lastUpdated.getTime()) / 60000)} min ago
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Customize / Done button */}
          <button
            onClick={() => {
              if (isEditing) {
                setIsEditing(false);
                setCatalogOpen(false);
              } else {
                setIsEditing(true);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isEditing
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Done
              </>
            ) : (
              <>
                <Settings2 className="w-3.5 h-3.5" />
                Customize
              </>
            )}
          </button>

          {/* Add widgets button (visible in edit mode) */}
          {isEditing && (
            <button
              onClick={() => setCatalogOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
            >
              + Add Widgets
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {enabledWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <Cloud className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Your dashboard is empty</h3>
          <p className="text-slate-400 text-sm mb-4">Add widgets to customize your dashboard</p>
          <button
            onClick={() => { setIsEditing(true); setCatalogOpen(true); }}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
          >
            + Add Widgets
          </button>
        </div>
      )}

      {/* Widget Grid */}
      <div ref={gridContainerRef}>
        {enabledWidgets.length > 0 && layouts && containerWidth > 0 && (
          <ResponsiveGridLayout
            className="dashboard-grid"
            width={containerWidth}
            layouts={layouts}
            breakpoints={GRID_CONFIG.breakpoints}
            cols={GRID_CONFIG.cols}
            rowHeight={GRID_CONFIG.rowHeight}
            margin={GRID_CONFIG.margin}
            draggableHandle=".widget-drag-handle"
            isDraggable={isEditing}
            isResizable={isEditing}
            onLayoutChange={handleLayoutChange}
            useCSSTransforms={true}
            compactType="vertical"
          >
            {enabledWidgets.map(widgetId => {
              const config = WIDGET_REGISTRY[widgetId];
              if (!config) return null;

              const WidgetComponent = config.component;
              const widgetProps = getWidgetProps(widgetId);
              const isScoreWidget = config.dataRequirements.includes('scores');
              const scoreLoading = isScoreWidget && !scoreData[config.scoreEndpoint];

              return (
                <div
                  key={widgetId}
                  data-grid={{
                    minW: config.minSize.w,
                    minH: config.minSize.h,
                    maxW: config.maxSize.w,
                    maxH: config.maxSize.h,
                  }}
                >
                  <WidgetWrapper
                    id={widgetId}
                    title={config.name}
                    icon={config.icon}
                    isEditing={isEditing}
                    onRemove={removeWidget}
                    loading={scoreLoading}
                  >
                    <WidgetComponent {...widgetProps} />
                  </WidgetWrapper>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
      )}

      {/* Widget Catalog Drawer */}
      {catalogOpen && (
        <WidgetCatalog
          enabledWidgets={enabledWidgets}
          onAddWidget={addWidget}
          onRemoveWidget={removeWidget}
          onReset={resetLayout}
          onClose={() => setCatalogOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardPage;
