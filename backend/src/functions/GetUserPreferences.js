const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

/**
 * GetUserPreferences - Retrieve user notification and display preferences
 * 
 * GET /api/userpreferences?userId=user123
 * 
 * Returns: User's saved preferences or defaults if none exist
 */

app.http('GetUserPreferences', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'userpreferences',
    handler: async (request, context) => {
        context.log('GetUserPreferences function triggered');

        try {
            const userId = request.query.get('userId');

            if (!userId) {
                return {
                    status: 400,
                    jsonBody: { error: 'Missing userId parameter' }
                };
            }

            const connectionString = process.env.AzureWebJobsStorage;
            
            // Default preferences (returned if user has none saved)
            const defaultPreferences = {
                // Notification channels
                telegramEnabled: false,
                telegramChatId: '',
                whatsappEnabled: false,
                whatsappNumber: '',
                preferredChannel: 'telegram',

                // Alert types
                alertTypes: {
                    dailyForecast: true,
                    weatherWarnings: true,
                    temperatureAlerts: true,
                    stargazingAlerts: false,
                    auroraAlerts: false,
                    rainAlerts: false,
                },

                // Timing
                morningForecastTime: '07:00',
                quietHoursEnabled: false,
                quietHoursStart: '23:00',
                quietHoursEnd: '07:00',

                // Thresholds
                stargazingThreshold: 70,

                // Display
                temperatureUnit: 'celsius',
                windSpeedUnit: 'kmh',
                timeFormat: '24h',
            };

            // If using development storage, return defaults
            if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
                context.log('Using development storage - returning defaults');
                return {
                    status: 200,
                    jsonBody: {
                        userId: userId,
                        preferences: defaultPreferences,
                        isDefault: true
                    }
                };
            }

            // Try to get from database
            const tableClient = TableClient.fromConnectionString(
                connectionString,
                'UserPreferences'
            );

            try {
                const entity = await tableClient.getEntity('preferences', userId);
                
                // Parse stored preferences
                const storedPrefs = entity.preferencesJson 
                    ? JSON.parse(entity.preferencesJson)
                    : {};
            
                // ========== NEW: Fall back to flat columns ==========
                // If JSON doesn't have values, use flat columns
                if (storedPrefs.telegramEnabled === undefined && entity.telegramEnabled !== undefined) {
                    storedPrefs.telegramEnabled = entity.telegramEnabled;
                }
                if (!storedPrefs.telegramChatId && entity.telegramChatId) {
                    storedPrefs.telegramChatId = entity.telegramChatId;
                }
                if (storedPrefs.whatsappEnabled === undefined && entity.whatsappEnabled !== undefined) {
                    storedPrefs.whatsappEnabled = entity.whatsappEnabled;
                }
                // ====================================================
            
                // Merge with defaults (in case new fields were added)
                const preferences = {
                    ...defaultPreferences,
                    ...storedPrefs,
                    alertTypes: {
                        ...defaultPreferences.alertTypes,
                        ...(storedPrefs.alertTypes || {})
                    }
                };

                return {
                    status: 200,
                    jsonBody: {
                        userId: userId,
                        preferences: preferences,
                        lastUpdated: entity.timestamp,
                        isDefault: false
                    }
                };

            } catch (error) {
                if (error.statusCode === 404) {
                    // No preferences saved yet - return defaults
                    context.log(`No preferences found for ${userId}, returning defaults`);
                    return {
                        status: 200,
                        jsonBody: {
                            userId: userId,
                            preferences: defaultPreferences,
                            isDefault: true
                        }
                    };
                }
                throw error;
            }

        } catch (error) {
            context.error('Error in GetUserPreferences:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: 'Failed to get preferences',
                    details: error.message
                }
            };
        }
    }
});