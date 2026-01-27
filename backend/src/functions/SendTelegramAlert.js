const { app } = require('@azure/functions');
const axios = require('axios');

/**
 * SendTelegramAlert - Send a message via Telegram Bot API
 * 
 * This function can be:
 * 1. Called directly via HTTP (for testing)
 * 2. Called from other functions (like CheckAlertsAndNotify)
 * 
 * Environment variables required:
 * - TELEGRAM_BOT_TOKEN: Your bot token from @BotFather
 */

// HTTP Trigger - for testing and manual sends
app.http('SendTelegramAlert', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'telegram/send',
    handler: async (request, context) => {
        context.log('SendTelegramAlert function triggered');

        try {
            const body = await request.json();
            const { chatId, message } = body;

            if (!chatId || !message) {
                return {
                    status: 400,
                    jsonBody: { 
                        error: 'Missing required fields: chatId and message' 
                    }
                };
            }

            const result = await sendTelegramMessage(chatId, message, context);

            return {
                status: 200,
                jsonBody: { 
                    success: true, 
                    messageId: result.message_id,
                    chatId: chatId
                }
            };

        } catch (error) {
            context.error('Error sending Telegram message:', error);
            return {
                status: 500,
                jsonBody: { 
                    error: 'Failed to send message',
                    details: error.message 
                }
            };
        }
    }
});

/**
 * Send a message via Telegram Bot API
 * Can be imported and used by other functions
 * 
 * @param {string|number} chatId - Telegram chat ID
 * @param {string} message - Message text (supports Markdown)
 * @param {object} context - Azure Functions context (for logging)
 * @param {object} options - Additional options
 * @returns {object} Telegram API response
 */
async function sendTelegramMessage(chatId, message, context = console, options = {}) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
        throw new Error('TELEGRAM_BOT_TOKEN environment variable not set');
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const payload = {
        chat_id: chatId,
        text: message,
        parse_mode: options.parseMode || 'Markdown',
        disable_notification: options.silent || false,
    };

    // Add reply keyboard if provided
    if (options.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
    }

    try {
        const response = await axios.post(url, payload);
        
        if (response.data.ok) {
            context.log(`Telegram message sent successfully to chat ${chatId}`);
            return response.data.result;
        } else {
            throw new Error(`Telegram API error: ${response.data.description}`);
        }
    } catch (error) {
        if (error.response) {
            // Telegram API returned an error
            const telegramError = error.response.data;
            context.error('Telegram API error:', telegramError);
            throw new Error(`Telegram API error: ${telegramError.description}`);
        }
        throw error;
    }
}

// Export for use in other functions
module.exports = { sendTelegramMessage };