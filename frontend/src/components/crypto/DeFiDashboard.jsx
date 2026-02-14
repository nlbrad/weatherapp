import React from 'react';
import { Layers, ArrowLeftRight, Fuel } from 'lucide-react';

function formatBillions(n) {
  if (n == null) return '—';
  const val = Number(n);
  if (Number.isNaN(val)) return '—';
  if (val >= 1e12) return '$' + (val / 1e12).toFixed(2) + 'T';
  if (val >= 1e9) return '$' + (val / 1e9).toFixed(1) + 'B';
  if (val >= 1e6) return '$' + (val / 1e6).toFixed(1) + 'M';
  return '$' + val.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function DeFiDashboard({ data }) {
  if (!data) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8 text-center">
        <Layers className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-3 text-sm text-slate-400">DeFi data not available.</p>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Value Locked',
      value: formatBillions(data.tvl),
      icon: Layers,
      color: 'text-cyan-400',
    },
    {
      label: 'DEX Volume (24h)',
      value: formatBillions(data.dexVolume24h),
      icon: ArrowLeftRight,
      color: 'text-purple-400',
    },
    {
      label: 'ETH Gas Price',
      value: data.ethGasGwei != null ? `${Math.round(data.ethGasGwei)} gwei` : 'N/A',
      icon: Fuel,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Chain breakdown - if chains data is available */}
      {data.chains && data.chains.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-medium text-white mb-4">TVL by Chain</h3>
          <div className="space-y-3">
            {data.chains.slice(0, 10).map((chain, idx) => {
              const maxTvl = data.chains[0]?.tvl || 1;
              const pct = ((chain.tvl / (data.tvl || maxTvl)) * 100).toFixed(1);
              const barWidth = Math.max((chain.tvl / maxTvl) * 100, 2);
              return (
                <div key={chain.name || idx} className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 w-20 truncate">{chain.name || chain.gecko_id}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${barWidth}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-16 text-right">{formatBillions(chain.tvl)}</span>
                  <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/50">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Total Value Locked (TVL)</strong> represents the total capital deposited in DeFi protocols.
          <strong className="text-slate-400 ml-1">DEX Volume</strong> is the 24-hour trading volume across decentralized exchanges.
          Data sourced from DefiLlama and Etherscan.
        </p>
      </div>
    </div>
  );
}
