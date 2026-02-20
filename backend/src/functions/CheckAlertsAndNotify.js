const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const axios = require('axios');
const twilio = require('twilio');

// Initialize clients
const storageConnectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';
const tableClient = TableClient.fromConnectionString(storageConnectionString, 'UserLocations');

const WHATSAPP_ENABLED = process.env.WHATSAPP_ENABLED === 'true';
const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

function getTwilioClient() {
    if (!WHATSAPP_ENABLED) {
        return null;
    }
    return twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Timer trigger - runs every hour (except 7am to avoid duplicate with DailyForecast)
app.timer('CheckAlertsAndNotify', {
    schedule: '0 0 * * * *', // Every hour at minute 0
    handler: async (myTimer, context) => {
        // Skip 7am UTC - DailyForecastTimer handles this hour
        const currentHour = new Date().getUTCHours();
        if (currentHour === 7) {
            context.log('CheckAlertsAndNotify: Skipping 7am - DailyForecastTimer handles this');
            return;
        }
        
        context.log('CheckAlertsAndNotify timer triggered');
        await checkAndNotify(context);
    }
});

// Also create HTTP trigger for manual testing
app.http('CheckAlertsAndNotifyHttp', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'CheckAlerts',
    handler: async (request, context) => {
        context.log('Manual alert check triggered');
        await checkAndNotify(context);
        
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Alert check completed' })
        };
    }
});

// Main logic (shared between timer and HTTP triggers)
async function checkAndNotify(context) {
    try {
        // Get all user locations from database
        const entities = tableClient.listEntities();
        
        const alertsSent = [];
        let locationsChecked = 0;

        for await (const entity of entities) {
            locationsChecked++;
            
            // Skip if alerts are disabled for this location
            if (!entity.alertsEnabled) {
                context.log(`Skipping ${entity.locationName} - alerts disabled`);
                continue;
            }

            const userId = entity.partitionKey;
            const locationName = entity.locationName;
            const country = entity.country;
            const minTemp = entity.minTemp;
            const maxTemp = entity.maxTemp;

            context.log(`Checking weather for ${locationName} (User: ${userId})`);

            // Fetch current weather
            const location = country ? `${locationName},${country}` : locationName;
            const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${openWeatherApiKey}&units=metric`;
            
            const weatherResponse = await axios.get(weatherUrl);
            const currentTemp = weatherResponse.data.main.temp;
            const condition = weatherResponse.data.weather[0].description;

            context.log(`${locationName}: ${currentTemp}°C, ${condition}`);

            // Check if temperature is outside thresholds
            let alertMessage = null;

            if (currentTemp < minTemp) {
                alertMessage = `🥶 Cold Alert for ${locationName}!\n\nCurrent: ${currentTemp}°C\nYour minimum: ${minTemp}°C\n\nConditions: ${condition}\n\nDress warmly!`;
            } else if (currentTemp > maxTemp) {
                alertMessage = `🥵 Heat Alert for ${locationName}!\n\nCurrent: ${currentTemp}°C\nYour maximum: ${maxTemp}°C\n\nConditions: ${condition}\n\nStay cool and hydrated!`;
            }

            // Send WhatsApp alert if threshold exceeded
            if (alertMessage) {
                try {
                    // For testing, we'll need the user's WhatsApp number
                    // In production, you'd store this in the database
                    // For now, we'll use a test number from environment variable
                    const userPhone = process.env.TEST_WHATSAPP_NUMBER;

                    if (!WHATSAPP_ENABLED) {
                        context.log('WhatsApp disabled - alert would have been sent:', alertMessage);
                    } else if (userPhone) {
                        const twilioClient = getTwilioClient();
                        if (!twilioClient) {
                            context.log('Twilio client not configured - alert would have been sent:', alertMessage);
                            continue;
                        }
                        const message = await twilioClient.messages.create({
                            from: process.env.TWILIO_WHATSAPP_FROM,
                            to: `whatsapp:${userPhone}`,
                            body: alertMessage
                        });

                        context.log(`Alert sent! SID: ${message.sid}`);
                        alertsSent.push({
                            location: locationName,
                            userId: userId,
                            temperature: currentTemp,
                            messageSid: message.sid
                        });
                    } else {
                        context.log('No test WhatsApp number configured - alert would have been sent:', alertMessage);
                    }
                } catch (twilioError) {
                    context.error(`Failed to send WhatsApp message: ${twilioError.message}`);
                }
            }
        }

        context.log(`Alert check complete. Checked ${locationsChecked} locations. Sent ${alertsSent.length} alerts.`);
        
    } catch (error) {
        context.error('Error in checkAndNotify:', error);
    }
}