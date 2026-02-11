import React from 'react';

/**
 * UVIndexWidget - Current UV level with protection advice
 */

const getUVInfo = (uvi, isNight) => {
  if (isNight) return { level: 'None', color: 'text-slate-500', bg: 'bg-slate-800', advice: 'No UV at night' };
  if (uvi <= 2) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-500/10', advice: 'No protection needed' };
  if (uvi <= 5) return { level: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/10', advice: 'Wear sunscreen' };
  if (uvi <= 7) return { level: 'High', color: 'text-orange-400', bg: 'bg-orange-500/10', advice: 'Cover up & sunscreen' };
  if (uvi <= 10) return { level: 'Very High', color: 'text-red-400', bg: 'bg-red-500/10', advice: 'Avoid midday sun' };
  return { level: 'Extreme', color: 'text-purple-400', bg: 'bg-purple-500/10', advice: 'Stay indoors if possible' };
};

const UVIndexWidget = ({ weather, forecast }) => {
  const isNight = weather?.icon?.endsWith('n') || false;
  const uvi = isNight ? 0 : (forecast?.current?.uvi || forecast?.daily?.[0]?.uvi || 0);
  const info = getUVInfo(uvi, isNight);

  return (
    <div className={`h-full flex flex-col items-center justify-center text-center rounded-lg ${info.bg} p-2`}>
      <p className={`text-4xl font-bold font-mono ${info.color}`}>
        {uvi.toFixed(1)}
      </p>
      <p className={`text-sm font-semibold ${info.color} mt-1`}>{info.level}</p>
      <p className="text-xs text-slate-400 mt-2">{info.advice}</p>
    </div>
  );
};

export default React.memo(UVIndexWidget);
