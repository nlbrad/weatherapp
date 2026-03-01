/**
 * CryptoNewsFeed.jsx - Magazine-style crypto news layout
 *
 * Redesigned to feel like a professional news site:
 * - Lead story with dramatic typography
 * - Ranked secondary stories
 * - Bloomberg-style scrolling news ticker
 * - Two-column newspaper grid (featured + compact sidebar)
 * - Source spotlight sections
 * - Topic inference tags & freshness badges
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  Clock, Newspaper, ChevronDown, ChevronUp,
  Zap, ArrowRight, TrendingUp,
} from 'lucide-react';

// ========================================
// Source colour map — extended with gradient & accent
// ========================================
const SOURCE_COLORS = {
  CoinDesk:           { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/25',   dot: 'bg-blue-400',   accent: 'border-l-blue-500',   gradient: 'from-blue-500/10 to-transparent' },
  'The Block':        { bg: 'bg-purple-500/15',  text: 'text-purple-400', border: 'border-purple-500/25', dot: 'bg-purple-400', accent: 'border-l-purple-500', gradient: 'from-purple-500/10 to-transparent' },
  'DL News':          { bg: 'bg-rose-500/15',    text: 'text-rose-400',   border: 'border-rose-500/25',   dot: 'bg-rose-400',   accent: 'border-l-rose-500',   gradient: 'from-rose-500/10 to-transparent' },
  Decrypt:            { bg: 'bg-green-500/15',   text: 'text-green-400',  border: 'border-green-500/25',  dot: 'bg-green-400',  accent: 'border-l-green-500',  gradient: 'from-green-500/10 to-transparent' },
  CoinTelegraph:      { bg: 'bg-amber-500/15',   text: 'text-amber-400',  border: 'border-amber-500/25',  dot: 'bg-amber-400',  accent: 'border-l-amber-500',  gradient: 'from-amber-500/10 to-transparent' },
  Blockworks:         { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400',   accent: 'border-l-cyan-500',   gradient: 'from-cyan-500/10 to-transparent' },
  'Bitcoin Magazine': { bg: 'bg-orange-500/15',  text: 'text-orange-400', border: 'border-orange-500/25', dot: 'bg-orange-400', accent: 'border-l-orange-500', gradient: 'from-orange-500/10 to-transparent' },
  'The Defiant':      { bg: 'bg-pink-500/15',    text: 'text-pink-400',   border: 'border-pink-500/25',   dot: 'bg-pink-400',   accent: 'border-l-pink-500',   gradient: 'from-pink-500/10 to-transparent' },
  CryptoSlate:        { bg: 'bg-indigo-500/15',  text: 'text-indigo-400', border: 'border-indigo-500/25', dot: 'bg-indigo-400', accent: 'border-l-indigo-500', gradient: 'from-indigo-500/10 to-transparent' },
  Unchained:          { bg: 'bg-teal-500/15',    text: 'text-teal-400',   border: 'border-teal-500/25',   dot: 'bg-teal-400',   accent: 'border-l-teal-500',   gradient: 'from-teal-500/10 to-transparent' },
};

const DEFAULT_COLOR = {
  bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25',
  dot: 'bg-slate-400', accent: 'border-l-slate-500', gradient: 'from-slate-500/10 to-transparent',
};

const MAX_ARTICLES = 40;

// ========================================
// Topic inference from title keywords
// ========================================
const TOPIC_PATTERNS = [
  { label: 'Bitcoin',     pattern: /\bbitcoin\b|\bbtc\b/i },
  { label: 'Ethereum',    pattern: /\bethereum\b|\beth\b(?!er)/i },
  { label: 'Solana',      pattern: /\bsolana\b|\bsol\b/i },
  { label: 'XRP',         pattern: /\bxrp\b|\bripple\b/i },
  { label: 'DeFi',        pattern: /\bdefi\b|\bdex\b|\blending\b|\byield\b|\bliquidity\b|\baave\b|\buniswap\b/i },
  { label: 'NFT',         pattern: /\bnfts?\b|\bopensea\b/i },
  { label: 'Regulation',  pattern: /\bsec\b|\bregulat/i },
  { label: 'Stablecoin',  pattern: /\bstablecoin\b|\busdt\b|\busdc\b|\btether\b/i },
  { label: 'Layer 2',     pattern: /\blayer.?2\b|\bl2\b|\brollup\b|\barbitrum\b|\boptimism\b|\bbase\b/i },
  { label: 'AI',          pattern: /\bartificial intellig|\bmachine learn|\b(?:^|\s)ai\s/i },
  { label: 'Markets',     pattern: /\brally\b|\bbull\b|\bbear\b|\bcrash\b|\ball.time.high\b|\bath\b/i },
  { label: 'Mining',      pattern: /\bmining\b|\bminer\b|\bhashrate\b/i },
];

function inferTopics(title) {
  const matches = [];
  for (const { label, pattern } of TOPIC_PATTERNS) {
    if (pattern.test(title)) {
      matches.push(label);
      if (matches.length >= 2) break;
    }
  }
  return matches;
}

// ========================================
// Freshness detection
// ========================================
function getFreshness(pubDate) {
  const diffMin = (Date.now() - new Date(pubDate).getTime()) / 60000;
  if (Number.isNaN(diffMin)) return null;
  if (diffMin < 30) return 'BREAKING';
  if (diffMin < 120) return 'NEW';
  return null;
}

// ========================================
// Helpers
// ========================================
function formatRelativeTime(pubDate) {
  const now = Date.now();
  const then = new Date(pubDate).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function getTimeSection(pubDate) {
  const now = new Date();
  const then = new Date(pubDate);
  if (Number.isNaN(then.getTime())) return 'Earlier';
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  if (then >= todayStart) return 'Today';
  if (then >= yesterdayStart) return 'Yesterday';
  return 'Earlier';
}

function getColor(source) {
  return SOURCE_COLORS[source] || DEFAULT_COLOR;
}

function padRank(n) {
  return String(n).padStart(2, '0');
}

// ========================================
// Subcomponents
// ========================================

function SourceBadge({ source, className = '' }) {
  const c = getColor(source);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {source}
    </span>
  );
}

function FreshnessBadge({ freshness }) {
  if (!freshness) return null;
  if (freshness === 'BREAKING') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        Breaking
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider">
      <Zap className="w-2.5 h-2.5" />
      New
    </span>
  );
}

function TopicTag({ topic }) {
  const topicColors = {
    Bitcoin:  'bg-amber-500/10 text-amber-400/80',
    Ethereum: 'bg-indigo-500/10 text-indigo-400/80',
    Solana:   'bg-purple-500/10 text-purple-400/80',
    DeFi:     'bg-green-500/10 text-green-400/80',
  };
  const colors = topicColors[topic] || 'bg-slate-800/60 text-slate-400';
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${colors}`}>
      {topic}
    </span>
  );
}

function SectionDivider({ label }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-slate-800" />
      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-500 px-2">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
    </div>
  );
}

// ---- Source Navigation Bar ----
function SourceNavBar({ sources, sourceCounts, activeSource, setActiveSource, totalCount }) {
  return (
    <div className="space-y-0">
      <div className="flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <button
          type="button"
          onClick={() => setActiveSource('All')}
          className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            activeSource === 'All'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          All Sources
          <span className="text-[10px] opacity-60 tabular-nums">{totalCount}</span>
        </button>
        {sources.map(source => {
          const isActive = activeSource === source;
          const c = getColor(source);
          return (
            <button
              key={source}
              type="button"
              onClick={() => setActiveSource(source)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? `${c.bg} ${c.text} border ${c.border}`
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {source}
              <span className="text-[10px] opacity-50 tabular-nums">{sourceCounts[source]}</span>
            </button>
          );
        })}
      </div>
      <div className="h-px bg-slate-800" />
    </div>
  );
}

// ---- Lead Story ----
function LeadStory({ article }) {
  const c = getColor(article.source);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block rounded-2xl bg-gradient-to-r ${c.gradient} border border-slate-700/60 border-l-4 ${c.accent} p-6 sm:p-8 transition-all hover:border-slate-600 hover:shadow-lg hover:shadow-cyan-500/5 overflow-hidden`}
    >
      {/* Rank watermark */}
      <span className="absolute top-3 right-4 text-[64px] font-black text-slate-800/30 leading-none select-none" aria-hidden>
        01
      </span>

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SourceBadge source={article.source} />
          <FreshnessBadge freshness={article.freshness} />
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(article.pubDate)}
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors mb-3">
          {article.title}
        </h2>

        {article.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {article.topics.map(t => <TopicTag key={t} topic={t} />)}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-cyan-500 transition-colors">
          Read full story
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </a>
  );
}

// ---- Secondary Story Card (#2-#5) ----
function SecondaryStoryCard({ article }) {
  const c = getColor(article.source);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl bg-slate-900/60 border border-slate-800 border-l-[3px] ${c.accent} p-4 transition-all hover:border-slate-600 hover:bg-slate-800/40`}
    >
      <div className="flex gap-3">
        <span className="text-lg font-bold text-slate-700 leading-none mt-0.5 flex-shrink-0 tabular-nums">
          {padRank(article.rank)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-semibold text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
            {article.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge source={article.source} />
            <FreshnessBadge freshness={article.freshness} />
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(article.pubDate)}
            </span>
          </div>
          {article.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.topics.map(t => <TopicTag key={t} topic={t} />)}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ---- News Ticker ----
function NewsTicker({ articles }) {
  const containerRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const duration = Math.max(20, articles.length * 3);

  if (articles.length < 4) return null;

  const tickerItems = articles.map((a, i) => {
    const c = getColor(a.source);
    const truncTitle = a.title.length > 65 ? a.title.slice(0, 62) + '...' : a.title;
    return (
      <span key={`${a.link}-${i}`} className="inline-flex items-center gap-2 px-4 whitespace-nowrap">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
        <span className="text-xs font-medium text-slate-300">{truncTitle}</span>
        <span className="text-[10px] text-slate-600">{formatRelativeTime(a.pubDate)}</span>
        <span className="text-slate-800">|</span>
      </span>
    );
  });

  return (
    <div
      className="relative rounded-xl bg-slate-900/80 border border-slate-800 py-2.5 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900/80 to-transparent z-10 pointer-events-none" />

      {/* Label */}
      <div className="absolute left-0 top-0 bottom-0 flex items-center z-20 pl-3 pr-2 bg-slate-900/90">
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-500">
          <TrendingUp className="w-3 h-3" />
          Live
        </span>
      </div>

      {/* Scrolling content */}
      <div
        ref={containerRef}
        className="flex animate-ticker-scroll"
        style={{
          '--ticker-duration': `${duration}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
          paddingLeft: '60px',
        }}
      >
        {/* Duplicate for seamless loop */}
        {tickerItems}
        {tickerItems}
      </div>
    </div>
  );
}

// ---- Main Story Card (left column) ----
function MainStoryCard({ article }) {
  const c = getColor(article.source);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block rounded-xl bg-slate-900/50 border border-slate-800 border-l-[3px] ${c.accent} p-4 transition-all hover:border-slate-600 hover:bg-slate-800/40 hover:shadow-md hover:shadow-slate-900/50`}
    >
      <h4 className="text-sm sm:text-base font-medium text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2.5">
        {article.title}
      </h4>
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={article.source} />
        <FreshnessBadge freshness={article.freshness} />
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(article.pubDate)}
        </span>
      </div>
      {article.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {article.topics.map(t => <TopicTag key={t} topic={t} />)}
        </div>
      )}
    </a>
  );
}

// ---- Compact Headline (right sidebar) ----
function CompactHeadline({ article }) {
  const c = getColor(article.source);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 py-2.5 border-b border-slate-800/50 last:border-b-0 transition-colors hover:bg-slate-800/20 -mx-2 px-2 rounded"
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${c.dot}`} />
      <div className="min-w-0 flex-1">
        <h5 className="text-sm text-slate-300 leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2">
          {article.title}
        </h5>
        <span className="text-[10px] text-slate-600 mt-0.5 block">
          {article.source} · {formatRelativeTime(article.pubDate)}
        </span>
      </div>
    </a>
  );
}

// ---- Source Spotlight Section ----
function SourceSpotlight({ source, articles, onViewSource }) {
  const c = getColor(source);
  if (articles.length === 0) return null;
  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${c.dot}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>From {source}</span>
        </div>
        <button
          type="button"
          onClick={() => onViewSource(source)}
          className={`text-[10px] font-medium ${c.text} hover:underline flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity`}
        >
          View all <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
      <div className="space-y-0">
        {articles.map((article, i) => (
          <a
            key={`${article.link}-${i}`}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-2 py-2 border-b border-slate-700/30 last:border-b-0"
          >
            <span className="text-[10px] font-bold text-slate-600 mt-0.5 tabular-nums">{padRank(i + 1)}</span>
            <h5 className="text-sm text-slate-300 leading-snug group-hover:text-white transition-colors line-clamp-2 flex-1">
              {article.title}
            </h5>
          </a>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Main component
// ========================================
export default function CryptoNewsFeed({ news = [] }) {
  const [activeSource, setActiveSource] = useState('All');
  const [showAll, setShowAll] = useState(false);

  // Unique sources with counts
  const sourceCounts = useMemo(() => {
    const counts = {};
    news.forEach(item => {
      if (item.source) counts[item.source] = (counts[item.source] || 0) + 1;
    });
    return counts;
  }, [news]);

  const sources = useMemo(() => {
    return Object.keys(sourceCounts).sort((a, b) => a.localeCompare(b));
  }, [sourceCounts]);

  // Filtered & enriched articles
  const enrichedArticles = useMemo(() => {
    const pool = activeSource === 'All' ? news : news.filter(item => item.source === activeSource);
    return pool.slice(0, MAX_ARTICLES).map((article, index) => ({
      ...article,
      topics: inferTopics(article.title),
      freshness: getFreshness(article.pubDate),
      rank: index + 1,
    }));
  }, [news, activeSource]);

  // Layout sections
  const isFullLayout = enrichedArticles.length >= 8;
  const topStories = isFullLayout ? enrichedArticles.slice(0, 5) : enrichedArticles.slice(0, 1);
  const leadStory = topStories[0];
  const secondaryStories = isFullLayout ? topStories.slice(1) : [];

  const mainGridArticles = isFullLayout ? enrichedArticles.slice(5) : enrichedArticles.slice(1);
  const INITIAL_SHOW = 16;
  const visibleMainGrid = showAll ? mainGridArticles : mainGridArticles.slice(0, INITIAL_SHOW);
  const hiddenCount = mainGridArticles.length - INITIAL_SHOW;

  // Split main grid into left (featured) and right (compact)
  const leftColumnCount = Math.ceil(visibleMainGrid.length * 0.45);
  const leftColumn = visibleMainGrid.slice(0, leftColumnCount);
  const rightColumn = visibleMainGrid.slice(leftColumnCount);

  // Source spotlight sections (only in "All" view)
  const sourceSections = useMemo(() => {
    if (activeSource !== 'All' || !isFullLayout) return [];
    const topSources = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([source]) => source);
    return topSources.map(source => ({
      source,
      articles: enrichedArticles
        .filter(a => a.source === source && a.rank > 5)
        .slice(0, 3),
    })).filter(s => s.articles.length > 0);
  }, [activeSource, sourceCounts, enrichedArticles, isFullLayout]);

  // Group remaining articles by time section (for the grid)
  const groupedLeft = useMemo(() => {
    const groups = [];
    let currentSection = null;
    leftColumn.forEach(article => {
      const section = getTimeSection(article.pubDate);
      if (section !== currentSection) {
        groups.push({ section, articles: [] });
        currentSection = section;
      }
      groups[groups.length - 1].articles.push(article);
    });
    return groups;
  }, [leftColumn]);

  // Empty state
  if (!news || news.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-10 text-center">
        <Newspaper className="mx-auto h-12 w-12 text-slate-600 mb-3" />
        <p className="text-sm text-slate-400">No crypto news available right now.</p>
        <p className="text-xs text-slate-600 mt-1">Check back shortly — feeds refresh every 2 minutes.</p>
      </div>
    );
  }

  // Empty filter state
  if (enrichedArticles.length === 0) {
    return (
      <div className="space-y-4">
        <SourceNavBar
          sources={sources}
          sourceCounts={sourceCounts}
          activeSource={activeSource}
          setActiveSource={setActiveSource}
          totalCount={news.length}
        />
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-500">
            No articles from <span className="text-slate-300 font-medium">{activeSource}</span> in this batch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Source Navigation */}
      <SourceNavBar
        sources={sources}
        sourceCounts={sourceCounts}
        activeSource={activeSource}
        setActiveSource={setActiveSource}
        totalCount={news.length}
      />

      {/* 2. Top Stories */}
      {leadStory && (
        <div className="space-y-3">
          <LeadStory article={leadStory} />
          {secondaryStories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {secondaryStories.map((article, i) => (
                <SecondaryStoryCard key={`${article.link}-${i}`} article={article} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. News Ticker */}
      {isFullLayout && <NewsTicker articles={enrichedArticles} />}

      {/* 4. Main News Grid */}
      {visibleMainGrid.length > 0 && (
        <>
          <SectionDivider label="Latest" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left column — featured cards */}
            <div className="lg:col-span-7 space-y-3">
              {groupedLeft.map(({ section, articles }) => (
                <div key={section} className="space-y-2.5">
                  {groupedLeft.length > 1 && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">{section}</span>
                  )}
                  {articles.map((article, i) => (
                    <MainStoryCard key={`${article.link}-${i}`} article={article} />
                  ))}
                </div>
              ))}
            </div>

            {/* Right column — compact headlines */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-slate-900/30 border border-slate-800 p-3">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Read</span>
                </div>
                {rightColumn.map((article, i) => (
                  <CompactHeadline key={`${article.link}-${i}`} article={article} />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 5. Source Spotlights */}
      {sourceSections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sourceSections.map(({ source, articles }) => (
            <SourceSpotlight
              key={source}
              source={source}
              articles={articles}
              onViewSource={setActiveSource}
            />
          ))}
        </div>
      )}

      {/* 6. Show more / less */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-800 text-sm text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800/30 transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show {hiddenCount} more stories
            </>
          )}
        </button>
      )}
    </div>
  );
}
