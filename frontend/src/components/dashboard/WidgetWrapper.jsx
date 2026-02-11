import React, { Suspense } from 'react';
import { GripVertical, X } from 'lucide-react';
import WidgetErrorBoundary from './WidgetErrorBoundary';
import WidgetSkeleton from './WidgetSkeleton';

const WidgetWrapper = ({ id, title, icon: IconName, isEditing, onRemove, loading, children }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isEditing && (
            <div className="widget-drag-handle cursor-grab active:cursor-grabbing p-0.5 text-slate-500 hover:text-slate-300 transition-colors">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <h3 className="text-sm font-medium text-slate-300 truncate">{title}</h3>
        </div>
        {isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.(id);
            }}
            className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : (
          <WidgetErrorBoundary widgetId={id}>
            <Suspense fallback={<WidgetSkeleton />}>
              {children}
            </Suspense>
          </WidgetErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default React.memo(WidgetWrapper);
