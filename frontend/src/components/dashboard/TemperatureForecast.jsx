import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Cloud, Sun, CloudRain, CloudSnow } from 'lucide-react';
import { format } from 'date-fns';

/**
 * TemperatureForecast - 7-day temperature line chart
 * 
 * Features:
 * - High/low temperature lines
 * - Weather condition icons
 * - Interactive tooltip
 * - Responsive design
 */

const TemperatureForecast = ({ forecast, compact = false }) => {
  if (!forecast || !forecast.daily) {
    return (
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <p className="text-gray-400">Forecast data unavailable</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = forecast.daily.map((day) => {
    const date = new Date(day.date);
    return {
      date: format(date, 'EEE'), // Mon, Tue, Wed...
      fullDate: format(date, 'MMM d'), // Jan 23
      high: Math.round(day.tempHigh),
      low: Math.round(day.tempLow),
      condition: day.condition,
      icon: day.icon,
      pop: Math.round(day.pop * 100), // Precipitation probability
      humidity: day.humidity
    };
  });

  // Get weather icon component
  const getWeatherIcon = (condition) => {
    const iconClass = "w-5 h-5";
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className={`${iconClass} text-accent-orange`} />;
      case 'clouds':
        return <Cloud className={`${iconClass} text-gray-400`} />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className={`${iconClass} text-blue-400`} />;
      case 'snow':
        return <CloudSnow className={`${iconClass} text-blue-200`} />;
      default:
        return <Cloud className={`${iconClass} text-gray-400`} />;
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-elevated border border-dark-border rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-accent-orange">High:</span>
              <span className="text-white font-mono">{data.high}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400">Low:</span>
              <span className="text-white font-mono">{data.low}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Rain:</span>
              <span className="text-white font-mono">{data.pop}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Humidity:</span>
              <span className="text-white font-mono">{data.humidity}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get temperature range for context
  const allTemps = chartData.flatMap(d => [d.high, d.low]);
  const maxTemp = Math.max(...allTemps);
  const minTemp = Math.min(...allTemps);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              7-Day Forecast
            </h3>
            <p className="text-sm text-gray-400 mt-1">Temperature trends</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Range</p>
            <p className="text-sm font-semibold text-white">
              {minTemp}° - {maxTemp}°C
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={compact ? "p-4" : "p-6"}>
        <div style={{ width: '100%', height: compact ? '200px' : '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                style={{ fontSize: compact ? '10px' : '12px' }}
              />
              <YAxis 
                stroke="#666"
                style={{ fontSize: compact ? '10px' : '12px' }}
                domain={[minTemp - 2, maxTemp + 2]}
                tickFormatter={(value) => `${value}°`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                iconType="line"
              />
              <Line 
                type="monotone" 
                dataKey="high" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={{ fill: '#f97316', r: 3 }}
                activeDot={{ r: 5 }}
                name="High"
              />
              <Line 
                type="monotone" 
                dataKey="low" 
                stroke="#60a5fa" 
                strokeWidth={2}
                dot={{ fill: '#60a5fa', r: 3 }}
                activeDot={{ r: 5 }}
                name="Low"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Details - Hide in compact mode */}
        {!compact && (
          <div className="grid grid-cols-7 gap-2 mt-6">
            {chartData.map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-dark-elevated border border-dark-border rounded-lg p-3 text-center"
            >
              <p className="text-xs text-gray-400 mb-2">{day.date}</p>
              <div className="flex justify-center mb-2">
                {getWeatherIcon(day.condition)}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-accent-orange">{day.high}°</p>
                <p className="text-xs text-blue-400">{day.low}°</p>
              </div>
              {day.pop > 30 && (
                <p className="text-xs text-blue-400 mt-1">
                  💧 {day.pop}%
                </p>
              )}
            </motion.div>
          ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TemperatureForecast;