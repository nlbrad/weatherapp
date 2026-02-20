const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');

/**
 * DeleteUserLocation - Remove a user's saved location
 * 
 * Endpoint: DELETE /api/DeleteUserLocation?userId=xxx&locationName=xxx
 */

app.http('DeleteUserLocation', {
    methods: ['DELETE', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        context.log('DeleteUserLocation function triggered');

        try {
            const userId = request.query.get('userId');
            const locationName = request.query.get('locationName');

            if (!userId || !locationName) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'userId and locationName parameters are required' 
                    })
                };
            }

            // Delete from Azure Table Storage
            // partitionKey = userId, rowKey = locationName
            await tableClient.deleteEntity(userId, locationName);

            context.log(`Location deleted: ${locationName} for user ${userId}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    message: 'Location deleted successfully',
                    userId: userId,
                    locationName: locationName
                })
            };

        } catch (error) {
            // If entity doesn't exist, Azure throws an error
            if (error.statusCode === 404) {
                return {
                    status: 404,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({ 
                        error: 'Location not found'
                    })
                };
            }

            context.error('Error deleting location:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ 
                    error: 'Failed to delete location',
                    details: error.message 
                })
            };
        }
    }
});