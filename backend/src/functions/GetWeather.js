const { app } = require('@azure/functions');
const axios = require('axios');

app.http('GetWeather', {
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

        context.log('GetWeather function triggered');

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
            
            // Fetch weather data
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
            const weatherResponse = await axios.get(weatherUrl);
            const weatherData = weatherResponse.data;

            // Fetch air quality data using coordinates from weather response
            let airQuality = null;
            try {
                const aqUrl = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&appid=${apiKey}`;
                const aqResponse = await axios.get(aqUrl);
                const aqData = aqResponse.data.list[0];
                
                airQuality = {
                    aqi: aqData.main.aqi, // 1-5 scale
                    components: {
                        pm25: aqData.components.pm2_5,
                        pm10: aqData.components.pm10,
                        o3: aqData.components.o3,
                        no2: aqData.components.no2,
                        so2: aqData.components.so2,
                        co: aqData.components.co
                    }
                };
            } catch (aqError) {
                context.warn('Failed to fetch air quality data:', aqError.message);
                // Continue without air quality data
            }

            const result = {
                location: {
                    name: weatherData.name,
                    country: weatherData.sys.country
                },
                weather: {
                    temp: weatherData.main.temp,
                    feelsLike: weatherData.main.feels_like,
                    tempMin: weatherData.main.temp_min,
                    tempMax: weatherData.main.temp_max,
                    humidity: weatherData.main.humidity,
                    pressure: weatherData.main.pressure,
                    condition: weatherData.weather[0].main,
                    description: weatherData.weather[0].description,
                    icon: weatherData.weather[0].icon,
                    visibility: weatherData.visibility ? weatherData.visibility / 1000 : 10 // Convert meters to km
                },
                wind: {
                    speed: weatherData.wind.speed,
                    direction: weatherData.wind.deg
                },
                airQuality: airQuality, // Add air quality data
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
            context.error('Error fetching weather:', error.message);
            
            return {
                status: error.response?.status || 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to fetch weather data',
                    details: error.message 
                })
            };
        }
    }
});