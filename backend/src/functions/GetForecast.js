const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * GetForecast - Fetch weather forecast data
 * 
 * Endpoints:
 * GET /api/getforecast?city=Dublin&country=IE
 * 
 * Returns:
 * - 7-day daily forecast (high/low temps, conditions)
 * - 24-hour hourly forecast (temp, conditions, precipitation)
 * - Sunrise/sunset times
 */

app.http('GetForecast', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        context.log('GetForecast function triggered');

        try {
            let city, country;
            
            // Get parameters from query string or body
            if (request.method === 'GET') {
                city = request.query.get('city');
                country = request.query.get('country');
            } else {
                const body = await request.json();
                city = body.city;
                country = body.country;
            }

            if (!city) {
                return {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ error: 'City parameter is required' })
                };
            }

            const apiKey = process.env.OPENWEATHER_API_KEY;
            const location = country ? `${city},${country}` : city;

            // First, get coordinates from geocoding API
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${apiKey}`;
            const geoResponse = await axios.get(geoUrl);
            
            if (!geoResponse.data || geoResponse.data.length === 0) {
                return {
                    status: 404,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ error: 'Location not found' })
                };
            }

            const { lat, lon, name, country: countryCode } = geoResponse.data[0];

            // Fetch forecast data using One Call API 3.0
            const forecastUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,alerts&units=metric&appid=${apiKey}`;
            const forecastResponse = await axios.get(forecastUrl);
            const data = forecastResponse.data;

            // Process daily forecast (7 days)
            const daily = data.daily.slice(0, 7).map(day => ({
                date: new Date(day.dt * 1000).toISOString(),
                timestamp: day.dt,
                tempHigh: day.temp.max,
                tempLow: day.temp.min,
                tempMorn: day.temp.morn,
                tempDay: day.temp.day,
                tempEve: day.temp.eve,
                tempNight: day.temp.night,
                feelsLike: {
                    morn: day.feels_like.morn,
                    day: day.feels_like.day,
                    eve: day.feels_like.eve,
                    night: day.feels_like.night
                },
                condition: day.weather[0].main,
                description: day.weather[0].description,
                icon: day.weather[0].icon,
                humidity: day.humidity,
                pressure: day.pressure,
                windSpeed: day.wind_speed,
                windDirection: day.wind_deg,
                clouds: day.clouds,
                pop: day.pop, // Probability of precipitation
                rain: day.rain || 0,
                snow: day.snow || 0,
                uvi: day.uvi, // UV index
                sunrise: new Date(day.sunrise * 1000).toISOString(),
                sunset: new Date(day.sunset * 1000).toISOString(),
                moonrise: day.moonrise ? new Date(day.moonrise * 1000).toISOString() : null,
                moonset: day.moonset ? new Date(day.moonset * 1000).toISOString() : null,
                moonPhase: day.moon_phase // 0-1 where 0=new, 0.5=full, 1=new
            }));

            // Process hourly forecast (24 hours)
            const hourly = data.hourly.slice(0, 24).map(hour => ({
                time: new Date(hour.dt * 1000).toISOString(),
                timestamp: hour.dt,
                temp: hour.temp,
                feelsLike: hour.feels_like,
                condition: hour.weather[0].main,
                description: hour.weather[0].description,
                icon: hour.weather[0].icon,
                humidity: hour.humidity,
                pressure: hour.pressure,
                windSpeed: hour.wind_speed,
                windDirection: hour.wind_deg,
                clouds: hour.clouds,
                pop: hour.pop, // Probability of precipitation
                rain: hour.rain ? hour.rain['1h'] : 0,
                snow: hour.snow ? hour.snow['1h'] : 0,
                visibility: hour.visibility ? hour.visibility / 1000 : 10 // Convert to km
            }));

            // Current conditions (for sunrise/sunset and additional metrics)
            const current = {
                sunrise: new Date(data.current.sunrise * 1000).toISOString(),
                sunset: new Date(data.current.sunset * 1000).toISOString(),
                timezone: data.timezone,
                timezoneOffset: data.timezone_offset,
                dew_point: data.current.dew_point,
                clouds: data.current.clouds,
                uvi: data.current.uvi
            };

            const result = {
                location: {
                    name: name,
                    country: countryCode,
                    lat: lat,
                    lon: lon
                },
                current: current,
                daily: daily,
                hourly: hourly,
                timestamp: new Date().toISOString()
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(result)
            };

        } catch (error) {
            context.error('Error fetching forecast:', error.message);
            
            // Check if it's an OpenWeather API error
            if (error.response?.status === 401) {
                return {
                    status: 401,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ 
                        error: 'Invalid API key or One Call API 3.0 not enabled',
                        details: 'You may need to subscribe to One Call API 3.0 on OpenWeather'
                    })
                };
            }
            
            return {
                status: error.response?.status || 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to fetch forecast data',
                    details: error.message 
                })
            };
        }
    }
});