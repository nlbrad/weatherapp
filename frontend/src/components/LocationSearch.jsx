import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Loader, X, Navigation } from 'lucide-react';

/**
 * LocationSearch - Autocomplete location search component
 * 
 * Features:
 * - Debounced search (300ms)
 * - Autocomplete dropdown
 * - Recent searches (localStorage)
 * - Geolocation support
 * - Returns lat/lon with selection
 */

const LocationSearch = ({ onSelect, placeholder = "Search for a city..." }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentLocationSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/searchlocations?query=${encodeURIComponent(query)}&limit=6`
        );
        const data = await response.json();
        setResults(data.locations || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, API_BASE_URL]);

  // Handle location selection
  const handleSelect = (location) => {
    // Save to recent searches
    const updated = [
      location,
      ...recentSearches.filter(l => l.id !== location.id)
    ].slice(0, 5);
    
    setRecentSearches(updated);
    localStorage.setItem('recentLocationSearches', JSON.stringify(updated));
    
    // Clear and close
    setQuery('');
    setShowDropdown(false);
    setResults([]);
    
    // Callback with selection
    onSelect(location);
  };

  // Use device geolocation
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode to get city name
          const response = await fetch(
            `${API_BASE_URL}/searchlocations?query=${position.coords.latitude},${position.coords.longitude}&limit=1`
          );
          
          // If reverse geocoding doesn't work, use coordinates directly
          const location = {
            name: 'My Location',
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            displayName: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            country: '',
            id: 'my-location'
          };
          
          handleSelect(location);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          // Fall back to coordinates only
          handleSelect({
            name: 'My Location',
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            displayName: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            country: '',
            id: 'my-location'
          });
        } finally {
          setGeoLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location. Please enable location services.');
        setGeoLoading(false);
      }
    );
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentLocationSearches');
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {loading ? (
            <Loader className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-24 py-3 bg-dark-elevated border border-dark-border rounded-xl
                   text-white placeholder-gray-500
                   focus:ring-2 focus:ring-primary focus:border-transparent
                   transition-all duration-200"
        />
        
        {/* Right side buttons */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          
          <button
            onClick={useMyLocation}
            disabled={geoLoading}
            className="p-2 hover:bg-dark-border rounded-lg transition-colors"
            title="Use my location"
          >
            {geoLoading ? (
              <Loader className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Navigation className="w-4 h-4 text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (query.length >= 2 || recentSearches.length > 0) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-dark-surface border border-dark-border 
                     rounded-xl shadow-xl overflow-hidden"
          >
            {/* Search Results */}
            {results.length > 0 && (
              <div className="py-2">
                <p className="px-4 py-1 text-xs text-gray-500 uppercase tracking-wide">
                  Search Results
                </p>
                {results.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelect(location)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-elevated
                             transition-colors text-left"
                  >
                    <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {location.name}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {location.state && `${location.state}, `}{location.country}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {location.lat.toFixed(2)}, {location.lon.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {query.length >= 2 && results.length === 0 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-gray-400">No locations found for "{query}"</p>
                <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}

            {/* Recent Searches */}
            {recentSearches.length > 0 && query.length < 2 && (
              <div className="py-2">
                <div className="px-4 py-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Recent Searches
                  </p>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
                {recentSearches.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => handleSelect(location)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-elevated
                             transition-colors text-left"
                  >
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white truncate">{location.displayName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {query.length < 2 && recentSearches.length === 0 && (
              <div className="px-4 py-6 text-center">
                <MapPin className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">Start typing to search for a city</p>
                <p className="text-sm text-gray-500 mt-1">
                  Or use the location button to detect your position
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LocationSearch;