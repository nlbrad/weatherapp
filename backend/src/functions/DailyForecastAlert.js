/**
 * DailyForecastAlert.js - Morning Weather Briefing
 * 
 * FIXES:
 * - Uses AlertTracker for deduplication (no more sending twice!)
 * - Deduplicates warnings (no more duplicate wind warnings!)
 * - Records alerts for history
 * 
 * Triggers:
 * - HTTP: POST /api/daily-forecast (manual test)
 * - Timer: 7am UTC daily
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Use existing SkyScore module
const { calculateSkyScore } = require('../scoring/SkyScore');

// Weather warnings
const { getWarningsForLocation, formatWarningsForMessage, getHighestSeverity } = require('../utils/MeteoAlarm');

// User location helper
const { getUserLocation } = require('../utils/UserLocationHelper');

// Persistent alert tracking - NEW!
const { hasRecentAlert, recordAlert } = require('../utils/AlertTracker');

// Only send once per day
const DAILY_COOLDOWN_HOURS = 20;

// ============================================
// HTTP Trigger - Manual testing
// ============================================
app.http('DailyForecastAlert', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'daily-forecast',
    handler: async (request, context) => {
        context.log('DailyForecastAlert triggered via HTTP');
        
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
            
            // Generate the forecast
            const forecast = await generateDailyForecast(lat, lon, locationName, context);
            
            // If chatId provided, send to Telegram
            if (chatId) {
                const sent = await sendTelegramMessage(chatId, forecast.message);
                return {
                    status: 200,
                    jsonBody: {
                        success: sent,
                        messageSent: sent,
                        ...forecast.summary
                    }
                };
            }
            
            // Return preview
            return {
                status: 200,
                jsonBody: {
                    message: forecast.message,
                    ...forecast.summary
                }
            };
            
        } catch (error) {
            context.error('Error in DailyForecastAlert:', error);
            return {
                status: 500,
                jsonBody: { error: error.message }
            };
        }
    }
});

// ============================================
// Timer Trigger - Daily at 7am UTC
// ============================================
app.timer('DailyForecastTimer', {
    schedule: '0 0 7 * * *',
    handler: async (timer, context) => {
        context.log('DailyForecastTimer triggered at', new Date().toISOString());
        
        try {
            const results = await processAllUsersForDailyForecast(context);
            context.log(`Daily forecast: ${results.sent} sent, ${results.alreadySent} already sent today`);
        } catch (error) {
            context.error('Error in DailyForecastTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Batch test
// ============================================
app.http('DailyForecastBatchTest', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    route: 'daily-forecast/batch-test',
    handler: async (request, context) => {
        context.log('DailyForecastBatchTest triggered');
        
        const force = request.query.get('force') === 'true';
        
        try {
            const results = await processAllUsersForDailyForecast(context, force);
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
// Core: Generate Daily Forecast
// ============================================
async function generateDailyForecast(lat, lon, locationName, context) {
    // Fetch weather data and warnings in parallel
    const [weatherData, rawWarnings] = await Promise.all([
        fetchWeatherData(lat, lon, context),
        getWarningsForLocation(lat, lon).catch(err => {
            context.log('Warning fetch error:', err.message);
            return [];
        })
    ]);
    
    if (!weatherData || !weatherData.current) {
        throw new Error('Failed to fetch weather data');
    }
    
    // Deduplicate warnings!
    const warnings = deduplicateWarnings(rawWarnings);
    
    const current = weatherData.current;
    const today = weatherData.daily?.[0] || {};
    const hourly = weatherData.hourly || [];
    
    // Extract key data
    const tempNow = Math.round(current.temp);
    const tempMin = Math.round(today.temp?.min ?? current.temp);
    const tempMax = Math.round(today.temp?.max ?? current.temp);
    const feelsLike = Math.round(current.feels_like);
    
    // Weather description
    const weatherDesc = current.weather?.[0]?.description || 'Unknown';
    const weatherMain = current.weather?.[0]?.main || 'Clear';
    
    // Rain probability
    const rainChance = Math.round((today.pop || 0) * 100);
    
    // Wind
    const windSpeed = Math.round((current.wind_speed || 0) * 3.6);
    const windGust = current.wind_gust ? Math.round(current.wind_gust * 3.6) : null;
    const windDir = getWindDirection(current.wind_deg);
    
    // Visibility & humidity
    const visibility = current.visibility ? (current.visibility / 1000).toFixed(1) : null;
    const humidity = current.humidity;
    
    // Sun times
    const sunrise = formatTime(current.sunrise);
    const sunset = formatTime(current.sunset);
    const dayLength = getDayLength(current.sunrise, current.sunset);
    
    // Calculate SkyScore for tonight
    let skyScore = { score: 0, rating: 'Unknown' };
    try {
        skyScore = await calculateSkyScore(lat, lon);
    } catch (err) {
        context.log('SkyScore error:', err.message);
    }
    
    // Build message
    const message = buildDailyMessage({
        locationName,
        warnings,
        tempNow, tempMin, tempMax, feelsLike,
        weatherDesc, weatherMain,
        rainChance,
        windSpeed, windGust, windDir,
        visibility, humidity,
        sunrise, sunset, dayLength,
        skyScore,
        hourly
    });
    
    return {
        message,
        summary: {
            location: locationName,
            temp: { now: tempNow, min: tempMin, max: tempMax },
            conditions: weatherMain,
            rainChance,
            warnings: warnings.length,
            skyScore: skyScore.score
        }
    };
}

/**
 * Deduplicate warnings - same type/severity = combine
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
            // Keep later expiry, merge regions
            const existingExpires = new Date(existing.expires || 0);
            const newExpires = new Date(warning.expires || 0);
            
            if (newExpires > existingExpires) {
                if (warning.regionsText !== existing.regionsText) {
                    warning.regionsText = mergeRegions(existing.regionsText, warning.regionsText);
                }
                seen.set(key, warning);
            }
        }
    }
    
    return Array.from(seen.values());
}

function mergeRegions(r1, r2) {
    if (!r1) return r2;
    if (!r2) return r1;
    const all = new Set([...r1.split(', '), ...r2.split(', ')]);
    return Array.from(all).join(', ');
}

/**
 * Build the daily forecast message
 */
function buildDailyMessage(data) {
    const lines = [];
    const {
        locationName, warnings,
        tempNow, tempMin, tempMax, feelsLike,
        weatherDesc, weatherMain,
        rainChance,
        windSpeed, windGust, windDir,
        visibility, humidity,
        sunrise, sunset, dayLength,
        skyScore
    } = data;
    
    // Header
    const greeting = getGreeting();
    const weatherEmoji = getWeatherEmoji(weatherMain);
    lines.push(`${weatherEmoji} ${greeting} Here's today in ${locationName}`);
    lines.push('');
    
    // Warnings first (if any)
    if (warnings && warnings.length > 0) {
        lines.push('⚠️ *Active Weather Warnings:*');
        lines.push('');
        for (const w of warnings) {
            lines.push(`${w.severityColor} *${w.severityName} - ${w.type}*`);
            if (w.regionsText && !w.isNationwide) {
                lines.push(`   📍 ${w.regionsText}`);
            }
            if (w.onset && w.expires) {
                lines.push(`   ⏰ ${formatDateTime(w.onset)} - ${formatDateTime(w.expires)}`);
            }
            lines.push('');
        }
    }
    
    // Temperature
    lines.push('🌡️ *Temperature*');
    lines.push(`   ${tempMin}°C → ${tempMax}°C (now ${tempNow}°C)`);
    lines.push(`   Feels like ${feelsLike}°C`);
    lines.push('');
    
    // Conditions
    lines.push(`${weatherEmoji} ${capitalise(weatherDesc)}`);
    if (rainChance > 0) {
        lines.push(`🌧️ ${rainChance}% chance of rain`);
    }
    lines.push('');
    
    // Wind
    lines.push('💨 *Wind*');
    lines.push(`   ${windSpeed} km/h ${windDir}${windGust ? ` (gusts ${windGust} km/h)` : ''}`);
    lines.push('');
    
    // Details
    if (visibility) {
        const visRating = visibility >= 10 ? 'Excellent' : visibility >= 5 ? 'Good' : visibility >= 2 ? 'Moderate' : 'Poor';
        lines.push(`👁️ Visibility: ${visibility} km (${visRating})`);
    }
    if (humidity) {
        const humidDesc = humidity > 80 ? 'very humid' : humidity > 60 ? 'humid' : humidity < 30 ? 'dry' : 'comfortable';
        lines.push(`💧 Humidity: ${humidity}% (${humidDesc})`);
    }
    lines.push('');
    
    // Sun times
    lines.push(`🌅 Sunrise ${sunrise} · Sunset ${sunset}`);
    lines.push(`   (${dayLength} daylight)`);
    lines.push('');
    
    // Activity scores
    const outdoorScore = calculateOutdoorScore(data);
    lines.push('📊 *Activity Scores:*');
    lines.push(`   ${outdoorScore >= 60 ? '✅' : outdoorScore >= 40 ? '⚠️' : '❌'} Outdoor: ${outdoorScore}/100 (${getRating(outdoorScore)})`);
    lines.push(`   ${skyScore.score >= 60 ? '✅' : skyScore.score >= 40 ? '⚠️' : '❌'} Stargazing tonight: ${skyScore.score}/100 (${skyScore.rating})`);
    
    return lines.join('\n');
}

// ============================================
// Batch Processor
// ============================================
async function processAllUsersForDailyForecast(context, force = false) {
    const results = {
        processed: 0,
        sent: 0,
        alreadySent: 0,
        skipped: 0,
        errors: []
    };
    
    const connectionString = process.env.AzureWebJobsStorage;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context.log('Development mode - skipping');
        return results;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const prefsClient = TableClient.fromConnectionString(connectionString, 'UserPreferences');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            // Check if daily forecast enabled
            let enabled = false;
            if (user.preferencesJson) {
                try {
                    const prefs = JSON.parse(user.preferencesJson);
                    enabled = prefs.alertTypes?.dailyForecast === true;
                } catch (e) {}
            }
            enabled = enabled || user.alertDailyForecast === true;
            
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
            
            // Check if already sent today!
            const alreadySent = await hasRecentAlert(
                userId,
                'daily-forecast',
                { date: today },
                DAILY_COOLDOWN_HOURS
            );
            
            if (alreadySent && !force) {
                results.alreadySent++;
                context.log(`User ${userId}: Already sent daily forecast today`);
                continue;
            }
            
            // Get user location
            const userLocation = await getUserLocation(userId, context);
            
            try {
                const forecast = await generateDailyForecast(
                    userLocation.latitude,
                    userLocation.longitude,
                    userLocation.locationName,
                    context
                );
                
                const sent = await sendTelegramMessage(chatId, forecast.message);
                
                if (sent) {
                    results.sent++;
                    
                    // Record for deduplication + history
                    await recordAlert(userId, 'daily-forecast', {
                        date: today,
                        title: 'Daily Forecast',
                        summary: `${forecast.summary.temp.min}°C - ${forecast.summary.temp.max}°C, ${forecast.summary.conditions}`,
                        location: userLocation.locationName,
                    });
                    
                    context.log(`User ${userId}: Daily forecast sent`);
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
// Helper Functions
// ============================================

async function fetchWeatherData(lat, lon, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error('OPENWEATHER_API_KEY not configured');
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
    return response.json();
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning!';
    if (hour < 17) return 'Good afternoon!';
    return 'Good evening!';
}

function getWeatherEmoji(main) {
    const emojis = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Thunderstorm': '⛈️',
        'Snow': '❄️',
        'Mist': '🌫️',
        'Fog': '🌫️',
    };
    return emojis[main] || '🌤️';
}

function getWindDirection(deg) {
    if (deg == null) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    return new Date(timestamp * 1000).toLocaleTimeString('en-IE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const time = date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isToday) return `Today ${time}`;
    
    return date.toLocaleDateString('en-IE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getDayLength(sunrise, sunset) {
    if (!sunrise || !sunset) return '-- hours';
    const diff = sunset - sunrise;
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return `${hours}h ${mins}m`;
}

function capitalise(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateOutdoorScore(data) {
    let score = 100;
    
    // Rain penalty
    if (data.rainChance > 70) score -= 40;
    else if (data.rainChance > 40) score -= 20;
    
    // Wind penalty
    if (data.windSpeed > 50) score -= 30;
    else if (data.windSpeed > 30) score -= 15;
    
    // Temperature penalty
    if (data.tempMax < 5 || data.tempMax > 30) score -= 20;
    
    // Warnings penalty
    if (data.warnings?.length > 0) {
        const highest = getHighestSeverity(data.warnings);
        if (highest.level >= 4) score -= 40;
        else if (highest.level >= 3) score -= 25;
        else score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
}

function getRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Bad';
}

// Shared Telegram utility
const { sendTelegramMessage: _sendTelegram } = require('../utils/telegramHelper');
async function sendTelegramMessage(chatId, message) {
    const result = await _sendTelegram(chatId, message);
    return result.ok === true;
}

module.exports = {
    generateDailyForecast,
    processAllUsersForDailyForecast
};
