const { app } = require('@azure/functions');
const { sendTelegramMessage } = require('../utils/telegramHelper');

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

            if (!result.ok) {
                return {
                    status: 500,
                    jsonBody: {
                        error: 'Failed to send message',
                        details: result.error
                    }
                };
            }

            return {
                status: 200,
                jsonBody: {
                    success: true,
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

// Re-export shared utility for backward compatibility
module.exports = { sendTelegramMessage };