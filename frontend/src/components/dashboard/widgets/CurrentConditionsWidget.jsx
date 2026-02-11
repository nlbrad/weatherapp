import React from 'react';
import { getWeatherEmoji } from './weatherFormatUtils';

/**
 * CurrentConditionsWidget - Primary conditions display
 * Shows temp, feels like, condition icon, hi/lo, and upcoming forecast
 */

const getWeatherIcon = getWeatherEmoji;

const getUpcomingForecast = (weather, forecast) => {
  if (!forecast?.hourly || forecast.hourly.length < 6) return null;
  const upcoming = forecast.hourly.slice(1, 7);
  const precipHours = upcoming.filter(h => h.pop > 0.3);

  if (precipHours.length > 0) {
    const avgTemp = upcoming.reduce((s, h) => s + h.temp, 0) / upcoming.length;
    const type = avgTemp <= 0 ? 'snow' : avgTemp <= 2 ? 'sleet' : 'rain';
    const hoursUntil = upcoming.findIndex(h => h.pop > 0.3) + 1;
    const icon = type === 'snow' ? '❄️' : '🌧️';
    return `${icon} ${type.charAt(0).toUpperCase() + type.slice(1)} in ~${hoursUntil * 3}h`;
  }

  const tempDiff = upcoming[5]?.temp - weather.temp;
  if (Math.abs(tempDiff) > 3) {
    return tempDiff > 0
      ? `📈 Warming to ${Math.round(upcoming[5]?.temp)}°`
      : `📉 Cooling to ${Math.round(upcoming[5]?.temp)}°`;
  }

  const c = weather.condition?.toLowerCase() || '';
  if (c.includes('clear')) return '✨ Staying clear';
  if (c.includes('cloud')) return '☁️ Clouds persisting';
  return '→ Conditions stable';
};

const CurrentConditionsWidget = ({ weather, forecast }) => {
  if (!weather) return <p className="text-slate-400 text-sm">No data</p>;

  const todayForecast = forecast?.daily?.[0];
  const upcoming = getUpcomingForecast(weather, forecast);

  return (
    <div className="h-full flex flex-col justify-between">
      {/* Main conditions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white font-mono">
              {weather.temp.toFixed(1)}°
            </span>
            <span className="text-lg text-slate-400">C</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Feels like {weather.feelsLike.toFixed(1)}°
          </p>
        </div>
        <div className="text-right">
          <span className="text-5xl">{getWeatherIcon(weather.condition, weather.icon)}</span>
          <p className="text-sm text-slate-300 capitalize mt-1">
            {weather.description || weather.condition}
          </p>
        </div>
      </div>

      {/* Hi/Lo + Extras */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
        {todayForecast && (
          <span className="text-sm font-mono text-slate-400">
            H:{Math.round(todayForecast.tempHigh)}° L:{Math.round(todayForecast.tempLow)}°
          </span>
        )}
        <span className="text-xs text-slate-500">
          👁 {weather.visibility}km
        </span>
        {upcoming && (
          <span className="text-xs text-cyan-400">{upcoming}</span>
        )}
      </div>
    </div>
  );
};

export default React.memo(CurrentConditionsWidget);
