/**
 * ComputeAuroraScore Azure Function
 * 
 * HTTP Trigger that computes aurora/northern lights viewing conditions.
 * 
 * Endpoints:
 *   GET  /api/aurora-score?lat={lat}&lon={lon}
 */

const { app } = require('@azure/functions');
const axios = require('axios');
const { computeAuroraScore, findAuroraWindows, prepareAuroraForAI } = require('../scoring/AuroraScore');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Simple cache
const cache = new Map();

app.http('ComputeAuroraScore', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'aurora-score',
    handler: async (request, context) => {
        try {
            context.log('ComputeAuroraScore function triggered');

            const lat = parseFloat(request.query.get('lat'));
            const lon = parseFloat(request.query.get('lon'));
            const includeWindows = request.query.get('windows') !== 'false';
            const includeAIData = request.query.get('aiData') === 'true';

            if (!lat || !lon) {
                return {
                    status: 400,
                    jsonBody: { error: 'lat and lon parameters required' }
                };
            }

            // Get weather data
            const weatherData = await getWeatherData(lat, lon, context);
            
            // Get Kp index (geomagnetic activity)
            const kpData = await getKpIndex(context);
            
            // Get astronomical data
            const astroData = getAstronomicalData(lat, weatherData);

            // Compute score
            const scoreResult = computeAuroraScore({
                kpIndex: kpData.current,
                latitude: lat,
                cloudCover: weatherData.current.clouds,
                sunAltitude: astroData.sunAltitude,
                isDark: astroData.isDark,
                forecastKp: kpData.forecast
            });

            // Build response
            const response = {
                location: { lat, lon },
                timestamp: new Date().toISOString(),
                current: {
                    score: scoreResult.score,
                    rating: scoreResult.rating,
                    factors: scoreResult.factors,
                    reasons: scoreResult.reasons,
                    recommendation: scoreResult.recommendation
                },
                kpIndex: {
                    current: kpData.current,
                    forecast3hr: kpData.forecast?.[0],
                    forecast6hr: kpData.forecast?.[1],
                    level: scoreResult.factors.kpIndex.level,
                    description: scoreResult.factors.kpIndex.description,
                    minNeededForLatitude: scoreResult.factors.kpIndex.minNeeded
                },
                conditions: {
                    clouds: weatherData.current.clouds,
                    temperature: Math.round(weatherData.current.temp),
                    visibility: weatherData.current.visibility
                },
                astronomical: astroData,
                alert: scoreResult.alert
            };

            // Add windows if requested
            if (includeWindows && weatherData.hourly) {
                const hourlyWithDarkness = weatherData.hourly
                    .map(hour => ({
                        ...hour,
                        datetime: new Date(hour.dt * 1000).toISOString(),
                        isDark: isHourDark(hour.dt, lat),
                        sunAltitude: -20 // Simplified - would need proper calculation
                    }))
                    .filter(hour => hour.isDark);

                const windows = findAuroraWindows(hourlyWithDarkness, lat, kpData.forecast);
                response.windows = windows.length > 0 ? windows : null;
                response.bestWindow = windows[0] || null;
            }

            // Add AI data if requested
            if (includeAIData) {
                response.aiData = prepareAuroraForAI(
                    scoreResult,
                    response.bestWindow,
                    { name: 'Location', latitude: lat }
                );
            }

            return {
                status: 200,
                jsonBody: response
            };

        } catch (error) {
            context.error('Error computing aurora score:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to compute aurora score', message: error.message }
            };
        }
    }
});

/**
 * Get weather data from OpenWeather
 */
async function getWeatherData(lat, lon, context) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached.data;
    }

    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&exclude=minutely`;

    try {
        const response = await axios.get(url);
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        return response.data;
    } catch (error) {
        // Fallback to 2.5 API
        context.log('Falling back to OpenWeather 2.5 API');
        const fallbackUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await axios.get(fallbackUrl);
        return {
            current: {
                temp: response.data.main.temp,
                clouds: response.data.clouds.all,
                visibility: response.data.visibility,
                sunrise: response.data.sys.sunrise,
                sunset: response.data.sys.sunset
            },
            hourly: null
        };
    }
}

/**
 * Get current Kp index from NOAA or estimate
 * 
 * In production, use: https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
 */
async function getKpIndex(context) {
    const cacheKey = 'kp_index';
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) { // 30 min cache
        return cached.data;
    }

    try {
        // NOAA Space Weather Prediction Center - real Kp data
        const response = await axios.get(
            'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
            { timeout: 5000 }
        );

        // Parse NOAA data - format: [timestamp, Kp, ...]
        const data = response.data;
        const latest = data[data.length - 1];
        const currentKp = parseFloat(latest[1]) || 2;

        // Get forecast from NOAA
        let forecast = [currentKp, currentKp, currentKp]; // Default
        
        try {
            const forecastResponse = await axios.get(
                'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json',
                { timeout: 5000 }
            );
            if (forecastResponse.data && forecastResponse.data.length > 0) {
                forecast = forecastResponse.data.slice(0, 8).map(f => parseFloat(f[1]) || currentKp);
            }
        } catch (e) {
            context.log('Could not fetch Kp forecast, using current value');
        }

        const kpData = {
            current: currentKp,
            forecast,
            source: 'NOAA SWPC',
            updatedAt: new Date().toISOString()
        };

        cache.set(cacheKey, { data: kpData, timestamp: Date.now() });
        return kpData;

    } catch (error) {
        context.log('Failed to fetch Kp index, using estimate:', error.message);
        
        // Return estimated/default Kp
        return {
            current: 2,  // Typical quiet value
            forecast: [2, 2, 2, 2],
            source: 'estimated',
            updatedAt: new Date().toISOString()
        };
    }
}

/**
 * Calculate astronomical data
 */
function getAstronomicalData(lat, weatherData) {
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Simple sun altitude calculation
    const solarNoon = 12;
    const hourFromNoon = Math.abs(hour - solarNoon);
    const maxAltitude = 90 - Math.abs(lat - 23.5 * Math.cos(getDayOfYear(now) * Math.PI / 182.5));
    const sunAltitude = maxAltitude * Math.cos(hourFromNoon * Math.PI / 12);

    let isDark = false;
    let twilightPhase = 'day';
    
    if (sunAltitude < -18) {
        isDark = true;
        twilightPhase = 'astronomical';
    } else if (sunAltitude < -12) {
        isDark = true;
        twilightPhase = 'nautical';
    } else if (sunAltitude < -6) {
        twilightPhase = 'civil';
    } else if (sunAltitude < 0) {
        twilightPhase = 'horizon';
    }

    return {
        sunAltitude: Math.round(sunAltitude),
        isDark,
        twilightPhase,
        sunrise: weatherData.current.sunrise ? new Date(weatherData.current.sunrise * 1000).toISOString() : null,
        sunset: weatherData.current.sunset ? new Date(weatherData.current.sunset * 1000).toISOString() : null,
        bestViewingDirection: 'North'
    };
}

function isHourDark(timestamp, lat) {
    const date = new Date(timestamp * 1000);
    const hour = date.getUTCHours();
    
    // Simplified - proper calculation would use sun position
    // For Ireland in winter, dark roughly 17:00-08:00 UTC
    return hour < 7 || hour > 17;
}

function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

module.exports = { getKpIndex };