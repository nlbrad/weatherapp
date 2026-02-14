/**
 * DigestSettings.jsx - Crypto Digest Telegram Settings
 *
 * Slide-over panel for managing crypto digest delivery:
 * - Toggle on/off
 * - Set delivery times (multiple per day)
 * - Reads/writes via preferencesAPI
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, Plus, Trash2, Loader, Check, Bell } from 'lucide-react';
import { preferencesAPI } from '../../services/api';

const DEFAULT_TIMES = ['08:00', '20:00'];
const MAX_TIMES = 6;

const DigestSettings = ({ userId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState([...DEFAULT_TIMES]);
  const [preferences, setPreferences] = useState(null);

  // Load preferences
  useEffect(() => {
    const load = async () => {
      try {
        const data = await preferencesAPI.getPreferences(userId);
        const prefs = data?.preferences || {};
        setPreferences(prefs);
        setEnabled(prefs.alertTypes?.cryptoDigest || false);
        setTimes(prefs.cryptoDigestTimes || [...DEFAULT_TIMES]);
      } catch (err) {
        console.error('Failed to load preferences:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  // Save preferences
  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedPrefs = {
        ...preferences,
        alertTypes: {
          ...preferences?.alertTypes,
          cryptoDigest: enabled,
        },
        cryptoDigestTimes: times,
      };
      await preferencesAPI.savePreferences(userId, updatedPrefs);
      setPreferences(updatedPrefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const addTime = () => {
    if (times.length >= MAX_TIMES) return;
    setTimes([...times, '12:00']);
  };

  const removeTime = (index) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  const updateTime = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-800 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Crypto Digest</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Enable Toggle */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">Telegram Delivery</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Receive crypto market updates via Telegram
                    </p>
                  </div>
                  <button
                    onClick={() => setEnabled(!enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-cyan-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Delivery Times */}
              {enabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-white">Delivery Times (UTC)</span>
                    </div>
                    {times.length < MAX_TIMES && (
                      <button
                        onClick={addTime}
                        className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {times.map((time, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => updateTime(index, e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                        />
                        {times.length > 1 && (
                          <button
                            onClick={() => removeTime(index)}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-500">
                    Up to {MAX_TIMES} delivery times per day. Times are in UTC.
                  </p>
                </div>
              )}

              {/* What's included */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-white">What's included</span>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-2">
                  {[
                    'BTC, ETH & market prices (24h change)',
                    'S&P 500 & Gold prices',
                    'Fear & Greed Index',
                    'Top crypto news (7 articles)',
                    'DeFi metrics (TVL, DEX volume)',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                saved
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
              }`}
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default DigestSettings;
