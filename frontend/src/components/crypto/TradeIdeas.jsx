import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Format price
function formatPrice(price) {
  if (price == null) return '—';
  const n = Number(price);
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toFixed(2);
  return '$' + n.toPrecision(4);
}

// Calculate RSI (14-period)
function calculateRSI(prices) {
  if (!prices || prices.length < 15) return null;
  const data = prices.slice(-15);
  let gains = 0, losses = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate SMA
function calculateSMA(prices, period) {
  if (!prices || prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / slice.length;
}

// Calculate volatility (std dev of hourly returns over last 24h)
function calculateVolatility(prices) {
  if (!prices || prices.length < 25) return null;
  const recent = prices.slice(-25);
  const returns = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push(recent[i] / recent[i - 1] - 1);
  }
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
  return Math.sqrt(variance);
}

// Analyze a coin
function analyzeCoin(coin) {
  const prices = coin.sparkline7d;
  if (!prices || prices.length < 30) return null;

  // RSI
  const rsi = calculateRSI(prices);
  const rsiLabel = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';

  // SMA Cross
  const smaShort = calculateSMA(prices, 24);
  const smaLong = calculateSMA(prices, Math.min(prices.length, 168));
  let smaCross = 'Flat';
  if (smaShort && smaLong) {
    const diff = ((smaShort - smaLong) / smaLong) * 100;
    if (diff > 0.5) smaCross = 'Bullish';
    else if (diff < -0.5) smaCross = 'Bearish';
  }

  // Momentum
  const len = prices.length;
  const momentum24h = len >= 24 ? ((prices[len - 1] - prices[len - 24]) / prices[len - 24]) * 100 : null;
  const momentum7d = ((prices[len - 1] - prices[0]) / prices[0]) * 100;

  // Volatility
  const vol = calculateVolatility(prices);
  const volLabel = vol == null ? 'N/A' : vol < 0.01 ? 'Low' : vol < 0.03 ? 'Medium' : 'High';

  // Support / Resistance (last 48 points)
  const recentPrices = prices.slice(-48);
  const support = Math.min(...recentPrices);
  const resistance = Math.max(...recentPrices);

  // Overall signal score
  let score = 0;
  if (rsi < 30) score += 2;
  else if (rsi > 70) score -= 2;
  if (smaCross === 'Bullish') score += 1;
  else if (smaCross === 'Bearish') score -= 1;
  if (momentum7d > 0) score += 1;
  else if (momentum7d < 0) score -= 1;

  const signal = score >= 2 ? 'BULLISH' : score <= -2 ? 'BEARISH' : 'NEUTRAL';

  return {
    rsi: Math.round(rsi),
    rsiLabel,
    smaCross,
    momentum24h,
    momentum7d,
    volLabel,
    support,
    resistance,
    signal,
    score,
  };
}

// Generate summary text
function generateSummary(signal, rsi, smaCross, momentum7d, volLabel) {
  const momentumStr = Math.abs(momentum7d) > 5 ? 'strong' : 'moderate';

  if (signal === 'BULLISH') {
    const rsiNote = rsi > 65 ? 'approaching overbought territory' : 'room for further gains';
    return `Price trading above key moving averages with ${momentumStr} upward momentum. RSI at ${rsi} suggests ${rsiNote}.`;
  }
  if (signal === 'BEARISH') {
    const rsiNote = rsi < 35 ? 'oversold conditions may present opportunity' : 'continued selling pressure';
    return `Price below key moving averages with downward pressure. RSI at ${rsi} indicates ${rsiNote}.`;
  }
  return `Price consolidating near moving averages with ${volLabel.toLowerCase()} volatility. RSI at ${rsi} in neutral territory — waiting for a clearer directional move.`;
}

const SIGNAL_STYLES = {
  BULLISH: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: TrendingUp },
  BEARISH: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: TrendingDown },
  NEUTRAL: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Minus },
};

export default function TradeIdeas({ topCoins = [] }) {
  const analyses = useMemo(() => {
    return topCoins
      .slice(0, 10)
      .map(coin => {
        const analysis = analyzeCoin(coin);
        return analysis ? { coin, ...analysis } : null;
      })
      .filter(Boolean);
  }, [topCoins]);

  if (!topCoins || topCoins.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-3 text-sm text-slate-400">No market data available for analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-300/80">
          <strong>Not financial advice.</strong> These signals are generated from basic technical indicators
          and should not be used as the sole basis for investment decisions.
        </p>
      </div>

      {/* Signal Cards */}
      <div className="space-y-4">
        {analyses.map(a => {
          const style = SIGNAL_STYLES[a.signal];
          const Icon = style.icon;
          const summary = generateSummary(a.signal, a.rsi, a.smaCross, a.momentum7d, a.volLabel);

          return (
            <div key={a.coin.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {a.coin.image && <img src={a.coin.image} alt="" width={24} height={24} className="rounded-full" />}
                  <div>
                    <span className="text-white font-semibold">{a.coin.name}</span>
                    <span className="text-slate-400 text-xs ml-1.5">({a.coin.symbol})</span>
                    <span className="text-slate-300 text-sm ml-3">{formatPrice(a.coin.price)}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 ${style.bg} ${style.text} border ${style.border} rounded-lg px-3 py-1 text-xs font-bold`}>
                  <Icon className="w-3.5 h-3.5" />
                  {a.signal}
                </span>
              </div>

              {/* Indicators Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <IndicatorBox label="RSI (14)" value={`${a.rsi}`} sub={a.rsiLabel}
                  color={a.rsi > 70 ? 'text-red-400' : a.rsi < 30 ? 'text-emerald-400' : 'text-slate-200'} />
                <IndicatorBox label="SMA Cross" value={a.smaCross}
                  color={a.smaCross === 'Bullish' ? 'text-emerald-400' : a.smaCross === 'Bearish' ? 'text-red-400' : 'text-slate-300'} />
                <IndicatorBox label="Momentum (7d)"
                  value={a.momentum7d != null ? `${a.momentum7d >= 0 ? '+' : ''}${a.momentum7d.toFixed(1)}%` : '—'}
                  color={a.momentum7d >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <IndicatorBox label="Volatility" value={a.volLabel}
                  color={a.volLabel === 'High' ? 'text-amber-400' : a.volLabel === 'Low' ? 'text-cyan-400' : 'text-slate-300'} />
              </div>

              {/* Support / Resistance */}
              <div className="flex gap-4 mb-3 text-xs">
                <span className="text-slate-500">Support: <span className="text-slate-300">{formatPrice(a.support)}</span></span>
                <span className="text-slate-500">Resistance: <span className="text-slate-300">{formatPrice(a.resistance)}</span></span>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndicatorBox({ label, value, sub, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
