const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Initialize Table Storage client
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');

app.http('SaveUserLocation', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('SaveUserLocation function triggered');

        try {
            // Get data from request body
            const body = await request.json();
            const { userId, locationName, country, alertsEnabled, minTemp, maxTemp } = body;

            // Validate required fields
            if (!userId || !locationName) {
                return {
                    status: 400,
                    body: JSON.stringify({ 
                        error: 'userId and locationName are required' 
                    })
                };
            }

            // Create table if it doesn't exist
            await tableClient.createTable().catch(() => {
                // Table already exists, ignore error
            });

            // Create entity (row) for Table Storage
            const entity = {
                partitionKey: userId,  // Groups data by user
                rowKey: locationName,  // Unique identifier within partition
                locationName: locationName,
                country: country || '',
                alertsEnabled: alertsEnabled ?? true,
                minTemp: minTemp ?? 0,
                maxTemp: maxTemp ?? 30,
                createdAt: new Date().toISOString()
            };

            // Save to table (upsert = create or update)
            await tableClient.upsertEntity(entity, 'Replace');

            context.log(`Location saved: ${locationName} for user ${userId}`);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
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
                body: JSON.stringify({ 
                    error: 'Failed to save location',
                    details: error.message 
                })
            };
        }
    }
});
