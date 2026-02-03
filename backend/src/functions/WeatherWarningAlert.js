/**
 * WeatherWarningAlert.js - Weather Warning Alert System
 * 
 * FIXES:
 * - Full description text (no more truncation!)
 * - Deduplicates similar warnings (same type/severity)
 * - Uses persistent AlertTracker
 * 
 * Triggers:
 * - HTTP: POST /api/weather-warning (manual test)
 * - Timer: Every 30 mins to check for new warnings
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// MeteoAlarm service
const { 
    getIrelandWarnings, 
    getHighestSeverity 
} = require('../utils/MeteoAlarm');

// Persistent alert tracking
const { hasRecentAlert, recordAlert } = require('../utils/AlertTracker');

// Cooldown: Don't re-send same warning within 12 hours
const WARNING_COOLDOWN_HOURS = 12;

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
            
            // Fetch and deduplicate warnings
            const rawWarnings = await getIrelandWarnings();
            const warnings = deduplicateWarnings(rawWarnings);
            
            context.log(`Found ${rawWarnings.length} raw, ${warnings.length} after dedup`);
            
            if (warnings.length === 0) {
                return {
                    status: 200,
                    jsonBody: {
                        warningCount: 0,
                        message: 'No active weather warnings for Ireland.',
                        warnings: []
                    }
                };
            }
            
            // Build message
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
                        warnings: warnings.map(w => ({
                            type: w.type,
                            severity: w.severityName,
                            regions: w.regionsText
                        }))
                    }
                };
            }
            
            // Return preview
            return {
                status: 200,
                jsonBody: {
                    preview: true,
                    warningCount: warnings.length,
                    warnings: warnings.map(w => ({
                        type: w.type,
                        severity: w.severityName,
                        regions: w.regionsText,
                        onset: w.onset,
                        expires: w.expires
                    })),
                    message: message
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
// Timer Trigger - Every 30 mins
// ============================================
app.timer('WeatherWarningTimer', {
    schedule: '0 */30 * * * *',
    handler: async (timer, context) => {
        context.log('WeatherWarningTimer triggered at', new Date().toISOString());
        
        try {
            const results = await checkAndSendWarnings(context);
            context.log(`Warning check: ${results.sent} sent, ${results.alreadySent} already sent`);
        } catch (error) {
            context.error('Error in WeatherWarningTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Batch test
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
// Deduplicate Warnings
// ============================================
/**
 * Remove duplicate warnings (same type + severity)
 * Keep the one with latest expiry or most regions
 */
function deduplicateWarnings(warnings) {
    if (!warnings || warnings.length === 0) return [];
    
    const seen = new Map();
    
    for (const warning of warnings) {
        const key = `${warning.type}-${warning.severityLevel}`;
        
        if (!seen.has(key)) {
            seen.set(key, warning);
        } else {
            const existing = seen.get(key);
            // Keep the one that expires later or covers more regions
            const existingExpires = new Date(existing.expires || 0);
            const newExpires = new Date(warning.expires || 0);
            
            if (newExpires > existingExpires) {
                // Merge regions if different
                if (warning.regionsText !== existing.regionsText) {
                    warning.regionsText = mergeRegions(existing.regionsText, warning.regionsText);
                }
                seen.set(key, warning);
            } else if (warning.regionsText && warning.regionsText !== existing.regionsText) {
                // Same expiry but different regions - merge
                existing.regionsText = mergeRegions(existing.regionsText, warning.regionsText);
            }
        }
    }
    
    return Array.from(seen.values());
}

/**
 * Merge region strings, removing duplicates
 */
function mergeRegions(regions1, regions2) {
    if (!regions1) return regions2;
    if (!regions2) return regions1;
    
    const all = new Set([
        ...regions1.split(', '),
        ...regions2.split(', ')
    ]);
    
    return Array.from(all).join(', ');
}

// ============================================
// Build Warning Message (FULL DESCRIPTION!)
// ============================================
function buildWarningMessage(warnings) {
    if (!warnings || warnings.length === 0) {
        return 'No active weather warnings.';
    }
    
    const lines = [];
    
    // Header
    const highest = getHighestSeverity(warnings);
    const headerEmoji = highest.level >= 4 ? '🚨' : '⚠️';
    
    lines.push(`${headerEmoji} *WEATHER WARNING*`);
    lines.push('');
    
    for (const warning of warnings) {
        const emoji = getWarningEmoji(warning.type);
        lines.push(`${warning.severityColor} *${warning.severityName} - ${warning.type}* ${emoji}`);
        
        // Regions
        if (!warning.isNationwide && warning.regionsText) {
            lines.push(`   📍 ${warning.regionsText}`);
        } else {
            lines.push('   📍 All of Ireland');
        }
        
        // Timing
        if (warning.onset && warning.expires) {
            const onsetStr = formatDateTime(warning.onset);
            const expiresStr = formatDateTime(warning.expires);
            lines.push(`   ⏰ ${onsetStr} - ${expiresStr}`);
        }
        
        // FULL description - no truncation!
        if (warning.description) {
            lines.push(`   _${warning.description}_`);
        }
        
        lines.push('');
    }
    
    // Advice
    const advice = getAdvice(highest);
    if (advice) {
        lines.push('💡 ' + advice);
    }
    
    lines.push('');
    lines.push('─────────────');
    lines.push('_Source: Met Éireann via MeteoAlarm_');
    
    return lines.join('\n');
}

/**
 * Get emoji for warning type
 */
function getWarningEmoji(type) {
    const emojis = {
        'Wind': '💨',
        'Rain': '🌧️',
        'Snow': '❄️',
        'Ice': '🧊',
        'Snow/Ice': '❄️',
        'Thunderstorm': '⛈️',
        'Fog': '🌫️',
        'High Temperature': '🌡️',
        'Low Temperature': '🥶',
        'Coastal': '🌊',
        'Flooding': '💧',
    };
    return emojis[type] || '⚠️';
}

/**
 * Get advice based on severity
 */
function getAdvice(highest) {
    if (highest.level >= 4) {
        return '*Red warning: Take action now. Only travel if absolutely necessary.*';
    } else if (highest.level >= 3) {
        return '*Orange warning: Be prepared. Disruption likely.*';
    } else if (highest.level >= 2) {
        return '_Yellow warning: Be aware. Some disruption possible._';
    }
    return null;
}

/**
 * Format datetime
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const time = date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
    });
    
    if (isToday) return `Today ${time}`;
    if (isTomorrow) return `Tomorrow ${time}`;
    
    return date.toLocaleDateString('en-IE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// ============================================
// Check and Send to All Users
// ============================================
async function checkAndSendWarnings(context, force = false) {
    const results = {
        warningCount: 0,
        processed: 0,
        sent: 0,
        alreadySent: 0,
        skipped: 0,
        errors: []
    };
    
    // Fetch and deduplicate
    const rawWarnings = await getIrelandWarnings();
    const warnings = deduplicateWarnings(rawWarnings);
    results.warningCount = warnings.length;
    
    if (warnings.length === 0) {
        context.log('No active warnings');
        return results;
    }
    
    const message = buildWarningMessage(warnings);
    const highest = getHighestSeverity(warnings);
    
    const warningData = {
        type: highest.type,
        severity: highest.severityName,
        onset: highest.onset,
    };
    
    const connectionString = process.env.AzureWebJobsStorage;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            // Check if enabled
            let warningsEnabled = false;
            if (user.preferencesJson) {
                try {
                    const prefs = JSON.parse(user.preferencesJson);
                    warningsEnabled = prefs.alertTypes?.weatherWarnings === true;
                } catch (e) {}
            }
            warningsEnabled = warningsEnabled || user.alertWeatherWarnings === true;
            
            if (!warningsEnabled && !force) continue;
            
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
                // Check deduplication
                const alreadySent = await hasRecentAlert(
                    userId, 
                    'weather-warning', 
                    warningData, 
                    WARNING_COOLDOWN_HOURS
                );
                
                if (alreadySent && !force) {
                    results.alreadySent++;
                    continue;
                }
                
                const sent = await sendTelegramMessage(chatId, message);
                
                if (sent) {
                    results.sent++;
                    await recordAlert(userId, 'weather-warning', {
                        ...warningData,
                        title: `${highest.severityName} ${highest.type} Warning`,
                        summary: highest.description || `${highest.type} warning`,
                        location: highest.regionsText || 'Ireland',
                    });
                } else {
                    results.errors.push({ userId, error: 'Send failed' });
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

// ============================================
// Telegram
// ============================================
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
    deduplicateWarnings,
    checkAndSendWarnings
};
