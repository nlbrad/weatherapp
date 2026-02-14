import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Search, X, Wallet, Loader } from 'lucide-react';
import { cryptoAPI } from '../../services/cryptoAPI';

const ALLOCATION_COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#a855f7',
];

function formatPrice(price) {
  if (price == null) return '—';
  const n = Number(price);
  if (Number.isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + n.toFixed(4);
}

function formatPnl(value) {
  if (value == null) return '—';
  const n = Number(value);
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 1000) return sign + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return sign + '$' + Math.abs(n).toFixed(2);
}

// ─── Stable modal component defined OUTSIDE of PortfolioTracker ───
function AddCoinModal({
  isOpen,
  editingIndex,
  formData,
  setFormData,
  searchQuery,
  setSearchQuery,
  searchResults,
  searching,
  onSearchChange,
  onSelectCoin,
  onSave,
  onClose,
  saving,
}) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {editingIndex != null ? 'Edit Holding' : 'Add Coin'}
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Coin search (only when adding) */}
          {editingIndex == null && (
            <div className="relative mb-4">
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-3">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={
                    formData.coinId
                      ? `${formData.name} (${formData.symbol})`
                      : searchQuery
                  }
                  onChange={e => {
                    setFormData(prev => ({
                      ...prev,
                      coinId: '',
                      symbol: '',
                      name: '',
                    }));
                    onSearchChange(e.target.value);
                  }}
                  placeholder="Search coin..."
                  className="w-full bg-transparent text-white text-sm py-2.5 px-2 focus:outline-none"
                />
                {searching && (
                  <Loader className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto z-10">
                  {searchResults.map(coin => (
                    <button
                      key={coin.id}
                      onClick={() => onSelectCoin(coin)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                    >
                      {coin.image && (
                        <img
                          src={coin.image}
                          alt=""
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      )}
                      <span>{coin.name}</span>
                      <span className="text-slate-400 text-xs uppercase">
                        {coin.symbol}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Show selected coin when editing */}
          {editingIndex != null && (
            <div className="mb-4 flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              {formData.image && (
                <img
                  src={formData.image}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span className="text-white text-sm font-medium">{formData.name}</span>
              <span className="text-slate-400 text-xs">{formData.symbol}</span>
            </div>
          )}

          {/* Amount */}
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">Amount</label>
            <input
              type="number"
              step="any"
              value={formData.amount}
              onChange={e =>
                setFormData(prev => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Buy Price */}
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">
              Buy Price (USD)
            </label>
            <input
              type="number"
              step="any"
              value={formData.buyPrice}
              onChange={e =>
                setFormData(prev => ({ ...prev, buyPrice: e.target.value }))
              }
              placeholder="0.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Buy Date */}
          <div className="mb-5">
            <label className="text-xs text-slate-400 mb-1 block">
              Buy Date (optional)
            </label>
            <input
              type="date"
              value={formData.buyDate}
              onChange={e =>
                setFormData(prev => ({ ...prev, buyDate: e.target.value }))
              }
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={
                !formData.coinId ||
                !formData.amount ||
                !formData.buyPrice ||
                saving
              }
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? 'Saving...'
                : editingIndex != null
                  ? 'Update'
                  : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main PortfolioTracker component ───
export default function PortfolioTracker({ userId, topCoins = [] }) {
  const [holdings, setHoldings] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState(0);
  const [totalPnlPercent, setTotalPnlPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    coinId: '',
    symbol: '',
    name: '',
    image: '',
    amount: '',
    buyPrice: '',
    buyDate: '',
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef(null);

  // Load portfolio
  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const data = await cryptoAPI.getPortfolio(userId);
      setHoldings(data.holdings || []);
      setTotalValue(data.totalValue || 0);
      setTotalPnl(data.totalPnl || 0);
      setTotalPnlPercent(data.totalPnlPercent || 0);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Save portfolio
  const savePortfolio = async (newHoldings) => {
    setSaving(true);
    try {
      const rawHoldings = newHoldings.map(h => ({
        coinId: h.coinId,
        symbol: h.symbol,
        name: h.name,
        image: h.image,
        amount: h.amount,
        buyPrice: h.buyPrice,
        buyDate: h.buyDate,
      }));
      await cryptoAPI.savePortfolio(userId, rawHoldings);
      await loadPortfolio();
    } catch (err) {
      console.error('Failed to save portfolio:', err);
    } finally {
      setSaving(false);
    }
  };

  // Search coins (debounced)
  const handleSearchChange = useCallback(
    query => {
      setSearchQuery(query);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (!query || query.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchTimerRef.current = setTimeout(async () => {
        try {
          const data = await cryptoAPI.searchCoins(query);
          setSearchResults(data.searchResults || []);
        } catch {
          const filtered = topCoins
            .filter(
              c =>
                c.name?.toLowerCase().includes(query.toLowerCase()) ||
                c.symbol?.toLowerCase().includes(query.toLowerCase()),
            )
            .slice(0, 8);
          setSearchResults(filtered);
        } finally {
          setSearching(false);
        }
      }, 300);
    },
    [topCoins],
  );

  const selectCoin = useCallback(coin => {
    setFormData(prev => ({
      ...prev,
      coinId: coin.id,
      symbol: coin.symbol?.toUpperCase(),
      name: coin.name,
      image: coin.image || '',
    }));
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const openAddModal = useCallback(() => {
    setEditingIndex(null);
    setFormData({
      coinId: '',
      symbol: '',
      name: '',
      image: '',
      amount: '',
      buyPrice: '',
      buyDate: '',
    });
    setSearchQuery('');
    setSearchResults([]);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    index => {
      const h = holdings[index];
      setEditingIndex(index);
      setFormData({
        coinId: h.coinId,
        symbol: h.symbol,
        name: h.name,
        image: h.image || '',
        amount: String(h.amount),
        buyPrice: String(h.buyPrice),
        buyDate: h.buyDate || '',
      });
      setSearchQuery('');
      setSearchResults([]);
      setModalOpen(true);
    },
    [holdings],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSaveHolding = useCallback(() => {
    if (!formData.coinId || !formData.amount || !formData.buyPrice) return;
    const newHolding = {
      coinId: formData.coinId,
      symbol: formData.symbol,
      name: formData.name,
      image: formData.image,
      amount: parseFloat(formData.amount),
      buyPrice: parseFloat(formData.buyPrice),
      buyDate: formData.buyDate || new Date().toISOString().split('T')[0],
    };
    let newHoldings;
    if (editingIndex != null) {
      newHoldings = [...holdings];
      newHoldings[editingIndex] = {
        ...newHoldings[editingIndex],
        ...newHolding,
      };
    } else {
      newHoldings = [...holdings, newHolding];
    }
    savePortfolio(newHoldings);
    setModalOpen(false);
  }, [formData, editingIndex, holdings]);

  const handleDelete = useCallback(
    index => {
      if (!window.confirm(`Remove ${holdings[index].symbol} from portfolio?`))
        return;
      const newHoldings = holdings.filter((_, i) => i !== index);
      savePortfolio(newHoldings);
    },
    [holdings],
  );

  // --- Modal (stable component, defined outside) ---
  const modal = (
    <AddCoinModal
      isOpen={modalOpen}
      editingIndex={editingIndex}
      formData={formData}
      setFormData={setFormData}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      searchResults={searchResults}
      searching={searching}
      onSearchChange={handleSearchChange}
      onSelectCoin={selectCoin}
      onSave={handleSaveHolding}
      onClose={closeModal}
      saving={saving}
    />
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Empty state
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-12 text-center">
        <Wallet className="mx-auto h-16 w-16 text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Holdings Yet</h3>
        <p className="text-slate-400 text-sm mb-6">
          Add your first holding to start tracking your portfolio.
        </p>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Add Coin
        </button>
        {modal}
      </div>
    );
  }

  // Allocation data
  const allocationData = holdings
    .map((h, i) => ({
      symbol: h.symbol,
      value: h.value || 0,
      color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
      pct: totalValue > 0 ? ((h.value || 0) / totalValue) * 100 : 0,
    }))
    .filter(a => a.pct > 0);

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-400 mb-1">Portfolio Value</p>
          <p className="text-3xl font-bold text-white">
            {formatPrice(totalValue)}
          </p>
          <p
            className={`text-sm font-medium mt-1 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {formatPnl(totalPnl)} ({totalPnlPercent >= 0 ? '+' : ''}
            {totalPnlPercent.toFixed(1)}%)
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" /> Add Coin
        </button>
      </div>

      {/* Holdings Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="px-4 py-2.5 text-left text-xs font-medium uppercase text-slate-400">
                Coin
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                Amount
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                Avg Buy
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                Current
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                Value
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                P&L
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((h, idx) => {
              const rowBg =
                idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-transparent';
              const pnlColor =
                (h.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400';
              return (
                <tr
                  key={`${h.coinId}-${idx}`}
                  className={`${rowBg} border-b border-slate-800/40`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {h.image && (
                        <img
                          src={h.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <span className="font-medium text-white">{h.symbol}</span>
                      <span className="text-xs text-slate-500">{h.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-slate-200">
                    {h.amount}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-300">
                    {formatPrice(h.buyPrice)}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-200">
                    {formatPrice(h.currentPrice)}
                  </td>
                  <td className="px-3 py-3 text-right text-white font-medium">
                    {formatPrice(h.value)}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-medium ${pnlColor}`}
                  >
                    {formatPnl(h.pnl)}
                    <span className="block text-xs opacity-75">
                      ({(h.pnlPercent || 0) >= 0 ? '+' : ''}
                      {(h.pnlPercent || 0).toFixed(1)}%)
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(idx)}
                        className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Allocation Bar */}
      {allocationData.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400 mb-3 font-medium">Allocation</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {allocationData.map((a, i) => (
              <div
                key={a.symbol}
                style={{ width: `${a.pct}%`, backgroundColor: a.color }}
                className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === allocationData.length - 1 ? 'rounded-r-full' : ''}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {allocationData.map(a => (
              <div key={a.symbol} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <span className="text-xs text-slate-300">
                  {a.symbol} {a.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal}
    </div>
  );
}
