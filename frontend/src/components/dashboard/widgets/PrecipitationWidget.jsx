import React from 'react';

/**
 * PrecipitationWidget - Rain probability timeline for next 24 hours
 */

const PrecipitationWidget = ({ forecast }) => {
  if (!forecast?.hourly) return <p className="text-slate-400 text-sm">No data</p>;

  const timezone = forecast.current?.timezone || 'UTC';
  const hours = forecast.hourly.slice(0, 24).map(h => ({
    time: new Date(h.time).toLocaleTimeString('en-US', {
      hour: '2-digit', hour12: false, timeZone: timezone
    }),
    pop: Math.round(h.pop * 100),
    rain: h.rain || 0,
  }));

  const maxPop = Math.max(...hours.map(h => h.pop), 1);
  const totalRain = hours.reduce((s, h) => s + h.rain, 0);

  const getBarColor = (pop) => {
    if (pop <= 20) return 'bg-green-500/60';
    if (pop <= 50) return 'bg-blue-400/60';
    if (pop <= 75) return 'bg-blue-500/80';
    return 'bg-purple-500/80';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Next 24 hours</span>
        {totalRain > 0 && (
          <span className="text-xs text-blue-400">💧 {totalRain.toFixed(1)}mm total</span>
        )}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 flex-1 min-h-0">
        {hours.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full flex flex-col items-center justify-end flex-1 min-h-0">
              {h.pop > 0 && (
                <span className="text-[9px] text-slate-400 mb-0.5">{h.pop}%</span>
              )}
              <div className="w-full relative" style={{ height: `${Math.max((h.pop / maxPop) * 100, h.pop > 0 ? 8 : 0)}%` }}>
                <div className={`absolute inset-0 rounded-t ${getBarColor(h.pop)}`} />
              </div>
            </div>
            <span className="text-[9px] text-slate-500 mt-1 leading-none">{h.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(PrecipitationWidget);
