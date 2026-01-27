/**
 * Intent Detector Module
 * 
 * Parses natural language messages from users into structured intents.
 * Uses simple keyword/pattern matching first, can be enhanced with AI later.
 * 
 * Supported Intents:
 * - sky_score: Stargazing, astrophotography conditions
 * - aurora_score: Northern lights viewing
 * - outdoor_score: Hiking, cycling, general outdoor
 * - swimming_score: Sea swimming conditions
 * - weather_now: Current weather
 * - weather_forecast: Weather forecast
 * - best_location: Which saved location is best
 * - add_location: Add a new location
 * - list_locations: Show saved locations
 * - remove_location: Delete a location
 * - help: Show available commands
 * - settings: Change preferences
 * - unknown: Couldn't determine intent
 */

// =====================================================
// INTENT PATTERNS
// =====================================================

const INTENT_PATTERNS = {
    sky_score: {
        keywords: [
            'stars', 'stargazing', 'stargazing', 'astrophotography', 'night sky',
            'telescope', 'meteor', 'milky way', 'clear sky', 'clear skies',
            'see stars', 'sky tonight', 'dark sky', 'celestial'
        ],
        patterns: [
            /good.*(night|sky|stars)/i,
            /can i see.*(stars|sky)/i,
            /worth.*(going out|heading out).*(stars|tonight)/i,
            /(tonight|sky).*(clear|good)/i,
            /stargazing/i
        ],
        examples: [
            "Is tonight good for stargazing?",
            "Can I see the stars tonight?",
            "Clear skies tonight?",
            "Good night for astrophotography?"
        ]
    },

    aurora_score: {
        keywords: [
            'aurora', 'northern lights', 'aurora borealis', 'lights',
            'kp', 'geomagnetic', 'solar storm'
        ],
        patterns: [
            /aurora/i,
            /northern lights/i,
            /kp.*(index|level)/i,
            /lights.*(tonight|visible|chance)/i
        ],
        examples: [
            "Any chance of aurora tonight?",
            "Northern lights visible?",
            "What's the Kp index?"
        ]
    },

    outdoor_score: {
        keywords: [
            'hiking', 'hike', 'walk', 'walking', 'cycling', 'bike', 'biking',
            'running', 'run', 'jog', 'picnic', 'outdoor', 'outside',
            'go out', 'head out', 'trip'
        ],
        patterns: [
            /good.*(day|time).*(hike|walk|cycle|run|outside|outdoor)/i,
            /(hike|walk|cycle|run|picnic)/i,
            /should i.*(go out|head out)/i,
            /worth.*(going|heading).*(out|outside)/i,
            /outdoor/i
        ],
        examples: [
            "Good day for a hike?",
            "Should I cycle today?",
            "Is it worth going outside?"
        ]
    },

    swimming_score: {
        keywords: [
            'swim', 'swimming', 'sea', 'ocean', 'beach', 'water',
            'dip', 'waves', 'sea temp', 'water temp'
        ],
        patterns: [
            /swim/i,
            /sea.*(temp|temperature|warm|cold)/i,
            /water.*(temp|temperature)/i,
            /beach/i,
            /waves/i,
            /good.*(swim|dip)/i
        ],
        examples: [
            "Good for a swim?",
            "What's the sea temperature?",
            "How are the waves?"
        ]
    },

    weather_now: {
        keywords: [
            'weather', 'temperature', 'temp', 'raining', 'rain', 'wind',
            'cold', 'warm', 'hot', 'conditions'
        ],
        patterns: [
            /weather.*(now|current|today)/i,
            /what.*(weather|temp)/i,
            /is it.*(raining|cold|warm|hot|windy)/i,
            /how.*(cold|warm|hot)/i,
            /current.*(temp|conditions)/i
        ],
        examples: [
            "What's the weather like?",
            "Is it raining?",
            "How cold is it?"
        ]
    },

    weather_forecast: {
        keywords: [
            'forecast', 'tomorrow', 'weekend', 'week', 'later',
            'next few days', 'coming days'
        ],
        patterns: [
            /forecast/i,
            /weather.*(tomorrow|weekend|week|later)/i,
            /will it.*(rain|be).*(tomorrow|weekend|later)/i,
            /next.*(few|couple).*days/i
        ],
        examples: [
            "What's the forecast?",
            "Will it rain tomorrow?",
            "Weather for the weekend?"
        ]
    },

    best_location: {
        keywords: [
            'best', 'where', 'which location', 'recommend', 'suggestion'
        ],
        patterns: [
            /best.*(location|place|spot)/i,
            /where.*(should|best|go)/i,
            /which.*(location|place)/i,
            /recommend/i
        ],
        examples: [
            "Which location is best tonight?",
            "Where should I go?",
            "Best spot for stargazing?"
        ]
    },

    add_location: {
        keywords: [
            'add', 'new location', 'save', 'add place'
        ],
        patterns: [
            /add.*(location|place)/i,
            /save.*(location|place)/i,
            /new.*(location|place)/i
        ],
        examples: [
            "Add a new location",
            "Save Dublin as a location"
        ]
    },

    list_locations: {
        keywords: [
            'list', 'show', 'my locations', 'saved locations', 'all locations'
        ],
        patterns: [
            /list.*(location|place)/i,
            /show.*(location|place)/i,
            /my.*(location|place)/i,
            /saved.*(location|place)/i
        ],
        examples: [
            "List my locations",
            "Show saved locations"
        ]
    },

    remove_location: {
        keywords: [
            'remove', 'delete', 'remove location'
        ],
        patterns: [
            /remove.*(location|place)/i,
            /delete.*(location|place)/i
        ],
        examples: [
            "Remove Dublin",
            "Delete location"
        ]
    },

    help: {
        keywords: [
            'help', 'commands', 'what can you do', 'options', 'menu'
        ],
        patterns: [
            /^help$/i,
            /what can you/i,
            /how.*(work|use)/i,
            /commands/i,
            /options/i
        ],
        examples: [
            "Help",
            "What can you do?",
            "Show commands"
        ]
    },

    settings: {
        keywords: [
            'settings', 'preferences', 'configure', 'change', 'update',
            'alert mode', 'quiet hours'
        ],
        patterns: [
            /settings/i,
            /preferences/i,
            /change.*(alert|mode|preference)/i,
            /quiet hours/i
        ],
        examples: [
            "Settings",
            "Change alert mode",
            "Set quiet hours"
        ]
    },

    greeting: {
        keywords: [
            'hi', 'hello', 'hey', 'morning', 'evening', 'afternoon'
        ],
        patterns: [
            /^(hi|hello|hey|hiya|howdy)$/i,
            /good (morning|evening|afternoon)/i
        ],
        examples: [
            "Hi",
            "Hello",
            "Good morning"
        ]
    },

    thanks: {
        keywords: [
            'thanks', 'thank you', 'cheers', 'ta', 'appreciated'
        ],
        patterns: [
            /thank/i,
            /cheers/i,
            /^ta$/i
        ],
        examples: [
            "Thanks!",
            "Thank you"
        ]
    }
};

// =====================================================
// ACTIVITY EXTRACTION
// =====================================================

const ACTIVITY_KEYWORDS = {
    hiking: ['hike', 'hiking', 'hill', 'mountain', 'trail'],
    cycling: ['cycle', 'cycling', 'bike', 'biking', 'bicycle'],
    walking: ['walk', 'walking', 'stroll'],
    running: ['run', 'running', 'jog', 'jogging'],
    picnic: ['picnic', 'park', 'bbq', 'barbecue']
};

// =====================================================
// LOCATION EXTRACTION
// =====================================================

const LOCATION_PATTERNS = [
    /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,  // "in Dublin", "in New York"
    /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,  // "at Wicklow"
    /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/  // "for Galway"
];

// =====================================================
// MAIN DETECTION FUNCTION
// =====================================================

/**
 * Detect intent from a user message
 * 
 * @param {string} message - Raw user message
 * @returns {Object} Detected intent with confidence and entities
 */
function detectIntent(message) {
    if (!message || typeof message !== 'string') {
        return { intent: 'unknown', confidence: 0, raw: message };
    }

    const normalizedMessage = message.toLowerCase().trim();
    
    // Track best match
    let bestMatch = { intent: 'unknown', confidence: 0 };
    const scores = {};

    // Check each intent
    for (const [intentName, config] of Object.entries(INTENT_PATTERNS)) {
        let score = 0;

        // Check keywords (partial match)
        for (const keyword of config.keywords) {
            if (normalizedMessage.includes(keyword.toLowerCase())) {
                score += 1;
            }
        }

        // Check patterns (regex match - higher weight)
        for (const pattern of config.patterns) {
            if (pattern.test(message)) {
                score += 3;
            }
        }

        scores[intentName] = score;

        if (score > bestMatch.confidence) {
            bestMatch = { intent: intentName, confidence: score };
        }
    }

    // Calculate normalized confidence (0-1)
    const maxPossibleScore = 10; // Rough estimate
    const normalizedConfidence = Math.min(bestMatch.confidence / maxPossibleScore, 1);

    // Extract entities
    const entities = extractEntities(message, bestMatch.intent);

    return {
        intent: bestMatch.confidence > 0 ? bestMatch.intent : 'unknown',
        confidence: normalizedConfidence,
        rawScore: bestMatch.confidence,
        allScores: scores,
        entities,
        raw: message
    };
}

/**
 * Extract entities from message based on intent
 */
function extractEntities(message, intent) {
    const entities = {};

    // Extract location
    for (const pattern of LOCATION_PATTERNS) {
        const match = message.match(pattern);
        if (match) {
            entities.location = match[1];
            break;
        }
    }

    // Extract activity for outdoor intent
    if (intent === 'outdoor_score') {
        for (const [activity, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
            for (const keyword of keywords) {
                if (message.toLowerCase().includes(keyword)) {
                    entities.activity = activity;
                    break;
                }
            }
            if (entities.activity) break;
        }
    }

    // Extract time references
    const timePatterns = {
        tonight: /tonight/i,
        tomorrow: /tomorrow/i,
        weekend: /weekend/i,
        now: /(now|current|right now)/i
    };

    for (const [timeRef, pattern] of Object.entries(timePatterns)) {
        if (pattern.test(message)) {
            entities.timeReference = timeRef;
            break;
        }
    }

    return entities;
}

/**
 * Get help text for available commands
 */
function getHelpText() {
    return `🌤️ *Weather Bot Commands*

*Scores & Conditions:*
• "Is tonight good for stargazing?"
• "Aurora chance tonight?"
• "Good day for hiking?"
• "Swimming conditions?"
• "What's the weather?"

*Locations:*
• "List my locations"
• "Best location tonight?"
• "Add [location name]"
• "Remove [location name]"

*Settings:*
• "Settings" - View preferences
• "Help" - Show this message

Just ask naturally - I'll understand! 🙂`;
}

/**
 * Get greeting response
 */
function getGreetingResponse() {
    const greetings = [
        "Hi! 👋 How can I help with weather today?",
        "Hello! Ready to check conditions for you. What would you like to know?",
        "Hey there! Ask me about weather, stargazing, aurora, or outdoor activities!"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Get thanks response
 */
function getThanksResponse() {
    const responses = [
        "You're welcome! 🙂",
        "No problem! Let me know if you need anything else.",
        "Happy to help! Enjoy! ☀️"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    detectIntent,
    extractEntities,
    getHelpText,
    getGreetingResponse,
    getThanksResponse,
    INTENT_PATTERNS,
    ACTIVITY_KEYWORDS
};