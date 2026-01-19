const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');

app.http('GetUserLocations', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('GetUserLocations function triggered');

        try {
            const userId = request.query.get('userId');

            if (!userId) {
                return {
                    status: 400,
                    body: JSON.stringify({ 
                        error: 'userId parameter is required' 
                    })
                };
            }

            // Query all locations for this user
            const entities = tableClient.listEntities({
                queryOptions: { filter: `PartitionKey eq '${userId}'` }
            });

            // Convert async iterator to array
            const locations = [];
            for await (const entity of entities) {
                locations.push({
                    locationName: entity.locationName,
                    country: entity.country,
                    alertsEnabled: entity.alertsEnabled,
                    minTemp: entity.minTemp,
                    maxTemp: entity.maxTemp,
                    createdAt: entity.createdAt
                });
            }

            context.log(`Found ${locations.length} locations for user ${userId}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ 
                    userId: userId,
                    locations: locations
                })
            };

        } catch (error) {
            context.error('Error retrieving locations:', error);
            
            return {
                status: 500,
                body: JSON.stringify({ 
                    error: 'Failed to retrieve locations',
                    details: error.message 
                })
            };
        }
    }
});
