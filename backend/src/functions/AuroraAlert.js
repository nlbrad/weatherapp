/**
 * AuroraAlert.js - Northern Lights Alert System (UPDATED)
 * 
 * CHANGES:
 * - Uses persistent AlertTracker for deduplication (no more repeated alerts!)
 * - Uses AuroraScore properly (score >= threshold, not just Kp >= 5)
 * - Records sent alerts for history feature
 * 
 * Triggers:
 * - HTTP: POST /api/aurora-alert (manual test)
 * - Timer: Every hour to check Kp index
 * 
 * Ireland (53°N) typically needs Kp 5+ for visible aurora
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Use EXISTING AuroraScore module
const { 
    computeAuroraScore, 
    shouldAlert, 
    KP_DESCRIPTIONS 
} = require('../scoring/AuroraScore');

// User location helper
const { getUserLocation } = require('../utils/UserLocationHelper');

// NEW: Persistent alert tracking
const { hasRecentAlert, recordAlert } = require('../utils/AlertTracker');

// Default threshold for aurora alerts
const DEFAULT_AURORA_THRESHOLD = 50; // AuroraScore threshold (not Kp!)
const AURORA_COOLDOWN_HOURS = 6; // Don't re-alert for same Kp level within 6 hours

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
            let chatId, lat, lon, locationName, force, threshold;
            
            if (request.method === 'POST') {
                const body = await request.json().catch(() => ({}));
                chatId = body.chatId;
                lat = body.lat ?? 53.3498;
                lon = body.lon ?? -6.2603;
                locationName = body.locationName ?? 'Dublin';
                force = body.force === true;
                threshold = body.threshold ?? DEFAULT_AURORA_THRESHOLD;
            } else {
                chatId = request.query.get('chatId');
                lat = parseFloat(request.query.get('lat')) || 53.3498;
                lon = parseFloat(request.query.get('lon')) || -6.2603;
                locationName = request.query.get('location') || 'Dublin';
                force = request.query.get('force') === 'true';
                threshold = parseInt(request.query.get('threshold')) || DEFAULT_AURORA_THRESHOLD;
            }
            
            // Generate aurora report
            const report = await generateAuroraReport(lat, lon, locationName, context);
            
            // Check if we should alert based on AuroraScore (not just Kp!)
            const shouldSend = report.score >= threshold;
            
            // If chatId provided and (should alert OR forced), send to Telegram
            if (chatId && (shouldSend || force)) {
                const sent = await sendTelegramMessage(chatId, report.message);
                return {
                    status: 200,
                    jsonBody: {
                        success: sent,
                        messageSent: sent,
                        shouldAlert: shouldSend,
                        forced: force,
                        scoreThreshold: threshold,
                        ...report.summary
                    }
                };
            }
            
            // Return report without sending
            return {
                status: 200,
                jsonBody: {
                    preview: true,
                    shouldAlert: shouldSend,
                    scoreThreshold: threshold,
                    ...report.summary,
                    message: report.message
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
// Timer Trigger - Automatic checks
// ============================================
app.timer('AuroraAlertTimer', {
    schedule: '0 0 * * * *',  // Every hour
    handler: async (timer, context) => {
        context.log('AuroraAlertTimer triggered at', new Date().toISOString());
        
        try {
            const results = await checkAndSendAuroraAlerts(context);
            context.log(`Aurora check complete: ${results.sent} sent, ${results.skipped} skipped`);
        } catch (error) {
            context.error('Error in AuroraAlertTimer:', error);
        }
    }
});

// ============================================
// Batch Test Endpoint
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
    // Fetch Kp data
    const kpData = await fetchKpIndex(context);
    
    // Fetch weather for cloud cover
    const weatherData = await fetchWeatherData(lat, lon, context);
    const clouds = weatherData?.current?.clouds ?? 50;
    
    // Calculate if it's dark
    const now = new Date();
    const hour = now.getUTCHours();
    const isDark = hour >= 21 || hour <= 5;  // Rough estimate
    const sunAltitude = isDark ? -30 : 10;   // Simplified
    
    // Use AuroraScore computation
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
    const headerEmoji = scoreResult.score >= 65 ? '🌌' : '🌙';
    
    lines.push(`${headerEmoji} *Aurora Alert - ${locationName}*`);
    lines.push('');
    
    // Score (this is what we use for alerting now!)
    const scoreEmoji = scoreResult.score >= 70 ? '🟢' : scoreResult.score >= 50 ? '🟡' : '🔴';
    lines.push(`${scoreEmoji} *AuroraScore: ${scoreResult.score}/100* - ${scoreResult.rating}`);
    lines.push('');
    
    // Kp Index
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
    
    // Conditions
    lines.push('📋 *Conditions:*');
    if (isDark) {
        lines.push(`   ✅ Dark enough for viewing`);
    } else {
        lines.push(`   ⚠️ Not dark yet - wait until after sunset`);
    }
    
    if (clouds <= 25) {
        lines.push(`   ✅ Clear skies (${clouds}% clouds)`);
    } else if (clouds <= 50) {
        lines.push(`   🟡 Partly cloudy (${clouds}%) - may have gaps`);
    } else {
        lines.push(`   ❌ Cloudy (${clouds}%) - visibility limited`);
    }
    lines.push('');
    
    // Recommendation
    if (scoreResult.recommendation) {
        lines.push(`💡 _${scoreResult.recommendation}_`);
    }
    
    return lines.join('\n');
}

// ============================================
// Core: Check All Users and Send Alerts
// ============================================
async function checkAndSendAuroraAlerts(context, force = false) {
    const results = {
        processed: 0,
        sent: 0,
        skipped: 0,
        belowThreshold: 0,
        alreadySent: 0,
        errors: []
    };
    
    // First, check global Kp level - if too low, skip everything
    const kpData = await fetchKpIndex(context);
    if (kpData.current < 4 && !force) {
        context.log(`Kp index ${kpData.current} too low for alerts, skipping batch`);
        results.skipped = 'Kp too low globally';
        return results;
    }
    
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
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
            const threshold = prefs.auroraAlertsThreshold || prefs.auroraThreshold || DEFAULT_AURORA_THRESHOLD;
            
            if (!chatId) {
                results.skipped++;
                continue;
            }
            
            // Get user's saved location
            const userLocation = await getUserLocation(userId, context);
            const lat = userLocation.latitude;
            const lon = userLocation.longitude;
            const locationName = userLocation.locationName;
            
            try {
                // Generate report for this user's location
                const report = await generateAuroraReport(lat, lon, locationName, context);
                
                // Check if score meets threshold
                if (report.score < threshold && !force) {
                    results.belowThreshold++;
                    context.log(`User ${userId}: AuroraScore ${report.score} below threshold ${threshold}`);
                    continue;
                }
                
                // Check if we already sent this alert (PERSISTENT CHECK!)
                const alertData = {
                    kpIndex: report.kpIndex,
                    score: report.score,
                };
                
                const alreadySent = await hasRecentAlert(
                    userId, 
                    'aurora', 
                    alertData, 
                    AURORA_COOLDOWN_HOURS
                );
                
                if (alreadySent && !force) {
                    results.alreadySent++;
                    context.log(`User ${userId}: Aurora alert already sent for Kp ${Math.round(report.kpIndex)}`);
                    continue;
                }
                
                // Send the alert!
                const sent = await sendTelegramMessage(chatId, report.message);
                
                if (sent) {
                    results.sent++;
                    
                    // Record that we sent this alert (for deduplication + history)
                    await recordAlert(userId, 'aurora', {
                        kpIndex: report.kpIndex,
                        score: report.score,
                        title: `Aurora Alert (Kp ${report.kpIndex})`,
                        summary: `AuroraScore: ${report.score}/100 - ${report.rating}`,
                        location: locationName,
                    });
                    
                    context.log(`User ${userId}: Aurora alert sent (Score: ${report.score}, Kp: ${report.kpIndex})`);
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
// External API calls
// ============================================

async function fetchKpIndex(context) {
    try {
        // NOAA provides Kp data
        const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
        if (!response.ok) throw new Error('NOAA API error');
        
        const data = await response.json();
        // Data format: [[timestamp, Kp, ...], ...]
        // Get the most recent entry
        const recent = data[data.length - 1];
        const current = parseFloat(recent[1]) || 3;
        
        // Get next few entries for forecast
        const forecast = data.slice(-4).map(d => parseFloat(d[1]) || 3);
        
        return { current, forecast };
    } catch (error) {
        context.warn('Failed to fetch Kp index:', error.message);
        return { current: 3, forecast: [3, 3, 3] };
    }
}

async function fetchWeatherData(lat, lon, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return null;
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        context.warn('Weather fetch error:', error.message);
        return null;
    }
}

// ============================================
// Telegram (shared utility)
// ============================================
const { sendTelegramMessage: _sendTelegram } = require('../utils/telegramHelper');
async function sendTelegramMessage(chatId, message) {
    const result = await _sendTelegram(chatId, message);
    return result.ok === true;
}

module.exports = {
    generateAuroraReport,
    buildAuroraMessage,
    checkAndSendAuroraAlerts
};
