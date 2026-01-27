/**
 * ProcessWhatsAppMessage Azure Function
 * 
 * AI-Powered WhatsApp Chatbot Handler
 * 
 * Uses AI for BOTH:
 * 1. Intent Detection - Understanding what the user wants
 * 2. Response Generation - Creating natural replies
 * 
 * Flow:
 * ┌──────────────────────────────────────────────────────┐
 * │ User: "reckon I could see some stars tonight?"       │
 * └──────────────────────────────────────────────────────┘
 *                          │
 *                          ▼
 * ┌──────────────────────────────────────────────────────┐
 * │ AI Intent Detection (GPT-4o-mini)                    │
 * │ → intent: sky_score                                  │
 * │ → entities: { time: "tonight" }                      │
 * └──────────────────────────────────────────────────────┘
 *                          │
 *                          ▼
 * ┌──────────────────────────────────────────────────────┐
 * │ Call Scoring API: /api/sky-score                     │
 * │ → Get REAL weather data (AI never invents this!)    │
 * └──────────────────────────────────────────────────────┘
 *                          │
 *                          ▼
 * ┌──────────────────────────────────────────────────────┐
 * │ AI Response Generation (GPT-4o-mini)                 │
 * │ → Narrates the data naturally                        │
 * └──────────────────────────────────────────────────────┘
 *                          │
 *                          ▼
 * ┌──────────────────────────────────────────────────────┐
 * │ "Good conditions tonight! Moon sets at 22:15,        │
 * │  then you'll have dark skies until dawn. Cloud       │
 * │  cover should drop to around 20% after midnight."    │
 * └──────────────────────────────────────────────────────┘
 */

const { app } = require('@azure/functions');
const axios = require('axios');

// Import AI-powered modules
const { 
    detectIntentWithAI, 
    getHelpText, 
    getGreetingResponse, 
    getThanksResponse 
} = require('../utils/AIIntentDetector');

const { generateResponse } = require('../utils/AINarrator');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:7071/api';
const DEFAULT_LOCATION = { lat: 53.3498, lon: -6.2603, name: 'Dublin' };

// =====================================================
// MAIN WEBHOOK HANDLER
// =====================================================

app.http('ProcessWhatsAppMessage', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'whatsapp/webhook',
    handler: async (request, context) => {
        const startTime = Date.now();
        
        try {
            // Parse Twilio payload
            const body = await parseFormBody(request);
            const from = body.From || '';
            const messageBody = body.Body || '';
            const phoneNumber = from.replace('whatsapp:', '');

            context.log(`[WhatsApp] From: ${phoneNumber}`);
            context.log(`[WhatsApp] Message: "${messageBody}"`);

            if (!messageBody.trim()) {
                return createTwiMLResponse("I didn't catch that. What would you like to know?");
            }

            // ================================
            // STEP 1: AI INTENT DETECTION
            // ================================
            const intentResult = await detectIntentWithAI(messageBody);
            
            context.log(`[Intent] ${intentResult.intent} (confidence: ${intentResult.confidence})`);
            context.log(`[Entities]`, intentResult.entities);
            if (intentResult.reasoning) {
                context.log(`[Reasoning] ${intentResult.reasoning}`);
            }

            // ================================
            // STEP 2: PROCESS INTENT
            // ================================
            const responseText = await processIntent(
                intentResult,
                phoneNumber,
                messageBody,
                context
            );

            // ================================
            // STEP 3: SEND RESPONSE
            // ================================
            const duration = Date.now() - startTime;
            context.log(`[Response] Generated in ${duration}ms`);

            return createTwiMLResponse(responseText);

        } catch (error) {
            context.error('Webhook error:', error);
            return createTwiMLResponse(
                "Sorry, something went wrong. Please try again!"
            );
        }
    }
});

// =====================================================
// INTENT PROCESSOR
// =====================================================

async function processIntent(intentResult, phoneNumber, userMessage, context) {
    const { intent, confidence, entities } = intentResult;

    // Handle simple intents (no API calls needed)
    switch (intent) {
        case 'greeting':
            return getGreetingResponse();
        
        case 'thanks':
            return getThanksResponse();
        
        case 'help':
            return getHelpText();
        
        case 'settings':
            return getSettingsInfo();
        
        case 'list_locations':
            return await handleListLocations(phoneNumber, context);
        
        case 'add_location':
            return handleAddLocation(entities);
        
        case 'remove_location':
            return handleRemoveLocation(entities);
    }

    // Get user's location (from entities or saved locations)
    const location = await resolveLocation(phoneNumber, entities, context);

    // Handle score-based intents
    switch (intent) {
        case 'sky_score':
            return await handleScoreRequest('sky-score', location, entities, userMessage, context);
        
        case 'aurora_score':
            return await handleScoreRequest('aurora-score', location, entities, userMessage, context);
        
        case 'outdoor_score':
            return await handleScoreRequest('outdoor-score', location, entities, userMessage, context);
        
        case 'swimming_score':
            return await handleScoreRequest('swimming-score', location, entities, userMessage, context);
        
        case 'weather_now':
        case 'weather_forecast':
            return await handleWeather(location, entities, userMessage, intent, context);
        
        case 'best_location':
            return await handleBestLocation(phoneNumber, entities, userMessage, context);
        
        case 'unknown':
        default:
            return handleUnknown(userMessage, confidence);
    }
}

// =====================================================
// SCORE REQUEST HANDLER
// =====================================================

async function handleScoreRequest(endpoint, location, entities, userMessage, context) {
    context.log(`[API] Calling ${endpoint} for ${location.name}`);

    // Build params from entities
    const params = {};
    if (entities.activity) {
        params.activity = entities.activity;
    }
    if (entities.experience) {
        params.experience = entities.experience;
    }

    // Call our scoring API (this is where REAL data comes from)
    const data = await callScoringAPI(endpoint, location, params);
    
    if (!data) {
        return `Sorry, I couldn't get ${endpoint.replace('-score', '')} conditions right now. Try again in a moment!`;
    }

    // Add location info
    data.location = { name: location.name };
    
    // Add time context if user mentioned it
    if (entities.time) {
        data.timeContext = entities.time;
    }

    // Map endpoint to intent name for narrator
    const intentMap = {
        'sky-score': 'sky_score',
        'aurora-score': 'aurora_score',
        'outdoor-score': 'outdoor_score',
        'swimming-score': 'swimming_score'
    };

    // Generate natural response using AI
    return await generateResponse(intentMap[endpoint], data, { userMessage });
}

// =====================================================
// WEATHER HANDLER
// =====================================================

async function handleWeather(location, entities, userMessage, intent, context) {
    context.log(`[API] Getting weather for ${location.name}`);

    // Use outdoor score API (has comprehensive weather)
    const data = await callScoringAPI('outdoor-score', location, {});
    
    if (!data) {
        return "Couldn't get weather right now. Try again!";
    }

    const weatherData = {
        location: { name: location.name },
        conditions: data.conditions,
        forecast: data.next24Hours?.slice(0, 8),
        type: intent === 'weather_forecast' ? 'forecast' : 'current'
    };

    return await generateResponse('weather_now', weatherData, { userMessage });
}

// =====================================================
// BEST LOCATION HANDLER
// =====================================================

async function handleBestLocation(phoneNumber, entities, userMessage, context) {
    const locations = await getUserLocations(phoneNumber, context);
    
    if (!locations || locations.length === 0) {
        return "You don't have any saved locations yet. Add some first!";
    }
    
    if (locations.length === 1) {
        return `You only have ${locations[0].name} saved. Add more to compare!`;
    }

    // Determine which score to compare
    let endpoint = 'sky-score';  // default
    if (entities.activity) {
        endpoint = 'outdoor-score';
    }

    // Get scores for all locations
    const results = await Promise.all(
        locations.map(async (loc) => {
            try {
                const data = await callScoringAPI(endpoint, loc, 
                    entities.activity ? { activity: entities.activity } : {});
                return {
                    name: loc.name,
                    score: data?.current?.score || 0,
                    rating: data?.current?.rating || 'Unknown',
                    topReason: data?.current?.reasons?.[0] || ''
                };
            } catch {
                return { name: loc.name, score: 0, rating: 'Error' };
            }
        })
    );

    results.sort((a, b) => b.score - a.score);

    return await generateResponse('best_location', { locations: results }, { userMessage });
}

// =====================================================
// LOCATION HANDLERS
// =====================================================

async function resolveLocation(phoneNumber, entities, context) {
    // 1. User mentioned a specific location
    if (entities.location) {
        // TODO: Geocode this location
        // For now, check if it matches a saved location
        const saved = await getUserLocations(phoneNumber, context);
        const match = saved?.find(l => 
            l.name.toLowerCase() === entities.location.toLowerCase()
        );
        if (match) return match;
        
        // Not found - use default but log it
        context.log(`[Location] "${entities.location}" not found in saved, using default`);
    }

    // 2. User's saved primary location
    const saved = await getUserLocations(phoneNumber, context);
    if (saved?.length > 0) {
        return saved.find(l => l.isPrimary) || saved[0];
    }

    // 3. Default
    return DEFAULT_LOCATION;
}

async function handleListLocations(phoneNumber, context) {
    const locations = await getUserLocations(phoneNumber, context);
    
    if (!locations?.length) {
        return "You don't have any saved locations yet.\n\nUse the web dashboard to add some!";
    }
    
    let response = "📍 *Your Locations:*\n\n";
    locations.forEach((loc, i) => {
        response += `${i + 1}. ${loc.name}`;
        if (loc.isPrimary) response += ' ⭐';
        response += '\n';
    });
    
    return response;
}

function handleAddLocation(entities) {
    if (entities.location) {
        return `I'd love to add "${entities.location}" but this feature is coming soon!\n\nFor now, use the web dashboard to add locations.`;
    }
    return "Tell me which location to add, like 'add Galway'.\n\nOr use the web dashboard.";
}

function handleRemoveLocation(entities) {
    return "Location removal is coming soon! Use the web dashboard for now.";
}

function getSettingsInfo() {
    return `⚙️ *Settings*

Manage your preferences on the web dashboard:
• Alert frequency
• Quiet hours  
• Activities to track
• Temperature units

Dashboard: [your-url-here]`;
}

function handleUnknown(userMessage, confidence) {
    if (confidence > 0.3) {
        // Partial understanding
        return `I'm not quite sure what you mean. Could you rephrase that?\n\nI can help with stargazing, aurora, hiking, cycling, swimming, or general weather!`;
    }
    
    return `I didn't understand "${userMessage}".\n\nTry asking about:\n🌟 Stargazing\n🌌 Aurora\n🥾 Hiking/cycling\n🏊 Swimming\n⛅ Weather\n\nOr say "help" for examples!`;
}

// =====================================================
// DATABASE HELPERS (TODO: Implement properly)
// =====================================================

async function getUserLocations(phoneNumber, context) {
    // TODO: Fetch from database
    // For now, return mock data
    return [
        { name: 'Dublin', lat: 53.3498, lon: -6.2603, isPrimary: true },
        // { name: 'Galway', lat: 53.2707, lon: -9.0568, isPrimary: false },
    ];
}

// =====================================================
// API HELPER
// =====================================================

async function callScoringAPI(endpoint, location, params = {}) {
    try {
        const url = new URL(`${API_BASE_URL}/${endpoint}`);
        url.searchParams.append('lat', location.lat);
        url.searchParams.append('lon', location.lon);
        url.searchParams.append('windows', 'true');
        
        for (const [key, value] of Object.entries(params)) {
            if (value) url.searchParams.append(key, value);
        }
        
        const response = await axios.get(url.toString(), { timeout: 10000 });
        return response.data;

    } catch (error) {
        console.error(`API error (${endpoint}):`, error.message);
        return null;
    }
}

// =====================================================
// TWILIO HELPERS
// =====================================================

async function parseFormBody(request) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body = {};
    for (const [key, value] of params.entries()) {
        body[key] = value;
    }
    return body;
}

function createTwiMLResponse(message) {
    return {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${escapeXml(message)}</Message>
</Response>`
    };
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = { processIntent, callScoringAPI };