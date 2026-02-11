import React from 'react';

/**
 * PressureTrendWidget - Pressure, visibility, dew point
 */

const PressureTrendWidget = ({ weather }) => {
  if (!weather) return <p className="text-slate-400 text-sm">No data</p>;

  const pressure = weather.pressure;
  const pressureStatus = pressure > 1020 ? { label: 'High (Fair)', color: 'text-green-400' }
    : pressure < 1010 ? { label: 'Low (Unsettled)', color: 'text-yellow-400' }
    : { label: 'Normal', color: 'text-slate-300' };

  const vis = weather.visibility || 10;
  const visLabel = vis >= 10 ? 'Clear' : vis >= 5 ? 'Good' : vis >= 2 ? 'Moderate' : 'Poor';

  return (
    <div className="h-full flex flex-col justify-center space-y-3">
      {/* Pressure */}
      <div>
        <p className="text-[10px] text-slate-500 mb-0.5">Pressure</p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-white font-mono">{pressure}</span>
          <span className="text-xs text-slate-500">hPa</span>
        </div>
        <p className={`text-[10px] ${pressureStatus.color}`}>{pressureStatus.label}</p>
      </div>

      {/* Visibility */}
      <div>
        <p className="text-[10px] text-slate-500 mb-0.5">Visibility</p>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-white font-mono">{vis}</span>
          <span className="text-xs text-slate-500">km</span>
          <span className="text-xs text-slate-400 ml-1">{visLabel}</span>
        </div>
      </div>

      {/* Clouds */}
      <div>
        <p className="text-[10px] text-slate-500 mb-0.5">Cloud cover</p>
        <span className="text-sm font-bold text-white font-mono">{weather.clouds}%</span>
      </div>
    </div>
  );
};

export default React.memo(PressureTrendWidget);
