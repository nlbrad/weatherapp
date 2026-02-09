/**
 * CryptoDigestAlert.js - Crypto-Focused Digest
 * 
 * Delivers comprehensive crypto market updates:
 * - Curated news from multiple sources (balanced selection)
 * - Market prices (BTC, ETH, S&P 500, Gold)
 * - Fear & Greed Index sentiment
 * - DeFi metrics (TVL, DEX volume)
 * 
 * Triggers:
 * - HTTP: POST /api/crypto-digest (manual/test)
 * - Timer: Every hour at :00 (checks user preferences)
 * - Timer: Every hour at :30 (checks user preferences)
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Crypto data fetching
const { fetchAllCryptoData } = require('../utils/CryptoSources');

// Alert tracking
const { hasRecentAlert, recordAlert } = require('../utils/AlertTracker');

// ============================================
// HTTP Trigger - Manual / Test
// ============================================
app.http('CryptoDigestAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'crypto-digest',
    handler: async (request, context) => {
        context.log('CryptoDigestAlert triggered via HTTP');
        
        try {
            let chatId, force;
            
            if (request.method === 'POST') {
                const body = await request.json().catch(() => ({}));
                chatId = body.chatId;
                force = body.force === true;
                context.log('POST request - chatId:', chatId, 'force:', force);
            } else {
                chatId = request.query.get('chatId');
                force = request.query.get('force') === 'true';
                context.log('GET request - chatId:', chatId);
            }
            
            // Fetch crypto data (7 news stories for good mix of sources)
            context.log('Fetching crypto data...');
            let cryptoData;
            try {
                cryptoData = await fetchAllCryptoData({ newsLimit: 7 });
                context.log('Crypto data fetched successfully');
            } catch (fetchError) {
                context.error('Error fetching crypto data:', fetchError);
                return {
                    status: 500,
                    headers: corsHeaders(),
                    jsonBody: { 
                        success: false, 
                        error: 'Failed to fetch crypto data: ' + fetchError.message 
                    }
                };
            }
            
            // Build message
            const message = buildCryptoMessage(cryptoData);
            context.log(`Message built, length: ${message.length} chars`);
            
            // Send if chatId provided
            if (chatId) {
                context.log('Sending to Telegram chatId:', chatId);
                const result = await sendTelegramMessage(chatId, message, context);
                
                return {
                    status: 200,
                    headers: corsHeaders(),
                    jsonBody: {
                        success: result.ok,
                        messageSent: result.ok,
                        error: result.error || null,
                        newsCount: cryptoData.news?.length || 0,
                        sources: [...new Set(cryptoData.news?.map(n => n.source) || [])],
                    }
                };
            }
            
            // Return preview
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: {
                    preview: true,
                    cryptoData,
                    message,
                }
            };
            
        } catch (error) {
            context.error('Error in CryptoDigestAlert:', error);
            return {
                status: 500,
                headers: corsHeaders(),
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Timer - HOURLY CHECK (runs every hour)
// ============================================
app.timer('CryptoDigestHourlyCheck', {
    schedule: '0 0 * * * *',  // Every hour at :00
    handler: async (timer, context) => {
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        // Format current time as HH:00
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:00`;
        
        context.log(`CryptoDigest hourly check at ${currentTimeStr} UTC`);
        
        try {
            const results = await sendToUsersAtTime(context, currentHour, 0);
            context.log(`Hourly crypto digest: ${results.sent} sent, ${results.skipped} skipped`);
        } catch (error) {
            context.error('Error in hourly crypto digest:', error);
        }
    }
});

// ============================================
// Timer - HALF-HOUR CHECK (runs at :30)
// ============================================
app.timer('CryptoDigestHalfHourCheck', {
    schedule: '0 30 * * * *',  // Every hour at :30
    handler: async (timer, context) => {
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        // Format current time as HH:30
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:30`;
        
        context.log(`CryptoDigest half-hour check at ${currentTimeStr} UTC`);
        
        try {
            const results = await sendToUsersAtTime(context, currentHour, 30);
            context.log(`Half-hour crypto digest: ${results.sent} sent, ${results.skipped} skipped`);
        } catch (error) {
            context.error('Error in half-hour crypto digest:', error);
        }
    }
});

// ============================================
// HTTP - Batch Test
// ============================================
app.http('CryptoDigestBatchTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'crypto-digest/batch-test',
    handler: async (request, context) => {
        const force = request.query.get('force') === 'true';
        
        try {
            const results = await sendToAllUsers(context, force);
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: { success: true, forced: force, ...results }
            };
        } catch (error) {
            return {
                status: 500,
                headers: corsHeaders(),
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// BUILD MESSAGE (HTML format for Telegram)
// ============================================
function buildCryptoMessage(data) {
    const lines = [];
    
    // Header with timestamp
    const now = new Date();
    const time = now.toISOString().split('T')[1].substring(0, 5); // HH:MM
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    lines.push('₿ <b>Crypto Digest</b>');
    lines.push(`🕐 ${date} • ${time} UTC`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    
    // Markets section
    if (data.markets) {
        lines.push('📊 <b>MARKETS (24h)</b>');
        lines.push('');
        
        // Crypto prices
        if (data.markets.crypto?.length > 0) {
            for (const coin of data.markets.crypto) {
                const arrow = coin.change24h >= 0 ? '↗' : '↘';
                lines.push(`${coin.symbol}: ${formatCryptoPrice(coin.price)}  (${formatChange(coin.change24h)} ${arrow})`);
            }
        }
        
        // Traditional markets
        if (data.markets.traditional?.length > 0) {
            for (const asset of data.markets.traditional) {
                const arrow = asset.change24h >= 0 ? '↗' : '↘';
                lines.push(`${asset.name}: ${formatTraditionalPrice(asset.price)}  (${formatChange(asset.change24h)} ${arrow})`);
            }
        }
        
        lines.push('');
        
        // Market cap and dominance
        if (data.markets.totalMarketCap) {
            const mcap = `$${(data.markets.totalMarketCap / 1e12).toFixed(2)}T`;
            const mcapChange = data.markets.totalMarketCapChange24h 
                ? ` (${formatChange(data.markets.totalMarketCapChange24h)})` 
                : '';
            lines.push(`Market Cap: ${mcap}${mcapChange}`);
        }
        
        if (data.markets.btcDominance) {
            lines.push(`BTC Dominance: ${data.markets.btcDominance.toFixed(1)}%`);
        }
        
        lines.push('');
    }
    
    // Fear & Greed Index
    if (data.sentiment) {
        const emoji = getSentimentEmoji(data.sentiment.value);
        lines.push(`${emoji} <b>Fear & Greed:</b> ${data.sentiment.value} (${data.sentiment.label})`);
        lines.push('');
    }
    
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    
    // News section
    if (data.news?.length > 0) {
        lines.push('📰 <b>TOP STORIES</b>');
        lines.push('');
        
        for (const item of data.news) {
            lines.push(formatNewsItem(item));
        }
        
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
    }
    
    // DeFi metrics
    if (data.defi && (data.defi.tvl || data.defi.dexVolume24h)) {
        lines.push('💡 <b>DID YOU KNOW?</b>');
        lines.push('');
        
        if (data.defi.tvl) {
            lines.push(`Total Value Locked (TVL): $${(data.defi.tvl / 1e9).toFixed(1)}B`);
        }
        
        if (data.defi.dexVolume24h) {
            lines.push(`Daily DEX Volume: $${(data.defi.dexVolume24h / 1e9).toFixed(1)}B`);
        }
        
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━');
    }
    
    // Footer
    lines.push('🔗 Links are clickable');
    lines.push('⚙️ Manage: /settings');
    
    return lines.join('\n');
}

function formatNewsItem(item) {
    // Escape HTML special characters in title
    const title = escapeHtml(truncate(item.title, 80));
    const source = item.source || 'Unknown';
    
    if (item.link) {
        // Format: • [Title] Source
        return `• <a href="${item.link}">${title}</a>\n  <i>${source}</i>`;
    }
    return `• ${title}\n  <i>${source}</i>`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatCryptoPrice(price) {
    if (price == null) return '?';
    if (price >= 10000) return '$' + Math.round(price).toLocaleString();
    if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return '$' + price.toFixed(2);
    return '$' + price.toFixed(4);
}

function formatTraditionalPrice(price) {
    if (price == null) return '?';
    if (price >= 1000) return Math.round(price).toLocaleString();
    return price.toFixed(2);
}

function formatChange(change) {
    if (change == null) return '?';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
}

function getSentimentEmoji(value) {
    if (value >= 75) return '🤑';  // Extreme Greed
    if (value >= 55) return '😊';  // Greed
    if (value >= 45) return '😐';  // Neutral
    if (value >= 25) return '😨';  // Fear
    return '😱';                    // Extreme Fear
}

function truncate(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.substring(0, max - 1) + '…';
}

function corsHeaders() {
    return { 'Access-Control-Allow-Origin': '*' };
}

// ============================================
// SEND TO USERS AT SPECIFIC TIME
// ============================================
async function sendToUsersAtTime(context, hour, minute = 0) {
    const results = {
        processed: 0,
        sent: 0,
        alreadySent: 0,
        skipped: 0,
        noMatch: 0,
        errors: []
    };
    
    const connectionString = process.env.AzureWebJobsStorage;
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    // Format current time for matching (HH:MM)
    const currentTimeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    context.log(`Checking for users with crypto digest time ${currentTimeStr}`);
    
    // We'll fetch crypto data only if at least one user needs it
    let cryptoData = null;
    let message = null;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            results.processed++;
            
            // Check if crypto digest is enabled
            let enabled = false;
            let userTimes = ['08:00', '20:00'];  // Default times
            
            if (user.preferencesJson) {
                try {
                    const prefs = JSON.parse(user.preferencesJson);
                    enabled = prefs.alertTypes?.cryptoDigest === true;
                    if (prefs.cryptoDigestTimes && Array.isArray(prefs.cryptoDigestTimes)) {
                        userTimes = prefs.cryptoDigestTimes;
                    }
                } catch (e) {}
            }
            // Fallback to old column name if exists
            enabled = enabled || user.alertCryptoDigest === true;
            
            if (!enabled) {
                results.skipped++;
                continue;
            }
            
            // Check if current time matches any of user's configured times
            const hasMatchingTime = userTimes.some(t => t === currentTimeStr);
            
            if (!hasMatchingTime) {
                results.noMatch++;
                continue;
            }
            
            context.log(`User ${user.rowKey} has matching crypto digest time ${currentTimeStr}`);
            
            // Get chat ID
            const userId = user.rowKey;
            let chatId = user.telegramChatId;
            if (!chatId && user.preferencesJson) {
                try {
                    chatId = JSON.parse(user.preferencesJson).telegramChatId;
                } catch (e) {}
            }
            
            if (!chatId) {
                results.skipped++;
                continue;
            }
            
            // Check deduplication (per time slot to avoid duplicate sends)
            const dedupeKey = `${today}-${currentTimeStr}`;
            const alreadySent = await hasRecentAlert(
                userId,
                'crypto-digest',
                { date: dedupeKey },
                1  // 1 hour cooldown for same time slot
            );
            
            if (alreadySent) {
                results.alreadySent++;
                continue;
            }
            
            // Fetch crypto data if not already fetched
            if (!cryptoData) {
                context.log('Fetching crypto data for first matching user...');
                cryptoData = await fetchAllCryptoData({ newsLimit: 7 });
                message = buildCryptoMessage(cryptoData);
                context.log(`Message length: ${message.length} chars`);
                context.log(`News from sources: ${[...new Set(cryptoData.news.map(n => n.source))].join(', ')}`);
            }
            
            try {
                const result = await sendTelegramMessage(chatId, message, context);
                
                if (result.ok) {
                    results.sent++;
                    await recordAlert(userId, 'crypto-digest', {
                        date: dedupeKey,
                        title: 'Crypto Digest',
                        summary: `Delivered at ${currentTimeStr}`,
                    });
                } else {
                    results.errors.push({ userId, error: result.error || 'Send failed' });
                }
            } catch (err) {
                results.errors.push({ userId, error: err.message });
            }
        }
        
    } catch (error) {
        context.error('Error querying users:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

// Legacy function for manual/test sends
async function sendToAllUsers(context, force = false) {
    const results = {
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: []
    };
    
    const connectionString = process.env.AzureWebJobsStorage;
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    // Fetch crypto data once
    const cryptoData = await fetchAllCryptoData({ newsLimit: 7 });
    const message = buildCryptoMessage(cryptoData);
    context.log(`Message length: ${message.length} chars`);
    context.log(`News from sources: ${[...new Set(cryptoData.news.map(n => n.source))].join(', ')}`);
    
    const today = new Date().toISOString().split('T')[0];
    const dedupeKey = `${today}-manual`;
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            let enabled = false;
            if (user.preferencesJson) {
                try {
                    const prefs = JSON.parse(user.preferencesJson);
                    enabled = prefs.alertTypes?.cryptoDigest === true;
                } catch (e) {}
            }
            enabled = enabled || user.alertCryptoDigest === true;
            
            if (!enabled && !force) continue;
            
            results.processed++;
            
            const userId = user.rowKey;
            let chatId = user.telegramChatId;
            if (!chatId && user.preferencesJson) {
                try {
                    chatId = JSON.parse(user.preferencesJson).telegramChatId;
                } catch (e) {}
            }
            
            if (!chatId) {
                results.skipped++;
                continue;
            }
            
            // Skip if already sent today (unless forced)
            if (!force) {
                const alreadySent = await hasRecentAlert(userId, 'crypto-digest', { date: dedupeKey }, 12);
                if (alreadySent) {
                    results.skipped++;
                    continue;
                }
            }
            
            try {
                const result = await sendTelegramMessage(chatId, message, context);
                
                if (result.ok) {
                    results.sent++;
                    await recordAlert(userId, 'crypto-digest', {
                        date: dedupeKey,
                        title: 'Crypto Digest (Manual)',
                        summary: 'Manual batch send',
                    });
                } else {
                    results.errors.push({ userId, error: result.error || 'Send failed' });
                }
            } catch (err) {
                results.errors.push({ userId, error: err.message });
            }
        }
    } catch (error) {
        context.error('Error in batch send:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

// ============================================
// TELEGRAM SENDER
// ============================================
async function sendTelegramMessage(chatId, text, context) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
        if (context) context.error('TELEGRAM_BOT_TOKEN not configured');
        return { ok: false, error: 'Bot token not configured' };
    }
    
    // Clean up message formatting
    const finalMessage = text
        .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
        .trim();
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: finalMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            if (context) context.log('Telegram message sent successfully');
            return { ok: true };
        } else {
            if (context) context.error('Telegram API error:', result.description);
            
            // If HTML parsing failed, try without parse_mode
            if (result.description?.includes('parse') || result.description?.includes('entities')) {
                if (context) context.log('Retrying without formatting...');
                const retryResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: finalMessage.replace(/<[^>]+>/g, ''), // Strip all HTML tags
                        disable_web_page_preview: true,
                    })
                });
                const retryResult = await retryResponse.json();
                if (retryResult.ok) {
                    return { ok: true, warning: 'Sent without formatting' };
                }
                return { ok: false, error: retryResult.description || 'Telegram API error' };
            }
            
            return { ok: false, error: result.description || 'Telegram API error' };
        }
    } catch (error) {
        if (context) context.error('Telegram fetch error:', error.message);
        return { ok: false, error: error.message };
    }
}

module.exports = {
    buildCryptoMessage,
    sendToAllUsers,
    sendToUsersAtTime,
};