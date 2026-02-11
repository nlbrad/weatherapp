/**
 * telegramHelper.js - Shared Telegram messaging utility
 *
 * Consolidates Telegram message sending logic that was previously
 * duplicated across 7+ function files.
 *
 * Features:
 * - Supports Markdown and HTML parse modes
 * - HTML retry/fallback (strips tags if parsing fails)
 * - Message truncation for Telegram's 4096 char limit
 * - Silent mode and reply markup support
 */

const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Send a Telegram message with retry logic
 *
 * @param {string} chatId - Telegram chat ID
 * @param {string} message - Message text
 * @param {object} context - Logger (context.log/context.error) or console
 * @param {object} options - Additional options
 * @param {string} options.parseMode - 'Markdown' or 'HTML' (default: 'Markdown')
 * @param {boolean} options.silent - Send without notification sound
 * @param {object} options.replyMarkup - Telegram reply markup (inline keyboards etc.)
 * @param {boolean} options.disablePreview - Disable link previews (default: false)
 * @returns {object} { ok: boolean, warning?: string, error?: string }
 */
async function sendTelegramMessage(chatId, message, context = console, options = {}) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        const msg = 'TELEGRAM_BOT_TOKEN not configured';
        if (context?.error) context.error(msg);
        return { ok: false, error: msg };
    }

    if (!chatId) {
        const msg = 'No chat ID provided';
        if (context?.error) context.error(msg);
        return { ok: false, error: msg };
    }

    const parseMode = options.parseMode || 'Markdown';

    // Clean up and truncate message
    let finalMessage = message
        .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
        .trim();

    if (finalMessage.length > TELEGRAM_MAX_LENGTH) {
        if (context?.warn) context.warn(`Message too long (${finalMessage.length} chars), truncating...`);
        const suffix = parseMode === 'HTML' ? '\n\n... <i>truncated</i>' : '\n\n... _truncated_';
        finalMessage = finalMessage.substring(0, TELEGRAM_MAX_LENGTH - 50) + suffix;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const payload = {
        chat_id: chatId,
        text: finalMessage,
        parse_mode: parseMode,
    };

    if (options.silent) {
        payload.disable_notification = true;
    }
    if (options.disablePreview) {
        payload.disable_web_page_preview = true;
    }
    if (options.replyMarkup) {
        payload.reply_markup = options.replyMarkup;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (result.ok) {
            if (context?.log) context.log(`Telegram message sent to chat ${chatId}`);
            return { ok: true };
        }

        if (context?.error) context.error('Telegram API error:', result.description);

        // If parsing failed, retry without formatting
        if (result.description?.includes('parse') || result.description?.includes('entities')) {
            if (context?.log) context.log('Retrying without formatting...');

            const plainText = parseMode === 'HTML'
                ? finalMessage.replace(/<[^>]+>/g, '')
                : finalMessage.replace(/[*_`\[\]()~>#+\-=|{}.!]/g, '');

            const retryResponse = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: plainText,
                    disable_web_page_preview: options.disablePreview || false,
                }),
            });

            const retryResult = await retryResponse.json();
            if (retryResult.ok) {
                return { ok: true, warning: 'Sent without formatting' };
            }
            return { ok: false, error: retryResult.description || 'Telegram API error' };
        }

        return { ok: false, error: result.description || 'Telegram API error' };
    } catch (error) {
        if (context?.error) context.error('Telegram send error:', error.message);
        return { ok: false, error: error.message };
    }
}

module.exports = { sendTelegramMessage, TELEGRAM_MAX_LENGTH };
