import React, { useState, useMemo } from 'react';
import { ArrowUpDown, TrendingUp, TrendingDown, Fuel } from 'lucide-react';

// Format price: $96,412 or $2,834.50
function formatPrice(price) {
  if (price == null) return '—';
  const n = Number(price);
  if (Number.isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 0.01) return '$' + n.toFixed(2);
  return '$' + n.toPrecision(4);
}

// Format market cap: $1.9T, $341B, $12.4M
function formatMarketCap(cap) {
  if (cap == null) return '—';
  const n = Number(cap);
  if (Number.isNaN(n)) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// Format change: +2.4% or -0.8%
function formatChange(change) {
  if (change == null) return '—';
  const n = Number(change);
  if (Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + '%';
}

function changeColor(change) {
  if (change == null) return 'text-slate-400';
  return Number(change) >= 0 ? 'text-emerald-400' : 'text-red-400';
}

// Sparkline SVG
function Sparkline({ prices, width = '100%', height = 30, positive = true }) {
  if (!prices || prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const svgW = 100;
  const step = svgW / (prices.length - 1);
  const points = prices
    .map((p, i) => `${(i * step).toFixed(2)},${(height - ((p - min) / range) * (height - 2) - 1).toFixed(2)}`)
    .join(' ');
  const stroke = positive ? '#34d399' : '#f87171';
  return (
    <svg viewBox={`0 0 ${svgW} ${height}`} preserveAspectRatio="none" width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Fear & Greed dot
function sentimentDotClass(value) {
  if (value == null) return 'bg-slate-500';
  const v = Number(value);
  if (v <= 25) return 'bg-red-500';
  if (v <= 45) return 'bg-orange-500';
  if (v <= 55) return 'bg-yellow-500';
  if (v <= 75) return 'bg-green-500';
  return 'bg-emerald-400';
}

const SORT_KEYS = { rank: 'marketCapRank', price: 'price', change24h: 'change24h', change7d: 'change7d', marketCap: 'marketCap' };

export default function MarketOverview({ data }) {
  const [sortKey, setSortKey] = useState('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sortedCoins = useMemo(() => {
    if (!data?.topCoins) return [];
    const coins = [...data.topCoins].slice(0, 20);
    const key = SORT_KEYS[sortKey] || 'marketCapRank';
    coins.sort((a, b) => {
      const av = a[key] ?? 0;
      const bv = b[key] ?? 0;
      return sortAsc ? av - bv : bv - av;
    });
    return coins;
  }, [data?.topCoins, sortKey, sortAsc]);

  const topCoinMap = useMemo(() => {
    const m = {};
    (data?.topCoins || []).forEach(c => { m[c.symbol?.toUpperCase()] = c; });
    return m;
  }, [data?.topCoins]);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-slate-500">Loading market data...</div>;
  }

  const { markets, trending, sentiment, defi } = data;

  function handleSort(key) {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(key === 'rank'); }
  }

  function SortHeader({ label, colKey, className = '' }) {
    const active = sortKey === colKey;
    return (
      <th onClick={() => handleSort(colKey)} className={`cursor-pointer select-none px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400 hover:text-cyan-400 transition-colors ${className}`}>
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown size={12} className={active ? 'text-cyan-500' : 'text-slate-600'} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Stats Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <StatChip label="Market Cap">
          <span className="font-semibold text-slate-100">{formatMarketCap(markets?.totalMarketCap)}</span>
          {markets?.totalMarketCapChange24h != null && (
            <span className={`text-xs ${changeColor(markets.totalMarketCapChange24h)}`}>{formatChange(markets.totalMarketCapChange24h)}</span>
          )}
        </StatChip>
        <StatChip label="BTC Dominance">
          <span className="font-semibold text-slate-100">{markets?.btcDominance != null ? Number(markets.btcDominance).toFixed(1) + '%' : '—'}</span>
        </StatChip>
        <StatChip label="Fear & Greed">
          <span className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${sentimentDotClass(sentiment?.value)}`} />
            <span className="font-semibold text-slate-100">{sentiment?.value ?? '—'}</span>
            {sentiment?.label && <span className="text-xs text-slate-400">{sentiment.label}</span>}
          </span>
        </StatChip>
        {defi?.ethGasGwei != null && (
          <StatChip label="ETH Gas">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-100">
              <Fuel size={12} className="text-cyan-500" />
              {Math.round(defi.ethGasGwei)} gwei
            </span>
          </StatChip>
        )}
      </div>

      {/* Price Tickers */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(markets?.crypto || []).slice(0, 2).map(coin => {
          const topCoin = topCoinMap[coin.symbol?.toUpperCase()];
          const sparkData = topCoin?.sparkline7d;
          const is7dPositive = topCoin?.change7d != null ? topCoin.change7d >= 0 : coin.change24h >= 0;
          return (
            <TickerCard key={coin.symbol}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400">{coin.symbol?.toUpperCase()}</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-100">{formatPrice(coin.price)}</p>
                </div>
                <ChangeTag value={coin.change24h} />
              </div>
              {sparkData && sparkData.length > 1 && (
                <div className="mt-2"><Sparkline prices={sparkData} height={30} positive={is7dPositive} /></div>
              )}
            </TickerCard>
          );
        })}
        {(markets?.traditional || []).slice(0, 2).map(asset => (
          <TickerCard key={asset.symbol}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">{asset.name || asset.symbol}</p>
                <p className="mt-0.5 text-lg font-bold text-slate-100">{formatPrice(asset.price)}</p>
              </div>
              <ChangeTag value={asset.change24h} />
            </div>
          </TickerCard>
        ))}
      </div>

      {/* Top Coins Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <SortHeader label="#" colKey="rank" className="text-left w-10" />
              <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-slate-400">Coin</th>
              <SortHeader label="Price" colKey="price" className="text-right" />
              <SortHeader label="24h %" colKey="change24h" className="text-right" />
              <SortHeader label="7d %" colKey="change7d" className="text-right" />
              <SortHeader label="Market Cap" colKey="marketCap" className="text-right" />
              <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-slate-400">7d Chart</th>
            </tr>
          </thead>
          <tbody>
            {sortedCoins.map((coin, idx) => {
              const sparkData = coin.sparkline7d;
              const is7dPositive = coin.change7d != null ? coin.change7d >= 0 : true;
              const rowBg = idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-transparent';
              return (
                <tr key={coin.id || coin.symbol} className={`${rowBg} border-b border-slate-800/40 transition-colors hover:bg-slate-800/50`}>
                  <td className="px-3 py-2.5 text-left text-slate-400">{coin.marketCapRank ?? idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {coin.image && <img src={coin.image} alt={coin.symbol} width={20} height={20} className="rounded-full" loading="lazy" />}
                      <span className="font-medium text-slate-100">{coin.name}</span>
                      <span className="text-xs uppercase text-slate-500">{coin.symbol}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-100">{formatPrice(coin.price)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${changeColor(coin.change24h)}`}>{formatChange(coin.change24h)}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${changeColor(coin.change7d)}`}>{formatChange(coin.change7d)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-300">{formatMarketCap(coin.marketCap)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="ml-auto w-[60px]">
                      {sparkData && sparkData.length > 1 ? (
                        <Sparkline prices={sparkData} width={60} height={20} positive={is7dPositive} />
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sortedCoins.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No coin data available</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Trending Coins */}
      {trending && trending.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <TrendingUp size={14} className="text-cyan-500" /> Trending
          </h3>
          <div className="flex flex-wrap gap-2">
            {trending.map(coin => (
              <span key={coin.id || coin.symbol} className="inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs font-medium text-slate-300">
                <span role="img" aria-label="fire">🔥</span>
                <span className="uppercase">{coin.symbol}</span>
                <span className={changeColor(coin.change24h)}>{formatChange(coin.change24h)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function TickerCard({ children }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">{children}</div>;
}

function ChangeTag({ value }) {
  if (value == null) return null;
  const positive = Number(value) >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
      <Icon size={12} />
      {formatChange(value)}
    </span>
  );
}
