const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * GetWeatherData - Combined weather endpoint
 * 
 * Returns ALL weather data in a single call:
 * - Current conditions
 * - Hourly forecast (48 hours)
 * - Daily forecast (7 days)
 * - Air quality
 * - Alerts
 * 
 * This reduces multiple API calls to ONE, improving performance
 * 
 * Endpoint: GET /api/GetWeatherData?lat=22.31&lon=114.16
 */

app.http('GetWeatherData', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        context.log('GetWeatherData function triggered');

        try {
            const lat = request.query.get('lat');
            const lon = request.query.get('lon');

            if (!lat || !lon) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ error: 'lat and lon parameters required' })
                };
            }

            const apiKey = process.env.OPENWEATHER_API_KEY;
            
            // Fetch all data in parallel for speed
            const [forecastResponse, airQualityResponse] = await Promise.all([
                // One Call API 3.0 - includes current, hourly, daily, alerts
                axios.get(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=metric&appid=${apiKey}`),
                // Air Quality
                axios.get(`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
            ]);

            const forecast = forecastResponse.data;
            const aq = airQualityResponse.data.list[0];

            // Build comprehensive response
            const result = {
                // Metadata
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                timezone: forecast.timezone,
                timezoneOffset: forecast.timezone_offset,
                fetchedAt: new Date().toISOString(),
                
                // Current conditions
                current: {
                    temp: forecast.current.temp,
                    feelsLike: forecast.current.feels_like,
                    humidity: forecast.current.humidity,
                    pressure: forecast.current.pressure,
                    dewPoint: forecast.current.dew_point,
                    clouds: forecast.current.clouds,
                    visibility: forecast.current.visibility,
                    windSpeed: forecast.current.wind_speed,
                    windDeg: forecast.current.wind_deg,
                    windGust: forecast.current.wind_gust,
                    uvi: forecast.current.uvi,
                    condition: forecast.current.weather[0].main,
                    description: forecast.current.weather[0].description,
                    icon: forecast.current.weather[0].icon,
                    sunrise: new Date(forecast.current.sunrise * 1000).toISOString(),
                    sunset: new Date(forecast.current.sunset * 1000).toISOString(),
                },

                // Hourly forecast (next 48 hours)
                hourly: forecast.hourly.slice(0, 48).map(hour => ({
                    dt: new Date(hour.dt * 1000).toISOString(),
                    temp: hour.temp,
                    feelsLike: hour.feels_like,
                    humidity: hour.humidity,
                    pressure: hour.pressure,
                    clouds: hour.clouds,
                    windSpeed: hour.wind_speed,
                    windDeg: hour.wind_deg,
                    pop: hour.pop, // Probability of precipitation
                    rain: hour.rain?.['1h'] || 0,
                    snow: hour.snow?.['1h'] || 0,
                    condition: hour.weather[0].main,
                    description: hour.weather[0].description,
                    icon: hour.weather[0].icon,
                })),

                // Daily forecast (7 days)
                daily: forecast.daily.slice(0, 7).map(day => ({
                    dt: new Date(day.dt * 1000).toISOString(),
                    sunrise: new Date(day.sunrise * 1000).toISOString(),
                    sunset: new Date(day.sunset * 1000).toISOString(),
                    moonrise: day.moonrise ? new Date(day.moonrise * 1000).toISOString() : null,
                    moonset: day.moonset ? new Date(day.moonset * 1000).toISOString() : null,
                    moonPhase: day.moon_phase,
                    tempMin: day.temp.min,
                    tempMax: day.temp.max,
                    tempMorn: day.temp.morn,
                    tempDay: day.temp.day,
                    tempEve: day.temp.eve,
                    tempNight: day.temp.night,
                    feelsLikeDay: day.feels_like.day,
                    feelsLikeNight: day.feels_like.night,
                    humidity: day.humidity,
                    pressure: day.pressure,
                    windSpeed: day.wind_speed,
                    windDeg: day.wind_deg,
                    clouds: day.clouds,
                    uvi: day.uvi,
                    pop: day.pop,
                    rain: day.rain || 0,
                    snow: day.snow || 0,
                    condition: day.weather[0].main,
                    description: day.weather[0].description,
                    icon: day.weather[0].icon,
                })),

                // Air quality
                airQuality: {
                    aqi: aq.main.aqi,
                    components: {
                        pm25: aq.components.pm2_5,
                        pm10: aq.components.pm10,
                        o3: aq.components.o3,
                        no2: aq.components.no2,
                        so2: aq.components.so2,
                        co: aq.components.co,
                        no: aq.components.no,
                        nh3: aq.components.nh3,
                    }
                },

                // Weather alerts (if any)
                alerts: forecast.alerts ? forecast.alerts.map(alert => ({
                    event: alert.event,
                    sender: alert.sender_name,
                    start: new Date(alert.start * 1000).toISOString(),
                    end: new Date(alert.end * 1000).toISOString(),
                    description: alert.description,
                    tags: alert.tags || []
                })) : []
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300', // Allow browser caching for 5 mins
                },
                body: JSON.stringify(result)
            };

        } catch (error) {
            context.error('Error fetching weather data:', error.message);
            
            return {
                status: error.response?.status || 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to fetch weather data',
                    message: error.message
                })
            };
        }
    }
});