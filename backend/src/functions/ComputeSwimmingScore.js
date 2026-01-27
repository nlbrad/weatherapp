/**
 * ComputeSwimmingScore Azure Function
 * 
 * HTTP Trigger that computes sea/outdoor swimming conditions.
 * Now uses REAL sea temperature and wave data from Open-Meteo Marine API!
 * 
 * Endpoints:
 *   GET  /api/swimming-score?lat={lat}&lon={lon}&experience={level}
 */

const { app } = require('@azure/functions');
const axios = require('axios');
const { computeSwimmingScore, findSwimmingWindows, prepareSwimmingForAI, EXPERIENCE_LEVELS } = require('../scoring/SwimmingScore');
const { getMarineData, getWaveConditions, isSwimmingSafe, categorizeSeaState } = require('../utils/marineData');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000;

const cache = new Map();

app.http('ComputeSwimmingScore', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'swimming-score',
    handler: async (request, context) => {
        try {
            context.log('ComputeSwimmingScore function triggered');

            const lat = parseFloat(request.query.get('lat'));
            const lon = parseFloat(request.query.get('lon'));
            const experience = request.query.get('experience') || 'intermediate';
            const waterTempOverride = request.query.get('waterTemp') ? parseFloat(request.query.get('waterTemp')) : null;
            const hasWetsuit = request.query.get('wetsuit') === 'true';
            const includeWindows = request.query.get('windows') !== 'false';
            const includeAIData = request.query.get('aiData') === 'true';

            if (!lat || !lon) {
                return {
                    status: 400,
                    jsonBody: { error: 'lat and lon parameters required' }
                };
            }

            // Validate experience level
            if (!EXPERIENCE_LEVELS[experience]) {
                return {
                    status: 400,
                    jsonBody: { 
                        error: 'Invalid experience level',
                        validLevels: Object.keys(EXPERIENCE_LEVELS)
                    }
                };
            }

            // Fetch data in parallel for speed
            const [weatherData, marineData] = await Promise.all([
                getWeatherData(lat, lon, context),
                getMarineData(lat, lon)
            ]);
            
            // Get water temperature - prefer API, fallback to estimate
            const waterTemp = waterTempOverride ?? 
                              marineData.current.seaTemp ?? 
                              getEstimatedWaterTemp(lat, lon);
            
            const waterTempSource = waterTempOverride ? 'user-provided' : 
                                   marineData.current.seaTemp ? 'open-meteo-marine' : 
                                   'seasonal-estimate';
            
            // Get wave data - prefer API, fallback to wind estimate
            const waveHeight = marineData.current.waveHeight ?? 
                              marineData.current.swellHeight ?? 
                              estimateWaveFromWind(weatherData.current.wind_speed);
            
            const waveSource = marineData.current.waveHeight ? 'open-meteo-marine' : 'wind-estimate';
            
            // Check swimming safety based on real wave data
            const safetyCheck = isSwimmingSafe(waveHeight, experience);

            // Compute score
            const scoreResult = computeSwimmingScore({
                waterTemp,
                airTemp: weatherData.current.temp,
                feelsLike: weatherData.current.feels_like,
                windSpeed: weatherData.current.wind_speed * 3.6, // m/s to km/h
                precipProbability: weatherData.hourly?.[0]?.pop ? weatherData.hourly[0].pop * 100 : 0,
                waveHeight,
                seaState: categorizeSeaState(waveHeight),
                hasWetsuit,
                humidity: weatherData.current.humidity
            }, experience);

            // Build response
            const response = {
                location: { lat, lon },
                timestamp: new Date().toISOString(),
                experience: scoreResult.experience,
                current: {
                    score: scoreResult.score,
                    rating: scoreResult.rating,
                    factors: scoreResult.factors,
                    reasons: scoreResult.reasons,
                    recommendation: scoreResult.recommendation,
                    swimDuration: scoreResult.swimDuration
                },
                safety: {
                    ...scoreResult.safety,
                    waveCheck: safetyCheck
                },
                conditions: {
                    waterTemp: {
                        value: waterTemp,
                        unit: '°C',
                        source: waterTempSource,
                        category: scoreResult.factors.waterTemp.category
                    },
                    airTemp: Math.round(weatherData.current.temp),
                    feelsLike: Math.round(weatherData.current.feels_like),
                    windSpeed: Math.round(weatherData.current.wind_speed * 3.6),
                    windChillWet: scoreResult.factors.wind.windChillWet,
                    sea: {
                        waveHeight: waveHeight,
                        waveHeightUnit: 'm',
                        waveDirection: marineData.current.waveDirection,
                        wavePeriod: marineData.current.wavePeriod,
                        swellHeight: marineData.current.swellHeight,
                        state: categorizeSeaState(waveHeight),
                        source: waveSource
                    },
                    weather: weatherData.current.weather?.[0]?.description
                },
                gear: {
                    wetsuitRecommended: waterTemp < 15,
                    wetsuitRequired: waterTemp < 12,
                    hasWetsuit
                },
                dataSources: {
                    weather: 'openweather',
                    marine: marineData.source,
                    waterTemp: waterTempSource,
                    waves: waveSource
                }
            };

            // Add warnings prominently if any
            if (scoreResult.warnings && scoreResult.warnings.length > 0) {
                response.warnings = scoreResult.warnings;
            }
            
            // Add wave safety warning if needed
            if (!safetyCheck.safe) {
                response.warnings = response.warnings || [];
                response.warnings.push(safetyCheck.reason);
            }

            // Add marine forecast if available
            if (marineData.hourly.times.length > 0) {
                response.marineForecast = marineData.hourly.times.slice(0, 12).map((time, i) => ({
                    time,
                    seaTemp: marineData.hourly.seaTemps[i],
                    waveHeight: marineData.hourly.waveHeights[i],
                    seaState: categorizeSeaState(marineData.hourly.waveHeights[i])
                }));
            }

            // Add windows if requested
            if (includeWindows && weatherData.hourly) {
                const hourlyWithDatetime = weatherData.hourly.map((hour, i) => ({
                    ...hour,
                    datetime: new Date(hour.dt * 1000).toISOString(),
                    // Use marine forecast if available
                    waveHeight: marineData.hourly.waveHeights[i] ?? waveHeight
                }));

                // Get water temp forecast (or use constant if not available)
                const waterTempForecast = marineData.hourly.seaTemps.length > 0 
                    ? marineData.hourly.seaTemps 
                    : waterTemp;

                const windows = findSwimmingWindows(
                    hourlyWithDatetime,
                    waterTempForecast,
                    experience,
                    { minScore: 55, minDurationMinutes: 60, maxWindows: 3 }
                );

                response.windows = windows.length > 0 ? windows : null;
                response.bestWindow = windows[0] || null;
            }

            // Add tide info placeholder (would need separate tide API)
            response.tides = {
                note: 'Tide data requires separate integration',
                recommendation: 'Check local tide tables before swimming',
                suggestedApis: ['admiralty.co.uk', 'worldtides.info']
            };

            // Add AI data if requested
            if (includeAIData) {
                response.aiData = prepareSwimmingForAI(
                    scoreResult,
                    response.bestWindow,
                    { name: 'Location' }
                );
            }

            return {
                status: 200,
                jsonBody: response
            };

        } catch (error) {
            context.error('Error computing swimming score:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to compute swimming score', message: error.message }
            };
        }
    }
});

/**
 * Get experience levels endpoint
 */
app.http('GetSwimmingExperienceLevels', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'swimming-levels',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: {
                levels: Object.entries(EXPERIENCE_LEVELS).map(([key, profile]) => ({
                    id: key,
                    name: profile.name,
                    minWaterTemp: profile.minWaterTemp,
                    maxWaveHeight: profile.maxWaveHeight,
                    recommendedDuration: profile.recommendedDuration,
                    description: getExperienceDescription(key)
                }))
            }
        };
    }
});

function getExperienceDescription(level) {
    const descriptions = {
        beginner: 'New to open water swimming. Prefer warmer water and calm conditions.',
        intermediate: 'Comfortable in open water. Can handle cooler temps and moderate conditions.',
        experienced: 'Regular open water swimmer. Comfortable in cold water and varied conditions.',
        coldWaterSwimmer: 'Dedicated cold water swimmer. Acclimatized to very cold temperatures.'
    };
    return descriptions[level] || '';
}

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
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        
        const currentRes = await axios.get(currentUrl);

        return {
            current: {
                temp: currentRes.data.main.temp,
                feels_like: currentRes.data.main.feels_like,
                humidity: currentRes.data.main.humidity,
                wind_speed: currentRes.data.wind.speed,
                wind_deg: currentRes.data.wind.deg,
                visibility: currentRes.data.visibility,
                weather: currentRes.data.weather
            },
            hourly: null
        };
    }
}

/**
 * Fallback: Estimate water temperature from season and location
 */
function getEstimatedWaterTemp(lat, lon) {
    // Irish Sea temperature estimates by month
    const IRISH_SEA_TEMPS = {
        1: 9, 2: 8, 3: 8, 4: 9, 5: 11, 6: 13,
        7: 15, 8: 16, 9: 15, 10: 14, 11: 12, 12: 10
    };

    const month = new Date().getMonth() + 1;
    let baseTemp = IRISH_SEA_TEMPS[month] || 12;

    // Adjust for latitude (colder further north)
    if (lat > 54) baseTemp -= 1;
    else if (lat < 52) baseTemp += 0.5;

    // Adjust for west coast (Gulf Stream effect)
    if (lon < -8) baseTemp += 0.5;

    return Math.round(baseTemp * 10) / 10;
}

/**
 * Fallback: Estimate wave height from wind speed
 */
function estimateWaveFromWind(windSpeedMs) {
    const windKmh = windSpeedMs * 3.6;
    if (windKmh < 12) return 0.2;
    if (windKmh < 20) return 0.5;
    if (windKmh < 30) return 1.0;
    if (windKmh < 40) return 1.5;
    if (windKmh < 50) return 2.5;
    return 4.0;
}