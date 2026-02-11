/**
 * weatherDataHelper.js - Shared weather data fetching utility
 *
 * Consolidates the OpenWeather API calling logic that was previously
 * duplicated across 4 Compute* function files.
 *
 * Features:
 * - OpenWeather 3.0 OneCall API with 2.5 fallback
 * - In-memory caching with TTL
 */

const axios = require('axios');

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map();

/**
 * Get weather data from OpenWeather with caching and API fallback
 *
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {object} context - Logger (context.log/context.error) or console
 * @returns {object} Weather data with current and hourly properties
 */
async function getWeatherData(lat, lon, context = console) {
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
        if (context?.log) context.log('Falling back to OpenWeather 2.5 API');

        const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;

        const [currentRes, forecastRes] = await Promise.all([
            axios.get(currentUrl),
            axios.get(forecastUrl),
        ]);

        const fallbackData = {
            current: {
                temp: currentRes.data.main.temp,
                feels_like: currentRes.data.main.feels_like,
                humidity: currentRes.data.main.humidity,
                wind_speed: currentRes.data.wind.speed,
                wind_deg: currentRes.data.wind.deg,
                wind_gust: currentRes.data.wind.gust,
                visibility: currentRes.data.visibility,
                weather: currentRes.data.weather,
                clouds: currentRes.data.clouds?.all,
                uvi: 0,
            },
            hourly: forecastRes.data.list.map(item => ({
                dt: item.dt,
                temp: item.main.temp,
                feels_like: item.main.feels_like,
                humidity: item.main.humidity,
                wind_speed: item.wind.speed,
                wind_gust: item.wind.gust,
                pop: item.pop || 0,
                weather: item.weather,
                visibility: item.visibility || 10000,
                clouds: item.clouds?.all,
            })),
        };

        cache.set(cacheKey, { data: fallbackData, timestamp: Date.now() });
        return fallbackData;
    }
}

module.exports = { getWeatherData };
