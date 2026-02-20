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

            const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;

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
                
                // JSON storage for complex preferences
                preferencesJson: JSON.stringify({
                    telegramChatId: preferences.telegramChatId || '',
                    whatsappNumber: preferences.whatsappNumber || '',
                    preferredChannel: preferences.preferredChannel || 'telegram',
                    
                    alertTypes: preferences.alertTypes || {},
                    
                    // Time configurations
                    morningForecastTime: preferences.morningForecastTime || '07:00',
                    newsDigestTimes: preferences.newsDigestTimes || ['07:30', '18:00'],
                    cryptoDigestTimes: preferences.cryptoDigestTimes || ['08:00', '20:00'],  // NEW
                    
                    // Thresholds (support both key formats: legacy and frontend alertType-based)
                    stargazingThreshold: preferences.stargazingAlertsThreshold || preferences.stargazingThreshold || 70,
                    auroraThreshold: preferences.auroraAlertsThreshold || preferences.auroraThreshold || 50,
                    // Also persist frontend keys so they round-trip correctly
                    stargazingAlertsThreshold: preferences.stargazingAlertsThreshold || preferences.stargazingThreshold || 70,
                    auroraAlertsThreshold: preferences.auroraAlertsThreshold || preferences.auroraThreshold || 50,
                    
                    // Quiet hours
                    quietHoursEnabled: preferences.quietHoursEnabled || false,
                    quietHoursStart: preferences.quietHoursStart || '23:00',
                    quietHoursEnd: preferences.quietHoursEnd || '07:00',
                }),
                
                // Telegram config
                telegramEnabled: preferences.telegramEnabled || false,
                telegramChatId: preferences.telegramChatId || '',
                
                // Alert type flags (for backwards compatibility)
                alertDailyForecast: preferences.alertTypes?.dailyForecast || false,
                alertNewsDigest: preferences.alertTypes?.newsDigest || false,
                alertCryptoDigest: preferences.alertTypes?.cryptoDigest || false,  // NEW
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