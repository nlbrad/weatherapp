import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  getWeatherEmoji, getTempColor, getPrecipColor,
  getWindInfo, getWindDir, formatDay, formatDate,
} from './weatherFormatUtils';

/**
 * TemperatureForecastWidget - 7-day forecast with temperature range bars
 *
 * Row-per-day table layout showing: condition, temperature range bar,
 * precipitation, wind, and humidity for each day.
 */

const TemperatureForecastWidget = ({ forecast }) => {
  const containerRef = useRef(null);
  const [isNarrow, setIsNarrow] = useState(false);

  // Detect narrow mode when width is limited
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setIsNarrow(entry.contentRect.width < 400);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  if (!forecast?.daily) {
    return <p className="text-slate-400 text-sm">No forecast data</p>;
  }

  const tz = forecast.current?.timezone || 'UTC';

  // Prepare 7 days of data
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const days = useMemo(() => {
    return forecast.daily.map((d, i) => ({
      dayLabel: i === 0 ? 'Today' : formatDay(d.date, tz),
      dateLabel: formatDate(d.date, tz),
      emoji: getWeatherEmoji(d.condition, d.icon),
      condition: d.description || d.condition,
      high: Math.round(d.tempHigh),
      low: Math.round(d.tempLow),
      pop: d.pop || 0,
      popPct: Math.round((d.pop || 0) * 100),
      rain: d.rain || 0,
      snow: d.snow || 0,
      windSpeed: Math.round(d.windSpeed || 0),
      windDir: getWindDir(d.windDeg || 0),
      humidity: d.humidity,
      uvi: d.uvi || 0,
    }));
  }, [forecast.daily, tz]);

  // Week's overall temperature range (for bar positioning)
  const weekMin = Math.min(...days.map(d => d.low));
  const weekMax = Math.max(...days.map(d => d.high));
  const weekRange = weekMax - weekMin || 1;

  // Summary insights
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const summary = useMemo(() => {
    const rainyDays = days.filter(d => d.pop > 0.3);
    const rainSummary = rainyDays.length > 0
      ? rainyDays.map(d => d.dayLabel).join(', ')
      : null;
    const totalRain = days.reduce((s, d) => s + d.rain, 0);
    const totalSnow = days.reduce((s, d) => s + d.snow, 0);
    const peakUV = Math.max(...days.map(d => d.uvi));
    const peakUVDay = days.find(d => d.uvi === peakUV);
    return { rainSummary, totalRain, totalSnow, peakUV, peakUVDay };
  }, [days]);

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-1.5 text-[10px] flex-wrap">
        <span className="text-slate-400">7-day outlook</span>
        <span className="font-mono text-white font-semibold">
          {weekMin}° – {weekMax}°
        </span>
        {summary.rainSummary && (
          <span className="text-blue-400">
            🌧️ {summary.rainSummary}
            {summary.totalRain > 0 && ` · ${summary.totalRain.toFixed(1)}mm`}
          </span>
        )}
        {summary.totalSnow > 0 && (
          <span className="text-indigo-300">
            ❄️ {summary.totalSnow.toFixed(1)}cm
          </span>
        )}
        {summary.peakUV >= 6 && (
          <span className="text-orange-400">
            ☀️ UV {Math.round(summary.peakUV)} {summary.peakUVDay?.dayLabel}
          </span>
        )}
      </div>

      {/* Day rows */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {days.map((d, i) => {
          const barLeft = ((d.low - weekMin) / weekRange) * 100;
          const barWidth = ((d.high - d.low) / weekRange) * 100;
          const isToday = i === 0;

          return (
            <div
              key={i}
              className={`
                flex items-center gap-1.5 px-1 py-[5px]
                border-b border-slate-800/30 last:border-b-0
                ${isToday ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/40' : 'border-l-2 border-l-transparent'}
              `}
            >
              {/* Day + Date */}
              <div className="w-[44px] flex-shrink-0">
                <span className={`text-[11px] font-medium block leading-tight
                  ${isToday ? 'text-cyan-400' : 'text-slate-300'}`}>
                  {d.dayLabel}
                </span>
                <span className="text-[9px] text-slate-600 leading-tight block">
                  {d.dateLabel}
                </span>
              </div>

              {/* Emoji */}
              <span className="text-sm flex-shrink-0 w-5 text-center">{d.emoji}</span>

              {/* Lo temp */}
              <span
                className="text-[11px] font-mono font-semibold w-[26px] text-right flex-shrink-0"
                style={{ color: getTempColor(d.low) }}
              >
                {d.low}°
              </span>

              {/* Temperature range bar */}
              <div className="flex-1 min-w-[50px] h-[6px] bg-slate-800 rounded-full relative mx-0.5">
                <div
                  className="absolute h-full rounded-full"
                  style={{
                    left: `${barLeft}%`,
                    width: `${Math.max(barWidth, 6)}%`,
                    background: `linear-gradient(to right, ${getTempColor(d.low)}, ${getTempColor(d.high)})`,
                  }}
                />
              </div>

              {/* Hi temp */}
              <span
                className="text-[11px] font-mono font-bold w-[26px] flex-shrink-0"
                style={{ color: getTempColor(d.high) }}
              >
                {d.high}°
              </span>

              {/* Precipitation */}
              <div className="w-[38px] flex-shrink-0 text-right">
                {d.rain > 0 ? (
                  <span className="text-[10px] font-mono text-blue-400 font-semibold">
                    {d.rain.toFixed(1)}mm
                  </span>
                ) : d.snow > 0 ? (
                  <span className="text-[10px] font-mono text-indigo-300 font-semibold">
                    {d.snow.toFixed(1)}cm
                  </span>
                ) : d.popPct > 20 ? (
                  <span className="text-[10px] font-mono" style={{ color: getPrecipColor(d.pop) }}>
                    {d.popPct}%
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-700">—</span>
                )}
              </div>

              {/* Wind (hidden in narrow mode) */}
              {!isNarrow && (
                <div className="w-[36px] flex-shrink-0 text-right">
                  <span
                    className="text-[10px] font-mono leading-none"
                    style={{ color: getWindInfo(d.windSpeed).color }}
                  >
                    {d.windSpeed}
                  </span>
                  <span className="text-[8px] text-slate-600 ml-0.5">
                    {d.windDir}
                  </span>
                </div>
              )}

              {/* Humidity (hidden in narrow mode) */}
              {!isNarrow && (
                <span className="text-[10px] font-mono text-slate-500 w-[28px] text-right flex-shrink-0">
                  {d.humidity}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(TemperatureForecastWidget);
