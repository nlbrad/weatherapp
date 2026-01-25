const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');

/**
 * SaveUserLocation - Save or update a user's location
 * 
 * UPDATED: Now supports latitude/longitude for map integration
 * 
 * Required: userId, locationName
 * Optional: country, lat, lon, alertsEnabled, minTemp, maxTemp
 */

app.http('SaveUserLocation', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        context.log('SaveUserLocation function triggered');

        try {
            const body = await request.json();
            const { 
                userId, 
                locationName, 
                country, 
                latitude,      // NEW
                longitude,     // NEW
                alertsEnabled, 
                minTemp, 
                maxTemp 
            } = body;

            if (!userId || !locationName) {
                return {
                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ 
                        error: 'userId and locationName are required' 
                    })
                };
            }

            // Ensure table exists
            await tableClient.createTable().catch(() => {});

            const entity = {
                partitionKey: userId,
                rowKey: locationName,
                locationName: locationName,
                country: country || '',
                latitude: latitude || null,       // NEW - Store coordinates
                longitude: longitude || null,     // NEW - Store coordinates
                alertsEnabled: alertsEnabled ?? true,
                minTemp: minTemp ?? 0,
                maxTemp: maxTemp ?? 30,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await tableClient.upsertEntity(entity, 'Replace');

            context.log(`Location saved: ${locationName} for user ${userId} (${latitude}, ${longitude})`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    message: 'Location saved successfully',
                    location: entity
                })
            };

        } catch (error) {
            context.error('Error saving location:', error);
            
            return {
                status: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to save location',
                    details: error.message 
                })
            };
        }
    }
});