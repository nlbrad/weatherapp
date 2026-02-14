const { app } = require('@azure/functions');
const axios = require('axios');
const { getIrelandWarnings } = require('../utils/MeteoAlarm');

/**
 * GetWeatherData - Combined weather endpoint
 *
 * Returns ALL weather data in a single call:
 * - Current conditions
 * - Hourly forecast (48 hours)
 * - Daily forecast (7 days)
 * - Air quality
 * - Alerts (OpenWeather for all locations + MeteoAlarm for Ireland)
 *
 * Endpoint: GET /api/GetWeatherData?lat=53.35&lon=-6.26&country=IE
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
            const country = (request.query.get('country') || '').toUpperCase();

            if (!lat || !lon) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ error: 'lat and lon parameters required' })
                };
            }

            const apiKey = process.env.OPENWEATHER_API_KEY;

            // Determine if this is an Ireland location (for MeteoAlarm)
            const isIreland = country === 'IE' || country === 'IRELAND';

            // Fetch all data in parallel for speed
            const fetches = [
                // One Call API 3.0 - includes current, hourly, daily, alerts
                axios.get(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=metric&appid=${apiKey}`),
                // Air Quality
                axios.get(`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`),
            ];

            // Add MeteoAlarm fetch for Ireland locations
            if (isIreland) {
                fetches.push(
                    getIrelandWarnings().catch(err => {
                        context.warn('MeteoAlarm fetch failed:', err.message);
                        return [];
                    })
                );
            }

            const results = await Promise.all(fetches);
            const forecast = results[0].data;
            const aq = results[1].data.list[0];
            const meteoAlarmWarnings = isIreland ? (results[2] || []) : [];

            // Build alerts array — MeteoAlarm for Ireland, OpenWeather for all
            const openWeatherAlerts = forecast.alerts ? forecast.alerts.map(alert => ({
                event: alert.event,
                sender: alert.sender_name,
                start: new Date(alert.start * 1000).toISOString(),
                end: new Date(alert.end * 1000).toISOString(),
                description: alert.description,
                tags: alert.tags || [],
                source: 'openweather',
            })) : [];

            const meteoAlerts = meteoAlarmWarnings.map(w => ({
                event: `${w.severityName} ${w.type} Warning`,
                sender: w.sender || 'Met Éireann',
                start: w.onset ? w.onset.toISOString() : new Date().toISOString(),
                end: w.expires ? w.expires.toISOString() : new Date().toISOString(),
                description: [
                    w.headline,
                    w.description,
                    w.regionsText && !w.isNationwide ? `Regions: ${w.regionsText}` : null,
                    w.instruction ? `Advice: ${w.instruction}` : null,
                ].filter(Boolean).join('\n'),
                tags: [w.type?.toLowerCase(), w.severityName?.toLowerCase()].filter(Boolean),
                source: 'meteoalarm',
                severity: w.severityName,
                severityLevel: w.severityLevel,
            }));

            // Combine: MeteoAlarm first (more reliable for Ireland), then OpenWeather
            // Deduplicate: if MeteoAlarm has warnings, skip OpenWeather alerts that look like duplicates
            let combinedAlerts;
            if (meteoAlerts.length > 0) {
                // Use MeteoAlarm as primary source for Ireland
                // Still include OpenWeather alerts that don't overlap with MeteoAlarm types
                const meteoTypes = new Set(meteoAlarmWarnings.map(w => w.type?.toLowerCase()));
                const uniqueOWAlerts = openWeatherAlerts.filter(ow => {
                    const owEvent = (ow.event || '').toLowerCase();
                    // Skip if MeteoAlarm already covers this type
                    return !Array.from(meteoTypes).some(t => owEvent.includes(t));
                });
                combinedAlerts = [...meteoAlerts, ...uniqueOWAlerts];
            } else {
                combinedAlerts = openWeatherAlerts;
            }

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
                    windSpeed: forecast.current.wind_speed * 3.6,
                    windDeg: forecast.current.wind_deg,
                    windGust: forecast.current.wind_gust ? forecast.current.wind_gust * 3.6 : undefined,
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
                    windSpeed: hour.wind_speed * 3.6,
                    windDeg: hour.wind_deg,
                    pop: hour.pop,
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
                    windSpeed: day.wind_speed * 3.6,
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

                // Weather alerts
                alerts: combinedAlerts,
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=300',
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
