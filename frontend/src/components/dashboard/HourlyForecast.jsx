import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Bar } from 'recharts';
import { Clock, Cloud, Sun, CloudRain, CloudSnow } from 'lucide-react';

/**
 * HourlyForecast - 24-hour forecast with line chart
 * 
 * Features:
 * - Temperature line chart (matching 7-day design)
 * - Rain probability overlay
 * - Hourly detail cards
 * - Interactive tooltip
 */

const HourlyForecast = ({ forecast, compact = false }) => {
  if (!forecast || !forecast.hourly) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <p className="text-slate-400">Hourly forecast unavailable</p>
      </div>
    );
  }

  // Get timezone from forecast
  const timezone = forecast.current?.timezone || 'UTC';

  // Helper to format time in location's timezone
  const formatTimeInZone = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    });
  };

  // Prepare chart data - show every hour for chart, every 3 hours for cards
  const allHourlyData = forecast.hourly.slice(0, 24).map((hour) => {
    return {
      time: formatTimeInZone(hour.time),
      temp: Math.round(hour.temp),
      feelsLike: Math.round(hour.feelsLike),
      condition: hour.condition,
      description: hour.description,
      pop: Math.round(hour.pop * 100),
      rain: hour.rain || 0,
      snow: hour.snow || 0,
      windSpeed: Math.round(hour.windSpeed),
      humidity: hour.humidity
    };
  });

  // Use every 3rd hour for the chart (8 data points for readability)
  const chartData = allHourlyData.filter((_, index) => index % 3 === 0);

  // Get weather icon component
  const getWeatherIcon = (condition) => {
    const iconClass = "w-5 h-5";
    switch (condition?.toLowerCase()) {
      case 'clear':
        return <Sun className={`${iconClass} text-accent-orange`} />;
      case 'clouds':
        return <Cloud className={`${iconClass} text-slate-400`} />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className={`${iconClass} text-blue-400`} />;
      case 'snow':
        return <CloudSnow className={`${iconClass} text-blue-200`} />;
      default:
        return <Cloud className={`${iconClass} text-slate-400`} />;
    }
  };

  // Get weather emoji
  const getWeatherEmoji = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'clear':
        return '☀️';
      case 'clouds':
        return '☁️';
      case 'rain':
      case 'drizzle':
        return '🌧️';
      case 'snow':
        return '❄️';
      case 'thunderstorm':
        return '⛈️';
      default:
        return '🌤️';
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-800 rounded-lg p-3 shadow-lg">
          <p className="text-white font-semibold mb-2">{data.time}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-accent-orange">Temp:</span>
              <span className="text-white font-mono">{data.temp}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Feels like:</span>
              <span className="text-white font-mono">{data.feelsLike}°C</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400">Rain:</span>
              <span className="text-white font-mono">{data.pop}%</span>
            </div>
            {data.rain > 0 && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-blue-400">Amount:</span>
                <span className="text-white font-mono font-bold">{data.rain.toFixed(1)}mm</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Wind:</span>
              <span className="text-white font-mono">{data.windSpeed} km/h</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate stats
  const temps = allHourlyData.map(d => d.temp);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const totalRain = allHourlyData.reduce((sum, d) => sum + d.rain, 0);
  const totalSnow = allHourlyData.reduce((sum, d) => sum + d.snow, 0);
  const totalPrecip = totalRain + totalSnow;

  // Find peak rain time
  const peakRainHour = allHourlyData.reduce((max, hour) => 
    hour.pop > max.pop ? hour : max, allHourlyData[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-500" />
              24-Hour Forecast
            </h3>
            <p className="text-sm text-slate-400 mt-1">Hourly breakdown</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Range</p>
            <p className="text-sm font-semibold text-white">
              {minTemp}° - {maxTemp}°C
            </p>
            {totalPrecip > 0 && (
              <p className="text-xs text-blue-400 mt-1">
                {totalSnow > totalRain ? '❄️' : '💧'} {totalPrecip.toFixed(1)}mm total
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className={compact ? "p-4" : "p-6"}>
        <div style={{ width: '100%', height: compact ? '200px' : '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis 
                dataKey="time" 
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
                yAxisId="rain"
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
                yAxisId="rain"
                dataKey="pop" 
                fill="#60a5fa"
                opacity={0.3}
                name="Rain %"
                radius={[4, 4, 0, 0]}
              />
              <Line 
                yAxisId="temp"
                type="monotone" 
                dataKey="temp" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={{ fill: '#f97316', r: 4 }}
                activeDot={{ r: 6 }}
                name="Temp"
              />
              <Line 
                yAxisId="temp"
                type="monotone" 
                dataKey="feelsLike" 
                stroke="#f97316" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Feels Like"
                opacity={0.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Details - Hide in compact mode */}
        {!compact && (
          <div className="grid grid-cols-8 gap-2 mt-6">
            {chartData.map((hour, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-slate-800 border border-slate-800 rounded-lg p-3 text-center"
              >
                <p className="text-xs text-slate-400 mb-2">{hour.time}</p>
                <div className="flex justify-center mb-2 text-lg">
                  {getWeatherEmoji(hour.condition)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-accent-orange">{hour.temp}°</p>
                  <p className="text-xs text-slate-500">Feels {hour.feelsLike}°</p>
                </div>
                {(hour.rain > 0 || hour.snow > 0 || hour.pop > 30) && (
                  <div className="mt-1">
                    {hour.rain > 0 && (
                      <p className="text-xs text-blue-400 font-semibold">
                        💧 {hour.rain.toFixed(1)}mm
                      </p>
                    )}
                    {hour.snow > 0 && (
                      <p className="text-xs text-blue-200 font-semibold">
                        ❄️ {hour.snow.toFixed(1)}mm
                      </p>
                    )}
                    {hour.rain === 0 && hour.snow === 0 && hour.pop > 30 && (
                      <p className="text-xs text-slate-400">
                        {hour.pop}% chance
                      </p>
                    )}
                  </div>
                )}
                {hour.windSpeed > 20 && (
                  <p className="text-xs text-slate-400 mt-1">
                    💨 {hour.windSpeed}
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

export default HourlyForecast;