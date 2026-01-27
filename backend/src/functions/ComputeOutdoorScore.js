/**
 * ComputeOutdoorScore Azure Function
 * 
 * HTTP Trigger that computes outdoor activity conditions.
 * Supports different activities: hiking, cycling, walking, running, picnic
 * 
 * Endpoints:
 *   GET  /api/outdoor-score?lat={lat}&lon={lon}&activity={activity}
 */

const { app } = require('@azure/functions');
const axios = require('axios');
const { computeOutdoorScore, findOutdoorWindows, prepareOutdoorForAI, ACTIVITY_PROFILES } = require('../scoring/OutdoorScore');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000;

const cache = new Map();

app.http('ComputeOutdoorScore', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'outdoor-score',
    handler: async (request, context) => {
        try {
            context.log('ComputeOutdoorScore function triggered');

            const lat = parseFloat(request.query.get('lat'));
            const lon = parseFloat(request.query.get('lon'));
            const activity = request.query.get('activity') || 'default';
            const includeWindows = request.query.get('windows') !== 'false';
            const includeAIData = request.query.get('aiData') === 'true';

            if (!lat || !lon) {
                return {
                    status: 400,
                    jsonBody: { error: 'lat and lon parameters required' }
                };
            }

            // Validate activity
            if (activity !== 'default' && !ACTIVITY_PROFILES[activity]) {
                return {
                    status: 400,
                    jsonBody: { 
                        error: 'Invalid activity',
                        validActivities: Object.keys(ACTIVITY_PROFILES)
                    }
                };
            }

            // Get weather data
            const weatherData = await getWeatherData(lat, lon, context);

            // Compute score
            const scoreResult = computeOutdoorScore({
                temperature: weatherData.current.temp,
                feelsLike: weatherData.current.feels_like,
                precipProbability: weatherData.current.pop ? weatherData.current.pop * 100 : 0,
                precipAmount: weatherData.current.rain?.['1h'] || 0,
                windSpeed: weatherData.current.wind_speed * 3.6, // m/s to km/h
                humidity: weatherData.current.humidity,
                uvIndex: weatherData.current.uvi || 0,
                visibility: weatherData.current.visibility,
                weatherCondition: weatherData.current.weather?.[0]?.description || 'clear'
            }, activity);

            // Build response
            const response = {
                location: { lat, lon },
                timestamp: new Date().toISOString(),
                activity: scoreResult.activity,
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
                    humidity: weatherData.current.humidity,
                    windSpeed: Math.round(weatherData.current.wind_speed * 3.6),
                    windDirection: weatherData.current.wind_deg,
                    uvIndex: weatherData.current.uvi || 0,
                    visibility: weatherData.current.visibility,
                    weather: weatherData.current.weather?.[0]?.description,
                    precipProbability: weatherData.hourly?.[0]?.pop ? Math.round(weatherData.hourly[0].pop * 100) : 0
                },
                hourSummary: scoreResult.hourSummary
            };

            // Add windows if requested
            if (includeWindows && weatherData.hourly) {
                const hourlyWithDatetime = weatherData.hourly.map(hour => ({
                    ...hour,
                    datetime: new Date(hour.dt * 1000).toISOString()
                }));

                const windows = findOutdoorWindows(hourlyWithDatetime, activity, {
                    minScore: 65,
                    minDurationMinutes: 60,
                    maxWindows: 3
                });

                response.windows = windows.length > 0 ? windows : null;
                response.bestWindow = windows[0] || null;
            }

            // Add 24-hour overview
            if (weatherData.hourly) {
                response.next24Hours = weatherData.hourly.slice(0, 24).map(hour => {
                    const hourScore = computeOutdoorScore({
                        temperature: hour.temp,
                        feelsLike: hour.feels_like,
                        precipProbability: hour.pop ? hour.pop * 100 : 0,
                        windSpeed: hour.wind_speed * 3.6,
                        humidity: hour.humidity,
                        uvIndex: hour.uvi || 0,
                        visibility: hour.visibility || 10000,
                        weatherCondition: hour.weather?.[0]?.description || 'clear'
                    }, activity);

                    return {
                        time: new Date(hour.dt * 1000).toISOString(),
                        hour: new Date(hour.dt * 1000).getHours(),
                        score: hourScore.score,
                        rating: hourScore.rating,
                        temp: Math.round(hour.temp),
                        rain: hour.pop ? Math.round(hour.pop * 100) : 0,
                        wind: Math.round(hour.wind_speed * 3.6)
                    };
                });
            }

            // Add AI data if requested
            if (includeAIData) {
                response.aiData = prepareOutdoorForAI(
                    scoreResult,
                    response.bestWindow,
                    { name: 'Location' },
                    activity
                );
            }

            return {
                status: 200,
                jsonBody: response
            };

        } catch (error) {
            context.error('Error computing outdoor score:', error);
            return {
                status: 500,
                jsonBody: { error: 'Failed to compute outdoor score', message: error.message }
            };
        }
    }
});

/**
 * Get activities endpoint - returns available activities
 */
app.http('GetOutdoorActivities', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'outdoor-activities',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: {
                activities: Object.entries(ACTIVITY_PROFILES).map(([key, profile]) => ({
                    id: key,
                    name: profile.name,
                    tempRange: profile.tempRange,
                    windTolerance: profile.windTolerance > 1 ? 'high' : profile.windTolerance < 1 ? 'low' : 'normal',
                    rainTolerance: profile.rainTolerance > 1 ? 'high' : profile.rainTolerance < 1 ? 'low' : 'normal'
                }))
            }
        };
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
        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

        const [currentRes, forecastRes] = await Promise.all([
            axios.get(currentUrl),
            axios.get(forecastUrl)
        ]);

        return {
            current: {
                temp: currentRes.data.main.temp,
                feels_like: currentRes.data.main.feels_like,
                humidity: currentRes.data.main.humidity,
                wind_speed: currentRes.data.wind.speed,
                wind_deg: currentRes.data.wind.deg,
                visibility: currentRes.data.visibility,
                weather: currentRes.data.weather,
                uvi: 0
            },
            hourly: forecastRes.data.list.map(item => ({
                dt: item.dt,
                temp: item.main.temp,
                feels_like: item.main.feels_like,
                humidity: item.main.humidity,
                wind_speed: item.wind.speed,
                pop: item.pop || 0,
                weather: item.weather,
                visibility: item.visibility || 10000
            }))
        };
    }
}