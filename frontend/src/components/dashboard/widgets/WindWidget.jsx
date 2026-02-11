import React from 'react';
import { motion } from 'framer-motion';
import gustHistory from '../../../services/gustHistory';

/**
 * WindWidget - Wind compass, speed/gust comparison, Beaufort scale
 */

const getCompassDirection = (deg) => {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(((deg % 360) / 22.5)) % 16];
};

const getWindDescription = (speed) => {
  if (speed < 1) return { text: 'Calm', level: 0 };
  if (speed < 6) return { text: 'Light Air', level: 1 };
  if (speed < 12) return { text: 'Light Breeze', level: 2 };
  if (speed < 20) return { text: 'Gentle Breeze', level: 3 };
  if (speed < 29) return { text: 'Moderate', level: 4 };
  if (speed < 39) return { text: 'Fresh', level: 5 };
  if (speed < 50) return { text: 'Strong', level: 6 };
  if (speed < 62) return { text: 'Near Gale', level: 7 };
  if (speed < 75) return { text: 'Gale', level: 8 };
  if (speed < 89) return { text: 'Strong Gale', level: 9 };
  if (speed < 103) return { text: 'Storm', level: 10 };
  return { text: 'Violent Storm', level: 11 };
};

const getWindColor = (level) => {
  const colors = ['#10B981','#10B981','#22D3EE','#06B6D4','#F59E0B','#F59E0B',
    '#EF4444','#EF4444','#DC2626','#DC2626','#991B1B','#7F1D1D'];
  return colors[Math.min(level, colors.length - 1)];
};

const WindWidget = ({ weather, location }) => {
  if (!weather?.wind) return <p className="text-slate-400 text-sm">No wind data</p>;

  const { speed, direction, gust: rawGust } = weather.wind;
  const currentGust = typeof rawGust === 'number' && rawGust > 0 ? rawGust : null;
  const gustState = gustHistory.getGustState(location?.lat, location?.lon, currentGust, speed);

  const windCondition = getWindDescription(speed);
  const windColor = getWindColor(windCondition.level);
  const hasGust = gustState.hasGust;
  const gustSpeed = gustState.gustSpeed;
  const gustColor = hasGust ? getWindColor(getWindDescription(gustSpeed).level) : null;
  const maxSpeed = Math.max(speed, hasGust ? gustSpeed : 0, 30);

  const radius = 55;
  const cx = radius + 8;
  const cy = radius + 8;

  return (
    <div className="h-full flex flex-col">
      {/* Compass */}
      <div className="flex flex-col items-center mb-1">
        <div className="relative w-28 h-28">
          <svg width="100%" height="100%" viewBox={`0 0 ${(radius+8)*2} ${(radius+8)*2}`}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#374151" strokeWidth="1.5" opacity="0.4" />
            {Array.from({ length: 36 }).map((_, i) => {
              const angle = (i * 10) * (Math.PI / 180);
              const isCardinal = i % 9 === 0;
              const isMajor = i % 3 === 0;
              const inner = isCardinal ? radius - 8 : isMajor ? radius - 5 : radius - 3;
              return (
                <line key={i}
                  x1={cx + Math.sin(angle) * inner} y1={cy - Math.cos(angle) * inner}
                  x2={cx + Math.sin(angle) * radius} y2={cy - Math.cos(angle) * radius}
                  stroke={isCardinal ? '#10B981' : '#4B5563'}
                  strokeWidth={isCardinal ? 1.5 : 0.5}
                  opacity={isCardinal ? 0.8 : 0.3}
                />
              );
            })}
            <text x={cx} y={cy - radius + 15} textAnchor="middle" className="text-[10px] font-bold fill-white">N</text>
            <text x={cx + radius - 10} y={cy + 4} textAnchor="middle" className="text-[9px] fill-slate-500">E</text>
            <text x={cx} y={cy + radius - 6} textAnchor="middle" className="text-[9px] fill-slate-500">S</text>
            <text x={cx - radius + 10} y={cy + 4} textAnchor="middle" className="text-[9px] fill-slate-500">W</text>
          </svg>
          <motion.div className="absolute inset-0 flex items-center justify-center"
            initial={{ rotate: 0 }} animate={{ rotate: direction + 180 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}>
            <svg width="65%" height="65%" viewBox="0 0 100 100">
              <line x1="50" y1="12" x2="50" y2="88" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 50 7 L 45 17 L 50 14 L 55 17 Z" fill="#10B981" />
              <circle cx="50" cy="88" r="3" fill="#10B981" opacity="0.6" />
            </svg>
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-green-500 rounded-full border border-green-400" />
          </div>
        </div>

        <div className="text-center mt-0.5">
          <p className="text-base font-bold font-mono text-white leading-tight">
            {speed.toFixed(1)} <span className="text-[10px] text-slate-400">km/h</span>
          </p>
          <p className="text-[11px]">
            <span className="text-slate-500">from </span>
            <span className="font-bold text-cyan-400">{getCompassDirection(direction)}</span>
            <span className="text-slate-500 ml-0.5">→ {getCompassDirection((direction + 180) % 360)}</span>
          </p>
        </div>
      </div>

      {/* Speed vs Gust bars */}
      <div className="bg-slate-800 rounded-lg p-2.5 space-y-2 flex-1">
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] text-slate-400">Speed</span>
            <span className="text-[10px] font-mono font-semibold text-white">{speed.toFixed(1)} km/h</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ backgroundColor: windColor }}
              initial={{ width: 0 }} animate={{ width: `${(speed / maxSpeed) * 100}%` }}
              transition={{ duration: 0.8 }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] text-slate-400">Gusts</span>
            {hasGust ? (
              <span className="text-[10px] font-mono font-semibold" style={{ color: gustColor }}>
                {gustSpeed.toFixed(1)} km/h
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 italic">Steady</span>
            )}
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            {hasGust && (
              <motion.div className="h-full rounded-full" style={{ backgroundColor: gustColor }}
                initial={{ width: 0 }} animate={{ width: `${(gustSpeed / maxSpeed) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.2 }} />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-700">
          <span className="text-slate-500">Beaufort {windCondition.level}</span>
          <span className="font-semibold" style={{ color: windColor }}>{windCondition.text}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(WindWidget);
