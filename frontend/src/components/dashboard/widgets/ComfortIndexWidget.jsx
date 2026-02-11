import React from 'react';

/**
 * ComfortIndexWidget - Feels-like, humidity, and comfort level
 */

const getComfortLevel = (feelsLike, humidity) => {
  if (feelsLike >= 15 && feelsLike <= 25 && humidity < 70) return { label: 'Comfortable', color: 'text-green-400', icon: '😊' };
  if (feelsLike >= 10 && feelsLike <= 30 && humidity < 80) return { label: 'Acceptable', color: 'text-emerald-400', icon: '🙂' };
  if (feelsLike < 5) return { label: 'Cold', color: 'text-blue-400', icon: '🥶' };
  if (feelsLike < 10) return { label: 'Chilly', color: 'text-cyan-400', icon: '😬' };
  if (feelsLike > 35) return { label: 'Hot', color: 'text-red-400', icon: '🥵' };
  if (feelsLike > 30) return { label: 'Warm', color: 'text-orange-400', icon: '😅' };
  if (humidity > 85) return { label: 'Humid', color: 'text-yellow-400', icon: '💦' };
  return { label: 'Fair', color: 'text-slate-300', icon: '😐' };
};

const ComfortIndexWidget = ({ weather }) => {
  if (!weather) return <p className="text-slate-400 text-sm">No data</p>;

  const comfort = getComfortLevel(weather.feelsLike, weather.humidity);
  const tempDiff = weather.temp - weather.feelsLike;

  return (
    <div className="h-full flex flex-col items-center justify-center text-center">
      <span className="text-3xl mb-1">{comfort.icon}</span>
      <p className={`text-sm font-bold ${comfort.color}`}>{comfort.label}</p>

      <div className="mt-3 space-y-1 w-full">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Feels like</span>
          <span className="text-white font-mono font-bold">{weather.feelsLike.toFixed(1)}°</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Humidity</span>
          <span className="text-white font-mono">{weather.humidity}%</span>
        </div>
        {Math.abs(tempDiff) > 1 && (
          <p className="text-[10px] text-slate-500 mt-1">
            {tempDiff > 0 ? `Wind chill: ${tempDiff.toFixed(1)}° colder` : `Heat index: ${Math.abs(tempDiff).toFixed(1)}° warmer`}
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(ComfortIndexWidget);
