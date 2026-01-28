/**
 * AuroraAlert.js - Northern Lights Alert System
 * 
 * Monitors Kp index and weather conditions to alert users
 * when aurora might be visible in Ireland.
 * 
 * Uses EXISTING AuroraScore module (DRY!)
 * 
 * Triggers:
 * - HTTP: POST /api/aurora-alert (manual test)
 * - Timer: Every hour to check Kp index
 * 
 * Ireland (53°N) typically needs Kp 5+ for visible aurora
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Use EXISTING AuroraScore module (DRY!)
const { 
    computeAuroraScore, 
    shouldAlert, 
    KP_DESCRIPTIONS 
} = require('../scoring/AuroraScore');

// User location helper
const { getUserLocation } = require('../utils/UserLocationHelper');

// Track sent alerts to avoid spam
const sentAlerts = new Map();

// ============================================
// HTTP Trigger - Manual testing
// ============================================
app.http('AuroraAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'aurora-alert',
    handler: async (request, context) => {
        context.log('AuroraAlert triggered via HTTP');
        
        try {
            let chatId, lat, lon, locationName, force;
            
            if (request.method === 'POST') {
                const body = await request.json().catch(() => ({}));
                chatId = body.chatId;
                lat = body.lat ?? 53.3498;
                lon = body.lon ?? -6.2603;
                locationName = body.locationName ?? 'Dublin';
                force = body.force === true;
            } else {
                chatId = request.query.get('chatId');
                lat = parseFloat(request.query.get('lat')) || 53.3498;
                lon = parseFloat(request.query.get('lon')) || -6.2603;
                locationName = request.query.get('location') || 'Dublin';
                force = request.query.get('force') === 'true';
            }
            
            // Generate aurora report
            const report = await generateAuroraReport(lat, lon, locationName, context);
            
            // Check if we should alert
            const alertDecision = shouldAlert(report.score, report.kpIndex, report.cloudCover);
            
            // If chatId provided and (should alert OR forced), send to Telegram
            if (chatId && (alertDecision.shouldSend || force)) {
                const sent = await sendTelegramMessage(chatId, report.message);
                return {
                    status: 200,
                    jsonBody: {
                        success: sent,
                        messageSent: sent,
                        shouldAlert: alertDecision.shouldSend,
                        forced: force,
                        ...report.summary
                    }
                };
            }
            
            // Return preview
            return {
                status: 200,
                jsonBody: {
                    message: report.message,
                    shouldAlert: alertDecision.shouldSend,
                    alertReason: alertDecision.message || 'Conditions not favorable',
                    ...report.summary
                }
            };
            
        } catch (error) {
            context.error('Error in AuroraAlert:', error);
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Timer Trigger - Check every hour
// ============================================
app.timer('AuroraAlertTimer', {
    schedule: '0 0 * * * *',  // Every hour
    handler: async (timer, context) => {
        context.log('AuroraAlertTimer triggered at', new Date().toISOString());
        
        try {
            const results = await checkAndSendAuroraAlerts(context);
            context.log(`Aurora check: Kp=${results.kpIndex}, ${results.sent} alerts sent`);
        } catch (error) {
            context.error('Error in AuroraAlertTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Test batch processor
// ============================================
app.http('AuroraAlertBatchTest', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'aurora-alert/batch-test',
    handler: async (request, context) => {
        context.log('AuroraAlertBatchTest triggered');
        
        const force = request.query.get('force') === 'true';
        
        try {
            const results = await checkAndSendAuroraAlerts(context, force);
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
// Core: Generate Aurora Report
// ============================================
async function generateAuroraReport(lat, lon, locationName, context) {
    // Fetch Kp index and weather in parallel
    const [kpData, weatherData] = await Promise.all([
        fetchKpIndex(context),
        fetchWeatherData(lat, lon, context)
    ]);
    
    const current = weatherData?.current || {};
    const clouds = current.clouds ?? 50;
    
    // Calculate sun position (simplified)
    const now = new Date();
    const hour = now.getUTCHours();
    const isDark = hour >= 21 || hour <= 5;  // Rough estimate
    const sunAltitude = isDark ? -30 : 10;   // Simplified
    
    // Use EXISTING AuroraScore computation
    const scoreResult = computeAuroraScore({
        kpIndex: kpData.current,
        latitude: lat,
        cloudCover: clouds,
        sunAltitude: sunAltitude,
        isDark: isDark,
        forecastKp: kpData.forecast
    });
    
    // Build message
    const message = buildAuroraMessage({
        locationName,
        lat,
        scoreResult,
        kpData,
        clouds,
        isDark,
        weatherData
    });
    
    return {
        message,
        score: scoreResult.score,
        rating: scoreResult.rating,
        kpIndex: kpData.current,
        cloudCover: clouds,
        summary: {
            score: scoreResult.score,
            rating: scoreResult.rating,
            kpIndex: kpData.current,
            kpLevel: KP_DESCRIPTIONS[Math.min(Math.floor(kpData.current), 9)]?.level,
            cloudCover: clouds,
            isDark,
            minKpNeeded: scoreResult.factors?.kpIndex?.minNeeded || 5
        }
    };
}

/**
 * Build the aurora alert message
 */
function buildAuroraMessage(data) {
    const { locationName, lat, scoreResult, kpData, clouds, isDark, weatherData } = data;
    
    const lines = [];
    
    // Header
    const kpInfo = KP_DESCRIPTIONS[Math.min(Math.floor(kpData.current), 9)];
    const headerEmoji = kpData.current >= 5 ? '🌌' : '🌙';
    
    lines.push(`${headerEmoji} *Aurora Alert - ${locationName}*`);
    lines.push('');
    
    // Score
    const scoreEmoji = scoreResult.score >= 70 ? '🟢' : scoreResult.score >= 50 ? '🟡' : '🔴';
    lines.push(`${scoreEmoji} *AuroraScore: ${scoreResult.score}/100* - ${scoreResult.rating}`);
    lines.push('');
    
    // Kp Index (most important)
    const kpEmoji = kpData.current >= 6 ? '🔥' : kpData.current >= 5 ? '⚡' : kpData.current >= 4 ? '📈' : '📊';
    lines.push(`${kpEmoji} *Kp Index: ${kpData.current}* (${kpInfo.level})`);
    lines.push(`   _${kpInfo.description}_`);
    
    // What Kp is needed for this latitude
    const minKpNeeded = scoreResult.factors?.kpIndex?.minNeeded || 5;
    if (kpData.current >= minKpNeeded) {
        lines.push(`   ✅ Above threshold for ${Math.round(lat)}°N latitude`);
    } else {
        lines.push(`   ⚠️ Need Kp ${minKpNeeded}+ for ${Math.round(lat)}°N (currently ${kpData.current})`);
    }
    lines.push('');
    
    // Kp Forecast if available
    if (kpData.forecast && kpData.forecast.length > 0) {
        lines.push('📅 *Kp Forecast:*');
        const next3hr = kpData.forecast[0] ?? kpData.current;
        const next6hr = kpData.forecast[1] ?? kpData.forecast[0] ?? kpData.current;
        lines.push(`   Next 3hr: Kp ${next3hr} | Next 6hr: Kp ${next6hr}`);
        lines.push('');
    }
    
    // Sky conditions
    lines.push('🌤️ *Conditions:*');
    lines.push(`   ☁️ Cloud cover: ${clouds}%`);
    if (clouds <= 25) {
        lines.push('   _✨ Clear skies - excellent!_');
    } else if (clouds <= 50) {
        lines.push('   _⛅ Partly cloudy - watch for breaks_');
    } else {
        lines.push('   _☁️ Cloudy - aurora may be hidden_');
    }
    
    // Darkness
    if (isDark) {
        lines.push('   🌙 Dark enough for viewing');
    } else {
        lines.push('   ☀️ Wait for darkness');
    }
    lines.push('');
    
    // Recommendation
    lines.push('💡 *Recommendation:*');
    lines.push(`_${scoreResult.recommendation}_`);
    lines.push('');
    
    // Viewing tips
    if (scoreResult.score >= 50) {
        lines.push('📍 *Best viewing:*');
        lines.push('• Find a dark location away from city lights');
        lines.push('• Look north towards the horizon');
        lines.push('• Give your eyes 20+ mins to adjust');
        lines.push('• Check between 10pm - 2am');
        lines.push('');
    }
    
    // Footer
    lines.push('─────────────');
    lines.push('_Source: NOAA Space Weather Prediction Center_');
    
    return lines.join('\n');
}

// ============================================
// Check and send alerts to all users
// ============================================
async function checkAndSendAuroraAlerts(context, force = false) {
    const results = {
        kpIndex: 0,
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: []
    };
    
    // Fetch current Kp index
    const kpData = await fetchKpIndex(context);
    results.kpIndex = kpData.current;
    
    // Quick check: if Kp is too low, don't bother checking users
    // Ireland needs Kp 5+ typically
    if (kpData.current < 4 && !force) {
        context.log(`Kp ${kpData.current} too low for Ireland - skipping user check`);
        results.skipped = 'Kp too low';
        return results;
    }
    
    // Check if we already sent an alert for this Kp level recently
    const alertKey = `kp-${Math.floor(kpData.current)}`;
    if (!force && hasRecentAlert(alertKey)) {
        context.log('Already sent alert for this Kp level recently');
        results.skipped = 'Recent alert sent';
        return results;
    }
    
    const connectionString = process.env.AzureWebJobsStorage;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping user notifications');
        results.skipped = 'Development mode';
        return results;
    }
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        // Query users with aurora alerts enabled
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            // Check if aurora alerts enabled
            const auroraEnabled = user.alertAuroraAlerts === true ||
                user.alertTypes?.auroraAlerts === true ||
                (user.preferencesJson && JSON.parse(user.preferencesJson)?.alertTypes?.auroraAlerts === true);
            
            if (!auroraEnabled && !force) {
                continue;
            }
            
            results.processed++;
            
            const userId = user.rowKey;
            
            // Parse preferences
            let prefs = {};
            if (user.preferencesJson) {
                try {
                    prefs = JSON.parse(user.preferencesJson);
                } catch (e) {}
            }
            
            const chatId = user.telegramChatId || prefs.telegramChatId;
            
            // Get user's saved location from UserLocations table
            const userLocation = await getUserLocation(userId, context);
            const lat = userLocation.latitude;
            const lon = userLocation.longitude;
            const locationName = userLocation.locationName;
            
            if (!chatId) {
                results.skipped++;
                continue;
            }
            
            try {
                const report = await generateAuroraReport(lat, lon, locationName, context);
                const alertDecision = shouldAlert(report.score, report.kpIndex, report.cloudCover);
                
                if (alertDecision.shouldSend || force) {
                    const sent = await sendTelegramMessage(chatId, report.message);
                    if (sent) {
                        results.sent++;
                        markAlertSent(alertKey);
                    } else {
                        results.errors.push({ userId: user.rowKey, error: 'Send failed' });
                    }
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

// ============================================
// Kp Index Fetching (NOAA)
// ============================================
async function fetchKpIndex(context) {
    // NOAA Space Weather Prediction Center - Planetary K-index
    const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) {
            context.log(`NOAA API error: ${response.status}`);
            return { current: 3, forecast: [3, 3, 3] };
        }
        
        const data = await response.json();
        
        // Data format: array of [timestamp, Kp, a_running, station_count]
        // Skip header row, get latest values
        if (!Array.isArray(data) || data.length < 2) {
            return { current: 3, forecast: [3, 3, 3] };
        }
        
        // Get latest Kp (last row)
        const latest = data[data.length - 1];
        const currentKp = parseFloat(latest[1]) || 3;
        
        // Get last few values for "forecast" (recent trend)
        const recentKps = data.slice(-4).map(row => parseFloat(row[1]) || 3);
        
        return {
            current: currentKp,
            forecast: recentKps,
            timestamp: latest[0]
        };
        
    } catch (error) {
        context.error('Error fetching Kp index:', error.message);
        return { current: 3, forecast: [3, 3, 3] };
    }
}

// ============================================
// Weather Data
// ============================================
async function fetchWeatherData(lat, lon, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        context.error('Weather fetch error:', error.message);
        return null;
    }
}

// ============================================
// Alert Tracking (avoid spam)
// ============================================
function hasRecentAlert(key) {
    const sent = sentAlerts.get(key);
    if (!sent) return false;
    
    // Don't re-alert within 6 hours for same Kp level
    const sixHoursAgo = Date.now() - (6 * 60 * 60 * 1000);
    return sent > sixHoursAgo;
}

function markAlertSent(key) {
    sentAlerts.set(key, Date.now());
    
    // Clean old entries
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    for (const [k, v] of sentAlerts) {
        if (v < oneDayAgo) sentAlerts.delete(k);
    }
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
    generateAuroraReport,
    buildAuroraMessage,
    checkAndSendAuroraAlerts
};