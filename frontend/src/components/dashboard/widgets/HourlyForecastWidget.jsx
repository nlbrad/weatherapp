import React, { useRef, useMemo, useState, useEffect } from 'react';
import {
  getWeatherEmoji, getTempColor, getPrecipColor,
  getWindInfo, getWindDir, formatHour,
} from './weatherFormatUtils';

/**
 * HourlyForecastWidget - 24-hour scrollable forecast strip
 *
 * Shows every hour for the next 24 hours as vertical mini-columns with:
 * time, weather emoji, temperature, feels-like, precipitation, wind, humidity
 */

const HourlyForecastWidget = ({ forecast }) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [compact, setCompact] = useState(false);

  // Detect compact mode when height is limited
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.height < 220);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!forecast?.hourly) {
    return <p className="text-slate-400 text-sm">No hourly data</p>;
  }

  const tz = forecast.current?.timezone || 'UTC';

  // Prepare 24 hours of data
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const hours = useMemo(() => {
    return forecast.hourly.slice(0, 24).map((h, i) => ({
      time: formatHour(h.time, tz),
      isNow: i === 0,
      emoji: getWeatherEmoji(h.condition, h.icon),
      temp: Math.round(h.temp),
      feelsLike: Math.round(h.feelsLike),
      showFeelsLike: Math.abs(h.temp - h.feelsLike) > 2,
      pop: h.pop || 0,
      popPct: Math.round((h.pop || 0) * 100),
      rain: h.rain || 0,
      snow: h.snow || 0,
      windSpeed: Math.round(h.windSpeed || 0),
      windDir: getWindDir(h.windDeg || 0),
      humidity: h.humidity,
    }));
  }, [forecast.hourly, tz]);

  // Summary insights
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const summary = useMemo(() => {
    const temps = hours.map(h => h.temp);
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);

    // Find rain window
    const firstRainIdx = hours.findIndex(h => h.pop > 0.3);
    const lastRainIdx = firstRainIdx >= 0
      ? hours.length - 1 - [...hours].reverse().findIndex(h => h.pop > 0.3)
      : -1;
    const rainStart = firstRainIdx >= 0 ? hours[firstRainIdx].time : null;
    const rainEnd = lastRainIdx >= 0 ? hours[lastRainIdx].time : null;

    // Total precipitation
    const totalRain = hours.reduce((s, h) => s + h.rain, 0);
    const totalSnow = hours.reduce((s, h) => s + h.snow, 0);

    // Peak wind
    const peakWind = Math.max(...hours.map(h => h.windSpeed));

    return { minT, maxT, rainStart, rainEnd, totalRain, totalSnow, peakWind };
  }, [hours]);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-2 text-[10px] flex-wrap">
        <span className="text-slate-400">Next 24h</span>
        <span className="font-mono text-white font-semibold">
          {summary.minT}° – {summary.maxT}°
        </span>
        {summary.rainStart && (
          <span className="text-blue-400">
            🌧️ {summary.rainStart}–{summary.rainEnd}
            {summary.totalRain > 0 && ` · ${summary.totalRain.toFixed(1)}mm`}
          </span>
        )}
        {summary.totalSnow > 0 && (
          <span className="text-indigo-300">
            ❄️ {summary.totalSnow.toFixed(1)}cm
          </span>
        )}
        {summary.peakWind >= 30 && (
          <span className="text-amber-400">
            💨 {summary.peakWind}km/h
          </span>
        )}
      </div>

      {/* Scrollable hour strip */}
      <div className="flex-1 overflow-hidden relative">
        {/* Right fade mask */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-slate-900/80 to-transparent z-10 pointer-events-none" />

        <div
          ref={scrollRef}
          className="h-full overflow-x-auto overflow-y-hidden"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}
        >
          <div className="flex h-full">
            {hours.map((h, i) => (
              <div
                key={i}
                className={`
                  flex flex-col items-center justify-start px-1.5 py-1 min-w-[50px]
                  border-r border-slate-800/30 last:border-r-0 flex-shrink-0
                  ${h.isNow ? 'bg-cyan-500/5' : ''}
                  ${h.pop > 0.5 ? 'bg-blue-500/5' : ''}
                `}
              >
                {/* Time */}
                <span className={`text-[10px] font-mono leading-none mb-1
                  ${h.isNow ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                  {h.isNow ? 'NOW' : h.time}
                </span>

                {/* Weather emoji */}
                <span className="text-sm leading-none mb-1">{h.emoji}</span>

                {/* Temperature */}
                <span
                  className="text-xs font-bold font-mono leading-none"
                  style={{ color: getTempColor(h.temp) }}
                >
                  {h.temp}°
                </span>

                {/* Feels-like (conditional) */}
                {!compact && h.showFeelsLike && (
                  <span className="text-[9px] text-slate-500 leading-none mt-0.5">
                    ~{h.feelsLike}°
                  </span>
                )}

                {/* Precip section */}
                <div className="w-full mt-1.5 mb-0.5">
                  {/* Mini precip bar */}
                  <div className="h-[3px] w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(h.pop * 100, h.pop > 0 ? 10 : 0)}%`,
                        backgroundColor: getPrecipColor(h.pop),
                      }}
                    />
                  </div>
                  {h.popPct > 10 && (
                    <span className="text-[9px] font-mono text-blue-400 leading-none block text-center mt-0.5">
                      {h.popPct}%
                    </span>
                  )}
                  {h.rain > 0 && (
                    <span className="text-[8px] font-mono text-blue-300 font-semibold leading-none block text-center">
                      {h.rain.toFixed(1)}
                    </span>
                  )}
                  {h.snow > 0 && !h.rain && (
                    <span className="text-[8px] font-mono text-indigo-300 font-semibold leading-none block text-center">
                      {h.snow.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Wind */}
                <div className="text-center mt-auto">
                  <span
                    className="text-[9px] font-mono leading-none block"
                    style={{ color: getWindInfo(h.windSpeed).color }}
                  >
                    {h.windSpeed}
                  </span>
                  <span className="text-[8px] text-slate-600 leading-none block">
                    {h.windDir}
                  </span>
                </div>

                {/* Humidity */}
                {!compact && (
                  <span className="text-[8px] font-mono text-slate-600 leading-none mt-0.5">
                    {h.humidity}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(HourlyForecastWidget);
