/**
 * Marine Data Helper
 * 
 * Fetches sea surface temperature, wave height, and other marine data
 * from the free Open-Meteo Marine API.
 * 
 * API Docs: https://open-meteo.com/en/docs/marine-weather-api
 */

const axios = require('axios');

// Cache for marine data (changes slowly)
const cache = new Map();
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes (sea temps change slowly)

/**
 * Get marine data for a location
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Object} Marine conditions
 */
async function getMarineData(lat, lon) {
    const cacheKey = `marine_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }

    try {
        const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature,wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period&hourly=sea_surface_temperature,wave_height,swell_wave_height&timezone=auto&forecast_days=2`;

        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;

        const marineData = {
            current: {
                seaTemp: data.current?.sea_surface_temperature ?? null,
                waveHeight: data.current?.wave_height ?? null,
                waveDirection: data.current?.wave_direction ?? null,
                wavePeriod: data.current?.wave_period ?? null,
                swellHeight: data.current?.swell_wave_height ?? null,
                swellPeriod: data.current?.swell_wave_period ?? null
            },
            hourly: {
                times: data.hourly?.time ?? [],
                seaTemps: data.hourly?.sea_surface_temperature ?? [],
                waveHeights: data.hourly?.wave_height ?? [],
                swellHeights: data.hourly?.swell_wave_height ?? []
            },
            units: data.current_units ?? {},
            source: 'open-meteo-marine',
            fetchedAt: new Date().toISOString()
        };

        // Cache the result
        cache.set(cacheKey, { data: marineData, timestamp: Date.now() });

        return marineData;

    } catch (error) {
        console.error('Failed to fetch marine data:', error.message);
        
        // Return null values - let the caller use fallback estimates
        return {
            current: {
                seaTemp: null,
                waveHeight: null,
                waveDirection: null,
                wavePeriod: null,
                swellHeight: null,
                swellPeriod: null
            },
            hourly: { times: [], seaTemps: [], waveHeights: [], swellHeights: [] },
            source: 'unavailable',
            error: error.message
        };
    }
}

/**
 * Get just sea surface temperature
 */
async function getSeaTemperature(lat, lon) {
    const data = await getMarineData(lat, lon);
    return data.current.seaTemp;
}

/**
 * Get wave conditions
 */
async function getWaveConditions(lat, lon) {
    const data = await getMarineData(lat, lon);
    
    const waveHeight = data.current.waveHeight ?? data.current.swellHeight ?? null;
    
    return {
        height: waveHeight,
        direction: data.current.waveDirection,
        period: data.current.wavePeriod,
        swellHeight: data.current.swellHeight,
        state: categorizeSeaState(waveHeight),
        source: data.source
    };
}

/**
 * Get sea state description from wave height
 */
function categorizeSeaState(waveHeight) {
    if (waveHeight === null) return 'Unknown';
    if (waveHeight < 0.1) return 'Calm (glassy)';
    if (waveHeight < 0.3) return 'Calm (rippled)';
    if (waveHeight < 0.5) return 'Smooth';
    if (waveHeight < 1.0) return 'Slight';
    if (waveHeight < 1.5) return 'Moderate';
    if (waveHeight < 2.5) return 'Rough';
    if (waveHeight < 4.0) return 'Very Rough';
    if (waveHeight < 6.0) return 'High';
    return 'Very High';
}

/**
 * Get Douglas Sea Scale (0-9)
 */
function getDouglasScale(waveHeight) {
    if (waveHeight === null) return null;
    if (waveHeight < 0.1) return 0;  // Calm (glassy)
    if (waveHeight < 0.1) return 1;  // Calm (rippled)
    if (waveHeight < 0.5) return 2;  // Smooth
    if (waveHeight < 1.25) return 3; // Slight
    if (waveHeight < 2.5) return 4;  // Moderate
    if (waveHeight < 4.0) return 5;  // Rough
    if (waveHeight < 6.0) return 6;  // Very Rough
    if (waveHeight < 9.0) return 7;  // High
    if (waveHeight < 14.0) return 8; // Very High
    return 9;                         // Phenomenal
}

/**
 * Check if conditions are safe for swimming
 */
function isSwimmingSafe(waveHeight, experience = 'intermediate') {
    const maxWaveByExperience = {
        beginner: 0.5,
        intermediate: 1.0,
        experienced: 1.5,
        coldWaterSwimmer: 1.0
    };

    const maxWave = maxWaveByExperience[experience] ?? 1.0;

    if (waveHeight === null) {
        return { safe: true, reason: 'Wave data unavailable - check conditions locally' };
    }

    if (waveHeight > maxWave) {
        return { 
            safe: false, 
            reason: `Waves (${waveHeight}m) exceed safe level (${maxWave}m) for ${experience} swimmers` 
        };
    }

    if (waveHeight > 2.0) {
        return { safe: false, reason: 'Dangerous sea conditions' };
    }

    return { safe: true, reason: null };
}

/**
 * Get forecast for sea conditions
 */
async function getMarineForecast(lat, lon, hours = 24) {
    const data = await getMarineData(lat, lon);
    
    if (!data.hourly.times.length) {
        return [];
    }

    return data.hourly.times.slice(0, hours).map((time, i) => ({
        time,
        seaTemp: data.hourly.seaTemps[i],
        waveHeight: data.hourly.waveHeights[i],
        swellHeight: data.hourly.swellHeights[i],
        seaState: categorizeSeaState(data.hourly.waveHeights[i])
    }));
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getMarineData,
    getSeaTemperature,
    getWaveConditions,
    getMarineForecast,
    categorizeSeaState,
    getDouglasScale,
    isSwimmingSafe
};