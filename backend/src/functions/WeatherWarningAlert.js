/**
 * WeatherWarningAlert.js - Dedicated weather warning alerts
 * 
 * Monitors MeteoAlarm for new Yellow/Orange/Red warnings
 * and sends detailed alerts to users.
 * 
 * Triggers:
 * - HTTP: POST /api/weather-warning (manual test)
 * - Timer: Every 30 mins to check for new warnings
 * 
 * Features:
 * - Tracks sent warnings to avoid duplicates
 * - Only alerts for Yellow (level 2) and above
 * - Detailed message with description and advice
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// MeteoAlarm service
const { 
    getIrelandWarnings, 
    formatWarningsDetailed,
    getHighestSeverity 
} = require('../utils/MeteoAlarm');

// Track sent warnings (in production, use database)
const sentWarnings = new Map();

// ============================================
// HTTP Trigger - Manual testing
// ============================================
app.http('WeatherWarningAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'weather-warning',
    handler: async (request, context) => {
        context.log('WeatherWarningAlert triggered via HTTP');
        
        try {
            let chatId, force;
            
            if (request.method === 'POST') {
                const body = await request.json().catch(() => ({}));
                chatId = body.chatId;
                force = body.force === true;
            } else {
                chatId = request.query.get('chatId');
                force = request.query.get('force') === 'true';
            }
            
            // Fetch current warnings
            const warnings = await getIrelandWarnings();
            
            context.log(`Found ${warnings.length} active warnings (Yellow+)`);
            
            // If no warnings, return early
            if (warnings.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        success: true,
                        message: 'No active warnings',
                        warningCount: 0
                    }
                };
            }
            
            // Build detailed message
            const message = buildWarningMessage(warnings);
            
            // If chatId provided, send to Telegram
            if (chatId) {
                const sent = await sendTelegramMessage(chatId, message);
                return {
                    status: 200,
                    jsonBody: {
                        success: sent,
                        messageSent: sent,
                        warningCount: warnings.length,
                        highestSeverity: getHighestSeverity(warnings)
                    }
                };
            }
            
            // Otherwise return preview
            return {
                status: 200,
                jsonBody: {
                    message,
                    warningCount: warnings.length,
                    warnings: warnings.map(w => ({
                        type: w.type,
                        severity: w.severityName,
                        regions: w.regionsText,
                        onset: w.onset,
                        expires: w.expires
                    }))
                }
            };
            
        } catch (error) {
            context.error('Error in WeatherWarningAlert:', error);
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Timer Trigger - Check every 30 mins
// ============================================
app.timer('WeatherWarningTimer', {
    schedule: '0 */30 * * * *',  // Every 30 minutes
    handler: async (timer, context) => {
        context.log('WeatherWarningTimer triggered at', new Date().toISOString());
        
        try {
            const results = await checkAndSendWarnings(context);
            context.log(`Warning check: ${results.newWarnings} new, ${results.sent} sent`);
        } catch (error) {
            context.error('Error in WeatherWarningTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Test batch processor
// ============================================
app.http('WeatherWarningBatchTest', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'weather-warning/batch-test',
    handler: async (request, context) => {
        context.log('WeatherWarningBatchTest triggered');
        
        const force = request.query.get('force') === 'true';
        
        try {
            const results = await checkAndSendWarnings(context, force);
            return {
                status: 200,
                jsonBody: {
                    success: true,
                    message: 'Batch process completed',
                    forced: force,
                    ...results
                }
            };
        } catch (error) {
            context.error('Error in batch test:', error);
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Core: Build Warning Message
// ============================================
function buildWarningMessage(warnings) {
    if (!warnings || warnings.length === 0) {
        return 'No active weather warnings.';
    }
    
    const lines = [];
    
    // Header with highest severity
    const highest = getHighestSeverity(warnings);
    const headerEmoji = highest.level >= 4 ? '🚨' : highest.level >= 3 ? '⚠️' : '⚠️';
    
    lines.push(`${headerEmoji} *WEATHER WARNING*`);
    lines.push('');
    
    // Group warnings by type for cleaner display
    const byType = {};
    for (const w of warnings) {
        if (!byType[w.type]) byType[w.type] = [];
        byType[w.type].push(w);
    }
    
    for (const [type, typeWarnings] of Object.entries(byType)) {
        // Get highest severity for this type
        const highestOfType = typeWarnings.reduce((max, w) => 
            w.severityLevel > max.severityLevel ? w : max
        );
        
        const emoji = highestOfType.emoji || '⚠️';
        lines.push(`${highestOfType.severityColor} *${highestOfType.severityName} - ${type}*`);
        
        // Regions
        const allRegions = typeWarnings.map(w => w.regionsText).filter(Boolean);
        const uniqueRegions = [...new Set(allRegions)];
        if (uniqueRegions.length > 0 && !uniqueRegions.includes('All areas')) {
            // Combine and dedupe region text
            const regionText = uniqueRegions.length === 1 
                ? uniqueRegions[0]
                : uniqueRegions.slice(0, 2).join('; ');
            lines.push(`📍 ${regionText}`);
        }
        
        // Time range (earliest onset to latest expiry)
        const onsets = typeWarnings.map(w => w.onset).filter(Boolean);
        const expires = typeWarnings.map(w => w.expires).filter(Boolean);
        if (onsets.length > 0 && expires.length > 0) {
            const earliestOnset = new Date(Math.min(...onsets.map(d => d.getTime())));
            const latestExpiry = new Date(Math.max(...expires.map(d => d.getTime())));
            lines.push(`⏰ ${formatDateTime(earliestOnset)} - ${formatDateTime(latestExpiry)}`);
        }
        
        // Description (from highest severity warning)
        if (highestOfType.description && highestOfType.description !== 'None') {
            lines.push('');
            lines.push(`_${highestOfType.description}_`);
        }
        
        lines.push('');
    }
    
    // What to expect based on warning types
    const advice = getWarningAdvice(warnings);
    if (advice.length > 0) {
        lines.push('⚠️ *What to expect:*');
        advice.forEach(a => lines.push(`• ${a}`));
        lines.push('');
    }
    
    // General tip based on highest severity
    const tip = getWarningTip(highest);
    if (tip) {
        lines.push(`💡 _${tip}_`);
        lines.push('');
    }
    
    // Source
    lines.push('─────────────');
    lines.push('_Source: Met Éireann via MeteoAlarm_');
    
    return lines.join('\n');
}

/**
 * Get advice based on warning types
 */
function getWarningAdvice(warnings) {
    const advice = [];
    const types = new Set(warnings.map(w => w.type.toLowerCase()));
    const maxSeverity = Math.max(...warnings.map(w => w.severityLevel));
    
    if (types.has('wind')) {
        advice.push('Dangerous driving conditions, especially on exposed routes');
        if (maxSeverity >= 3) {
            advice.push('Risk of fallen trees and structural damage');
            advice.push('Potential power outages');
        }
    }
    
    if (types.has('rain')) {
        advice.push('Surface water and localised flooding possible');
        if (maxSeverity >= 3) {
            advice.push('Rivers may overflow, avoid low-lying areas');
        }
    }
    
    if (types.has('snow') || types.has('snow-ice')) {
        advice.push('Hazardous driving conditions');
        advice.push('Allow extra time for journeys');
        if (maxSeverity >= 3) {
            advice.push('Travel may become impossible');
        }
    }
    
    if (types.has('fog')) {
        advice.push('Significantly reduced visibility');
        advice.push('Drive with fog lights, reduce speed');
    }
    
    if (types.has('thunderstorm')) {
        advice.push('Lightning strikes possible');
        advice.push('Avoid open areas and tall objects');
    }
    
    if (types.has('extreme high temperature') || types.has('heat')) {
        advice.push('Stay hydrated and avoid prolonged sun exposure');
        advice.push('Check on vulnerable neighbours');
    }
    
    if (types.has('extreme low temperature') || types.has('cold')) {
        advice.push('Risk of ice on roads and paths');
        advice.push('Protect pipes from freezing');
    }
    
    if (types.has('coastal event') || types.has('coastal')) {
        advice.push('High waves and dangerous coastal conditions');
        advice.push('Stay away from exposed coasts');
    }
    
    return advice.slice(0, 4); // Max 4 advice items
}

/**
 * Get general tip based on severity
 */
function getWarningTip(highest) {
    if (highest.level >= 4) {
        return 'Red warning: Take action now. Avoid all unnecessary travel.';
    }
    if (highest.level >= 3) {
        return 'Orange warning: Be prepared. Only travel if necessary.';
    }
    return 'Yellow warning: Stay aware and plan ahead.';
}

// ============================================
// Check for new warnings and send alerts
// ============================================
async function checkAndSendWarnings(context, force = false) {
    const connectionString = process.env.AzureWebJobsStorage;
    
    const results = {
        totalWarnings: 0,
        newWarnings: 0,
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: []
    };
    
    // Fetch current warnings
    const warnings = await getIrelandWarnings();
    results.totalWarnings = warnings.length;
    
    if (warnings.length === 0) {
        context.log('No active warnings');
        return results;
    }
    
    // Check which warnings are new
    const newWarnings = force ? warnings : warnings.filter(w => !hasBeenSent(w));
    results.newWarnings = newWarnings.length;
    
    if (newWarnings.length === 0 && !force) {
        context.log('No new warnings to send');
        return results;
    }
    
    // Build message for new warnings
    const message = buildWarningMessage(force ? warnings : newWarnings);
    
    // Mark warnings as sent
    newWarnings.forEach(w => markAsSent(w));
    
    // Development mode check
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping user notifications');
        results.skipped = 'Development mode';
        return results;
    }
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        // Query users with weather warnings enabled
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            // Check if weather warnings enabled
            const warningsEnabled = user.alertWeatherWarnings === true ||
                user.alertTypes?.weatherWarnings === true ||
                (user.preferencesJson && JSON.parse(user.preferencesJson)?.alertTypes?.weatherWarnings === true);
            
            if (!warningsEnabled && !force) {
                continue;
            }
            
            results.processed++;
            
            // Parse preferences
            let prefs = {};
            if (user.preferencesJson) {
                try {
                    prefs = JSON.parse(user.preferencesJson);
                } catch (e) {}
            }
            
            const chatId = user.telegramChatId || prefs.telegramChatId;
            
            if (!chatId) {
                results.skipped++;
                continue;
            }
            
            try {
                const sent = await sendTelegramMessage(chatId, message);
                if (sent) {
                    results.sent++;
                } else {
                    results.errors.push({ userId: user.rowKey, error: 'Send failed' });
                }
            } catch (err) {
                results.errors.push({ userId: user.rowKey, error: err.message });
            }
        }
        
    } catch (error) {
        context.error('Error querying users:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

/**
 * Check if warning has already been sent (simple in-memory tracking)
 * In production, use database for persistence across function restarts
 */
function hasBeenSent(warning) {
    const key = `${warning.id}-${warning.type}-${warning.severityLevel}`;
    const sent = sentWarnings.get(key);
    
    if (!sent) return false;
    
    // Re-send if it was sent more than 12 hours ago (warning might be updated)
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
    return sent > twelveHoursAgo;
}

/**
 * Mark warning as sent
 */
function markAsSent(warning) {
    const key = `${warning.id}-${warning.type}-${warning.severityLevel}`;
    sentWarnings.set(key, Date.now());
    
    // Clean up old entries (older than 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [k, v] of sentWarnings) {
        if (v < oneDayAgo) {
            sentWarnings.delete(k);
        }
    }
}

// ============================================
// Helpers
// ============================================
function formatDateTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    
    const dayStr = date.toLocaleDateString('en-IE', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
    
    return `${dayStr} ${timeStr}`;
}

async function sendTelegramMessage(chatId, message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        const result = await response.json();
        return result.ok === true;
    } catch (error) {
        console.error('Telegram error:', error.message);
        return false;
    }
}

module.exports = {
    buildWarningMessage,
    checkAndSendWarnings,
    getWarningAdvice
};