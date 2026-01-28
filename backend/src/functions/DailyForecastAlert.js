/**
 * DailyForecastAlert.js - Morning weather briefing
 * 
 * Sends a daily forecast message to users each morning.
 * Uses existing SkyScore for tonight's stargazing preview.
 * 
 * Triggers:
 * - HTTP: POST /api/daily-forecast (manual test)
 * - Timer: 7am UTC daily (configurable per user)
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

// Use existing SkyScore module (DRY!)
const { calculateSkyScore } = require('../scoring/SkyScore');

// Weather warnings from MeteoAlarm
const { getWarningsForLocation, formatWarningsForMessage, getHighestSeverity } = require('../utils/MeteoAlarm');

// User location helper
const { getUserLocation } = require('../utils/UserLocationHelper');

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
            
            // Otherwise return preview
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
    schedule: '0 0 7 * * *',  // 7am UTC daily
    handler: async (timer, context) => {
        context.log('DailyForecastTimer triggered at', new Date().toISOString());
        
        try {
            const results = await processAllUsersForDailyForecast(context);
            context.log(`Daily forecast: ${results.processed} users, ${results.sent} sent`);
        } catch (error) {
            context.error('Error in DailyForecastTimer:', error);
        }
    }
});

// ============================================
// HTTP Trigger - Test batch processor
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
// Core: Generate Daily Forecast
// ============================================
async function generateDailyForecast(lat, lon, locationName, context) {
    // Fetch weather data and warnings in parallel
    const [weatherData, warnings] = await Promise.all([
        fetchWeatherData(lat, lon, context),
        getWarningsForLocation(lat, lon).catch(err => {
            context.log('Warning fetch error:', err.message);
            return [];
        })
    ]);
    
    if (!weatherData || !weatherData.current) {
        throw new Error('Failed to fetch weather data');
    }
    
    const current = weatherData.current;
    const today = weatherData.daily?.[0] || {};
    const hourly = weatherData.hourly || [];
    
    // Extract key data
    const tempNow = Math.round(current.temp);
    const tempMin = Math.round(today.temp?.min ?? current.temp);
    const tempMax = Math.round(today.temp?.max ?? current.temp);
    const feelsLike = Math.round(current.feels_like);
    const feelsLikeMin = Math.round(today.feels_like?.morn ?? feelsLike);
    const feelsLikeMax = Math.round(today.feels_like?.day ?? feelsLike);
    const humidity = current.humidity;
    const windSpeed = Math.round(current.wind_speed * 3.6); // m/s to km/h
    const windGust = current.wind_gust ? Math.round(current.wind_gust * 3.6) : null;
    const windDir = getWindDirection(current.wind_deg);
    const clouds = current.clouds;
    const visibility = current.visibility; // in meters
    const description = current.weather?.[0]?.description || 'Unknown';
    const rainChance = Math.round((today.pop || 0) * 100);
    const uvIndex = Math.round(current.uvi || today.uvi || 0);
    
    // Find rain periods
    const rainPeriods = findRainPeriods(hourly);
    
    // Calculate tonight's SkyScore
    const skyScore = calculateTonightSkyScore(weatherData);
    
    // Calculate outdoor score (simplified)
    const outdoorScore = calculateOutdoorScore(weatherData);
    
    // Generate tip
    const tip = generateTip(weatherData, rainPeriods, skyScore, warnings);
    
    // Build message
    const message = buildForecastMessage({
        locationName,
        tempNow,
        tempMin,
        tempMax,
        feelsLike,
        feelsLikeMin,
        feelsLikeMax,
        description,
        rainChance,
        rainPeriods,
        windSpeed,
        windGust,
        windDir,
        humidity,
        clouds,
        visibility,
        uvIndex,
        skyScore,
        outdoorScore,
        tip,
        sunrise: today.sunrise,
        sunset: today.sunset,
        warnings
    });
    
    return {
        message,
        summary: {
            tempMin,
            tempMax,
            feelsLike,
            rainChance,
            windSpeed,
            windGust,
            visibility,
            outdoorScore: outdoorScore.score,
            skyScore: skyScore.score,
            description,
            warningCount: warnings.length,
            highestWarning: getHighestSeverity(warnings)
        }
    };
}

/**
 * Build the forecast message
 */
function buildForecastMessage(data) {
    const {
        locationName, tempNow, tempMin, tempMax, feelsLike, feelsLikeMin, feelsLikeMax,
        description, rainChance, rainPeriods, windSpeed, windGust, windDir,
        humidity, clouds, visibility, uvIndex, skyScore, outdoorScore, tip, 
        sunrise, sunset, warnings
    } = data;
    
    const lines = [];
    
    // Greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    // Header
    lines.push(`☀️ *${greeting}! Here's today in ${locationName}*`);
    lines.push('');
    
    // Weather warnings at the top if any
    if (warnings && warnings.length > 0) {
        const warningsText = formatWarningsForMessage(warnings);
        if (warningsText) {
            lines.push(warningsText);
            lines.push('');
        }
    }
    
    // Temperature section
    lines.push('🌡️ *Temperature*');
    lines.push(`   ${tempMin}°C → ${tempMax}°C (now ${tempNow}°C)`);
    
    // Feels like - show range if significantly different
    const feelsLikeDiff = Math.abs(feelsLike - tempNow);
    if (feelsLikeDiff >= 3) {
        lines.push(`   Feels like ${feelsLike}°C`);
    }
    lines.push('');
    
    // Weather description
    const weatherEmoji = getWeatherEmoji(description, clouds, rainChance);
    lines.push(`${weatherEmoji} *${capitalise(description)}*`);
    
    // Rain info
    if (rainChance > 20) {
        lines.push(`🌧️ ${rainChance}% chance of rain`);
        if (rainPeriods.length > 0) {
            lines.push(`   ${rainPeriods.join(', ')}`);
        }
    }
    lines.push('');
    
    // Wind section
    lines.push('💨 *Wind*');
    if (windGust && windGust > windSpeed + 10) {
        lines.push(`   ${windSpeed} km/h ${windDir} (gusts ${windGust} km/h)`);
    } else {
        lines.push(`   ${windSpeed} km/h ${windDir}`);
    }
    
    // Wind warning indicator
    if (windGust && windGust >= 70) {
        lines.push('   ⚠️ _Strong gusts - take care outdoors_');
    } else if (windGust && windGust >= 50) {
        lines.push('   ⚠️ _Gusty conditions_');
    }
    lines.push('');
    
    // Visibility
    if (visibility) {
        const visKm = (visibility / 1000).toFixed(1);
        let visDesc;
        if (visibility >= 10000) {
            visDesc = 'Excellent';
        } else if (visibility >= 5000) {
            visDesc = 'Good';
        } else if (visibility >= 2000) {
            visDesc = 'Moderate';
        } else if (visibility >= 1000) {
            visDesc = 'Poor';
        } else {
            visDesc = 'Very poor';
        }
        lines.push(`👁️ Visibility: ${visKm} km (${visDesc})`);
    }
    
    // Humidity if notable
    if (humidity >= 85) {
        lines.push(`💧 Humidity: ${humidity}% (very humid)`);
    } else if (humidity <= 30) {
        lines.push(`💧 Humidity: ${humidity}% (dry)`);
    }
    
    // UV Index if significant
    if (uvIndex >= 6) {
        lines.push(`☀️ UV Index: ${uvIndex} (High - wear sunscreen)`);
    } else if (uvIndex >= 3) {
        lines.push(`☀️ UV Index: ${uvIndex} (Moderate)`);
    }
    lines.push('');
    
    // Sunrise/Sunset
    if (sunrise && sunset) {
        const sunriseTime = formatTime(sunrise);
        const sunsetTime = formatTime(sunset);
        const dayLength = Math.round((sunset - sunrise) / 3600);
        const dayMins = Math.round(((sunset - sunrise) % 3600) / 60);
        lines.push(`🌅 Sunrise ${sunriseTime} · Sunset ${sunsetTime}`);
        lines.push(`   (${dayLength}h ${dayMins}m daylight)`);
    }
    lines.push('');
    
    // Today's scores
    lines.push('📊 *Activity Scores:*');
    const outdoorEmoji = outdoorScore.score >= 70 ? '✅' : outdoorScore.score >= 50 ? '⚠️' : '❌';
    const skyEmoji = skyScore.score >= 70 ? '✅' : skyScore.score >= 50 ? '⚠️' : '❌';
    lines.push(`   ${outdoorEmoji} Outdoor: ${outdoorScore.score}/100 (${outdoorScore.rating})`);
    lines.push(`   ${skyEmoji} Stargazing tonight: ${skyScore.score}/100 (${skyScore.rating})`);
    lines.push('');
    
    // Tip
    if (tip) {
        lines.push(`💡 _${tip}_`);
    }
    
    return lines.join('\n');
}

/**
 * Calculate tonight's SkyScore using existing module
 */
function calculateTonightSkyScore(weatherData) {
    const current = weatherData.current || {};
    const daily = weatherData.daily?.[0] || {};
    
    // Use evening/night forecast if available, otherwise current
    const tonightHour = weatherData.hourly?.find(h => {
        const hour = new Date(h.dt * 1000).getHours();
        return hour >= 21 || hour <= 2;
    }) || current;
    
    const weather = {
        clouds: tonightHour.clouds ?? current.clouds ?? 50,
        humidity: tonightHour.humidity ?? current.humidity ?? 70,
        visibility: current.visibility ?? 10000,
        windSpeed: tonightHour.wind_speed ?? current.wind_speed ?? 5
    };
    
    const moonData = {
        phase: daily.moon_phase ?? 0.5
    };
    
    const result = calculateSkyScore(weather, moonData);
    
    return {
        score: result.score,
        rating: result.rating
    };
}

/**
 * Calculate outdoor activity score (simplified)
 */
function calculateOutdoorScore(weatherData) {
    const current = weatherData.current || {};
    const today = weatherData.daily?.[0] || {};
    
    let score = 100;
    let reasons = [];
    
    // Temperature factor (ideal: 15-22°C)
    const temp = current.temp ?? 15;
    if (temp < 5) {
        score -= 30;
        reasons.push('cold');
    } else if (temp < 10) {
        score -= 15;
    } else if (temp > 28) {
        score -= 20;
        reasons.push('hot');
    } else if (temp > 25) {
        score -= 10;
    }
    
    // Rain factor
    const rainChance = (today.pop || 0) * 100;
    if (rainChance > 70) {
        score -= 35;
        reasons.push('likely rain');
    } else if (rainChance > 40) {
        score -= 20;
    } else if (rainChance > 20) {
        score -= 10;
    }
    
    // Wind factor
    const windSpeed = (current.wind_speed ?? 0) * 3.6;
    if (windSpeed > 40) {
        score -= 30;
        reasons.push('very windy');
    } else if (windSpeed > 25) {
        score -= 15;
    } else if (windSpeed > 15) {
        score -= 5;
    }
    
    // Cloud factor (minor impact)
    const clouds = current.clouds ?? 50;
    if (clouds > 90) {
        score -= 5;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    let rating;
    if (score >= 80) rating = 'Excellent';
    else if (score >= 65) rating = 'Good';
    else if (score >= 50) rating = 'Fair';
    else if (score >= 35) rating = 'Poor';
    else rating = 'Bad';
    
    return { score, rating, reasons };
}

/**
 * Find rain periods from hourly forecast
 */
function findRainPeriods(hourly) {
    const periods = [];
    let rainStart = null;
    
    for (const hour of hourly.slice(0, 24)) {
        const time = new Date(hour.dt * 1000);
        const hasRain = hour.pop > 0.3 || hour.rain?.['1h'] > 0;
        
        if (hasRain && !rainStart) {
            rainStart = time;
        } else if (!hasRain && rainStart) {
            periods.push(`${formatHour(rainStart)}-${formatHour(time)}`);
            rainStart = null;
        }
    }
    
    if (rainStart) {
        periods.push(`from ${formatHour(rainStart)}`);
    }
    
    return periods.slice(0, 2); // Max 2 periods
}

/**
 * Generate a helpful tip
 */
function generateTip(weatherData, rainPeriods, skyScore, warnings) {
    const current = weatherData.current || {};
    const hourly = weatherData.hourly || [];
    
    // Weather warning takes priority
    if (warnings && warnings.length > 0) {
        const highest = warnings.reduce((max, w) => 
            (w.severityLevel || 0) > (max.severityLevel || 0) ? w : max
        );
        if (highest.severityLevel >= 3) { // Orange or Red
            return `${highest.severityName} warning in effect - check warnings above and plan accordingly.`;
        }
    }
    
    // Check if rain clears later
    if (rainPeriods.length > 0) {
        const eveningHours = hourly.filter(h => {
            const hour = new Date(h.dt * 1000).getHours();
            return hour >= 17 && hour <= 21;
        });
        const eveningClear = eveningHours.every(h => (h.pop || 0) < 0.3);
        if (eveningClear) {
            return 'Rain clears by evening - good for after-work activities!';
        }
    }
    
    // Good stargazing tonight
    if (skyScore.score >= 70) {
        return 'Clear skies tonight - great for stargazing!';
    }
    
    // Strong wind warning
    const windGust = current.wind_gust ? current.wind_gust * 3.6 : 0;
    if (windGust > 60) {
        return 'Strong gusts expected - secure loose items and take care on exposed routes.';
    }
    
    // Cold warning
    if ((current.temp ?? 15) < 5) {
        return 'Dress warmly - it\'s cold out there!';
    }
    
    // Hot day
    if ((current.temp ?? 15) > 25) {
        return 'Stay hydrated and seek shade during midday.';
    }
    
    // Low visibility
    if ((current.visibility ?? 10000) < 2000) {
        return 'Reduced visibility - take extra care if driving.';
    }
    
    // Default
    return null;
}

// ============================================
// Batch processor
// ============================================
async function processAllUsersForDailyForecast(context, force = false) {
    const connectionString = process.env.AzureWebJobsStorage;
    
    const results = {
        processed: 0,
        sent: 0,
        skipped: 0,
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
        
        context.log('Querying users with telegramEnabled=true');
        
        const users = prefsClient.listEntities({
            queryOptions: { filter: "telegramEnabled eq true" }
        });
        
        for await (const user of users) {
            // Check if daily forecast enabled
            const dailyForecastEnabled = user.alertDailyForecast === true ||
                user.alertTypes?.dailyForecast === true ||
                (user.preferencesJson && JSON.parse(user.preferencesJson)?.alertTypes?.dailyForecast === true);
            
            if (!dailyForecastEnabled && !force) {
                context.log(`User ${user.rowKey}: daily forecast not enabled - skipping`);
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
                results.users.push({ userId, status: 'no_chatId' });
                continue;
            }
            
            try {
                const forecast = await generateDailyForecast(lat, lon, locationName, context);
                const sent = await sendTelegramMessage(chatId, forecast.message);
                
                if (sent) {
                    results.sent++;
                    results.users.push({ userId, status: 'sent' });
                } else {
                    results.errors.push({ userId, error: 'Telegram send failed' });
                }
            } catch (err) {
                context.error(`Error for user ${userId}:`, err.message);
                results.errors.push({ userId, error: err.message });
            }
        }
        
        context.log(`Batch complete: ${results.processed} processed, ${results.sent} sent`);
        
    } catch (error) {
        context.error('Error querying users:', error);
        results.errors.push({ error: error.message });
    }
    
    return results;
}

// ============================================
// Helpers
// ============================================
async function fetchWeatherData(lat, lon, context) {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        context.error('OPENWEATHER_API_KEY not configured');
        return null;
    }
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            context.error(`Weather API error: ${response.status}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        context.error('Weather fetch error:', error.message);
        return null;
    }
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

function getWindDirection(degrees) {
    if (degrees == null) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(degrees / 45) % 8];
}

function getWeatherEmoji(description, clouds, rainChance) {
    const desc = description.toLowerCase();
    if (desc.includes('thunder')) return '⛈️';
    if (desc.includes('rain') || desc.includes('drizzle')) return '🌧️';
    if (desc.includes('snow')) return '🌨️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    if (rainChance > 50) return '🌦️';
    if (clouds > 80) return '☁️';
    if (clouds > 40) return '⛅';
    return '☀️';
}

function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-IE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function formatHour(date) {
    return date.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
    generateDailyForecast,
    buildForecastMessage,
    calculateOutdoorScore
};