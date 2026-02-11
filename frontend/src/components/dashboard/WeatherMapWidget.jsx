import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Map, Maximize2, Minimize2, Layers, Loader } from 'lucide-react';

/**
 * WeatherMapWidget - Windy.com Interactive Weather Map
 * 
 * Features:
 * - Embedded Windy.com map
 * - Layer toggle (radar, wind, temp, clouds, satellite)
 * - Expand/collapse functionality
 * - Centered on location coordinates
 */

const WeatherMapWidget = ({ lat, lon, locationName }) => {
  const [selectedLayer, setSelectedLayer] = useState('wind');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Default to Dublin if no coordinates
  const latitude = lat || 53.3498;
  const longitude = lon || -6.2603;

  // Available Windy layers
  const layers = [
    { id: 'radar', name: 'Radar', icon: '🌧️' },
    { id: 'wind', name: 'Wind', icon: '💨' },
    { id: 'temp', name: 'Temp', icon: '🌡️' },
    { id: 'clouds', name: 'Clouds', icon: '☁️' },
    { id: 'satellite', name: 'Satellite', icon: '🛰️' },
    { id: 'rain', name: 'Rain', icon: '💧' },
  ];

  // Build Windy embed URL
  const getWindyUrl = () => {
    const zoom = isExpanded ? 7 : 8;
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      zoom: zoom.toString(),
      level: 'surface',
      overlay: selectedLayer,
      product: 'ecmwf',
      menu: '',
      message: 'true',
      marker: '',
      calendar: 'now',
      pressure: '',
      type: 'map',
      location: 'coordinates',
      detail: '',
      metricWind: 'km/h',
      metricTemp: '°C',
    });
    
    return `https://embed.windy.com/embed2.html?${params.toString()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={`bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden
                ${isExpanded ? 'fixed inset-4 z-50' : ''}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Map className="w-5 h-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Live Weather Map
              </h3>
              <p className="text-sm text-slate-400">
                {locationName || 'Weather radar & conditions'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Layer Indicator */}
            <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm text-slate-300">
              <Layers className="w-4 h-4 inline mr-1" />
              {layers.find(l => l.id === selectedLayer)?.name}
            </span>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title={isExpanded ? 'Minimize' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="w-5 h-5 text-slate-400" />
              ) : (
                <Maximize2 className="w-5 h-5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Layer Toggle Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {layers.map((layer) => (
            <button
              key={layer.id}
              onClick={() => {
                setSelectedLayer(layer.id);
                setIsLoading(true);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${selectedLayer === layer.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
            >
              <span className="mr-1">{layer.icon}</span>
              {layer.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className={`relative ${isExpanded ? 'h-[calc(100%-140px)]' : 'h-[500px]'}`}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-2" />
              <p className="text-slate-400">Loading weather map...</p>
            </div>
          </div>
        )}

        {/* Windy Iframe */}
        <iframe
          key={`${selectedLayer}-${isExpanded}`}
          src={getWindyUrl()}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Weather Map"
          onLoad={() => setIsLoading(false)}
          className="bg-slate-950"
          allow="geolocation"
        />

{/*         Coordinates Badge
        <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-950/80 backdrop-blur-sm 
                      rounded-lg border border-slate-800">
          <p className="text-xs text-slate-400 font-mono">
            📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div> */}

        {/* Powered by Windy Badge */}
        {/* <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-950/80 backdrop-blur-sm 
                      rounded-lg border border-slate-800">
          <p className="text-xs text-slate-500">
            Powered by <span className="text-cyan-500">Windy.com</span>
          </p>
        </div> */}
      </div>

      {/* Expanded Mode: Close Button */}
      {isExpanded && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsExpanded(false)}
            className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg 
                     hover:bg-slate-800 transition-colors shadow-lg"
          >
            <Minimize2 className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default WeatherMapWidget;