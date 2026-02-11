import React from 'react';

/**
 * SunWidget - Sunrise, sunset times with sun arc visualization
 */

const SunWidget = ({ forecast }) => {
  if (!forecast?.current || !forecast?.daily?.[0]) {
    return <p className="text-slate-400 text-sm">Sun data unavailable</p>;
  }

  const today = forecast.daily[0];
  const timezone = forecast.current?.timezone || 'UTC';
  const sunrise = new Date(today.sunrise);
  const sunset = new Date(today.sunset);
  const now = new Date();

  const dayLengthMs = sunset - sunrise;
  const dayH = Math.floor(dayLengthMs / 3600000);
  const dayM = Math.floor((dayLengthMs % 3600000) / 60000);

  const sunProgress = now >= sunrise && now <= sunset
    ? (now - sunrise) / (sunset - sunrise) : now < sunrise ? 0 : 1;
  const isDaytime = now >= sunrise && now <= sunset;

  const fmt = (date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone
  });

  return (
    <div className="h-full flex flex-col">
      {/* Sun arc */}
      <div className="relative h-24 mb-2">
        <svg className="w-full h-full" viewBox="0 0 200 90">
          <defs>
            <linearGradient id="sunArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <line x1="20" y1="75" x2="180" y2="75" stroke="#334155" strokeWidth="1" strokeDasharray="4,4" />
          <path d="M 20 75 Q 100 0 180 75" fill="none" stroke="#334155" strokeWidth="1.5" />
          {isDaytime && (
            <path d="M 20 75 Q 100 0 180 75" fill="none" stroke="url(#sunArc)" strokeWidth="3"
              strokeDasharray={`${sunProgress * 170}, 170`} strokeLinecap="round" />
          )}
          {isDaytime && (
            <g>
              <circle cx={20 + sunProgress * 160} cy={75 - Math.sin(sunProgress * Math.PI) * 70}
                r="10" fill="#f97316" opacity="0.3">
                <animate attributeName="r" values="10;14;10" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx={20 + sunProgress * 160} cy={75 - Math.sin(sunProgress * Math.PI) * 70}
                r="6" fill="#fbbf24" stroke="#f97316" strokeWidth="1.5" />
            </g>
          )}
          <text x="15" y="88" fontSize="8" fill="#64748b" textAnchor="middle">E</text>
          <text x="185" y="88" fontSize="8" fill="#64748b" textAnchor="middle">W</text>
        </svg>
      </div>

      {/* Times grid */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Sunrise</p>
          <p className="text-sm font-bold text-white font-mono">{fmt(sunrise)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Daylight</p>
          <p className="text-sm font-bold text-white font-mono">{dayH}h {dayM}m</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500">Sunset</p>
          <p className="text-sm font-bold text-white font-mono">{fmt(sunset)}</p>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/50 text-center">
        <span className={`text-xs px-2 py-0.5 rounded ${
          isDaytime ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
        }`}>
          {isDaytime ? '☀️ Daytime' : '🌙 Nighttime'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(SunWidget);
