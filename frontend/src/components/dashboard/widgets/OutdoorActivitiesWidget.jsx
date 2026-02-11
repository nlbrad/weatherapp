import React, { useState } from 'react';

/**
 * OutdoorActivitiesWidget - Activity scores for hiking, cycling, etc.
 * Data from /api/outdoor-score
 */

const ACTIVITIES = [
  { id: 'default', name: 'General', icon: '🌿' },
  { id: 'hiking', name: 'Hiking', icon: '🥾' },
  { id: 'cycling', name: 'Cycling', icon: '🚴' },
  { id: 'running', name: 'Running', icon: '🏃' },
  { id: 'picnic', name: 'Picnic', icon: '🧺' },
];

const RATING_COLORS = {
  Excellent: 'text-green-400',
  Good: 'text-emerald-400',
  Fair: 'text-yellow-400',
  Poor: 'text-orange-400',
  'Not Recommended': 'text-red-400',
};

const OutdoorActivitiesWidget = ({ scoreData }) => {
  const [selectedActivity, setSelectedActivity] = useState('default');

  if (!scoreData || scoreData.error) {
    return <p className="text-slate-400 text-sm">Outdoor data unavailable</p>;
  }

  const score = scoreData.current?.score || 0;
  const rating = scoreData.current?.rating || 'Poor';
  const ratingColor = RATING_COLORS[rating] || 'text-slate-400';

  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const ringColor = score >= 80 ? 'stroke-green-400' : score >= 60 ? 'stroke-emerald-400'
    : score >= 40 ? 'stroke-yellow-400' : score >= 20 ? 'stroke-orange-400' : 'stroke-red-400';

  return (
    <div className="h-full flex flex-col">
      {/* Activity selector */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {ACTIVITIES.map(a => (
          <button key={a.id}
            onClick={() => setSelectedActivity(a.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors ${
              selectedActivity === a.id
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}>
            <span>{a.icon}</span>{a.name}
          </button>
        ))}
      </div>

      {/* Score + details */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <svg width="64" height="64" className="transform -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle cx="32" cy="32" r={r} fill="none" className={ringColor}
              strokeWidth="4" strokeLinecap="round"
              strokeDasharray={circ} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-base font-bold ${ratingColor}`}>{score}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${ratingColor}`}>{rating}</p>
          {scoreData.current?.recommendation && (
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
              {scoreData.current.recommendation}
            </p>
          )}
        </div>
      </div>

      {/* Key factors */}
      <div className="grid grid-cols-3 gap-1.5 mt-auto">
        {scoreData.conditions && (
          <>
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <p className="text-[9px] text-slate-500">Temp</p>
              <p className="text-xs font-bold text-white font-mono">{Math.round(scoreData.conditions.temperature)}°</p>
            </div>
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <p className="text-[9px] text-slate-500">Rain</p>
              <p className="text-xs font-bold text-white font-mono">{scoreData.conditions.precipProbability}%</p>
            </div>
            <div className="bg-slate-800 rounded p-1.5 text-center">
              <p className="text-[9px] text-slate-500">Wind</p>
              <p className="text-xs font-bold text-white font-mono">{Math.round(scoreData.conditions.windSpeed)}</p>
            </div>
          </>
        )}
      </div>

      {/* Best window */}
      {scoreData.bestWindow && (
        <div className="mt-2 pt-2 border-t border-slate-800/50">
          <p className="text-[10px] text-slate-500">Best time</p>
          <p className="text-xs text-white font-mono">
            {new Date(scoreData.bestWindow.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            {' – '}
            {new Date(scoreData.bestWindow.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className="text-slate-500 ml-1">({scoreData.bestWindow.durationMinutes}min)</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(OutdoorActivitiesWidget);
