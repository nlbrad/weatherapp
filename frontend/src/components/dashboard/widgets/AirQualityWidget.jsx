import React from 'react';

/**
 * AirQualityWidget - AQI score gauge with key pollutants
 */

const AirQualityWidget = ({ weather }) => {
  const airQuality = weather?.airQuality;
  if (!airQuality?.components) return <p className="text-slate-400 text-sm">Air quality unavailable</p>;

  const { components } = airQuality;
  const limits = { pm25: 15, pm10: 45, o3: 100, no2: 25, so2: 40, co: 4000 };
  const weights = { pm25: 0.35, pm10: 0.15, o3: 0.25, no2: 0.15, so2: 0.05, co: 0.05 };

  const score = Math.round(Math.max(0, Math.min(100,
    Object.keys(weights).reduce((sum, key) =>
      sum + Math.max(0, 100 - (components[key] / limits[key]) * 50) * weights[key], 0)
  )));

  const getRating = (s) => {
    if (s >= 80) return { label: 'Excellent', color: 'text-green-400', ring: 'stroke-green-400', advice: 'Perfect for outdoor activities' };
    if (s >= 60) return { label: 'Good', color: 'text-emerald-400', ring: 'stroke-emerald-400', advice: 'Great for outdoor activities' };
    if (s >= 40) return { label: 'Moderate', color: 'text-yellow-400', ring: 'stroke-yellow-400', advice: 'Fine for most people' };
    if (s >= 20) return { label: 'Poor', color: 'text-orange-400', ring: 'stroke-orange-400', advice: 'Sensitive groups take care' };
    return { label: 'Hazardous', color: 'text-red-500', ring: 'stroke-red-500', advice: 'Avoid outdoor activities' };
  };

  const rating = getRating(score);
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const getPollutantStatus = (val, lim) => {
    const ratio = val / lim;
    if (ratio <= 0.5) return { status: 'Low', color: 'text-green-400' };
    if (ratio <= 1) return { status: 'OK', color: 'text-emerald-400' };
    if (ratio <= 2) return { status: 'High', color: 'text-yellow-400' };
    return { status: 'V.High', color: 'text-red-400' };
  };

  const pollutants = [
    { name: 'PM2.5', value: components.pm25, limit: 15 },
    { name: 'O₃', value: components.o3, limit: 100 },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        {/* Score gauge */}
        <div className="relative flex-shrink-0">
          <svg width="76" height="76" className="transform -rotate-90">
            <circle cx="38" cy="38" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle cx="38" cy="38" r={r} fill="none" className={rating.ring}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${rating.color}`}>{score}</span>
            <span className="text-[9px] text-slate-500">/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${rating.color}`}>{rating.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{rating.advice}</p>
        </div>
      </div>

      {/* Key pollutants */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        {pollutants.map(p => {
          const status = getPollutantStatus(p.value, p.limit);
          return (
            <div key={p.name} className="bg-slate-800 rounded-lg px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">{p.name}</span>
                <span className={`text-[10px] font-bold ${status.color}`}>{status.status}</span>
              </div>
              <span className="text-sm font-bold text-white font-mono">{p.value.toFixed(1)}</span>
              <span className="text-[9px] text-slate-500 ml-0.5">µg/m³</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(AirQualityWidget);
