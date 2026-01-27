/**
 * AI Narrator Module
 * 
 * Generates natural language responses from structured score data.
 * Uses Azure OpenAI GPT-4o-mini as the language model.
 * 
 * CRITICAL PRINCIPLE:
 * ==================
 * The AI NEVER generates weather data or forecasts!
 * It ONLY narrates/explains pre-computed results from the scoring engine.
 * 
 * This prevents hallucination of weather information.
 */

const axios = require('axios');

// =====================================================
// AZURE OPENAI CONFIGURATION
// =====================================================

const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
};

// =====================================================
// SYSTEM PROMPTS
// =====================================================

const SYSTEM_PROMPTS = {
    // For score-based responses (sky, aurora, outdoor, swimming)
    scoreResponse: `You are a friendly WhatsApp weather assistant for outdoor activities.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. You MUST ONLY use the data provided in the DATA section
2. NEVER invent, estimate, or hallucinate weather values, times, or conditions
3. NEVER say "I think" or guess about weather - only state what's in the data
4. Keep responses short (3-5 lines max) - this is WhatsApp
5. Be friendly but concise
6. Lead with the decision (good/not good/maybe)
7. Include the time window if one exists
8. Give 2-3 key reasons from the data

FORMAT:
Line 1: Clear yes/no/maybe recommendation
Line 2: Best time window (if available)
Line 3-4: Key reasons from the data
Line 5 (optional): Brief helpful tip

DO NOT:
- Use emojis excessively (1-2 max)
- Mention scores/numbers unless asked
- Make up any weather data not provided
- Be overly verbose`,

    // For comparing locations
    comparison: `You are comparing weather conditions across multiple locations.

RULES:
1. ONLY use the provided data for each location
2. Clearly state which location is best and why
3. Keep it brief (3-4 lines)
4. Don't invent any data

FORMAT:
Line 1: Best location name
Line 2-3: Why it's best (from the data)`,

    // For weather summaries
    weatherSummary: `You are summarizing current weather conditions.

RULES:
1. ONLY report the data provided
2. Be concise and friendly
3. Mention temperature, conditions, and any notable factors
4. Keep to 2-3 lines`,

    // For error/unknown cases
    clarification: `The user's request wasn't clear. Ask a brief clarifying question and suggest what you can help with:
- Stargazing conditions
- Aurora/northern lights
- Outdoor activities (hiking, cycling)
- Swimming conditions
- Weather forecast

Keep it to 2-3 lines.`
};

// =====================================================
// MAIN GENERATION FUNCTION
// =====================================================

/**
 * Generate a natural language response from structured data
 * 
 * @param {string} intent - The detected intent type
 * @param {Object} data - Structured data from scoring APIs
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated response
 */
async function generateResponse(intent, data, options = {}) {
    const { userMessage = '', userName = '' } = options;

    // Check if AI is configured
    if (!config.endpoint || !config.apiKey) {
        console.warn('Azure OpenAI not configured, using fallback response');
        return generateFallbackResponse(intent, data);
    }

    try {
        // Select appropriate system prompt
        const systemPrompt = getSystemPrompt(intent);
        
        // Build user prompt with structured data
        const userPrompt = buildUserPrompt(intent, data, userMessage);

        // Call Azure OpenAI
        const response = await callAzureOpenAI(systemPrompt, userPrompt);
        
        return response;

    } catch (error) {
        console.error('AI generation failed:', error.message);
        return generateFallbackResponse(intent, data);
    }
}

/**
 * Get the appropriate system prompt for an intent
 */
function getSystemPrompt(intent) {
    switch (intent) {
        case 'sky_score':
        case 'aurora_score':
        case 'outdoor_score':
        case 'swimming_score':
            return SYSTEM_PROMPTS.scoreResponse;
        case 'best_location':
            return SYSTEM_PROMPTS.comparison;
        case 'weather_now':
        case 'weather_forecast':
            return SYSTEM_PROMPTS.weatherSummary;
        default:
            return SYSTEM_PROMPTS.clarification;
    }
}

/**
 * Build the user prompt with structured data
 */
function buildUserPrompt(intent, data, userMessage) {
    let prompt = '';

    if (userMessage) {
        prompt += `USER ASKED: "${userMessage}"\n\n`;
    }

    prompt += `INTENT: ${intent}\n\n`;
    
    prompt += `DATA (use ONLY this information - do NOT add anything else):\n`;
    prompt += '```json\n';
    prompt += JSON.stringify(data, null, 2);
    prompt += '\n```\n\n';

    prompt += 'Generate a helpful, concise WhatsApp response based ONLY on the data above.';

    return prompt;
}

// =====================================================
// AZURE OPENAI API CALL
// =====================================================

/**
 * Call Azure OpenAI Chat Completion API
 */
async function callAzureOpenAI(systemPrompt, userPrompt) {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    const response = await axios.post(url, {
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.7,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0.3
    }, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        },
        timeout: 15000
    });

    const content = response.data.choices[0]?.message?.content;
    
    if (!content) {
        throw new Error('Empty response from Azure OpenAI');
    }

    // Log token usage for cost tracking
    const usage = response.data.usage;
    if (usage) {
        console.log(`AI tokens used: ${usage.total_tokens} (prompt: ${usage.prompt_tokens}, completion: ${usage.completion_tokens})`);
    }

    return content.trim();
}

// =====================================================
// FALLBACK RESPONSES (No AI)
// =====================================================

/**
 * Generate response without AI when not available
 */
function generateFallbackResponse(intent, data) {
    switch (intent) {
        case 'sky_score':
            return formatSkyResponse(data);
        case 'aurora_score':
            return formatAuroraResponse(data);
        case 'outdoor_score':
            return formatOutdoorResponse(data);
        case 'swimming_score':
            return formatSwimmingResponse(data);
        case 'weather_now':
            return formatWeatherResponse(data);
        case 'best_location':
            return formatBestLocationResponse(data);
        default:
            return "I'm not sure how to help with that. Try asking about stargazing, aurora, outdoor activities, or swimming conditions!";
    }
}

/**
 * Format sky score response
 */
function formatSkyResponse(data) {
    if (!data?.current) return "Couldn't get sky conditions. Try again!";

    const { score, rating, reasons = [] } = data.current;
    const location = data.location?.name || 'your location';
    
    let response = '';
    
    // Decision
    if (score >= 70) {
        response = `✨ Good for stargazing in ${location}!\n`;
    } else if (score >= 50) {
        response = `⭐ Fair conditions in ${location}.\n`;
    } else {
        response = `☁️ Not ideal for stargazing in ${location}.\n`;
    }
    
    // Time window
    if (data.bestWindow) {
        const start = formatTime(data.bestWindow.start);
        const end = formatTime(data.bestWindow.end);
        response += `Best window: ${start} - ${end}\n`;
    }
    
    // Reasons
    if (reasons.length > 0) {
        response += reasons.slice(0, 2).join('. ') + '.';
    }
    
    return response;
}

/**
 * Format aurora response
 */
function formatAuroraResponse(data) {
    if (!data?.current) return "Couldn't get aurora conditions. Try again!";

    const { score, rating } = data.current;
    const kp = data.kpIndex?.current;
    const needed = data.kpIndex?.minNeededForLatitude;
    
    let response = '';
    
    if (score >= 70) {
        response = `🌌 Aurora possible tonight! Kp is ${kp}.\n`;
    } else if (kp >= needed) {
        response = `🌌 Kp is ${kp} - aurora possible if skies clear.\n`;
    } else {
        response = `Aurora unlikely. Kp is ${kp}, need ${needed}+ for your latitude.\n`;
    }
    
    // Add reasons
    if (data.current.reasons?.length > 0) {
        response += data.current.reasons.slice(0, 2).join('. ') + '.';
    }
    
    return response;
}

/**
 * Format outdoor response
 */
function formatOutdoorResponse(data) {
    if (!data?.current) return "Couldn't get outdoor conditions. Try again!";

    const { score, rating, reasons = [] } = data.current;
    const activity = data.activity || 'outdoor activities';
    
    let response = '';
    
    if (score >= 70) {
        response = `👍 ${rating} for ${activity}!\n`;
    } else if (score >= 50) {
        response = `🤔 Fair conditions for ${activity}.\n`;
    } else {
        response = `👎 Not great for ${activity} today.\n`;
    }
    
    // Conditions summary
    if (data.conditions) {
        response += `${data.conditions.temperature}°C`;
        if (data.conditions.precipProbability > 20) {
            response += `, ${data.conditions.precipProbability}% rain`;
        }
        response += `, ${data.conditions.windSpeed}km/h wind\n`;
    }
    
    // Best window
    if (data.bestWindow) {
        const start = formatTime(data.bestWindow.start);
        const end = formatTime(data.bestWindow.end);
        response += `Best: ${start} - ${end}`;
    }
    
    return response;
}

/**
 * Format swimming response
 */
function formatSwimmingResponse(data) {
    if (!data?.current) return "Couldn't get swimming conditions. Try again!";

    const { score, rating } = data.current;
    const waterTemp = data.conditions?.waterTemp?.value;
    const seaState = data.conditions?.sea?.state;
    
    let response = '';
    
    if (score >= 65) {
        response = `🏊 ${rating} for swimming!\n`;
    } else if (score >= 45) {
        response = `🤔 Swimming possible but not ideal.\n`;
    } else {
        response = `❌ Not recommended for swimming.\n`;
    }
    
    // Water conditions
    if (waterTemp) {
        response += `Water: ${waterTemp}°C`;
        if (seaState) response += ` (${seaState})`;
        response += '\n';
    }
    
    // Duration recommendation
    if (data.current.swimDuration) {
        response += `Suggested swim: ${data.current.swimDuration}`;
    }
    
    // Warnings
    if (data.warnings?.length > 0) {
        response += `\n⚠️ ${data.warnings[0]}`;
    }
    
    return response;
}

/**
 * Format weather response
 */
function formatWeatherResponse(data) {
    if (!data?.conditions) return "Couldn't get weather data. Try again!";

    const { temperature, feelsLike, humidity, windSpeed, weather } = data.conditions;
    const location = data.location?.name || 'your location';
    
    let response = `Weather in ${location}:\n`;
    response += `🌡️ ${temperature}°C (feels like ${feelsLike}°C)\n`;
    response += `💨 Wind: ${windSpeed} km/h\n`;
    if (weather) response += `${weather}`;
    
    return response;
}

/**
 * Format best location response
 */
function formatBestLocationResponse(data) {
    if (!data?.locations?.length) {
        return "You don't have any saved locations. Add some first!";
    }

    // Find best score
    const best = data.locations.reduce((a, b) => 
        (a.score || 0) > (b.score || 0) ? a : b
    );
    
    return `🏆 Best: ${best.name}\n${best.rating} (${best.score}/100)`;
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Format ISO datetime to readable time
 */
function formatTime(datetime) {
    if (!datetime) return '';
    try {
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-IE', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    } catch {
        return '';
    }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    generateResponse,
    generateFallbackResponse,
    callAzureOpenAI,
    SYSTEM_PROMPTS,
    config
};