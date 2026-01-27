/**
 * AI Intent Detector Module
 * 
 * Uses GPT-4o-mini to understand natural language and extract:
 * - Intent (what the user wants)
 * - Entities (location, activity, time, etc.)
 * 
 * This replaces rigid keyword matching with true natural language understanding.
 * 
 * PRINCIPLE: AI detects intent, but NEVER generates weather data.
 * Weather data still comes from our scoring APIs.
 */

const axios = require('axios');

// Azure OpenAI Configuration
const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
};

// =====================================================
// INTENT CLASSIFICATION PROMPT
// =====================================================

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a weather/outdoor activities assistant.

Analyze the user's message and extract:
1. **intent**: What they want to know (from the list below)
2. **entities**: Any specific details mentioned

AVAILABLE INTENTS:
- sky_score: Stargazing, astrophotography, night sky viewing, seeing stars, telescope, meteor showers
- aurora_score: Northern lights, aurora borealis, aurora viewing
- outdoor_score: Hiking, walking, cycling, running, picnic, general outdoor activities
- swimming_score: Sea swimming, beach, water temperature, waves, ocean
- weather_now: Current weather conditions, temperature, is it raining
- weather_forecast: Future weather, tomorrow, weekend, next few days
- best_location: Which of their saved locations is best for an activity
- add_location: User wants to add/save a new location
- list_locations: User wants to see their saved locations
- remove_location: User wants to delete a location
- help: User needs help or wants to know what you can do
- settings: User wants to change preferences
- greeting: Hello, hi, good morning, etc.
- thanks: Thank you, cheers, etc.
- unknown: Cannot determine what user wants

ENTITIES TO EXTRACT:
- location: Any place name mentioned (city, area, beach name, etc.)
- activity: Specific activity (hiking, cycling, running, walking, picnic)
- time: When they're asking about (tonight, tomorrow, weekend, now, later, specific day)
- experience: For swimming - beginner, experienced, etc.

RESPOND IN THIS EXACT JSON FORMAT:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {
    "location": "location name or null",
    "activity": "activity type or null",
    "time": "time reference or null",
    "experience": "experience level or null"
  },
  "reasoning": "brief explanation of why you chose this intent"
}

EXAMPLES:

User: "reckon I could see some stars tonight?"
Response: {"intent": "sky_score", "confidence": 0.95, "entities": {"location": null, "activity": null, "time": "tonight", "experience": null}, "reasoning": "User asking about seeing stars tonight - stargazing conditions"}

User: "thinking about taking the bike out to wicklow tomorrow"
Response: {"intent": "outdoor_score", "confidence": 0.9, "entities": {"location": "Wicklow", "activity": "cycling", "time": "tomorrow", "experience": null}, "reasoning": "User planning cycling trip to Wicklow tomorrow"}

User: "any chance of the lights tonight?"
Response: {"intent": "aurora_score", "confidence": 0.85, "entities": {"location": null, "activity": null, "time": "tonight", "experience": null}, "reasoning": "User asking about 'the lights' likely refers to northern lights/aurora"}

User: "is the sea warm enough for a dip?"
Response: {"intent": "swimming_score", "confidence": 0.95, "entities": {"location": null, "activity": null, "time": null, "experience": null}, "reasoning": "User asking about sea temperature for swimming"}

User: "what's it like outside?"
Response: {"intent": "weather_now", "confidence": 0.9, "entities": {"location": null, "activity": null, "time": "now", "experience": null}, "reasoning": "User asking about current outdoor conditions"}

User: "hey"
Response: {"intent": "greeting", "confidence": 1.0, "entities": {"location": null, "activity": null, "time": null, "experience": null}, "reasoning": "Simple greeting"}

IMPORTANT:
- Be generous in interpretation - if it COULD be about weather/outdoor activities, classify it as such
- Irish/UK slang is common: "grand" = good, "reckon" = think, "the craic" = what's happening
- "the lights" usually means aurora/northern lights in this context
- If unsure between intents, pick the most likely one with lower confidence
- ONLY output valid JSON, nothing else`;

// =====================================================
// MAIN DETECTION FUNCTION
// =====================================================

/**
 * Detect intent using AI
 * 
 * @param {string} message - User's natural language message
 * @returns {Promise<Object>} Detected intent with entities
 */
async function detectIntentWithAI(message) {
    // Quick checks for very simple messages (save API calls)
    const quickResult = quickIntentCheck(message);
    if (quickResult) {
        return quickResult;
    }

    // Use AI for complex messages
    if (!config.endpoint || !config.apiKey) {
        console.warn('Azure OpenAI not configured, falling back to keyword matching');
        return detectIntentWithKeywords(message);
    }

    try {
        const response = await callOpenAI(message);
        const parsed = parseAIResponse(response);
        
        // Add original message
        parsed.raw = message;
        
        return parsed;

    } catch (error) {
        console.error('AI intent detection failed:', error.message);
        // Fallback to keyword matching
        return detectIntentWithKeywords(message);
    }
}

/**
 * Quick check for very simple messages (saves API calls)
 */
function quickIntentCheck(message) {
    const lower = message.toLowerCase().trim();
    
    // Exact matches for simple messages
    const quickMatches = {
        'hi': { intent: 'greeting', confidence: 1.0 },
        'hey': { intent: 'greeting', confidence: 1.0 },
        'hello': { intent: 'greeting', confidence: 1.0 },
        'hiya': { intent: 'greeting', confidence: 1.0 },
        'help': { intent: 'help', confidence: 1.0 },
        'thanks': { intent: 'thanks', confidence: 1.0 },
        'thank you': { intent: 'thanks', confidence: 1.0 },
        'cheers': { intent: 'thanks', confidence: 1.0 },
        'ta': { intent: 'thanks', confidence: 1.0 },
        'settings': { intent: 'settings', confidence: 1.0 },
        'locations': { intent: 'list_locations', confidence: 1.0 },
        'my locations': { intent: 'list_locations', confidence: 1.0 }
    };

    if (quickMatches[lower]) {
        return {
            ...quickMatches[lower],
            entities: {},
            raw: message,
            source: 'quick_match'
        };
    }

    return null;
}

/**
 * Call Azure OpenAI for intent classification
 */
async function callOpenAI(message) {
    const url = `${config.endpoint}/openai/deployments/${config.deployment}/chat/completions?api-version=${config.apiVersion}`;

    const response = await axios.post(url, {
        messages: [
            { role: 'system', content: INTENT_CLASSIFICATION_PROMPT },
            { role: 'user', content: message }
        ],
        max_tokens: 200,
        temperature: 0.3,  // Lower temperature for more consistent classification
        top_p: 0.9
    }, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': config.apiKey
        },
        timeout: 10000
    });

    return response.data.choices[0]?.message?.content;
}

/**
 * Parse AI response JSON
 */
function parseAIResponse(response) {
    try {
        // Clean up response (remove markdown code blocks if present)
        let cleaned = response.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        }
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        const parsed = JSON.parse(cleaned);
        
        return {
            intent: parsed.intent || 'unknown',
            confidence: parsed.confidence || 0.5,
            entities: parsed.entities || {},
            reasoning: parsed.reasoning || '',
            source: 'ai'
        };

    } catch (error) {
        console.error('Failed to parse AI response:', response);
        return {
            intent: 'unknown',
            confidence: 0,
            entities: {},
            source: 'ai_parse_error'
        };
    }
}

// =====================================================
// FALLBACK: KEYWORD MATCHING
// =====================================================

/**
 * Fallback keyword-based intent detection
 */
function detectIntentWithKeywords(message) {
    const lower = message.toLowerCase();
    
    const patterns = [
        { intent: 'sky_score', keywords: ['star', 'stars', 'stargazing', 'night sky', 'telescope', 'astrophoto', 'milky way', 'meteor', 'clear sky'] },
        { intent: 'aurora_score', keywords: ['aurora', 'northern lights', 'lights tonight', 'borealis', 'kp'] },
        { intent: 'swimming_score', keywords: ['swim', 'sea', 'beach', 'water temp', 'waves', 'dip', 'ocean'] },
        { intent: 'outdoor_score', keywords: ['hike', 'hiking', 'walk', 'walking', 'cycle', 'cycling', 'bike', 'run', 'running', 'outdoor', 'outside', 'picnic'] },
        { intent: 'weather_now', keywords: ['weather', 'raining', 'temperature', 'cold', 'warm', 'wind'] },
        { intent: 'weather_forecast', keywords: ['forecast', 'tomorrow', 'weekend', 'next week'] },
        { intent: 'best_location', keywords: ['best', 'which location', 'where should', 'recommend'] },
        { intent: 'list_locations', keywords: ['list', 'show', 'my locations', 'saved'] },
        { intent: 'add_location', keywords: ['add location', 'save location', 'new location'] },
        { intent: 'help', keywords: ['help', 'commands', 'what can you'] }
    ];

    for (const pattern of patterns) {
        for (const keyword of pattern.keywords) {
            if (lower.includes(keyword)) {
                return {
                    intent: pattern.intent,
                    confidence: 0.7,
                    entities: extractEntitiesBasic(message),
                    source: 'keyword_fallback',
                    raw: message
                };
            }
        }
    }

    return {
        intent: 'unknown',
        confidence: 0,
        entities: {},
        source: 'no_match',
        raw: message
    };
}

/**
 * Basic entity extraction for fallback
 */
function extractEntitiesBasic(message) {
    const entities = {};
    const lower = message.toLowerCase();

    // Time references
    if (lower.includes('tonight')) entities.time = 'tonight';
    else if (lower.includes('tomorrow')) entities.time = 'tomorrow';
    else if (lower.includes('weekend')) entities.time = 'weekend';
    else if (lower.includes('now')) entities.time = 'now';

    // Activities
    const activities = ['hiking', 'cycling', 'walking', 'running', 'picnic'];
    for (const activity of activities) {
        if (lower.includes(activity) || lower.includes(activity.slice(0, -3))) {
            entities.activity = activity;
            break;
        }
    }

    // Location (basic - capitalized words after "in" or "at")
    const locationMatch = message.match(/(?:in|at|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (locationMatch) {
        entities.location = locationMatch[1];
    }

    return entities;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get help text
 */
function getHelpText() {
    return `🌤️ *I'm your outdoor conditions assistant!*

Just ask me naturally about:

🌟 *Stargazing* - "Any chance of clear skies tonight?"
🌌 *Aurora* - "Will I see the northern lights?"
🥾 *Outdoors* - "Good day for a hike in Wicklow?"
🏊 *Swimming* - "Is the sea warm enough?"
⛅ *Weather* - "What's it like outside?"

📍 I can also manage your locations:
• "Show my locations"
• "Which spot is best tonight?"

Just chat naturally - I'll understand! 🙂`;
}

/**
 * Get greeting response
 */
function getGreetingResponse() {
    const hour = new Date().getHours();
    let greeting;
    
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    
    const responses = [
        `${greeting}! ☀️ What would you like to know about today?`,
        `${greeting}! Ready to help with weather and outdoor plans!`,
        `Hey there! 👋 Ask me about stargazing, weather, or outdoor activities!`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
}

/**
 * Get thanks response
 */
function getThanksResponse() {
    const responses = [
        "You're welcome! Enjoy! 🙂",
        "No bother! Let me know if you need anything else.",
        "Happy to help! Have a great time! ☀️",
        "Anytime! Clear skies! ✨"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    detectIntentWithAI,
    detectIntentWithKeywords,
    getHelpText,
    getGreetingResponse,
    getThanksResponse,
    INTENT_CLASSIFICATION_PROMPT
};