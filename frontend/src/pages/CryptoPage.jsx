/**
 * CryptoPage.jsx - Crypto Hub Main Page
 *
 * Tab-based container for the crypto section:
 * - Overview: Global stats, price tickers, top coins, trending
 * - News: Curated crypto news from multiple sources
 * - Portfolio: Track holdings with live P&L
 * - Trade Ideas: Technical analysis signals
 * - DeFi: TVL, DEX volume, gas, chain breakdown
 *
 * Digest settings accessible via gear icon.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  TrendingUp, Newspaper, Wallet, Lightbulb, Layers,
  RefreshCw, Settings, Loader,
} from 'lucide-react';
import { useAuth } from '../auth';
import { cryptoAPI } from '../services/cryptoAPI';
import MarketOverview from '../components/crypto/MarketOverview';
import CryptoNewsFeed from '../components/crypto/CryptoNewsFeed';
import PortfolioTracker from '../components/crypto/PortfolioTracker';
import TradeIdeas from '../components/crypto/TradeIdeas';
import DeFiDashboard from '../components/crypto/DeFiDashboard';
import DigestSettings from '../components/crypto/DigestSettings';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'ideas', label: 'Trade Ideas', icon: Lightbulb },
  { id: 'defi', label: 'DeFi', icon: Layers },
];

const AUTO_REFRESH_MS = 120000; // 2 minutes (CoinGecko free tier rate limit)

const CryptoPage = () => {
  const { user } = useAuth();
  const userId = user?.email || user?.oid || 'demo-user';
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = useCallback((tab) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const [cryptoData, setCryptoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [digestOpen, setDigestOpen] = useState(false);
  const refreshTimerRef = useRef(null);

  // Fetch all crypto data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await cryptoAPI.getCryptoData();
      setCryptoData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch crypto data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchData(true);
    }, AUTO_REFRESH_MS);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  // Loading skeleton
  if (loading && !cryptoData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          {TABS.map(t => (
            <div key={t.id} className="h-9 w-24 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-32 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setDigestOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Digest Settings"
          >
            <Settings className="w-3.5 h-3.5" />
            Digest
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-800 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          Failed to load data: {error}
          <button onClick={handleRefresh} className="ml-2 underline hover:text-red-300">
            Retry
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <MarketOverview data={cryptoData} />
        )}
        {activeTab === 'news' && (
          <CryptoNewsFeed news={cryptoData?.news} />
        )}
        {activeTab === 'portfolio' && (
          <PortfolioTracker
            userId={userId}
            topCoins={cryptoData?.topCoins}
          />
        )}
        {activeTab === 'ideas' && (
          <TradeIdeas topCoins={cryptoData?.topCoins} />
        )}
        {activeTab === 'defi' && (
          <DeFiDashboard data={cryptoData?.defi} />
        )}
      </div>

      {/* Digest Settings Slide-over */}
      {digestOpen && (
        <DigestSettings
          userId={userId}
          onClose={() => setDigestOpen(false)}
        />
      )}
    </div>
  );
};

export default CryptoPage;
