import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Clock, Droplets } from 'lucide-react';
import { format } from 'date-fns';

/**
 * HourlyForecast - 24-hour temperature bar chart
 * 
 * Features:
 * - Temperature bars by hour
 * - Precipitation probability overlay
 * - Interactive tooltip
 * - Scrollable on mobile
 */

const HourlyForecast = ({ forecast, compact = false }) => {
  if (!forecast || !forecast.hourly) {
    return (
      <div className="bg-dark-surface border border-dark-border rounded-xl p-6">
        <p className="text-gray-400">Hourly forecast data unavailable</p>
      </div>
    );
  }

  // Prepare chart data (show every 3 hours for readability)
  const chartData = forecast.hourly
    .filter((_, index) => index % 3 === 0) // Every 3 hours
    .map((hour) => {
      const time = new Date(hour.time);
      return {
        time: format(time, 'HH:mm'), // 14:00
        hour: format(time, 'ha'), // 2pm
        temp: Math.round(hour.temp),
        feelsLike: Math.round(hour.feelsLike),
        pop: Math.round(hour.pop * 100), // Precipitation probability
        rain: hour.rain || 0,
        humidity: hour.humidity,
        windSpeed: Math.round(hour.windSpeed),
        condition: hour.condition
      };
    });

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-elevated border border-dark-border rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.time}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Temp:</span>
              <span className="text-white font-mono">{data.temp}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Feels:</span>
              <span className="text-white font-mono">{data.feelsLike}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Rain:</span>
              <span className="text-white font-mono">{data.pop}%</span>
            </div>
            {data.rain > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-mono">{data.rain.toFixed(1)}mm</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400">Wind:</span>
              <span className="text-white font-mono">{data.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get temperature range
  const temps = chartData.map(d => d.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);

  // Find peak rain time
  const maxRain = Math.max(...chartData.map(d => d.pop));
  const peakRainTime = chartData.find(d => d.pop === maxRain);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-dark-surface border border-dark-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              24-Hour Forecast
            </h3>
            <p className="text-sm text-gray-400 mt-1">Temperature by hour</p>
          </div>
          <div className="text-right">
            {maxRain > 30 && (
              <div className="flex items-center gap-2 text-blue-400">
                <Droplets className="w-4 h-4" />
                <div>
                  <p className="text-xs text-gray-400">Peak rain</p>
                  <p className="text-sm font-semibold">
                    {peakRainTime?.hour} ({maxRain}%)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={compact ? "p-4" : "p-6"}>
        <div style={{ width: '100%', height: compact ? '200px' : '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis 
                dataKey="hour" 
                stroke="#666"
                style={{ fontSize: compact ? '10px' : '12px' }}
              />
              <YAxis 
                yAxisId="temp"
                stroke="#666"
                style={{ fontSize: compact ? '10px' : '12px' }}
                domain={[minTemp - 2, maxTemp + 2]}
                tickFormatter={(value) => `${value}°`}
              />
              <YAxis 
                yAxisId="pop"
                orientation="right"
                stroke="#60a5fa"
                style={{ fontSize: compact ? '10px' : '12px' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
              />
              <Bar 
                yAxisId="temp"
                dataKey="temp" 
                fill="#f97316" 
                radius={[4, 4, 0, 0]}
                name="Temperature (°C)"
              />
              <Bar 
                yAxisId="pop"
                dataKey="pop" 
                fill="#60a5fa" 
                radius={[4, 4, 0, 0]}
                opacity={0.6}
                name="Rain Chance (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats - Hide in compact mode */}
        {!compact && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Avg Temp</p>
            <p className="text-lg font-bold text-white">
              {Math.round(temps.reduce((a, b) => a + b) / temps.length)}°C
            </p>
          </div>
          <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">High/Low</p>
            <p className="text-lg font-bold text-white">
              {maxTemp}° / {minTemp}°
            </p>
          </div>
          <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Max Rain</p>
            <p className="text-lg font-bold text-blue-400">
              {maxRain}%
            </p>
          </div>
          <div className="bg-dark-elevated border border-dark-border rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Avg Wind</p>
            <p className="text-lg font-bold text-accent-green">
              {Math.round(chartData.reduce((a, b) => a + b.windSpeed, 0) / chartData.length)} km/h
            </p>
          </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HourlyForecast;