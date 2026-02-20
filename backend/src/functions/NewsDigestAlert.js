/**
 * NewsDigestAlert.js - Expanded News Digest
 * 
 * Morning & Evening digest with:
 * - Irish News, World News, Tech, Finance, Crypto, Science
 * - Market Data: Stocks, Forex, Crypto prices
 * - Clickable links
 * 
 * Triggers:
 * - HTTP: POST /api/news-digest (manual/test)
 * - Timer: 7:30am UTC (morning)
 * - Timer: 6:00pm UTC (evening)
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// News fetching
const { fetchAllNews } = require('../utils/NewsSources');

// Alert tracking
const { hasRecentAlert, recordAlert } = require('../utils/AlertTracker');

// Cooldown: 10 hours (allows morning + evening)
const NEWS_COOLDOWN_HOURS = 10;

// ============================================
// HTTP Trigger - Manual / Test
// ============================================
app.http('NewsDigestAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'news-digest',
    handler: async (request, context) => {
        context.log('NewsDigestAlert triggered via HTTP');
        
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
            
            // Fetch all news (3 per category to keep message shorter)
            context.log('Fetching news...');
            let news;
            try {
                news = await fetchAllNews({ limit: 3 });
                context.log('News fetched successfully:', Object.keys(news));
            } catch (fetchError) {
                context.error('Error fetching news:', fetchError);
                return {
                    status: 500,
                    headers: corsHeaders(),
                    jsonBody: { 
                        success: false, 
                        error: 'Failed to fetch news: ' + fetchError.message 
                    }
                };
            }
            
            // Build message
            const period = getTimeOfDay();
            const message = buildNewsMessage(news, period);
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
                        period,
                        categories: Object.keys(news).filter(k => k !== 'fetchedAt' && k !== 'markets'),
                    }
                };
            }
            
            // Return preview
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: {
                    preview: true,
                    period,
                    news,
                    message,
                }
            };
            
        } catch (error) {
            context.error('Error in NewsDigestAlert:', error);
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
app.timer('NewsDigestHourlyCheck', {
    schedule: '0 0 * * * *',  // Every hour at :00
    handler: async (timer, context) => {
        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();
        
        // Format current time as HH:00 (we check on the hour)
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:00`;
        
        context.log(`NewsDigest hourly check at ${currentTimeStr} UTC`);
        
        try {
            const results = await sendToUsersAtTime(context, currentHour);
            context.log(`Hourly digest: ${results.sent} sent, ${results.skipped} skipped`);
        } catch (error) {
            context.error('Error in hourly digest:', error);
        }
    }
});

// ============================================
// Timer - HALF-HOUR CHECK (runs at :30)
// ============================================
app.timer('NewsDigestHalfHourCheck', {
    schedule: '0 30 * * * *',  // Every hour at :30
    handler: async (timer, context) => {
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        // Format current time as HH:30
        const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:30`;
        
        context.log(`NewsDigest half-hour check at ${currentTimeStr} UTC`);
        
        try {
            const results = await sendToUsersAtTime(context, currentHour, 30);
            context.log(`Half-hour digest: ${results.sent} sent, ${results.skipped} skipped`);
        } catch (error) {
            context.error('Error in half-hour digest:', error);
        }
    }
});

// ============================================
// HTTP - Batch Test
// ============================================
app.http('NewsDigestBatchTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    route: 'news-digest/batch-test',
    handler: async (request, context) => {
        const force = request.query.get('force') === 'true';
        const period = request.query.get('period') || getTimeOfDay();
        
        try {
            const results = await sendToAllUsers(context, period, force);
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: { success: true, forced: force, period, ...results }
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
function buildNewsMessage(news, period = 'morning') {
    const lines = [];
    
    // Header
    const emoji = period === 'morning' ? '☀️' : '🌙';
    lines.push(`${emoji} <b>${capitalize(period)} News Digest</b>`);
    lines.push('');
    
    // Market summary (compact, at top)
    if (news.markets) {
        const marketLine = buildMarketSummary(news.markets);
        if (marketLine) {
            lines.push(marketLine);
            lines.push('');
        }
    }
    
    // Irish News
    if (news.irish?.length > 0) {
        lines.push('🇮🇪 <b>Ireland</b>');
        for (const item of news.irish) {
            lines.push(formatNewsItem(item));
        }
        lines.push('');
    }
    
    // World News
    if (news.world?.length > 0) {
        lines.push('🌍 <b>World</b>');
        for (const item of news.world) {
            lines.push(formatNewsItem(item));
        }
        lines.push('');
    }
    
    // Tech
    if (news.tech?.length > 0) {
        lines.push('💻 <b>Tech</b>');
        for (const item of news.tech) {
            const score = item.score ? ` <i>(${item.score}↑)</i>` : '';
            lines.push(formatNewsItem(item) + score);
        }
        lines.push('');
    }
    
    // Finance
    if (news.finance?.length > 0) {
        lines.push('💹 <b>Finance</b>');
        for (const item of news.finance) {
            lines.push(formatNewsItem(item));
        }
        lines.push('');
    }
    
    // Crypto
    if (news.crypto?.length > 0) {
        lines.push('₿ <b>Crypto</b>');
        for (const item of news.crypto) {
            lines.push(formatNewsItem(item));
        }
        lines.push('');
    }
    
    // Science/Space
    if (news.science?.length > 0) {
        lines.push('🔬 <b>Science</b>');
        for (const item of news.science) {
            lines.push(formatNewsItem(item));
        }
        lines.push('');
    }
    
    // Footer
    lines.push('─────────────');
    lines.push('<i>OmniAlert</i>');
    
    return lines.join('\n');
}

function formatNewsItem(item) {
    // Escape HTML special characters in title
    const title = escapeHtml(truncate(item.title, 60));
    
    if (item.link) {
        // Use HTML link format
        return `• <a href="${item.link}">${title}</a>`;
    }
    return `• ${title}`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildMarketSummary(markets) {
    const parts = [];
    
    // Crypto prices
    if (markets.crypto?.length > 0) {
        const btc = markets.crypto.find(c => c.symbol === 'BTC');
        const eth = markets.crypto.find(c => c.symbol === 'ETH');
        
        if (btc) {
            parts.push(`₿ $${formatPrice(btc.price)} (${formatChange(btc.change)})`);
        }
        if (eth) {
            parts.push(`Ξ $${formatPrice(eth.price)} (${formatChange(eth.change)})`);
        }
    }
    
    // Stock indices
    if (markets.stocks?.length > 0) {
        const sp = markets.stocks.find(s => s.name === 'S&P 500');
        if (sp) {
            parts.push(`S&P ${formatPrice(sp.price)} (${formatChange(sp.change)})`);
        }
    }
    
    // Forex
    if (markets.forex?.length > 0) {
        const eurusd = markets.forex.find(f => f.name === 'EUR/USD');
        if (eurusd) {
            parts.push(`€/$ ${eurusd.price?.toFixed(4)}`);
        }
    }
    
    if (parts.length === 0) return null;
    
    return `📊 ${parts.join(' · ')}`;
}

function formatPrice(price) {
    if (price == null) return '?';
    if (price >= 10000) return Math.round(price).toLocaleString();
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
}

function formatChange(change) {
    if (change == null) return '?';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
}

function truncate(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.substring(0, max - 1) + '…';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTimeOfDay() {
    const hour = new Date().getUTCHours();
    return hour < 14 ? 'morning' : 'evening';
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
    
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    // Format current time for matching (HH:MM)
    const currentTimeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const period = hour < 12 ? 'morning' : (hour < 17 ? 'afternoon' : 'evening');
    
    context.log(`Checking for users with time ${currentTimeStr}`);
    
    // We'll fetch news only if at least one user needs it
    let news = null;
    let message = null;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            results.processed++;
            
            // Check if news digest is enabled
            let enabled = false;
            let userTimes = ['07:30', '18:00'];  // Default times
            
            if (user.preferencesJson) {
                try {
                    const prefs = JSON.parse(user.preferencesJson);
                    enabled = prefs.alertTypes?.newsDigest === true;
                    if (prefs.newsDigestTimes && Array.isArray(prefs.newsDigestTimes)) {
                        userTimes = prefs.newsDigestTimes;
                    }
                } catch (e) {}
            }
            enabled = enabled || user.alertNewsDigest === true;
            
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
            
            context.log(`User ${user.rowKey} has matching time ${currentTimeStr}`);
            
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
                'news-digest',
                { date: dedupeKey },
                1  // 1 hour cooldown for same time slot
            );
            
            if (alreadySent) {
                results.alreadySent++;
                continue;
            }
            
            // Fetch news if not already fetched
            if (!news) {
                context.log('Fetching news for first matching user...');
                news = await fetchAllNews({ limit: 3 });
                message = buildNewsMessage(news, period);
                context.log(`Message length: ${message.length} chars`);
            }
            
            try {
                const result = await sendTelegramMessage(chatId, message, context);
                
                if (result.ok) {
                    results.sent++;
                    await recordAlert(userId, 'news-digest', {
                        date: dedupeKey,
                        title: `${capitalize(period)} News Digest`,
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
async function sendToAllUsers(context, period, force = false) {
    const results = {
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: []
    };
    
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    // Fetch news once
    const news = await fetchAllNews({ limit: 3 });
    const message = buildNewsMessage(news, period);
    context.log(`Message length: ${message.length} chars`);
    
    const today = new Date().toISOString().split('T')[0];
    const dedupeKey = `${today}-${period}-manual`;
    
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
                    enabled = prefs.alertTypes?.newsDigest === true;
                } catch (e) {}
            }
            enabled = enabled || user.alertNewsDigest === true;
            
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
            
            try {
                const result = await sendTelegramMessage(chatId, message, context);
                if (result.ok) {
                    results.sent++;
                } else {
                    results.errors.push({ userId, error: result.error });
                }
            } catch (err) {
                results.errors.push({ userId, error: err.message });
            }
        }
    } catch (error) {
        context.error('Error:', error);
    }
    
    return results;
}

// ============================================
// TELEGRAM (shared utility)
// ============================================
const { sendTelegramMessage: _sendTelegramShared } = require('../utils/telegramHelper');
async function sendTelegramMessage(chatId, message, context = null) {
    return _sendTelegramShared(chatId, message, context, { parseMode: 'HTML', disablePreview: true });
}

module.exports = {
    buildNewsMessage,
    sendToAllUsers,
    sendToUsersAtTime,
};
