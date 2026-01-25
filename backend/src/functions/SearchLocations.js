const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * SearchLocations - Geocoding API for location autocomplete
 * 
 * Uses OpenWeather Geocoding API to search for cities
 * Returns location suggestions with coordinates
 * 
 * Endpoint: GET /api/SearchLocations?query=Dublin&limit=5
 */

app.http('SearchLocations', {
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

        context.log('SearchLocations function triggered');

        try {
            const query = request.query.get('query');
            const limit = request.query.get('limit') || 5;

            if (!query || query.length < 2) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Query parameter required (minimum 2 characters)' 
                    })
                };
            }

            const apiKey = process.env.OPENWEATHER_API_KEY;
            
            // Use OpenWeather Geocoding API
            const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey}`;
            
            context.log(`Searching for: ${query}`);
            const response = await axios.get(geoUrl);
            
            // Transform response to our format
            const locations = response.data.map(loc => ({
                name: loc.name,
                country: loc.country,
                state: loc.state || null,
                lat: loc.lat,
                lon: loc.lon,
                // Create display name
                displayName: loc.state 
                    ? `${loc.name}, ${loc.state}, ${loc.country}`
                    : `${loc.name}, ${loc.country}`,
                // Create unique ID for React keys
                id: `${loc.name}-${loc.state || ''}-${loc.country}-${loc.lat.toFixed(2)}`
            }));

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    query: query,
                    count: locations.length,
                    locations: locations
                })
            };

        } catch (error) {
            context.error('Error searching locations:', error.message);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to search locations',
                    message: error.message
                })
            };
        }
    }
});