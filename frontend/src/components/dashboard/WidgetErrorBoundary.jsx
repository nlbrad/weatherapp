import React from 'react';
import { AlertTriangle } from 'lucide-react';

class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Widget error (${this.props.widgetId}):`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-slate-500 mb-2" />
          <p className="text-sm text-slate-400">Widget failed to load</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-xs text-cyan-400 hover:text-cyan-300"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;
