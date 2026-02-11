import React, { useState } from 'react';
import { X, Search, RotateCcw, Plus, Check,
  Cloud, Calendar, Star, Heart, Mountain } from 'lucide-react';
import { WIDGET_REGISTRY, WIDGET_CATEGORIES } from './widgetRegistry';

/**
 * WidgetCatalog - Slide-out drawer for adding/removing widgets
 */

const CATEGORY_ICONS = {
  weather: Cloud,
  forecast: Calendar,
  astronomy: Star,
  health: Heart,
  activities: Mountain,
};

const WidgetCatalog = ({ enabledWidgets, onAddWidget, onRemoveWidget, onReset, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(WIDGET_CATEGORIES)
  );

  const toggleCategory = (cat) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Group widgets by category
  const widgetsByCategory = {};
  Object.values(WIDGET_REGISTRY).forEach(widget => {
    if (!widgetsByCategory[widget.category]) {
      widgetsByCategory[widget.category] = [];
    }
    widgetsByCategory[widget.category].push(widget);
  });

  // Filter by search
  const matchesSearch = (widget) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return widget.name.toLowerCase().includes(q) ||
           widget.description.toLowerCase().includes(q);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-sm bg-slate-950 border-l border-slate-800 h-full overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">Widget Catalog</h3>
          <button onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg
                text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Widget list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {Object.entries(WIDGET_CATEGORIES).map(([catId, catInfo]) => {
            const widgets = (widgetsByCategory[catId] || []).filter(matchesSearch);
            if (widgets.length === 0) return null;

            const IconComponent = CATEGORY_ICONS[catId] || Cloud;
            const isExpanded = expandedCategories.includes(catId);

            return (
              <div key={catId}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(catId)}
                  className="flex items-center gap-2 w-full mb-2 group"
                >
                  <IconComponent className={`w-4 h-4 ${catInfo.color}`} />
                  <span className="text-sm font-semibold text-slate-300 group-hover:text-white">
                    {catInfo.label}
                  </span>
                  <span className="text-xs text-slate-600 ml-auto">
                    {widgets.filter(w => enabledWidgets.includes(w.id)).length}/{widgets.length}
                  </span>
                </button>

                {/* Widgets in category */}
                {isExpanded && (
                  <div className="space-y-2 ml-6">
                    {widgets.map(widget => {
                      const isEnabled = enabledWidgets.includes(widget.id);
                      return (
                        <div key={widget.id}
                          className="flex items-center justify-between p-2.5 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors">
                          <div className="min-w-0 mr-3">
                            <p className="text-sm font-medium text-white truncate">{widget.name}</p>
                            <p className="text-xs text-slate-500 truncate">{widget.description}</p>
                          </div>
                          <button
                            onClick={() => isEnabled ? onRemoveWidget(widget.id) : onAddWidget(widget.id)}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                              isEnabled
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {isEnabled ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 flex-shrink-0">
          <button
            onClick={onReset}
            className="flex items-center gap-2 w-full justify-center py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default Layout
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetCatalog;
