/**
 * ComputeSkyScore Azure Function
 * 
 * HTTP Trigger that computes sky viewing conditions for a location.
 * Returns score, factors, windows, and AI-ready data.
 * 
 * Endpoints:
 *   GET  /api/sky-score?lat={lat}&lon={lon}
 *   GET  /api/sky-score?locationId={locationId}
 *   POST /api/sky-score (batch multiple locations)
 */

const { app } = require('@azure/functions');
const axios = require('axios');
const { computeSkyScore, findSkyWindows, prepareForAINarration } = require('../scoring/SkyScore');

// Configuration
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Simple in-memory cache (use Redis in production)
const cache = new Map();

app.http('ComputeSkyScore', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'sky-score',
    handler: async (request, context) => {
        try {
            context.log('ComputeSkyScore function triggered');

            // Handle GET (single location) vs POST (batch)
            if (request.method === 'GET') {
                return await handleSingleLocation(request, context);
            } else {
                return await handleBatchLocations(request, context);
            }

        } catch (error) {
            context.error('Error computing sky score:', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to compute sky score',
                    message: error.message
                }
            };
        }
    }
});

/**
 * Handle single location score request
 */
async function handleSingleLocation(request, context) {
    const lat = request.query.get('lat');
    const lon = request.query.get('lon');
    const locationId = request.query.get('locationId');
    const includeWindows = request.query.get('windows') !== 'false';
    const includeAIData = request.query.get('aiData') === 'true';

    // Validate inputs
    if (!lat || !lon) {
        if (!locationId) {
            return {
                status: 400,
                jsonBody: { error: 'Either lat/lon or locationId required' }
            };
        }
        // TODO: Lookup location from database
        return {
            status: 400,
            jsonBody: { error: 'locationId lookup not yet implemented. Use lat/lon.' }
        };
    }

    // Get weather data and compute score
    const result = await computeScoreForLocation(
        parseFloat(lat),
        parseFloat(lon),
        { includeWindows, includeAIData },
        context
    );

    return {
        status: 200,
        jsonBody: result
    };
}

/**
 * Handle batch location scoring
 */
async function handleBatchLocations(request, context) {
    const body = await request.json();
    const { locations, includeWindows = true, includeAIData = false } = body;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return {
            status: 400,
            jsonBody: { error: 'locations array required' }
        };
    }

    if (locations.length > 10) {
        return {
            status: 400,
            jsonBody: { error: 'Maximum 10 locations per batch' }
        };
    }

    // Process all locations in parallel
    const results = await Promise.all(
        locations.map(loc => 
            computeScoreForLocation(
                loc.lat,
                loc.lon,
                { includeWindows, includeAIData, locationInfo: loc },
                context
            )
        )
    );

    return {
        status: 200,
        jsonBody: {
            timestamp: new Date().toISOString(),
            count: results.length,
            results
        }
    };
}

/**
 * Compute sky score for a single location
 */
async function computeScoreForLocation(lat, lon, options, context) {
    const { includeWindows, includeAIData, locationInfo } = options;
    
    // Get weather and astronomical data
    const weatherData = await getWeatherData(lat, lon, context);
    const astroData = await getAstronomicalData(lat, lon, context);

    // Build current conditions
    const currentConditions = {
        cloudCover: weatherData.current.clouds,
        humidity: weatherData.current.humidity,
        windSpeed: weatherData.current.wind_speed * 3.6, // m/s to km/h
        moonPhase: weatherData.daily?.[0]?.moon_phase ?? astroData.moonPhase,
        moonAltitude: astroData.moonAltitude,
        isDark: astroData.isDark,
        visibility: weatherData.current.visibility
    };

    // Compute current score
    const scoreResult = computeSkyScore(currentConditions);

    // Build response
    const response = {
        location: {
            lat,
            lon,
            name: locationInfo?.name,
            label: locationInfo?.label
        },
        timestamp: new Date().toISOString(),
        current: {
            score: scoreResult.score,
            rating: scoreResult.rating,
            factors: scoreResult.factors,
            reasons: scoreResult.reasons,
            recommendation: scoreResult.recommendation
        },
        conditions: {
            temperature: Math.round(weatherData.current.temp),
            feelsLike: Math.round(weatherData.current.feels_like),
            clouds: weatherData.current.clouds,
            humidity: weatherData.current.humidity,
            windSpeed: Math.round(weatherData.current.wind_speed * 3.6),
            windDirection: weatherData.current.wind_deg,
            visibility: weatherData.current.visibility,
            weather: weatherData.current.weather?.[0]?.description
        },
        astronomical: {
            isDark: astroData.isDark,
            sunAltitude: astroData.sunAltitude,
            twilightPhase: astroData.twilightPhase,
            moonPhase: astroData.moonPhase,
            moonPhaseName: astroData.moonPhaseName,
            moonAltitude: astroData.moonAltitude,
            moonRise: astroData.moonRise,
            moonSet: astroData.moonSet,
            sunrise: weatherData.current.sunrise ? new Date(weatherData.current.sunrise * 1000).toISOString() : null,
            sunset: weatherData.current.sunset ? new Date(weatherData.current.sunset * 1000).toISOString() : null
        }
    };

    // Add windows if requested
    if (includeWindows && weatherData.hourly) {
        const hourlyWithAstro = enrichHourlyWithAstro(weatherData.hourly, astroData, lat, lon);
        const windows = findSkyWindows(hourlyWithAstro, {
            minScore: 70,
            minDurationMinutes: 45,
            maxWindows: 3
        });

        response.windows = windows.length > 0 ? windows : null;
        response.bestWindow = windows[0] || null;
    }

    // Add AI-ready data if requested
    if (includeAIData) {
        response.aiData = prepareForAINarration(
            scoreResult,
            response.bestWindow,
            { name: locationInfo?.name, label: locationInfo?.label }
        );
    }

    return response;
}

/**
 * Get weather data from OpenWeather API (with caching)
 */
async function getWeatherData(lat, lon, context) {
    const cacheKey = `weather_${lat}_${lon}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        context.log('Using cached weather data');
        return cached.data;
    }

    context.log(`Fetching fresh weather data for ${lat}, ${lon}`);
    
    // Use OneCall 3.0 API for comprehensive data
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric&exclude=minutely`;

    try {
        const response = await axios.get(url);
        
        // Cache the result
        cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
        });

        return response.data;
    } catch (error) {
        // Fallback to 2.5 API if 3.0 not available
        if (error.response?.status === 401 || error.response?.status === 403) {
            context.log('Falling back to OpenWeather 2.5 API');
            return await getWeatherDataFallback(lat, lon, context);
        }
        throw error;
    }
}

/**
 * Fallback to older OpenWeather API
 */
async function getWeatherDataFallback(lat, lon, context) {
    const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const [currentRes, forecastRes] = await Promise.all([
        axios.get(currentUrl),
        axios.get(forecastUrl)
    ]);

    return {
        current: {
            ...currentRes.data.main,
            clouds: currentRes.data.clouds.all,
            wind_speed: currentRes.data.wind.speed,
            wind_deg: currentRes.data.wind.deg,
            visibility: currentRes.data.visibility,
            weather: currentRes.data.weather,
            sunrise: currentRes.data.sys.sunrise,
            sunset: currentRes.data.sys.sunset
        },
        hourly: forecastRes.data.list.map(item => ({
            dt: item.dt,
            datetime: new Date(item.dt * 1000).toISOString(),
            temp: item.main.temp,
            clouds: item.clouds.all,
            humidity: item.main.humidity,
            wind_speed: item.wind.speed,
            weather: item.weather
        }))
    };
}

/**
 * Get astronomical data (moon position, sun position, darkness)
 */
async function getAstronomicalData(lat, lon, context) {
    // For production, use a proper astronomy API or library
    // For now, we'll compute basic values
    
    const now = new Date();
    const hour = now.getUTCHours();
    
    // Simple sun altitude approximation (replace with proper calculation)
    // This is a very rough approximation - use SunCalc library in production
    const solarNoon = 12; // UTC approximate
    const hourFromNoon = Math.abs(hour - solarNoon);
    const maxAltitude = 90 - Math.abs(lat - 23.5 * Math.cos(getDayOfYear(now) * Math.PI / 182.5));
    const sunAltitude = maxAltitude * Math.cos(hourFromNoon * Math.PI / 12);

    // Determine darkness/twilight phase
    let isDark = false;
    let twilightPhase = 'day';
    
    if (sunAltitude < -18) {
        isDark = true;
        twilightPhase = 'astronomical';
    } else if (sunAltitude < -12) {
        twilightPhase = 'nautical';
    } else if (sunAltitude < -6) {
        twilightPhase = 'civil';
    } else if (sunAltitude < 0) {
        twilightPhase = 'horizon';
    }

    // Moon phase calculation (simplified)
    const lunarCycle = 29.53059; // days
    const knownNewMoon = new Date('2024-01-11').getTime();
    const daysSinceNewMoon = (now.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
    const moonPhase = (daysSinceNewMoon % lunarCycle) / lunarCycle;

    // Moon altitude (very simplified - use library in production)
    const moonAltitude = calculateMoonAltitude(lat, lon, now, moonPhase);

    return {
        sunAltitude: Math.round(sunAltitude),
        isDark,
        twilightPhase,
        moonPhase: Math.round(moonPhase * 100) / 100,
        moonPhaseName: getMoonPhaseName(moonPhase),
        moonAltitude: Math.round(moonAltitude),
        moonRise: null, // Would need proper calculation
        moonSet: null
    };
}

/**
 * Get moon phase name
 */
function getMoonPhaseName(phase) {
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
}

/**
 * Calculate moon altitude (simplified)
 */
function calculateMoonAltitude(lat, lon, date, moonPhase) {
    // This is a very rough approximation
    // In production, use a proper astronomy library like SunCalc
    const hour = date.getUTCHours();
    
    // Moon rises/sets roughly 50 min later each day
    // At full moon, it rises at sunset; at new moon, rises at sunrise
    const moonHourAngle = (hour + moonPhase * 12 - 12) * 15; // degrees
    
    // Simplified altitude calculation
    const latRad = lat * Math.PI / 180;
    const altitude = Math.sin(latRad) * Math.sin(0) + 
                     Math.cos(latRad) * Math.cos(0) * Math.cos(moonHourAngle * Math.PI / 180);
    
    return Math.asin(altitude) * 180 / Math.PI;
}

/**
 * Get day of year
 */
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

/**
 * Enrich hourly forecast with astronomical data for each hour
 */
function enrichHourlyWithAstro(hourly, currentAstro, lat, lon) {
    return hourly.map(hour => {
        const datetime = new Date(hour.dt * 1000);
        // Simplified: just check if it's nighttime hours
        const utcHour = datetime.getUTCHours();
        const isDark = utcHour < 5 || utcHour > 21; // Very rough approximation
        
        return {
            ...hour,
            datetime: datetime.toISOString(),
            cloudCover: hour.clouds,
            humidity: hour.humidity,
            windSpeed: hour.wind_speed * 3.6, // m/s to km/h
            moonPhase: currentAstro.moonPhase,
            moonAltitude: currentAstro.moonAltitude, // Would need per-hour calculation
            isDark
        };
    }).filter(hour => hour.isDark); // Only return dark hours for sky viewing
}

module.exports = { computeScoreForLocation };