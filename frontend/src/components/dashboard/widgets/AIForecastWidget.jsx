/**
 * AIForecastWidget - AI-powered weather briefing
 * 
 * Displays a natural language weather forecast written in the style
 * of Met Éireann or BBC Weather. The briefing is flowing prose —
 * no bullet points or rigid sections.
 * 
 * Props (from DashboardPage via widgetRegistry dataRequirements):
 *   - weather: current conditions object
 *   - forecast: hourly + daily forecast object
 *   - location: { lat, lon } coordinates
 * 
 * Features:
 *   - Auto-generates briefing on mount
 *   - 60-minute client-side cache (backend also caches)
 *   - Manual refresh button
 *   - Clean prose display with paragraph spacing
 *   - Fallback display if AI is unavailable
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, Clock, AlertCircle } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

// =====================================================
// CLIENT-SIDE CACHE
// Avoids re-fetching when switching pages and coming
// back to the dashboard within the same session.
// The backend has its own 60-minute cache too, so even
// if this expires, the backend won't re-call OpenAI.
// =====================================================

const clientCache = {
  data: null,
  key: null,
  timestamp: null,
};
const CLIENT_CACHE_MS = 60 * 60 * 1000; // 60 minutes

// =====================================================
// MAIN COMPONENT
// =====================================================

const AIForecastWidget = ({ weather, forecast, location }) => {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const fetchedRef = useRef(false);

  // Cache key based on location — refetches if you switch locations
  const cacheKey = location ? `${location.lat?.toFixed(2)}_${location.lon?.toFixed(2)}` : null;

  // ================================
  // FETCH BRIEFING
  // Called automatically on mount and manually via refresh button.
  // 
  // The widget sends the weather data it already has (from the
  // dashboard's existing API call) to our backend. The backend
  // then forwards it to Azure OpenAI with the forecaster prompt.
  // This means NO extra weather API calls — just one OpenAI call.
  // ================================
  const fetchBriefing = useCallback(async (forceRefresh = false) => {
    if (!weather || !forecast || !location) return;

    // Check client-side cache first
    if (!forceRefresh && clientCache.key === cacheKey && clientCache.data &&
        Date.now() - clientCache.timestamp < CLIENT_CACHE_MS) {
      setBriefing(clientCache.data.briefing);
      setGeneratedAt(clientCache.data.generatedAt);
      setIsCached(true);
      setIsFallback(clientCache.data.fallback || false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/ai-forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current: {
            temp: weather.temp,
            feelsLike: weather.feelsLike,
            humidity: weather.humidity,
            pressure: weather.pressure,
            description: weather.description,
            condition: weather.condition,
            clouds: weather.clouds,
            uvi: forecast.current?.uvi,
            windSpeed: weather.wind?.speed || 0,
            windGust: weather.wind?.gust || 0,
            windDeg: weather.wind?.direction || 0,
            visibility: weather.visibility,
          },
          hourly: (forecast.hourly || []).slice(0, 24).map(h => ({
            dt: h.time,
            temp: h.temp,
            feelsLike: h.feelsLike,
            humidity: h.humidity,
            pop: h.pop,
            rain: h.rain || 0,
            condition: h.condition,
            description: h.description,
            windSpeed: h.windSpeed,
            windDeg: h.windDeg,
          })),
          daily: (forecast.daily || []).slice(0, 3).map(d => ({
            dt: d.date,
            tempMax: d.tempHigh,
            tempMin: d.tempLow,
            pop: d.pop,
            rain: d.rain || 0,
            condition: d.condition,
            description: d.description,
            windSpeed: d.windSpeed,
            uvi: d.uvi,
            sunrise: d.sunrise,
            sunset: d.sunset,
          })),
          location: { lat: location.lat, lon: location.lon },
          forceRefresh,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      setBriefing(data.briefing);
      setGeneratedAt(data.generatedAt);
      setIsCached(data.cached || false);
      setIsFallback(data.fallback || false);

      // Update client cache
      clientCache.data = data;
      clientCache.key = cacheKey;
      clientCache.timestamp = Date.now();

    } catch (err) {
      console.error('AI Forecast error:', err);
      setError('Unable to generate forecast briefing.');
    } finally {
      setLoading(false);
    }
  }, [weather, forecast, location, cacheKey]);

  // Auto-fetch on mount (once)
  useEffect(() => {
    if (!fetchedRef.current && weather && forecast && location) {
      fetchedRef.current = true;
      fetchBriefing(false);
    }
  }, [weather, forecast, location, fetchBriefing]);

  // Reset if location changes
  useEffect(() => {
    fetchedRef.current = false;
  }, [cacheKey]);

  // ================================
  // Split briefing into paragraphs for rendering.
  // The AI returns plain text with \n\n between paragraphs.
  // ================================
  const paragraphs = briefing
    ? briefing.split(/\n\n+/).filter(p => p.trim())
    : [];

  // ================================
  // RENDER: Loading
  // ================================
  if (loading && !briefing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse mb-2" />
        <p className="text-sm text-slate-400">Writing forecast...</p>
        <p className="text-[10px] text-slate-600 mt-1">Analysing conditions</p>
      </div>
    );
  }

  // ================================
  // RENDER: Error
  // ================================
  if (error && !briefing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-5 h-5 text-red-400/70 mb-2" />
        <p className="text-sm text-slate-400">{error}</p>
        <button
          onClick={() => fetchBriefing(true)}
          className="mt-3 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 
                     text-cyan-400 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  // ================================
  // RENDER: Waiting for data
  // ================================
  if (!briefing) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <Sparkles className="w-5 h-5 text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Waiting for weather data...</p>
      </div>
    );
  }

  // ================================
  // RENDER: The forecast briefing
  // 
  // Designed for readability — like reading a forecast
  // on a news site. Clean typography, good line height,
  // subtle paragraph spacing. The content does the talking.
  // ================================
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Metadata bar — timestamp and refresh */}
      <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0 border-b border-slate-800/50 mb-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-600">
          {generatedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {new Date(generatedAt).toLocaleTimeString('en-IE', {
                hour: '2-digit', minute: '2-digit', hour12: false
              })}
            </span>
          )}
          {isFallback && (
            <span className="text-amber-500/60">basic mode</span>
          )}
        </div>
        <button
          onClick={() => fetchBriefing(true)}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-500 
                     hover:text-cyan-400 hover:bg-slate-800/50 rounded transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
          title="Regenerate forecast"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Updating' : 'Refresh'}
        </button>
      </div>

      {/* Forecast prose — scrollable */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        <div className="space-y-3 px-1">
          {paragraphs.map((paragraph, idx) => (
            <p
              key={idx}
              className="text-[13px] text-slate-300 leading-relaxed"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(AIForecastWidget);