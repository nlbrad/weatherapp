const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * SearchLocations - Location autocomplete using Google Places API
 * 
 * Uses Google Places Autocomplete for better results:
 * - Faster autocomplete suggestions
 * - Better global coverage
 * - Handles special characters and variations
 * 
 * Endpoint: GET /api/SearchLocations?query=Hong+Kong&limit=6
 * 
 * Required env var: GOOGLE_PLACES_API_KEY
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
            const limit = parseInt(request.query.get('limit')) || 6;

            if (!query || query.length < 2) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Query parameter required (minimum 2 characters)' 
                    })
                };
            }

            const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
            
            if (!googleApiKey) {
                context.warn('GOOGLE_PLACES_API_KEY not set, falling back to OpenWeather');
                return await fallbackToOpenWeather(query, limit, context);
            }

            // Use Google Places Autocomplete API
            // Type: (cities) restricts to cities only
            const autocompleteUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${googleApiKey}`;
            
            context.log(`Searching Google Places for: ${query}`);
            const autocompleteResponse = await axios.get(autocompleteUrl);
            
            if (autocompleteResponse.data.status !== 'OK' && autocompleteResponse.data.status !== 'ZERO_RESULTS') {
                context.error('Google Places API error:', autocompleteResponse.data.status);
                return await fallbackToOpenWeather(query, limit, context);
            }

            const predictions = autocompleteResponse.data.predictions || [];
            
            // Get details (including lat/lon) for each prediction
            const locations = await Promise.all(
                predictions.slice(0, limit).map(async (prediction) => {
                    try {
                        // Get place details to retrieve coordinates
                        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,address_components,name&key=${googleApiKey}`;
                        const detailsResponse = await axios.get(detailsUrl);
                        
                        if (detailsResponse.data.status !== 'OK') {
                            return null;
                        }

                        const details = detailsResponse.data.result;
                        const lat = details.geometry.location.lat;
                        const lon = details.geometry.location.lng;
                        
                        // Extract country code from address components
                        let country = '';
                        let state = '';
                        let cityName = details.name;
                        
                        for (const component of details.address_components || []) {
                            if (component.types.includes('country')) {
                                country = component.short_name;
                            }
                            if (component.types.includes('administrative_area_level_1')) {
                                state = component.long_name;
                            }
                            if (component.types.includes('locality')) {
                                cityName = component.long_name;
                            }
                        }

                        return {
                            name: cityName,
                            country: country,
                            state: state || null,
                            lat: lat,
                            lon: lon,
                            displayName: prediction.description,
                            placeId: prediction.place_id,
                            id: `${cityName}-${state || ''}-${country}-${lat.toFixed(2)}`
                        };
                    } catch (err) {
                        context.warn(`Failed to get details for ${prediction.description}:`, err.message);
                        return null;
                    }
                })
            );

            const validLocations = locations.filter(loc => loc !== null);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    query: query,
                    count: validLocations.length,
                    locations: validLocations,
                    source: 'google'
                })
            };

        } catch (error) {
            context.error('Error searching locations:', error.message);
            
            // Try fallback to OpenWeather
            try {
                const query = request.query.get('query');
                const limit = parseInt(request.query.get('limit')) || 6;
                return await fallbackToOpenWeather(query, limit, context);
            } catch (fallbackError) {
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
    }
});

/**
 * Fallback to OpenWeather Geocoding if Google isn't available
 */
async function fallbackToOpenWeather(query, limit, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
        throw new Error('No API keys configured');
    }

    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey}`;
    
    context.log(`Falling back to OpenWeather for: ${query}`);
    const response = await axios.get(geoUrl);
    
    const locations = response.data.map(loc => ({
        name: loc.name,
        country: loc.country,
        state: loc.state || null,
        lat: loc.lat,
        lon: loc.lon,
        displayName: loc.state 
            ? `${loc.name}, ${loc.state}, ${loc.country}`
            : `${loc.name}, ${loc.country}`,
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
            locations: locations,
            source: 'openweather'
        })
    };
}