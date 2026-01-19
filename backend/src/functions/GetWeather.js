const { app } = require('@azure/functions');
const axios = require('axios');

// Get weather data for a specific location
app.http('GetWeather', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.info('GetWeather function triggered');

        try {
            // Get location from query params or body
            const city = request.query.get('city') || (await request.json()).city;
            const country = request.query.get('country') || (await request.json()).country;

            if (!city) {
                return {
                    status: 400,
                    body: JSON.stringify({ error: 'City parameter is required' })
                };
            }

            // Call OpenWeatherMap API
            const apiKey = process.env.OPENWEATHER_API_KEY;
            const location = country ? `${city},${country}` : city;
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;

            const response = await axios.get(url);
            const weatherData = response.data;

            // Format the response
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
                    icon: weatherData.weather[0].icon
                },
                wind: {
                    speed: weatherData.wind.speed,
                    direction: weatherData.wind.deg
                },
                timestamp: new Date().toISOString()
            };

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(result)
            };

        } catch (error) {
            context.error('Error fetching weather:', error.message);
            
            return {
                status: error.response?.status || 500,
                body: JSON.stringify({ 
                    error: 'Failed to fetch weather data',
                    details: error.message 
                })
            };
        }
    }
});
