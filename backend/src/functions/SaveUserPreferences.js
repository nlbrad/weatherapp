const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

/**
 * SaveUserPreferences - Save user notification and display preferences
 * 
 * POST /api/userpreferences
 * Body: { userId: string, preferences: object }
 * 
 * Returns: Confirmation of save
 */

app.http('SaveUserPreferences', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'userpreferences',
    handler: async (request, context) => {
        context.log('SaveUserPreferences function triggered');

        try {
            const body = await request.json();
            const { userId, preferences } = body;

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Missing userId' }
                };
            }

            if (!preferences) {
                return {
                    status: 400,
                    jsonBody: { error: 'Missing preferences object' }
                };
            }

            const connectionString = process.env.AzureWebJobsStorage;

            // Development mode - just log and return success
            if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
                context.log('Development mode - preferences would be saved:', preferences);
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        userId: userId,
                        message: 'Preferences saved (development mode)'
                    }
                };
            }

            // Production - save to Azure Table Storage
            const tableClient = TableClient.fromConnectionString(
                connectionString,
                'UserPreferences'
            );

            // Ensure table exists
            try {
                await tableClient.createTable();
                context.log('Created UserPreferences table');
            } catch (error) {
                // Table already exists - that's fine
                if (error.statusCode !== 409) {
                    context.log('Table may already exist');
                }
            }

            // Prepare entity
            const entity = {
                partitionKey: 'preferences',
                rowKey: userId,
                userId: userId,
                preferencesJson: JSON.stringify(preferences),
                
                // Store key fields as columns for potential querying
                telegramEnabled: preferences.telegramEnabled || false,
                telegramChatId: preferences.telegramChatId || '',
                whatsappEnabled: preferences.whatsappEnabled || false,
                whatsappNumber: preferences.whatsappNumber || '',
                preferredChannel: preferences.preferredChannel || 'telegram',
                
                // Alert types (flattened for querying)
                alertDailyForecast: preferences.alertTypes?.dailyForecast || false,
                alertWeatherWarnings: preferences.alertTypes?.weatherWarnings || false,
                alertTemperature: preferences.alertTypes?.temperatureAlerts || false,
                alertStargazing: preferences.alertTypes?.stargazingAlerts || false,
                alertAurora: preferences.alertTypes?.auroraAlerts || false,
                
                // Timing
                morningForecastTime: preferences.morningForecastTime || '07:00',
                quietHoursEnabled: preferences.quietHoursEnabled || false,
                quietHoursStart: preferences.quietHoursStart || '23:00',
                quietHoursEnd: preferences.quietHoursEnd || '07:00',
                
                updatedAt: new Date().toISOString()
            };

            // Upsert (insert or update)
            await tableClient.upsertEntity(entity);
            context.log(`Saved preferences for user: ${userId}`);

            return {
                status: 200,
                jsonBody: {
                    success: true,
                    userId: userId,
                    message: 'Preferences saved successfully',
                    updatedAt: entity.updatedAt
                }
            };

        } catch (error) {
            context.error('Error in SaveUserPreferences:', error);
            return {
                status: 500,
                jsonBody: {
                    error: 'Failed to save preferences',
                    details: error.message
                }
            };
        }
    }
});