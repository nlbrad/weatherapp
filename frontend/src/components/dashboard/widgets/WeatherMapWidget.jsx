import React, { useState } from 'react';
import { Loader } from 'lucide-react';

/**
 * WeatherMapWidget - Windy.com embed with layer toggle
 */

const LAYERS = [
  { id: 'radar', name: 'Radar', icon: '🌧️' },
  { id: 'wind', name: 'Wind', icon: '💨' },
  { id: 'temp', name: 'Temp', icon: '🌡️' },
  { id: 'clouds', name: 'Clouds', icon: '☁️' },
  { id: 'rain', name: 'Rain', icon: '💧' },
];

const WeatherMapWidget = ({ location }) => {
  const [selectedLayer, setSelectedLayer] = useState('wind');
  const [isLoading, setIsLoading] = useState(true);

  const lat = location?.lat || 53.3498;
  const lon = location?.lon || -6.2603;

  const params = new URLSearchParams({
    lat: lat.toString(), lon: lon.toString(), zoom: '8',
    level: 'surface', overlay: selectedLayer, product: 'ecmwf',
    menu: '', message: 'true', marker: '', calendar: 'now',
    pressure: '', type: 'map', location: 'coordinates', detail: '',
    metricWind: 'km/h', metricTemp: '°C',
  });

  return (
    <div className="h-full flex flex-col -m-3">
      {/* Layer buttons */}
      <div className="flex flex-wrap gap-1.5 px-3 pt-1 pb-2">
        {LAYERS.map(layer => (
          <button key={layer.id}
            onClick={() => { setSelectedLayer(layer.id); setIsLoading(true); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-all ${
              selectedLayer === layer.id
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}>
            <span className="mr-0.5">{layer.icon}</span>{layer.name}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="relative flex-1 min-h-0">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center z-10">
            <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
          </div>
        )}
        <iframe
          key={selectedLayer}
          src={`https://embed.windy.com/embed2.html?${params.toString()}`}
          width="100%" height="100%" frameBorder="0" title="Weather Map"
          onLoad={() => setIsLoading(false)}
          className="bg-slate-950"
          allow="geolocation"
        />
      </div>
    </div>
  );
};

export default React.memo(WeatherMapWidget);
