import React from 'react';

const WidgetSkeleton = () => (
  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 h-full animate-pulse">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 bg-slate-800 rounded-lg" />
      <div className="h-4 w-24 bg-slate-800 rounded" />
    </div>
    <div className="space-y-3">
      <div className="h-3 w-full bg-slate-800 rounded" />
      <div className="h-3 w-3/4 bg-slate-800 rounded" />
      <div className="h-3 w-1/2 bg-slate-800 rounded" />
    </div>
  </div>
);

export default WidgetSkeleton;
