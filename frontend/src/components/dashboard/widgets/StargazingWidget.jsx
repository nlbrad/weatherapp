import React from 'react';

/**
 * StargazingWidget - Sky darkness score and viewing conditions
 * Data from /api/tonights-sky
 */

const COLORS = {
  Excellent: { text: 'text-purple-400', ring: 'stroke-purple-400' },
  Good: { text: 'text-blue-400', ring: 'stroke-blue-400' },
  Fair: { text: 'text-yellow-400', ring: 'stroke-yellow-400' },
  Poor: { text: 'text-orange-400', ring: 'stroke-orange-400' },
  Bad: { text: 'text-red-400', ring: 'stroke-red-400' },
};

const StargazingWidget = ({ scoreData }) => {
  if (!scoreData || scoreData.error) {
    return <p className="text-slate-400 text-sm">Sky data unavailable</p>;
  }

  const score = scoreData.skyScore || 0;
  const rating = scoreData.rating || 'Poor';
  const meta = scoreData.metadata || {};
  const colors = COLORS[rating] || COLORS.Poor;

  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <svg width="76" height="76" className="transform -rotate-90">
            <circle cx="38" cy="38" r={r} fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle cx="38" cy="38" r={r} fill="none" className={colors.ring}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${colors.text}`}>{score}</span>
            <span className="text-[9px] text-slate-500">/100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${colors.text}`}>{rating}</p>
          <p className="text-xs text-slate-400 mt-0.5">Stargazing conditions</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-slate-800 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-500">Clouds</p>
          <p className="text-sm font-bold text-white font-mono">{meta.clouds ?? '--'}%</p>
        </div>
        <div className="bg-slate-800 rounded-lg p-2 text-center">
          <p className="text-[10px] text-slate-500">Moon</p>
          <p className="text-sm font-bold text-white font-mono">
            {meta.moonPhase !== undefined ? `${Math.round(meta.moonPhase * 100)}%` : '--'}
          </p>
        </div>
      </div>

      {/* Extra info */}
      <div className="mt-2 space-y-1 text-xs">
        {meta.planetsVisible > 0 && (
          <p className="text-slate-400">🪐 {meta.planetsVisible} planets visible</p>
        )}
        {meta.hasISSPass && (
          <p className="text-cyan-400">🛰️ ISS pass tonight</p>
        )}
        {meta.activeMeteorShowers > 0 && (
          <p className="text-purple-400">☄️ {meta.activeMeteorShowers} meteor shower{meta.activeMeteorShowers > 1 ? 's' : ''} active</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(StargazingWidget);
