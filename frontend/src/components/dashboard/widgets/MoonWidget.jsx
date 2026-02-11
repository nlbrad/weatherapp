import React from 'react';

/**
 * MoonWidget - Phase, illumination, rise/set times
 */

const getMoonPhase = () => {
  const date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();
  if (month < 3) { year--; month += 12; }
  month++;
  let jd = (365.25 * year) + (30.6 * month) + day - 694039.09;
  jd /= 29.5305882;
  jd -= parseInt(jd);
  let b = Math.round(jd * 8);
  if (b >= 8) b = 0;

  return {
    phase: b,
    illumination: Math.abs(jd < 0.5 ? jd * 2 : (1 - jd) * 2),
    name: ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous',
           'Full Moon','Waning Gibbous','Last Quarter','Waning Crescent'][b],
    emoji: ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][b],
  };
};

const MoonWidget = ({ forecast }) => {
  const moonPhase = getMoonPhase();
  const timezone = forecast?.current?.timezone || 'UTC';
  const today = forecast?.daily?.[0];
  const moonrise = today?.moonrise ? new Date(today.moonrise) : null;
  const moonset = today?.moonset ? new Date(today.moonset) : null;

  const fmt = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Phase display */}
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <span className="text-5xl">{moonPhase.emoji}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{moonPhase.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="text-white font-bold">{Math.round(moonPhase.illumination * 100)}%</span> illuminated
          </p>
        </div>
      </div>

      {/* Rise/Set times */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Moonrise</p>
          <p className="text-sm font-bold text-white font-mono">{fmt(moonrise)}</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500 mb-0.5">Moonset</p>
          <p className="text-sm font-bold text-white font-mono">{fmt(moonset)}</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MoonWidget);
