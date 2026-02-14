/**
 * CryptoNewsFeed.jsx - Engaging crypto news layout
 *
 * Features:
 * - Hero card for the latest story
 * - Two-column grid for remaining articles
 * - Source filter chips with article counts
 * - Color-coded source badges
 * - Relative timestamps
 * - Time-section grouping (Today, Yesterday, Earlier)
 */

import React, { useState, useMemo } from 'react';
import { Clock, ExternalLink, Newspaper, ChevronDown, ChevronUp } from 'lucide-react';

// ========================================
// Source colour map — 10 sources
// ========================================
const SOURCE_COLORS = {
  CoinDesk:           { bg: 'bg-blue-500/15',   text: 'text-blue-400',   border: 'border-blue-500/25',   dot: 'bg-blue-400' },
  'The Block':        { bg: 'bg-purple-500/15',  text: 'text-purple-400', border: 'border-purple-500/25', dot: 'bg-purple-400' },
  'DL News':          { bg: 'bg-rose-500/15',    text: 'text-rose-400',   border: 'border-rose-500/25',   dot: 'bg-rose-400' },
  Decrypt:            { bg: 'bg-green-500/15',   text: 'text-green-400',  border: 'border-green-500/25',  dot: 'bg-green-400' },
  CoinTelegraph:      { bg: 'bg-amber-500/15',   text: 'text-amber-400',  border: 'border-amber-500/25',  dot: 'bg-amber-400' },
  Blockworks:         { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',   border: 'border-cyan-500/25',   dot: 'bg-cyan-400' },
  'Bitcoin Magazine': { bg: 'bg-orange-500/15',  text: 'text-orange-400', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  'The Defiant':      { bg: 'bg-pink-500/15',    text: 'text-pink-400',   border: 'border-pink-500/25',   dot: 'bg-pink-400' },
  CryptoSlate:        { bg: 'bg-indigo-500/15',  text: 'text-indigo-400', border: 'border-indigo-500/25', dot: 'bg-indigo-400' },
  Unchained:          { bg: 'bg-teal-500/15',    text: 'text-teal-400',   border: 'border-teal-500/25',   dot: 'bg-teal-400' },
};

const DEFAULT_COLOR = { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/25', dot: 'bg-slate-400' };
const MAX_ARTICLES = 30;

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

// ========================================
// Subcomponents
// ========================================

/** Source badge pill */
function SourceBadge({ source, className = '' }) {
  const c = getColor(source);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${c.bg} ${c.text} ${c.border} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {source}
    </span>
  );
}

/** Hero / featured article card */
function HeroCard({ article }) {
  const c = getColor(article.source);
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/60 p-6 transition-all hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <SourceBadge source={article.source} />
        <span className="text-[11px] text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(article.pubDate)}
        </span>
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white leading-snug group-hover:text-cyan-400 transition-colors mb-2">
        {article.title}
      </h3>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-cyan-500 transition-colors">
        Read full story
        <ExternalLink className="w-3 h-3" />
      </div>
    </a>
  );
}

/** Standard article card */
function ArticleCard({ article }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl bg-slate-900/50 border border-slate-800 p-4 transition-all hover:border-slate-600 hover:bg-slate-800/40"
    >
      <h4 className="text-sm font-medium text-white leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2.5">
        {article.title}
      </h4>
      <div className="flex items-center justify-between gap-2">
        <SourceBadge source={article.source} />
        <span className="text-[11px] text-slate-500 flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3" />
          {formatRelativeTime(article.pubDate)}
        </span>
      </div>
    </a>
  );
}

/** Time-section heading */
function SectionHeading({ label }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex-1 h-px bg-slate-800" />
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

  // Filtered articles
  const filteredArticles = useMemo(() => {
    const pool = activeSource === 'All' ? news : news.filter(item => item.source === activeSource);
    return pool.slice(0, MAX_ARTICLES);
  }, [news, activeSource]);

  // Split: hero (1st), rest grouped by time section
  const hero = filteredArticles[0];
  const rest = filteredArticles.slice(1);

  const INITIAL_SHOW = 8;
  const visibleRest = showAll ? rest : rest.slice(0, INITIAL_SHOW);

  // Group visible articles by time section
  const grouped = useMemo(() => {
    const groups = [];
    let currentSection = null;
    visibleRest.forEach(article => {
      const section = getTimeSection(article.pubDate);
      if (section !== currentSection) {
        groups.push({ section, articles: [] });
        currentSection = section;
      }
      groups[groups.length - 1].articles.push(article);
    });
    return groups;
  }, [visibleRest]);

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

  return (
    <div className="space-y-5">
      {/* Source filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveSource('All')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            activeSource === 'All'
              ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
          }`}
        >
          All
          <span className="ml-1.5 text-[10px] opacity-70">{news.length}</span>
        </button>
        {sources.map(source => {
          const isActive = activeSource === source;
          const c = getColor(source);
          return (
            <button
              key={source}
              type="button"
              onClick={() => setActiveSource(source)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isActive
                  ? `${c.bg} ${c.text} border ${c.border}`
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-transparent'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              {source}
              <span className="text-[10px] opacity-60">{sourceCounts[source]}</span>
            </button>
          );
        })}
      </div>

      {/* Empty filter state */}
      {filteredArticles.length === 0 ? (
        <div className="rounded-xl bg-slate-900/50 border border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-500">
            No articles from <span className="text-slate-300 font-medium">{activeSource}</span> in this batch.
          </p>
        </div>
      ) : (
        <>
          {/* Hero article */}
          {hero && <HeroCard article={hero} />}

          {/* Grouped articles */}
          {grouped.map(({ section, articles }) => (
            <div key={section} className="space-y-3">
              <SectionHeading label={section} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {articles.map((article, i) => (
                  <ArticleCard key={`${article.link}-${i}`} article={article} />
                ))}
              </div>
            </div>
          ))}

          {/* Show more / less */}
          {rest.length > INITIAL_SHOW && (
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
                  Show {rest.length - INITIAL_SHOW} more stories
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
