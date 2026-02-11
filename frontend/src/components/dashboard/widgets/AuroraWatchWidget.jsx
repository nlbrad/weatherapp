import React from 'react';

/**
 * AuroraWatchWidget - Northern lights viewing conditions
 * Data from /api/aurora-score
 */

const COLORS = {
  Excellent: { text: 'text-green-400', ring: 'stroke-green-400' },
  Good: { text: 'text-emerald-400', ring: 'stroke-emerald-400' },
  Possible: { text: 'text-yellow-400', ring: 'stroke-yellow-400' },
  Unlikely: { text: 'text-orange-400', ring: 'stroke-orange-400' },
  'Not Visible': { text: 'text-slate-500', ring: 'stroke-slate-500' },
};

const AuroraWatchWidget = ({ scoreData }) => {
  if (!scoreData || scoreData.error) {
    return <p className="text-slate-400 text-sm">Aurora data unavailable</p>;
  }

  const { current, kpIndex, conditions } = scoreData;
  const score = current?.score || 0;
  const rating = current?.rating || 'Not Visible';
  const colors = COLORS[rating] || COLORS['Not Visible'];

  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const bestWindow = scoreData.bestWindow;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        {/* Score circle */}
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
          {kpIndex && (
            <p className="text-xs text-slate-400 mt-0.5">
              Kp <span className="text-white font-mono font-bold">{kpIndex.current}</span>
              <span className="text-slate-500 ml-1">(need {kpIndex.minNeededForLatitude}+)</span>
            </p>
          )}
        </div>
      </div>

      {/* Key factors */}
      <div className="space-y-1.5 text-xs">
        {conditions && (
          <div className="flex justify-between text-slate-400">
            <span>Cloud cover</span>
            <span className="text-white font-mono">{conditions.clouds}%</span>
          </div>
        )}
        {current?.recommendation && (
          <p className="text-xs text-slate-500 mt-2 italic">{current.recommendation}</p>
        )}
      </div>

      {/* Best window */}
      {bestWindow && (
        <div className="mt-auto pt-2 border-t border-slate-800/50">
          <p className="text-[10px] text-slate-500">Best viewing window</p>
          <p className="text-xs text-white font-mono">
            {new Date(bestWindow.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            {' – '}
            {new Date(bestWindow.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(AuroraWatchWidget);
