/**
 * GetAIForecast - AI-powered weather briefing endpoint
 * 
 * Takes existing weather + forecast data from the frontend and sends it
 * to Azure OpenAI to generate a natural language briefing.
 * 
 * CRITICAL PRINCIPLE (same as AINarrator.js):
 * The AI NEVER generates weather data. It ONLY narrates/explains
 * pre-fetched data from OpenWeather. This prevents hallucination.
 * 
 * STYLE:
 * The output reads like a knowledgeable friend telling you what
 * the weather's doing — informal, practical, conversational.
 * Not a formal bulletin, more like someone who checks the weather
 * obsessively giving you the rundown.
 * 
 * Flow:
 *   Frontend sends weather data → This function formats a prompt →
 *   Azure OpenAI generates briefing → Returns to frontend
 * 
 * Caching:
 *   Responses are cached for 60 minutes per location to avoid
 *   excessive API calls (and costs) on dashboard refreshes.
 */

const { app } = require('@azure/functions');
const axios = require('axios');

// =====================================================
// AZURE OPENAI CONFIGURATION
// Reuses the same env vars as AINarrator.js
// =====================================================

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
};

// =====================================================
// IN-MEMORY CACHE
// Prevents repeated OpenAI calls on dashboard refreshes.
// Cache key = lat/lon rounded to 2 decimals (city-level).
// =====================================================

const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const cache = new Map();

function getCacheKey(lat, lon) {
    return `ai_forecast_${parseFloat(lat).toFixed(2)}_${parseFloat(lon).toFixed(2)}`;
}

function getCachedResponse(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
        return cached;
    }
    cache.delete(key);
    return null;
}

// =====================================================
// SYSTEM PROMPT (built dynamically per request)
// 
// Injected with the current hour so the AI knows what
// part of the day we're in. The tone is conversational
// — like a weather-savvy friend, not a news anchor.
// =====================================================

// The system prompt is built dynamically so we can inject the
// current time. This makes the AI speak from NOW — like a real
// forecaster would if you asked them "what's the weather like?"
function buildSystemPrompt(currentHour) {
    // Determine what part of the day we're in so the AI 
    // knows what's past, what's now, and what's ahead
    let timeContext;
    if (currentHour < 6) {
        timeContext = "It's the early hours. Focus on what the rest of the night holds and how the coming morning will shape up, then tomorrow.";
    } else if (currentHour < 10) {
        timeContext = "It's morning. Set the scene with current conditions, then cover how the rest of the day develops into evening, and briefly touch on tomorrow.";
    } else if (currentHour < 14) {
        timeContext = "It's midday. Briefly acknowledge the morning that's passed, focus on this afternoon and evening ahead, and give a tomorrow outlook.";
    } else if (currentHour < 18) {
        timeContext = "It's the afternoon. Don't describe the morning — it's gone. Start with how things are right now, cover this evening, tonight, and then tomorrow.";
    } else if (currentHour < 21) {
        timeContext = "It's the evening. Don't talk about today's daytime weather — it's over. Focus on how the rest of this evening goes, what tonight and overnight looks like, and then give a fuller outlook for tomorrow.";
    } else {
        timeContext = "It's late evening/night. Focus on overnight conditions, then give a full outlook for tomorrow as the main event.";
    }

    return `You're a weather-savvy friend giving someone a quick, useful rundown of what's happening outside and what's coming. Conversational and natural — like you're just telling someone what to expect, not reading a formal bulletin.

TIME AWARENESS — THIS IS CRITICAL:
${timeContext}
The data includes timestamps marking hours as PAST or UPCOMING. Only forecast UPCOMING hours. You can briefly nod to earlier conditions for context ("it's been pretty grey all day" or "after that rain this morning") but don't forecast what's already happened. Speak from right now, looking forward.

VOICE & STYLE:
- Relaxed, natural, like telling a friend — not a formal broadcast
- "It's about 12 degrees out there and fairly breezy" not "Temperatures of 12°C with moderate winds"
- Keep it practical — what should someone actually expect if they step outside?
- You can use "you" and speak directly: "you'll want a jacket this evening", "not a bad afternoon for a walk"
- Flowing sentences and short paragraphs, not bullet points
- Use plain language but still be specific with numbers — weave them in naturally
- A touch of personality is fine — "not the worst evening for February" or "a fairly miserable start"
- Keep it to 3-4 short paragraphs (roughly 100-150 words total)

CRITICAL RULES:
1. ONLY use the data provided — NEVER invent, estimate, or hallucinate values
2. If data is missing, skip it — don't guess
3. Use °C for temperature, km/h for wind
4. Round to whole numbers
5. No emojis, no markdown formatting
6. Don't start with "Good morning" or any greeting — just get into it
7. Don't reference "the data" or that you're reading anything — just talk naturally
8. NEVER forecast past hours — only look forward from right now`;
}

// =====================================================
// MAIN HANDLER
// =====================================================

app.http('GetAIForecast', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'ai-forecast',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const { current, hourly, daily, location } = body;

            if (!current || !hourly || !daily) {
                return {
                    status: 400,
                    jsonBody: { error: 'Missing required weather data (current, hourly, daily)' }
                };
            }

            const lat = location?.lat || 0;
            const lon = location?.lon || 0;
            const forceRefresh = body.forceRefresh === true;

            // Check cache first (unless force refresh)
            const cacheKey = getCacheKey(lat, lon);
            if (!forceRefresh) {
                const cached = getCachedResponse(cacheKey);
                if (cached) {
                    context.log('[AI Forecast] Returning cached response');
                    return {
                        status: 200,
                        jsonBody: {
                            briefing: cached.briefing,
                            generatedAt: cached.generatedAt,
                            cached: true,
                            expiresAt: new Date(cached.timestamp + CACHE_DURATION_MS).toISOString()
                        }
                    };
                }
            }

            // Check if Azure OpenAI is configured
            if (!config.endpoint || !config.apiKey) {
                context.warn('[AI Forecast] Azure OpenAI not configured, using fallback');
                const fallback = generateFallbackBriefing(current, hourly, daily);
                return {
                    status: 200,
                    jsonBody: {
                        briefing: fallback,
                        generatedAt: new Date().toISOString(),
                        cached: false,
                        fallback: true
                    }
                };
            }

            // Build the data prompt
            const userPrompt = buildDataPrompt(current, hourly, daily);

            // Build time-aware system prompt
            const currentHour = new Date().getHours();
            const systemPrompt = buildSystemPrompt(currentHour);

            // Call Azure OpenAI
            context.log(`[AI Forecast] Calling Azure OpenAI (hour: ${currentHour})...`);
            const briefing = await callAzureOpenAI(systemPrompt, userPrompt, context);

            // Cache the successful response
            const generatedAt = new Date().toISOString();
            cache.set(cacheKey, {
                briefing,
                generatedAt,
                timestamp: Date.now()
            });

            return {
                status: 200,
                jsonBody: {
                    briefing,
                    generatedAt,
                    cached: false
                }
            };

        } catch (error) {
            context.error('[AI Forecast] Error:', error.message);

            try {
                const body = await request.clone().json().catch(() => ({}));
                if (body.current && body.hourly && body.daily) {
                    const fallback = generateFallbackBriefing(body.current, body.hourly, body.daily);
                    return {
                        status: 200,
                        jsonBody: {
                            briefing: fallback,
                            generatedAt: new Date().toISOString(),
                            cached: false,
                            fallback: true
                        }
                    };
                }
            } catch (e) { /* fallback failed too */ }

            return {
                status: 500,
                jsonBody: { error: 'Failed to generate AI briefing' }
            };
        }
    }
});

// =====================================================
// BUILD DATA PROMPT
// 
// Think of this as handing the forecaster their data 
// sheet — they then write the bulletin from it.
// We sample hourly data every 3 hours to keep token 
// usage (and cost) down.
// =====================================================

function buildDataPrompt(current, hourly, daily) {
    const now = new Date();
    const currentHour = now.getHours();

    let prompt = `WEATHER DATA FOR BRIEFING\n`;
    prompt += `Right now: ${now.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at ${now.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })}\n\n`;

    prompt += `CURRENT CONDITIONS:\n`;
    prompt += `- Temperature: ${Math.round(current.temp)}°C (feels like ${Math.round(current.feelsLike)}°C)\n`;
    prompt += `- Conditions: ${current.description}\n`;
    prompt += `- Humidity: ${current.humidity}%\n`;
    prompt += `- Wind: ${Math.round(current.windSpeed)} km/h`;
    if (current.windGust) prompt += ` (gusts ${Math.round(current.windGust)} km/h)`;
    prompt += `\n`;
    prompt += `- Cloud cover: ${current.clouds}%\n`;
    if (current.uvi !== undefined) prompt += `- UV Index: ${current.uvi}\n`;
    prompt += `\n`;

    // Hourly forecast — mark each hour as PAST or UPCOMING
    // so the AI knows what's already happened vs what's ahead
    prompt += `HOURLY FORECAST (next 24h):\n`;
    const relevantHours = hourly.slice(0, 24).filter((_, i) => i % 3 === 0 || i === 0);
    relevantHours.forEach(h => {
        const time = new Date(h.time || h.dt);
        const hourOfDay = time.getHours();
        const isPast = time < now;
        const marker = isPast ? '[PAST]' : '[UPCOMING]';
        const hour = time.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false });
        prompt += `- ${hour} ${marker}: ${Math.round(h.temp)}°C, ${h.description || h.condition}, `;
        prompt += `rain ${Math.round((h.pop || 0) * 100)}%, `;
        prompt += `wind ${Math.round(h.windSpeed)} km/h`;
        if (h.rain > 0) prompt += `, rain ${h.rain}mm`;
        prompt += `\n`;
    });
    prompt += `\n`;

    // Today
    prompt += `TODAY:\n`;
    if (daily[0]) {
        const today = daily[0];
        prompt += `- High: ${Math.round(today.tempHigh || today.tempMax)}°C, Low: ${Math.round(today.tempLow || today.tempMin)}°C\n`;
        prompt += `- Conditions: ${today.description || today.condition}\n`;
        prompt += `- Rain chance: ${Math.round((today.pop || 0) * 100)}%\n`;
        prompt += `- Wind: ${Math.round(today.windSpeed)} km/h\n`;
        if (today.uvi !== undefined) prompt += `- UV Index: ${today.uvi}\n`;
        if (today.sunrise) prompt += `- Sunrise: ${new Date(today.sunrise).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })}\n`;
        if (today.sunset) prompt += `- Sunset: ${new Date(today.sunset).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit', hour12: false })}\n`;
    }
    prompt += `\n`;

    // Tomorrow
    prompt += `TOMORROW:\n`;
    if (daily[1]) {
        const tomorrow = daily[1];
        prompt += `- High: ${Math.round(tomorrow.tempHigh || tomorrow.tempMax)}°C, Low: ${Math.round(tomorrow.tempLow || tomorrow.tempMin)}°C\n`;
        prompt += `- Conditions: ${tomorrow.description || tomorrow.condition}\n`;
        prompt += `- Rain chance: ${Math.round((tomorrow.pop || 0) * 100)}%\n`;
        prompt += `- Wind: ${Math.round(tomorrow.windSpeed)} km/h\n`;
        if (tomorrow.uvi !== undefined) prompt += `- UV Index: ${tomorrow.uvi}\n`;
    }
    prompt += `\n`;

    // Day after for broader context
    if (daily[2]) {
        prompt += `DAY AFTER TOMORROW (${new Date(daily[2].date || daily[2].dt).toLocaleDateString('en-IE', { weekday: 'long' })}):\n`;
        prompt += `- High: ${Math.round(daily[2].tempHigh || daily[2].tempMax)}°C, Low: ${Math.round(daily[2].tempLow || daily[2].tempMin)}°C\n`;
        prompt += `- Conditions: ${daily[2].description || daily[2].condition}\n`;
    }

    prompt += `\nWrite the forecast briefing using ONLY the data above. Do not invent any values.`;

    return prompt;
}

// =====================================================
// AZURE OPENAI API CALL
// =====================================================

async function callAzureOpenAI(systemPrompt, userPrompt, context) {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    // Diagnostic logging — remove once working
    context.log(`[AI Forecast] Endpoint: ${config.endpoint}`);
    context.log(`[AI Forecast] Deployment: ${config.deployment}`);
    context.log(`[AI Forecast] API Version: ${config.apiVersion}`);
    context.log(`[AI Forecast] Full URL: ${url}`);

    const response = await axios.post(url, {
        messages: [
            { role: 'developer', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
    }, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        },
        timeout: 30000  // 30s timeout — reasoning models take longer
    });

    const content = response.data.choices[0]?.message?.content;

    // Diagnostic logging — see full response structure from o4-mini
    context.log(`[AI Forecast] Response keys: ${JSON.stringify(Object.keys(response.data))}`);
    context.log(`[AI Forecast] Choices[0] keys: ${JSON.stringify(Object.keys(response.data.choices[0] || {}))}`);
    context.log(`[AI Forecast] Message keys: ${JSON.stringify(Object.keys(response.data.choices[0]?.message || {}))}`);
    context.log(`[AI Forecast] Content type: ${typeof content}, length: ${content?.length || 0}`);
    context.log(`[AI Forecast] Raw message: ${JSON.stringify(response.data.choices[0]?.message).substring(0, 500)}`);
    context.log(`[AI Forecast] Finish reason: ${response.data.choices[0]?.finish_reason}`);
    context.log(`[AI Forecast] Content filter: ${JSON.stringify(response.data.choices[0]?.content_filter_results)}`);
    context.log(`[AI Forecast] Prompt filter: ${JSON.stringify(response.data.prompt_filter_results)}`);
    if (response.data.usage) {
        context.log(`[AI Forecast] Usage: ${JSON.stringify(response.data.usage)}`);
    }

    if (!content) {
        throw new Error('Empty response from Azure OpenAI');
    }

    const usage = response.data.usage;
    if (usage) {
        context.log(`[AI Forecast] Tokens: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
    }

    return content.trim();
}

// =====================================================
// FALLBACK BRIEFING (when OpenAI is unavailable)
// 
// Not as polished as the AI version, but written in the
// same casual style so the widget always shows something 
// readable rather than an error state.
// =====================================================

function generateFallbackBriefing(current, hourly, daily) {
    const today = daily[0] || {};
    const tomorrow = daily[1] || {};

    const morning = hourly.find(h => {
        const hour = new Date(h.time || h.dt).getHours();
        return hour >= 8 && hour <= 10;
    });
    const afternoon = hourly.find(h => {
        const hour = new Date(h.time || h.dt).getHours();
        return hour >= 13 && hour <= 15;
    });
    const evening = hourly.find(h => {
        const hour = new Date(h.time || h.dt).getHours();
        return hour >= 19 && hour <= 21;
    });

    const parts = [];

    // Paragraph 1: Current and morning
    let p1 = `It's about ${Math.round(current.temp)}°C out there right now with ${current.description}`;
    if (current.feelsLike && Math.abs(current.temp - current.feelsLike) >= 2) {
        p1 += `, though it feels more like ${Math.round(current.feelsLike)}°C with the wind`;
    }
    p1 += '.';
    if (morning && morning.pop > 0.3) {
        p1 += ` Expect some rain this morning — about a ${Math.round(morning.pop * 100)}% chance of showers.`;
    }
    if (current.windSpeed > 25) {
        p1 += ` It's fairly breezy too at ${Math.round(current.windSpeed)} km/h`;
        if (current.windGust > 40) p1 += ` with gusts up to ${Math.round(current.windGust)} km/h`;
        p1 += '.';
    }
    parts.push(p1);

    // Paragraph 2: Afternoon and evening
    const highTemp = Math.round(today.tempHigh || today.tempMax || current.temp);
    let p2 = `Should get up to around ${highTemp}°C this afternoon`;
    if (afternoon) {
        p2 += ` with ${afternoon.description || afternoon.condition}`;
    }
    p2 += '.';
    if (evening) {
        p2 += ` It'll cool off to about ${Math.round(evening.temp)}°C by the evening`;
        if (evening.pop > 0.4) p2 += ` and there's a chance of more rain`;
        p2 += '.';
    }
    parts.push(p2);

    // Paragraph 3: Tomorrow
    if (tomorrow.tempMax || tomorrow.tempHigh) {
        const tmrwHigh = Math.round(tomorrow.tempHigh || tomorrow.tempMax);
        const tmrwLow = Math.round(tomorrow.tempLow || tomorrow.tempMin);
        let p3 = `As for tomorrow, looking at highs around ${tmrwHigh}°C and lows of ${tmrwLow}°C`;
        if (tomorrow.description || tomorrow.condition) {
            p3 += ` with ${tomorrow.description || tomorrow.condition}`;
        }
        p3 += '.';
        if (tomorrow.pop > 0.5) {
            p3 += ` Rain looks pretty likely so you might want to plan around that.`;
        }
        parts.push(p3);
    }

    return parts.join('\n\n');
}