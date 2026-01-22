import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

/**
 * StatusIndicator - Color-coded status badge with gradients
 * 
 * Statuses: excellent, good, moderate, poor, critical
 */

const StatusIndicator = ({ 
  status, 
  label, 
  description,
  showIcon = true 
}) => {
  const statusConfig = {
    excellent: {
      gradient: ['#10B981', '#34D399'], // green gradient
      bg: 'bg-accent-green/10',
      border: 'border-accent-green/30',
      icon: CheckCircle2,
      text: 'Good', // Changed from 'Excellent' to match OpenWeather AQI 1
      textColor: '#10B981'
    },
    good: {
      gradient: ['#3B82F6', '#60A5FA'], // blue gradient
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: CheckCircle2,
      text: 'Fair', // Changed from 'Good' to match OpenWeather AQI 2
      textColor: '#3B82F6'
    },
    moderate: {
      gradient: ['#F59E0B', '#FBBF24'], // orange gradient
      bg: 'bg-accent-orange/10',
      border: 'border-accent-orange/30',
      icon: AlertTriangle,
      text: 'Moderate',
      textColor: '#F59E0B'
    },
    poor: {
      gradient: ['#EF4444', '#F87171'], // red gradient
      bg: 'bg-accent-red/10',
      border: 'border-accent-red/30',
      icon: AlertCircle,
      text: 'Poor',
      textColor: '#EF4444'
    },
    critical: {
      gradient: ['#DC2626', '#EF4444'], // dark red gradient
      bg: 'bg-accent-red/20',
      border: 'border-accent-red/50',
      icon: XCircle,
      text: 'Very Poor', // Changed from 'Critical' to match OpenWeather AQI 5
      textColor: '#DC2626'
    }
  };

  const config = statusConfig[status] || statusConfig.good;
  const Icon = config.icon;

  return (
    <div className={`
      px-4 py-3 rounded-lg border
      ${config.bg} ${config.border}
      backdrop-blur-sm
    `}>
      <div className="flex items-start space-x-3">
        {showIcon && (
          <Icon 
            className="w-5 h-5 flex-shrink-0 mt-0.5" 
            style={{ color: config.textColor }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <span 
              className={`
                text-xs font-bold px-3 py-1 rounded-full
                ${config.bg} border ${config.border}
              `}
              style={{ color: config.textColor }}
            >
              {config.text}
            </span>
          </div>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
      </div>
      
      {/* Gradient underline */}
      <div 
        className="h-0.5 w-full mt-2 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${config.gradient.join(', ')})`
        }}
      />
    </div>
  );
};

export default StatusIndicator;