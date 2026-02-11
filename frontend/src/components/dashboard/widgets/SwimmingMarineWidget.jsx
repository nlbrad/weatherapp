import React from 'react';

/**
 * SwimmingMarineWidget - Sea swimming conditions
 * Data from /api/swimming-score
 */

const SAFETY_COLORS = {
  safe: { text: 'text-green-400', ring: 'stroke-green-400', bg: 'bg-green-500/10' },
  caution: { text: 'text-yellow-400', ring: 'stroke-yellow-400', bg: 'bg-yellow-500/10' },
  dangerous: { text: 'text-red-400', ring: 'stroke-red-400', bg: 'bg-red-500/10' },
};

const SwimmingMarineWidget = ({ scoreData }) => {
  if (!scoreData || scoreData.error) {
    return <p className="text-slate-400 text-sm">Marine data unavailable</p>;
  }

  const score = scoreData.current?.score || 0;
  const rating = scoreData.current?.rating || 'Poor';
  const safetyLevel = scoreData.safety?.level || 'caution';
  const colors = SAFETY_COLORS[safetyLevel] || SAFETY_COLORS.caution;
  const conditions = scoreData.conditions || {};

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
          {scoreData.current?.swimDuration && (
            <p className="text-xs text-slate-400 mt-0.5">{scoreData.current.swimDuration}</p>
          )}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        {conditions.waterTemp && (
          <div className="bg-slate-800 rounded-lg p-2">
            <p className="text-[10px] text-slate-500">Water</p>
            <p className="text-sm font-bold text-white font-mono">
              {conditions.waterTemp.value}°C
            </p>
            <p className="text-[9px] text-slate-500">{conditions.waterTemp.category}</p>
          </div>
        )}
        {conditions.sea && (
          <div className="bg-slate-800 rounded-lg p-2">
            <p className="text-[10px] text-slate-500">Waves</p>
            <p className="text-sm font-bold text-white font-mono">
              {conditions.sea.waveHeight}m
            </p>
            <p className="text-[9px] text-slate-500">{conditions.sea.state}</p>
          </div>
        )}
      </div>

      {/* Gear + Safety */}
      <div className="mt-auto space-y-1.5">
        {scoreData.gear?.wetsuitRequired && (
          <p className="text-xs text-orange-400">🩱 Wetsuit required</p>
        )}
        {scoreData.gear?.wetsuitRecommended && !scoreData.gear?.wetsuitRequired && (
          <p className="text-xs text-yellow-400">🩱 Wetsuit recommended</p>
        )}
        {scoreData.safety?.warnings?.length > 0 && (
          <p className="text-xs text-red-400">⚠️ {scoreData.safety.warnings[0]}</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(SwimmingMarineWidget);
