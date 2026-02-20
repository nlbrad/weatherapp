const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const axios = require('axios');

/**
 * TelegramWebhook - Handle incoming messages from Telegram
 * 
 * This function receives webhook updates from Telegram when users
 * interact with your bot. It handles:
 * - /start command: Registers user's chat ID for alerts
 * - /stop command: Unsubscribes from alerts
 * - /status command: Shows current subscription status
 * 
 * Setup: You need to register this webhook URL with Telegram using:
 * https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_FUNCTION_URL>/api/telegram/webhook
 */

app.http('TelegramWebhook', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'telegram/webhook',
    handler: async (request, context) => {
        context.log('TelegramWebhook received update');

        try {
            const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
            if (secret) {
                const incoming = request.headers.get('x-telegram-bot-api-secret-token');
                if (incoming !== secret) {
                    context.warn('Telegram webhook secret mismatch');
                    return { status: 401, body: 'Unauthorized' };
                }
            }

            const update = await request.json();
            context.log('Telegram update:', JSON.stringify(update, null, 2));

            // Handle message updates
            if (update.message) {
                await handleMessage(update.message, context);
            }

            // Always return 200 to Telegram (otherwise it retries)
            return { status: 200, body: 'OK' };

        } catch (error) {
            context.error('Error processing webhook:', error);
            // Still return 200 to prevent Telegram from retrying
            return { status: 200, body: 'Error logged' };
        }
    }
});

/**
 * Handle incoming messages
 */
async function handleMessage(message, context) {
    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from.first_name || 'there';
    const username = message.from.username || null;

    context.log(`Message from ${firstName} (${chatId}): ${text}`);

    // Handle commands
    if (text.startsWith('/start')) {
        await handleStartCommand(chatId, firstName, username, context);
    } else if (text.startsWith('/stop')) {
        await handleStopCommand(chatId, firstName, context);
    } else if (text.startsWith('/status')) {
        await handleStatusCommand(chatId, context);
    } else if (text.startsWith('/test')) {
        await handleTestCommand(chatId, firstName, context);
    } else if (text.startsWith('/help')) {
        await handleHelpCommand(chatId, context);
    } else {
        // Unknown command or regular message
        await sendReply(chatId, 
            `👋 Hi ${firstName}! I'm your Weather Alert Bot.\n\n` +
            `Use /help to see available commands.`
        );
    }
}

/**
 * /start - Register user for alerts
 */
async function handleStartCommand(chatId, firstName, username, context) {
    try {
        // Save chat ID to database
        await saveTelegramUser(chatId, firstName, username, context);

        const welcomeMessage = 
            `🎉 *Welcome, ${firstName}!*\n\n` +
            `You're now connected to Weather Alerts!\n\n` +
            `*What happens next:*\n` +
            `• Go to the Weather Alert web app\n` +
            `• Open Settings → Notifications\n` +
            `• Select Telegram as your alert channel\n` +
            `• Your alerts will arrive here!\n\n` +
            `*Your Chat ID:* \`${chatId}\`\n` +
            `(You may need this for setup)\n\n` +
            `Type /help for all commands.`;

        await sendReply(chatId, welcomeMessage);
        context.log(`User registered: ${firstName} (${chatId})`);

    } catch (error) {
        context.error('Error in start command:', error);
        await sendReply(chatId, 
            `Welcome ${firstName}! ✅\n\n` +
            `Your Chat ID is: \`${chatId}\`\n\n` +
            `Use this in the Weather Alert app settings to receive alerts here.`
        );
    }
}

/**
 * /stop - Unsubscribe from alerts
 */
async function handleStopCommand(chatId, firstName, context) {
    try {
        await disableTelegramAlerts(chatId, context);

        await sendReply(chatId,
            `👋 Goodbye ${firstName}!\n\n` +
            `You've been unsubscribed from alerts.\n\n` +
            `You can re-enable alerts anytime by:\n` +
            `• Sending /start here, or\n` +
            `• Updating your settings in the web app`
        );

    } catch (error) {
        context.error('Error in stop command:', error);
        await sendReply(chatId, 
            `✅ Alerts disabled.\n\nSend /start to re-enable.`
        );
    }
}

/**
 * /status - Show current subscription status
 */
async function handleStatusCommand(chatId, context) {
    try {
        const status = await getTelegramUserStatus(chatId, context);

        if (status) {
            await sendReply(chatId,
                `📊 *Your Status*\n\n` +
                `• Chat ID: \`${chatId}\`\n` +
                `• Alerts: ${status.alertsEnabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `• Connected: ${status.connectedDate || 'Unknown'}\n\n` +
                `Manage your alert preferences in the web app.`
            );
        } else {
            await sendReply(chatId,
                `📊 *Your Status*\n\n` +
                `• Chat ID: \`${chatId}\`\n` +
                `• Status: Not fully registered\n\n` +
                `Complete setup in the Weather Alert web app settings.`
            );
        }

    } catch (error) {
        context.error('Error in status command:', error);
        await sendReply(chatId, 
            `Your Chat ID: \`${chatId}\`\n\n` +
            `Check the web app for full status.`
        );
    }
}

/**
 * /test - Send a test alert
 */
async function handleTestCommand(chatId, firstName, context) {
    const testMessage = 
        `🧪 *Test Alert*\n\n` +
        `Hey ${firstName}! This is a test message.\n\n` +
        `If you can see this, Telegram alerts are working! ✅\n\n` +
        `_Sent at: ${new Date().toLocaleString('en-IE', { timeZone: 'Europe/Dublin' })}_`;

    await sendReply(chatId, testMessage);
    context.log(`Test message sent to ${chatId}`);
}

/**
 * /help - Show available commands
 */
async function handleHelpCommand(chatId, context) {
    const helpMessage = 
        `🤖 *Weather Alert Bot Commands*\n\n` +
        `/start - Connect to receive alerts\n` +
        `/stop - Unsubscribe from alerts\n` +
        `/status - Check your subscription\n` +
        `/test - Send a test message\n` +
        `/help - Show this help\n\n` +
        `*Alert Types Available:*\n` +
        `• 🌡️ Temperature alerts\n` +
        `• ⛈️ Weather warnings\n` +
        `• 🌟 Stargazing conditions\n` +
        `• 🌌 Northern Lights alerts\n\n` +
        `Configure alerts in the web app settings.`;

    await sendReply(chatId, helpMessage);
}

/**
 * Send a reply message
 */
async function sendReply(chatId, text) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    await axios.post(url, {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
    });
}

/**
 * Save Telegram user to database
 */
async function saveTelegramUser(chatId, firstName, username, context) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Using development storage - user save simulated');
        return;
    }

    const tableClient = TableClient.fromConnectionString(
        connectionString,
        'TelegramUsers'
    );

    // Ensure table exists
    try {
        await tableClient.createTable();
    } catch (e) {
        // Table might already exist
    }

    const entity = {
        partitionKey: 'telegram',
        rowKey: chatId.toString(),
        chatId: chatId,
        firstName: firstName,
        username: username || '',
        alertsEnabled: true,
        connectedAt: new Date().toISOString()
    };

    await tableClient.upsertEntity(entity);
    context.log(`Saved Telegram user: ${chatId}`);
}

/**
 * Disable alerts for a user
 */
async function disableTelegramAlerts(chatId, context) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Using development storage - disable simulated');
        return;
    }

    const tableClient = TableClient.fromConnectionString(
        connectionString,
        'TelegramUsers'
    );

    try {
        const entity = await tableClient.getEntity('telegram', chatId.toString());
        entity.alertsEnabled = false;
        await tableClient.updateEntity(entity);
        context.log(`Disabled alerts for: ${chatId}`);
    } catch (e) {
        context.log('User not found in database');
    }
}

/**
 * Get user status from database
 */
async function getTelegramUserStatus(chatId, context) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        return null;
    }

    const tableClient = TableClient.fromConnectionString(
        connectionString,
        'TelegramUsers'
    );

    try {
        const entity = await tableClient.getEntity('telegram', chatId.toString());
        return {
            alertsEnabled: entity.alertsEnabled,
            connectedDate: entity.connectedAt
        };
    } catch (e) {
        return null;
    }
}

module.exports = { sendReply };