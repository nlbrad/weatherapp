/**
 * SwimmingScore Computation Module
 * 
 * Calculates a 0-100 score for sea/outdoor swimming conditions.
 * Use cases: Sea swimming, wild swimming, open water swimming
 * 
 * Key factors:
 * 1. Water temperature - most critical for safety and comfort
 * 2. Air temperature - affects getting in/out comfort
 * 3. Wind speed - wind chill when wet is dangerous
 * 4. Wave height/conditions - safety factor
 * 5. Rain - less critical but affects experience
 */

// =====================================================
// SCORING WEIGHTS
// =====================================================
const WEIGHTS = {
    // Water temperature is critical
    waterTemp: {
        weight: 35,
        thresholds: {
            dangerous: 8,      // Hypothermia risk without wetsuit
            cold: 12,          // Cold - experienced swimmers only
            cool: 15,          // Cool - short swims
            comfortable: 18,   // Comfortable for most
            warm: 22,          // Warm - ideal
            // Above 22°C is perfect
        },
        // Penalty based on temp (assuming no wetsuit)
        getPenalty: (temp, hasWetsuit = false) => {
            const effectiveTemp = hasWetsuit ? temp + 5 : temp; // Wetsuit adds ~5°C comfort
            if (effectiveTemp >= 20) return 0;
            if (effectiveTemp >= 18) return 0.15;
            if (effectiveTemp >= 15) return 0.35;
            if (effectiveTemp >= 12) return 0.55;
            if (effectiveTemp >= 10) return 0.75;
            if (effectiveTemp >= 8) return 0.9;
            return 1.0;  // Dangerous
        }
    },
    
    // Air temperature affects comfort getting in/out
    airTemp: {
        weight: 20,
        thresholds: {
            cold: 10,
            cool: 14,
            comfortable: 18,
            warm: 22
        },
        getPenalty: (temp) => {
            if (temp >= 20) return 0;
            if (temp >= 16) return 0.2;
            if (temp >= 12) return 0.4;
            if (temp >= 8) return 0.65;
            if (temp >= 5) return 0.85;
            return 1.0;
        }
    },
    
    // Wind chill when wet is very important
    wind: {
        weight: 20,
        thresholds: [
            { max: 10, penalty: 0 },       // Calm - perfect
            { max: 15, penalty: 0.2 },     // Light breeze
            { max: 20, penalty: 0.4 },     // Noticeable
            { max: 30, penalty: 0.65 },    // Uncomfortable when wet
            { max: 40, penalty: 0.85 },    // Unpleasant
            { max: 100, penalty: 1.0 }     // Don't swim
        ]
    },
    
    // Wave/sea conditions (if available)
    seaConditions: {
        weight: 15,
        // Wave height in meters
        thresholds: [
            { max: 0.3, penalty: 0 },      // Calm
            { max: 0.5, penalty: 0.15 },   // Slight
            { max: 1.0, penalty: 0.35 },   // Moderate
            { max: 1.5, penalty: 0.6 },    // Rough
            { max: 2.0, penalty: 0.85 },   // Very rough
            { max: 10, penalty: 1.0 }      // Dangerous
        ]
    },
    
    // Rain is less critical but affects experience
    rain: {
        weight: 10,
        thresholds: [
            { max: 10, penalty: 0 },       // Dry
            { max: 30, penalty: 0.2 },     // Light chance
            { max: 50, penalty: 0.4 },     // Possible
            { max: 70, penalty: 0.6 },     // Likely
            { max: 100, penalty: 0.8 }     // Raining
        ]
    }
};

// =====================================================
// SWIMMER EXPERIENCE LEVELS
// =====================================================
const EXPERIENCE_LEVELS = {
    beginner: {
        name: 'Beginner',
        minWaterTemp: 16,          // Higher threshold
        maxWaveHeight: 0.5,
        coldWaterMultiplier: 1.5,  // More penalty for cold
        recommendedDuration: '10-15 min'
    },
    intermediate: {
        name: 'Intermediate',
        minWaterTemp: 12,
        maxWaveHeight: 1.0,
        coldWaterMultiplier: 1.0,
        recommendedDuration: '15-30 min'
    },
    experienced: {
        name: 'Experienced',
        minWaterTemp: 8,
        maxWaveHeight: 1.5,
        coldWaterMultiplier: 0.7,  // Less penalty - they can handle cold
        recommendedDuration: '20-45 min'
    },
    coldWaterSwimmer: {
        name: 'Cold Water Swimmer',
        minWaterTemp: 4,           // Ice swimmers!
        maxWaveHeight: 1.0,
        coldWaterMultiplier: 0.4,
        recommendedDuration: '5-20 min'
    }
};

// =====================================================
// MAIN SCORING FUNCTION
// =====================================================

/**
 * Compute SwimmingScore for given conditions
 * 
 * @param {Object} conditions
 * @param {number} conditions.waterTemp - Water temperature in °C
 * @param {number} conditions.airTemp - Air temperature in °C
 * @param {number} conditions.feelsLike - Feels like temperature
 * @param {number} conditions.windSpeed - Wind speed in km/h
 * @param {number} conditions.precipProbability - Rain chance 0-100
 * @param {number} [conditions.waveHeight] - Wave height in meters
 * @param {string} [conditions.seaState] - 'calm', 'slight', 'moderate', 'rough'
 * @param {boolean} [conditions.hasWetsuit] - Is swimmer wearing wetsuit?
 * @param {string} [experience='intermediate'] - Swimmer experience level
 * 
 * @returns {Object} Score result with breakdown
 */
function computeSwimmingScore(conditions, experience = 'intermediate') {
    const {
        waterTemp = 14,
        airTemp = 15,
        feelsLike = 15,
        windSpeed = 10,
        precipProbability = 0,
        waveHeight = 0.5,
        seaState = null,
        hasWetsuit = false,
        humidity = 50
    } = conditions;

    const profile = EXPERIENCE_LEVELS[experience] || EXPERIENCE_LEVELS.intermediate;
    
    let score = 100;
    const factors = {};
    const reasons = [];
    const warnings = [];

    // =====================================================
    // FACTOR 1: Water Temperature (most important)
    // =====================================================
    let waterPenalty = WEIGHTS.waterTemp.getPenalty(waterTemp, hasWetsuit);
    waterPenalty *= profile.coldWaterMultiplier;
    waterPenalty = Math.min(1, waterPenalty);
    
    const waterPoints = Math.round(WEIGHTS.waterTemp.weight * waterPenalty);
    score -= waterPoints;
    
    const waterTempCategory = categorizeWaterTemp(waterTemp);
    factors.waterTemp = {
        value: waterTemp,
        category: waterTempCategory,
        hasWetsuit,
        penalty: waterPoints,
        maxPenalty: WEIGHTS.waterTemp.weight
    };
    
    // Water temp reasons and warnings
    if (waterTemp >= 18) {
        reasons.push(`Comfortable water (${waterTemp}°C)`);
    } else if (waterTemp >= 14) {
        reasons.push(`Cool water (${waterTemp}°C) - refreshing!`);
    } else if (waterTemp >= 10) {
        reasons.push(`Cold water (${waterTemp}°C) - limit swim time`);
        if (!hasWetsuit) warnings.push('Consider a wetsuit');
    } else {
        reasons.push(`Very cold water (${waterTemp}°C)`);
        warnings.push('Cold water risk - experienced swimmers only');
        if (!hasWetsuit) warnings.push('Wetsuit strongly recommended');
    }

    // =====================================================
    // FACTOR 2: Air Temperature
    // =====================================================
    const airPenalty = WEIGHTS.airTemp.getPenalty(airTemp);
    const airPoints = Math.round(WEIGHTS.airTemp.weight * airPenalty);
    score -= airPoints;
    
    factors.airTemp = {
        value: airTemp,
        feelsLike,
        penalty: airPoints,
        maxPenalty: WEIGHTS.airTemp.weight
    };
    
    if (airTemp >= 18) {
        reasons.push(`Warm air (${Math.round(airTemp)}°C) - comfortable exit`);
    } else if (airTemp >= 12) {
        reasons.push(`Cool air (${Math.round(airTemp)}°C) - have warm clothes ready`);
    } else {
        reasons.push(`Cold air (${Math.round(airTemp)}°C) - warm up quickly after`);
        warnings.push('Bring warm dry clothes and hot drink');
    }

    // =====================================================
    // FACTOR 3: Wind (wind chill when wet is serious)
    // =====================================================
    const windPenalty = calculatePenalty(windSpeed, WEIGHTS.wind.thresholds);
    const windPoints = Math.round(WEIGHTS.wind.weight * windPenalty);
    score -= windPoints;
    
    // Calculate wind chill effect when wet
    const windChillWet = calculateWindChillWet(airTemp, windSpeed);
    
    factors.wind = {
        speed: windSpeed,
        windChillWet,
        penalty: windPoints,
        maxPenalty: WEIGHTS.wind.weight
    };
    
    if (windSpeed <= 10) {
        reasons.push('Calm winds - ideal');
    } else if (windSpeed <= 20) {
        reasons.push(`Light breeze (${Math.round(windSpeed)} km/h)`);
    } else if (windSpeed <= 30) {
        reasons.push(`Breezy (${Math.round(windSpeed)} km/h) - wind chill when wet`);
    } else {
        warnings.push(`Strong wind (${Math.round(windSpeed)} km/h) - significant wind chill`);
    }

    // =====================================================
    // FACTOR 4: Sea Conditions / Waves
    // =====================================================
    const effectiveWaveHeight = waveHeight || estimateWaveHeight(seaState);
    const wavePenalty = calculatePenalty(effectiveWaveHeight, WEIGHTS.seaConditions.thresholds);
    const wavePoints = Math.round(WEIGHTS.seaConditions.weight * wavePenalty);
    score -= wavePoints;
    
    factors.seaConditions = {
        waveHeight: effectiveWaveHeight,
        seaState: seaState || estimateSeaState(effectiveWaveHeight),
        penalty: wavePoints,
        maxPenalty: WEIGHTS.seaConditions.weight
    };
    
    if (effectiveWaveHeight <= 0.3) {
        reasons.push('Calm sea');
    } else if (effectiveWaveHeight <= 0.7) {
        reasons.push('Slight waves');
    } else if (effectiveWaveHeight <= 1.2) {
        reasons.push('Moderate waves - swim with caution');
    } else {
        warnings.push('Rough sea - dangerous conditions');
    }
    
    // Safety gate for waves
    if (effectiveWaveHeight > profile.maxWaveHeight) {
        warnings.push(`Waves exceed safe level for ${profile.name.toLowerCase()} swimmers`);
    }

    // =====================================================
    // FACTOR 5: Rain
    // =====================================================
    const rainPenalty = calculatePenalty(precipProbability, WEIGHTS.rain.thresholds);
    const rainPoints = Math.round(WEIGHTS.rain.weight * rainPenalty);
    score -= rainPoints;
    
    factors.rain = {
        probability: precipProbability,
        penalty: rainPoints,
        maxPenalty: WEIGHTS.rain.weight
    };
    
    // Rain is less of an issue for swimmers (you're wet anyway!)
    if (precipProbability > 60) {
        reasons.push("Rain likely - you'll be wet anyway!");
    }

    // =====================================================
    // SAFETY GATES
    // =====================================================
    
    // Water too cold for experience level
    if (waterTemp < profile.minWaterTemp && !hasWetsuit) {
        score = Math.min(score, 35);
        warnings.push(`Water too cold for ${profile.name.toLowerCase()} without wetsuit`);
    }
    
    // Dangerous conditions
    if (effectiveWaveHeight > 2.0) {
        score = Math.min(score, 20);
        warnings.push('Sea conditions dangerous - do not swim');
    }
    
    if (windSpeed > 50) {
        score = Math.min(score, 25);
        warnings.push('Extreme wind - not safe for swimming');
    }

    // =====================================================
    // FINAL SCORE
    // =====================================================
    score = Math.max(0, Math.min(100, score));
    
    // Calculate recommended swim duration
    const recommendedDuration = calculateSwimDuration(waterTemp, airTemp, windSpeed, experience);

    return {
        score,
        rating: getSwimmingRating(score),
        experience: profile.name,
        factors,
        reasons: reasons.slice(0, 4),
        warnings: warnings.length > 0 ? warnings : null,
        recommendation: getSwimmingRecommendation(score, factors, warnings, profile),
        swimDuration: recommendedDuration,
        safety: {
            level: warnings.length === 0 ? 'safe' : warnings.some(w => w.includes('dangerous') || w.includes('Extreme')) ? 'dangerous' : 'caution',
            warnings
        },
        timestamp: new Date().toISOString()
    };
}

// =====================================================
// WINDOW DETECTION FOR SWIMMING
// =====================================================

/**
 * Find best swimming windows from hourly forecast
 */
function findSwimmingWindows(hourlyForecast, waterTempForecast = null, experience = 'intermediate', options = {}) {
    const {
        minScore = 60,
        minDurationMinutes = 60,
        maxWindows = 3
    } = options;

    const windows = [];
    let currentWindow = null;

    // Water temp changes slowly - use constant or interpolate
    const getWaterTemp = (index) => {
        if (Array.isArray(waterTempForecast)) {
            return waterTempForecast[index] ?? waterTempForecast[0] ?? 14;
        }
        return waterTempForecast ?? 14;
    };

    for (let i = 0; i < hourlyForecast.length; i++) {
        const hour = hourlyForecast[i];
        
        const result = computeSwimmingScore({
            waterTemp: getWaterTemp(i),
            airTemp: hour.temp ?? hour.temperature ?? 15,
            feelsLike: hour.feels_like ?? hour.feelsLike ?? hour.temp ?? 15,
            windSpeed: (hour.wind_speed ?? hour.windSpeed ?? 10) * 3.6,
            precipProbability: hour.pop ? hour.pop * 100 : (hour.precipProbability ?? 0),
            humidity: hour.humidity ?? 50
        }, experience);

        hour.swimmingScore = result.score;
        hour.swimmingFactors = result.factors;

        // Check for safe conditions too
        const isSafe = result.safety.level !== 'dangerous';

        if (result.score >= minScore && isSafe) {
            if (!currentWindow) {
                currentWindow = {
                    start: hour.datetime || new Date(hour.dt * 1000).toISOString(),
                    startIndex: i,
                    scores: [result.score],
                    waterTemps: [getWaterTemp(i)],
                    airTemps: [hour.temp ?? hour.temperature],
                    hours: [hour]
                };
            } else {
                currentWindow.scores.push(result.score);
                currentWindow.waterTemps.push(getWaterTemp(i));
                currentWindow.airTemps.push(hour.temp ?? hour.temperature);
                currentWindow.hours.push(hour);
            }
        } else if (currentWindow) {
            currentWindow = finalizeSwimmingWindow(currentWindow, hourlyForecast[i - 1], getWaterTemp(i - 1));
            if (currentWindow.durationMinutes >= minDurationMinutes) {
                windows.push(currentWindow);
            }
            currentWindow = null;
        }
    }

    // Handle window extending to end
    if (currentWindow) {
        currentWindow = finalizeSwimmingWindow(currentWindow, hourlyForecast[hourlyForecast.length - 1], getWaterTemp(hourlyForecast.length - 1));
        if (currentWindow.durationMinutes >= minDurationMinutes) {
            windows.push(currentWindow);
        }
    }

    return windows.sort((a, b) => b.peakScore - a.peakScore).slice(0, maxWindows);
}

function finalizeSwimmingWindow(window, lastHour, lastWaterTemp) {
    window.end = lastHour.datetime || new Date(lastHour.dt * 1000).toISOString();
    window.peakScore = Math.max(...window.scores);
    window.avgScore = Math.round(window.scores.reduce((a, b) => a + b, 0) / window.scores.length);
    window.waterTemp = Math.round(window.waterTemps.reduce((a, b) => a + b, 0) / window.waterTemps.length * 10) / 10;
    window.avgAirTemp = Math.round(window.airTemps.reduce((a, b) => a + b, 0) / window.airTemps.length);
    window.durationMinutes = window.scores.length * 60;
    
    const peakIndex = window.scores.indexOf(window.peakScore);
    window.peakTime = window.hours[peakIndex]?.datetime;
    
    delete window.scores;
    delete window.waterTemps;
    delete window.airTemps;
    delete window.hours;
    delete window.startIndex;
    
    return window;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function calculatePenalty(value, thresholds) {
    for (const threshold of thresholds) {
        if (value <= threshold.max) {
            return threshold.penalty;
        }
    }
    return 1;
}

function categorizeWaterTemp(temp) {
    if (temp >= 22) return 'Warm';
    if (temp >= 18) return 'Comfortable';
    if (temp >= 15) return 'Cool';
    if (temp >= 12) return 'Cold';
    if (temp >= 8) return 'Very Cold';
    return 'Dangerous';
}

function estimateWaveHeight(seaState) {
    const states = {
        'calm': 0.2,
        'slight': 0.5,
        'moderate': 1.0,
        'rough': 1.5,
        'very rough': 2.5,
        'high': 3.5
    };
    return states[seaState?.toLowerCase()] ?? 0.5;
}

function estimateSeaState(waveHeight) {
    if (waveHeight <= 0.3) return 'Calm';
    if (waveHeight <= 0.6) return 'Slight';
    if (waveHeight <= 1.2) return 'Moderate';
    if (waveHeight <= 2.0) return 'Rough';
    return 'Very Rough';
}

function calculateWindChillWet(airTemp, windSpeed) {
    // When wet, wind chill is more severe
    // Simplified formula - in reality it's more complex
    if (windSpeed < 5) return airTemp;
    const windMs = windSpeed / 3.6;
    const windChill = 13.12 + 0.6215 * airTemp - 11.37 * Math.pow(windMs, 0.16) + 0.3965 * airTemp * Math.pow(windMs, 0.16);
    // Additional penalty for being wet
    const wetPenalty = windSpeed > 15 ? (windSpeed - 15) * 0.15 : 0;
    return Math.round((windChill - wetPenalty) * 10) / 10;
}

function calculateSwimDuration(waterTemp, airTemp, windSpeed, experience) {
    const profile = EXPERIENCE_LEVELS[experience] || EXPERIENCE_LEVELS.intermediate;
    
    // Base duration from profile
    let baseDuration = profile.recommendedDuration;
    
    // Adjust based on conditions
    if (waterTemp < 12) {
        return waterTemp < 8 ? '5-10 min max' : '10-15 min';
    }
    
    if (windSpeed > 25 || airTemp < 10) {
        return '10-20 min';
    }
    
    return baseDuration;
}

function getSwimmingRating(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Not Recommended';
}

function getSwimmingRecommendation(score, factors, warnings, profile) {
    // Check for dangerous conditions first
    if (warnings && warnings.some(w => w.includes('dangerous') || w.includes('Extreme'))) {
        return 'Dangerous conditions - do not swim today.';
    }
    
    if (score >= 80) {
        return 'Excellent swimming conditions! Enjoy the water.';
    }
    
    if (score >= 65) {
        let rec = 'Good conditions for a swim.';
        if (factors.waterTemp.value < 14) {
            rec += ' Water is cool - consider a shorter swim.';
        }
        return rec;
    }
    
    if (score >= 50) {
        if (factors.waterTemp.value < 12) {
            return 'Cold water - only for experienced cold water swimmers.';
        }
        if (factors.wind.speed > 25) {
            return 'Windy conditions - wind chill significant when wet.';
        }
        return 'Fair conditions - swim with caution.';
    }
    
    if (score >= 35) {
        return `Conditions are poor for ${profile.name.toLowerCase()} swimmers. Consider postponing.`;
    }
    
    return 'Not recommended for swimming today.';
}

/**
 * Prepare data for AI narrator
 */
function prepareSwimmingForAI(scoreResult, window, location) {
    return {
        decision: scoreResult.score >= 65 ? 'yes' : scoreResult.score >= 45 ? 'maybe' : 'no',
        confidence: scoreResult.score >= 75 ? 'high' : scoreResult.score >= 55 ? 'medium' : 'low',
        location: { name: location.name },
        rating: scoreResult.rating,
        conditions: {
            waterTemp: `${scoreResult.factors.waterTemp.value}°C (${scoreResult.factors.waterTemp.category})`,
            airTemp: `${Math.round(scoreResult.factors.airTemp.value)}°C`,
            wind: `${Math.round(scoreResult.factors.wind.speed)} km/h`,
            sea: scoreResult.factors.seaConditions.seaState
        },
        window: window ? {
            start: formatTime(window.start),
            end: formatTime(window.end),
            waterTemp: `${window.waterTemp}°C`,
            airTemp: `${window.avgAirTemp}°C`
        } : null,
        swimDuration: scoreResult.swimDuration,
        reasons: scoreResult.reasons,
        warnings: scoreResult.warnings,
        recommendation: scoreResult.recommendation
    };
}

function formatTime(datetime) {
    if (!datetime) return null;
    const date = new Date(datetime);
    return date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    computeSwimmingScore,
    findSwimmingWindows,
    prepareSwimmingForAI,
    EXPERIENCE_LEVELS,
    WEIGHTS
};