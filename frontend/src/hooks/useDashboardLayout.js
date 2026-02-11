/**
 * useDashboardLayout - Custom hook for dashboard layout state management
 *
 * Handles layout persistence via localStorage (instant) and preferencesAPI (cloud backup).
 * Manages enabled widgets list and grid layouts for all breakpoints.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { preferencesAPI } from '../services/api';
import { DEFAULT_LAYOUTS, DEFAULT_ENABLED_WIDGETS, WIDGET_REGISTRY } from '../components/dashboard/widgetRegistry';

const STORAGE_KEY_PREFIX = 'dashboard_layout_v1_';
const SAVE_DEBOUNCE_MS = 1000;

const getStorageKey = (locationId) => `${STORAGE_KEY_PREFIX}${locationId}`;

const useDashboardLayout = (locationId, userId) => {
  const [layouts, setLayouts] = useState(null);
  const [enabledWidgets, setEnabledWidgets] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef(null);
  const initialRenderRef = useRef(true);

  // Load layout from localStorage first, then API
  useEffect(() => {
    const load = async () => {
      const storageKey = getStorageKey(locationId);

      // Try localStorage first (instant)
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.layouts && parsed.enabledWidgets) {
            setLayouts(parsed.layouts);
            setEnabledWidgets(parsed.enabledWidgets);
            setIsLoaded(true);
          }
        }
      } catch (e) {
        console.warn('Failed to load layout from localStorage:', e);
      }

      // Try API (cloud backup) - overwrites if present
      try {
        if (userId) {
          const prefs = await preferencesAPI.getPreferences(userId);
          const dashLayout = prefs?.preferences?.dashboardLayouts?.[locationId];
          if (dashLayout?.layouts && dashLayout?.enabledWidgets) {
            setLayouts(dashLayout.layouts);
            setEnabledWidgets(dashLayout.enabledWidgets);
          }
        }
      } catch (e) {
        // API might not have layout data yet, that's fine
        console.warn('Failed to load layout from API:', e);
      }

      // Set defaults if nothing was loaded
      setLayouts(prev => prev || DEFAULT_LAYOUTS);
      setEnabledWidgets(prev => prev || [...DEFAULT_ENABLED_WIDGETS]);
      setIsLoaded(true);
    };

    load();
  }, [locationId, userId]);

  // Save to localStorage immediately, debounce API save
  const persistLayout = useCallback((newLayouts, newEnabledWidgets) => {
    const storageKey = getStorageKey(locationId);

    // localStorage (instant)
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        layouts: newLayouts,
        enabledWidgets: newEnabledWidgets,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Failed to save layout to localStorage:', e);
    }

    // API (debounced)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        if (!userId) return;
        const prefs = await preferencesAPI.getPreferences(userId);
        const existingPrefs = prefs?.preferences || {};
        const dashboardLayouts = existingPrefs.dashboardLayouts || {};
        dashboardLayouts[locationId] = {
          layouts: newLayouts,
          enabledWidgets: newEnabledWidgets,
          updatedAt: new Date().toISOString(),
        };
        await preferencesAPI.savePreferences(userId, {
          ...existingPrefs,
          dashboardLayouts,
        });
      } catch (e) {
        console.warn('Failed to save layout to API:', e);
      }
    }, SAVE_DEBOUNCE_MS);
  }, [locationId, userId]);

  // Handle layout change from react-grid-layout
  // Skip persisting on the first couple of calls (initial render + breakpoint adjustment)
  const handleLayoutChange = useCallback((currentLayout, allLayouts) => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    setLayouts(allLayouts);
    persistLayout(allLayouts, enabledWidgets);
  }, [enabledWidgets, persistLayout]);

  // Add a widget
  const addWidget = useCallback((widgetId) => {
    const config = WIDGET_REGISTRY[widgetId];
    if (!config || enabledWidgets?.includes(widgetId)) return;

    const newEnabled = [...(enabledWidgets || []), widgetId];
    setEnabledWidgets(newEnabled);

    // Add to layouts with default position at bottom
    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach(breakpoint => {
      const layout = newLayouts[breakpoint] || [];
      const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
      const bpSize = breakpoint === 'xs' ? { w: 2, h: config.defaultSize.h }
        : breakpoint === 'sm' ? { w: Math.min(config.defaultSize.w, 4), h: config.defaultSize.h }
        : breakpoint === 'md' ? { w: Math.min(config.defaultSize.w, 8), h: config.defaultSize.h }
        : config.defaultSize;
      newLayouts[breakpoint] = [...layout, { i: widgetId, x: 0, y: maxY, ...bpSize }];
    });
    setLayouts(newLayouts);
    persistLayout(newLayouts, newEnabled);
  }, [enabledWidgets, layouts, persistLayout]);

  // Remove a widget
  const removeWidget = useCallback((widgetId) => {
    const newEnabled = (enabledWidgets || []).filter(id => id !== widgetId);
    setEnabledWidgets(newEnabled);

    const newLayouts = { ...layouts };
    Object.keys(newLayouts).forEach(breakpoint => {
      newLayouts[breakpoint] = (newLayouts[breakpoint] || []).filter(item => item.i !== widgetId);
    });
    setLayouts(newLayouts);
    persistLayout(newLayouts, newEnabled);
  }, [enabledWidgets, layouts, persistLayout]);

  // Reset to defaults
  const resetLayout = useCallback(() => {
    setLayouts(DEFAULT_LAYOUTS);
    setEnabledWidgets([...DEFAULT_ENABLED_WIDGETS]);
    persistLayout(DEFAULT_LAYOUTS, [...DEFAULT_ENABLED_WIDGETS]);
  }, [persistLayout]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return {
    layouts,
    enabledWidgets: enabledWidgets || [],
    isLoaded,
    handleLayoutChange,
    addWidget,
    removeWidget,
    resetLayout,
  };
};

export default useDashboardLayout;
