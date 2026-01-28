/**
 * TonightsSkyAlert.js - Azure Function for "Tonight's Sky" alerts
 * 
 * Combines:
 * - EXISTING SkyScore (from ../scoring/SkyScore.js)
 * - Visible planets (VisiblePlanets.js)
 * - ISS passes (ISSPasses.js)  
 * - Meteor showers (MeteorShowers.js)
 * 
 * Triggers:
 * - HTTP: POST /api/tonights-sky (manual test)
 * - Timer: Daily at 6pm (automated)
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// EXISTING SkyScore module - DRY: use the single source of truth!
const { calculateSkyScore, getMoonPhaseName, getMoonIllumination, getRating } = require('../scoring/SkyScore');

// Astronomy modules
const { getVisiblePlanets, formatPlanetsForMessage } = require('../astronomy/VisiblePlanets');
const { getTonightISSPasses, formatISSForMessage } = require('../astronomy/ISSPasses');
const { formatMeteorsForMessage, getActiveShowers } = require('../astronomy/MeteorShowers');

// User location helper
const { getUserLocation } = require('../utils/UserLocationHelper');

// ============================================
// HTTP Trigger - Manual testing
// ============================================
app.http('TonightsSkyAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'tonights-sky',
    handler: async (request, context) => {
        context.log('TonightsSkyAlert triggered via HTTP');
        
        try {
            // Parse parameters
            let chatId, lat, lon, locationName, threshold;
            
            let force = false;  // Force send even if below threshold
            
            if (request.method === 'POST') {
                const body = await request.json().catch(() => ({}));
                chatId = body.chatId;
                lat = body.lat ?? 53.3498;  // Dublin default
                lon = body.lon ?? -6.2603;
                locationName = body.locationName ?? 'Dublin';
                threshold = body.threshold ?? 60;
                force = body.force === true;
            } else {
                chatId = request.query.get('chatId');
                lat = parseFloat(request.query.get('lat')) || 53.3498;
                lon = parseFloat(request.query.get('lon')) || -6.2603;
                locationName = request.query.get('location') || 'Dublin';
                threshold = parseInt(request.query.get('threshold')) || 60;
                force = request.query.get('force') === 'true';
            }
            
            // Generate the report
            const report = await generateTonightsSkyReport(lat, lon, locationName, context);
            
            // If chatId provided, send to Telegram (if above threshold or forced)
            if (chatId) {
                const aboveThreshold = report.skyScore >= threshold;
                let sent = false;
                let skippedReason = null;
                
                if (aboveThreshold || force) {
                    sent = await sendTelegramMessage(chatId, report.message);
                    if (force && !aboveThreshold) {
                        skippedReason = `Forced send (SkyScore ${report.skyScore} below threshold ${threshold})`;
                    }
                } else {
                    skippedReason = `SkyScore ${report.skyScore} below threshold ${threshold}`;
                }
                
                return {
                    status: 200,
                    jsonBody: {
                        success: sent,
                        skyScore: report.skyScore,
                        rating: report.rating,
                        threshold: threshold,
                        aboveThreshold: aboveThreshold,
                        forced: force,
                        messageSent: sent,
                        skippedReason: skippedReason,
                        metadata: report.metadata
                    }
                };
            }
            
            // Otherwise, return the report for preview
            return {
                status: 200,
                jsonBody: {
                    message: report.message,
                    skyScore: report.skyScore,
                    rating: report.rating,
                    shouldAlert: report.skyScore >= threshold,
                    metadata: report.metadata
                }
            };
            
        } catch (error) {
            context.error('Error in TonightsSkyAlert:', error);
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Timer Trigger - Daily at 6pm
// ============================================
app.timer('TonightsSkyTimer', {
    schedule: '0 0 18 * * *',  // 6pm UTC daily
    handler: async (timer, context) => {
        context.log('TonightsSkyTimer triggered at', new Date().toISOString());
        
        try {
            await processAllUsersForStargazingAlerts(context);
        } catch (error) {
            context.error('Error in TonightsSkyTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Test batch processor manually
// ============================================
app.http('TonightsSkyBatchTest', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'tonights-sky/batch-test',
    handler: async (request, context) => {
        context.log('TonightsSkyBatchTest triggered manually');
        
        // Check for force parameter
        const force = request.query.get('force') === 'true';
        
        try {
            const results = await processAllUsersForStargazingAlerts(context, force);
            
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
// Core: Generate Tonight's Sky Report
// ============================================
async function generateTonightsSkyReport(lat, lon, locationName, context) {
    // Fetch all data in parallel
    const [weatherData, planets, issPasses] = await Promise.all([
        fetchWeatherData(lat, lon, context),
        getVisiblePlanets(lat, lon),
        getTonightISSPasses(lat, lon).catch(err => {
            context.log('ISS fetch error:', err.message);
            return [];
        })
    ]);
    
    // Debug logging for ISS
    context.log(`ISS Debug: N2YO_API_KEY set: ${!!process.env.N2YO_API_KEY}`);
    context.log(`ISS Debug: Passes found: ${issPasses.length}`);
    
    // Calculate SkyScore using EXISTING module (DRY!)
    const skyScore = computeSkyScoreFromWeather(weatherData);
    
    // Get meteor info
    const meteors = getActiveShowers();
    
    // Build the message
    const message = buildTonightsSkyMessage({
        locationName,
        skyScore,
        weatherData,
        planets,
        issPasses,
        meteors
    });
    
    return {
        message,
        skyScore: skyScore.score,
        rating: skyScore.rating,
        metadata: {
            clouds: weatherData.current?.clouds,
            moonPhase: weatherData.daily?.[0]?.moon_phase,
            planetsVisible: planets.length,
            hasISSPass: issPasses.length > 0,
            issPassCount: issPasses.length,
            issApiKeySet: !!process.env.N2YO_API_KEY,
            activeMeteorShowers: meteors.length
        }
    };
}

/**
 * Wrapper for existing SkyScore module
 * Adapts OpenWeather data format to SkyScore.js expected format
 */
function computeSkyScoreFromWeather(weatherData) {
    const current = weatherData.current || {};
    const daily = weatherData.daily?.[0] || {};
    
    // Format data for existing calculateSkyScore function
    const weather = {
        clouds: current.clouds ?? 50,
        humidity: current.humidity ?? 70,
        visibility: current.visibility ?? 10000,
        windSpeed: current.wind_speed ?? 5  // m/s (SkyScore.js expects m/s)
    };
    
    const moonData = {
        phase: daily.moon_phase ?? 0.5
    };
    
    // Use the EXISTING SkyScore calculation (DRY!)
    const result = calculateSkyScore(weather, moonData);
    
    // Return in format expected by message builder
    return {
        score: result.score,
        rating: result.rating,
        components: {
            clouds: weather.clouds,
            humidity: weather.humidity,
            windSpeed: weather.windSpeed * 3.6,  // Convert to km/h for display
            visibility: weather.visibility,
            moonPhase: moonData.phase
        },
        moonPhaseName: result.moonPhase,  // Already calculated by SkyScore.js
        moonIllumination: result.moonIllumination  // Already calculated by SkyScore.js
    };
}

/**
 * Build the Telegram message
 */
function buildTonightsSkyMessage(data) {
    const { locationName, skyScore, weatherData, planets, issPasses, meteors } = data;
    const current = weatherData.current || {};
    const daily = weatherData.daily?.[0] || {};
    
    const lines = [];
    
    // Header
    lines.push(`🌟 *Tonight's Sky - ${locationName}*`);
    lines.push('');
    
    // SkyScore
    const emoji = skyScore.score >= 80 ? '🌟' : skyScore.score >= 60 ? '⭐' : '☁️';
    lines.push(`${emoji} *SkyScore: ${skyScore.score}/100* - ${skyScore.rating}`);
    lines.push(`_${getRecommendation(skyScore.score)}_`);
    lines.push('');
    
    // Conditions
    lines.push('📊 *Conditions:*');
    lines.push(`   ☁️ Clouds: ${skyScore.components.clouds}%`);
    lines.push(`   💧 Humidity: ${skyScore.components.humidity}%`);
    lines.push(`   💨 Wind: ${Math.round(skyScore.components.windSpeed)} km/h`);
    lines.push('');
    
    // Moon
    const moonEmoji = getMoonEmoji(skyScore.moonIllumination);
    lines.push(`${moonEmoji} *Moon:* ${skyScore.moonPhaseName} (${skyScore.moonIllumination}%)`);
    if (daily.moonrise && daily.moonset) {
        const moonrise = formatTime(daily.moonrise);
        const moonset = formatTime(daily.moonset);
        lines.push(`   Rises ${moonrise}, Sets ${moonset}`);
    }
    if (skyScore.moonIllumination <= 25) {
        lines.push('   _🌟 Dark skies - great for faint objects!_');
    } else if (skyScore.moonIllumination >= 80) {
        lines.push('   _💡 Bright moon - best for planets tonight_');
    }
    lines.push('');
    
    // Planets
    const planetsSection = formatPlanetsForMessage(planets);
    if (planetsSection) {
        lines.push(planetsSection);
        lines.push('');
    }
    
    // ISS
    const issSection = formatISSForMessage(issPasses);
    if (issSection) {
        lines.push(issSection);
        lines.push('');
    }
    
    // Meteors
    const meteorsSection = formatMeteorsForMessage();
    if (meteorsSection) {
        lines.push(meteorsSection);
        lines.push('');
    }
    
    // Highlights
    const highlights = getHighlights(skyScore, planets, meteors);
    if (highlights.length > 0) {
        lines.push('✨ *Highlights:*');
        highlights.forEach(h => lines.push(`• ${h}`));
        lines.push('');
    }
    
    // Footer
    lines.push('─────────────');
    lines.push('💡 _Give your eyes 20 mins to adapt to darkness_');
    
    return lines.join('\n');
}

function getRecommendation(score) {
    if (score >= 80) return 'Excellent conditions! Perfect for stargazing.';
    if (score >= 65) return 'Good conditions for casual stargazing.';
    if (score >= 50) return 'Fair conditions. Best for bright objects.';
    if (score >= 35) return 'Poor conditions. Only the brightest objects visible.';
    return 'Not recommended for stargazing tonight.';
}

function getMoonEmoji(illumination) {
    if (illumination <= 5) return '🌑';
    if (illumination <= 35) return '🌒';
    if (illumination <= 65) return '🌓';
    if (illumination <= 95) return '🌔';
    return '🌕';
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-IE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getHighlights(skyScore, planets, meteors) {
    const highlights = [];
    
    // Count visible bright planets
    const brightPlanets = planets.filter(p => 
        ['Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.name) && p.altitude > 15
    );
    
    if (brightPlanets.length >= 3) {
        highlights.push(`${brightPlanets.length} planets visible tonight!`);
    }
    
    if (skyScore.score >= 80) {
        highlights.push('Great for deep-sky objects (galaxies, nebulae)');
    }
    
    // Seasonal constellations
    const month = new Date().getMonth() + 1;
    if (month >= 11 || month <= 2) {
        highlights.push('Orion & winter constellations visible');
    } else if (month >= 6 && month <= 8) {
        highlights.push('Summer Triangle high overhead');
    } else if (month >= 3 && month <= 5) {
        highlights.push('Spring galaxies season - M81, M82 visible');
    }
    
    return highlights.slice(0, 3);
}

// ============================================
// Process all users (for timer trigger)
// ============================================
async function processAllUsersForStargazingAlerts(context, force = false) {
    const connectionString = process.env.AzureWebJobsStorage;
    
    const results = {
        processed: 0,
        sent: 0,
        skipped: 0,
        belowThreshold: 0,
        errors: [],
        users: []
    };
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping batch processing');
        results.skipped = 'Development mode';
        return results;
    }
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        // Query users with telegram enabled
        // Note: We filter stargazing preference in code since it might be nested in JSON
        context.log('Querying users with telegramEnabled=true');
        
        const users = prefsClient.listEntities({
            queryOptions: { 
                filter: "telegramEnabled eq true" 
            }
        });
        
        for await (const user of users) {
            // Check if stargazing alerts are enabled (handle both flat and nested)
            const stargazingEnabled = user.alertStargazing === true || 
                                      user.alertTypes?.stargazingAlerts === true ||
                                      (user.preferencesJson && JSON.parse(user.preferencesJson)?.alertTypes?.stargazingAlerts === true);
            
            if (!stargazingEnabled) {
                context.log(`User ${user.rowKey}: stargazing not enabled - skipping`);
                continue;
            }
            
            results.processed++;
            
            const userId = user.rowKey;
            
            // Parse preferences - might be flat columns or nested JSON
            let prefs = {};
            if (user.preferencesJson) {
                try {
                    prefs = JSON.parse(user.preferencesJson);
                } catch (e) {
                    context.log(`Failed to parse preferencesJson for ${userId}`);
                }
            }
            
            // Get values from flat columns first, fall back to nested JSON
            const chatId = user.telegramChatId || prefs.telegramChatId;
            const threshold = user.stargazingThreshold || prefs.stargazingThreshold || 65;
            
            // Get user's saved location from UserLocations table
            const userLocation = await getUserLocation(userId, context);
            const lat = userLocation.latitude;
            const lon = userLocation.longitude;
            const locationName = userLocation.locationName;
            
            context.log(`Processing user ${userId}: chatId=${chatId}, threshold=${threshold}, force=${force}`);
            
            if (!chatId) {
                context.log(`User ${userId} has no chatId - skipping`);
                results.skipped++;
                results.users.push({ userId, status: 'no_chatId' });
                continue;
            }
            
            try {
                const report = await generateTonightsSkyReport(lat, lon, locationName, context);
                
                context.log(`User ${userId}: SkyScore=${report.skyScore}, threshold=${threshold}`);
                
                // Send if above threshold OR if forced
                if (report.skyScore >= threshold || force) {
                    const success = await sendTelegramMessage(chatId, report.message);
                    if (success) {
                        results.sent++;
                        results.users.push({ 
                            userId, 
                            status: force && report.skyScore < threshold ? 'force_sent' : 'sent', 
                            skyScore: report.skyScore 
                        });
                        context.log(`Sent alert to ${userId}`);
                    } else {
                        results.errors.push({ userId, error: 'Telegram send failed' });
                        results.users.push({ userId, status: 'send_failed' });
                    }
                } else {
                    results.belowThreshold++;
                    results.users.push({ 
                        userId, 
                        status: 'below_threshold', 
                        skyScore: report.skyScore,
                        threshold 
                    });
                    context.log(`Skipped ${userId}: score ${report.skyScore} < threshold ${threshold}`);
                }
            } catch (err) {
                context.error(`Error processing user ${userId}:`, err.message);
                results.errors.push({ userId, error: err.message });
            }
        }
        
        context.log(`Batch complete: ${results.processed} processed, ${results.sent} sent, ${results.belowThreshold} below threshold`);
        
    } catch (error) {
        context.error('Error querying users:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

// ============================================
// Weather & Telegram helpers
// ============================================
async function fetchWeatherData(lat, lon, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
        context.error('OPENWEATHER_API_KEY not configured');
        return { current: {}, daily: [] };
    }
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            context.error(`Weather API error: ${response.status}`);
            return { current: {}, daily: [] };
        }
        return await response.json();
    } catch (error) {
        context.error('Weather fetch error:', error.message);
        return { current: {}, daily: [] };
    }
}

async function sendTelegramMessage(chatId, message) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN not configured');
        return false;
    }
    
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    try {
        const response = await fetch(url, {
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
        console.error('Telegram send error:', error.message);
        return false;
    }
}

module.exports = {
    generateTonightsSkyReport,
    buildTonightsSkyMessage,
    computeSkyScoreFromWeather
};