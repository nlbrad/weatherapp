/**
 * OutdoorScore Computation Module
 * 
 * Calculates a 0-100 score for general outdoor activities.
 * Use cases: Hiking, cycling, walking, picnics, outdoor sports
 * 
 * Key factors:
 * 1. Precipitation - rain/snow ruins most outdoor activities
 * 2. Temperature - comfort band matters
 * 3. Wind - high winds are unpleasant/dangerous
 * 4. "Feels like" - wind chill or heat index
 */

// =====================================================
// SCORING WEIGHTS
// =====================================================
const WEIGHTS = {
    // Precipitation is the biggest factor
    precipitation: {
        weight: 35,
        thresholds: [
            { max: 0, penalty: 0 },        // No rain
            { max: 10, penalty: 0.2 },     // Very light chance
            { max: 30, penalty: 0.5 },     // Light rain possible
            { max: 50, penalty: 0.7 },     // Moderate chance
            { max: 70, penalty: 0.85 },    // Likely rain
            { max: 100, penalty: 1.0 }     // Definitely raining
        ]
    },
    
    // Temperature comfort (user configurable)
    temperature: {
        weight: 25,
        defaults: {
            ideal: { min: 15, max: 22 },   // Perfect
            comfortable: { min: 10, max: 25 },  // Good
            tolerable: { min: 5, max: 30 },     // Okay
            // Outside tolerable = significant penalty
        }
    },
    
    // Wind makes everything worse
    wind: {
        weight: 20,
        thresholds: [
            { max: 10, penalty: 0 },       // Calm
            { max: 20, penalty: 0.2 },     // Light breeze
            { max: 30, penalty: 0.4 },     // Moderate
            { max: 40, penalty: 0.65 },    // Strong
            { max: 50, penalty: 0.85 },    // Very strong
            { max: 100, penalty: 1.0 }     // Dangerous
        ]
    },
    
    // Feels-like adjustment
    feelsLike: {
        weight: 10,
        // Penalty based on difference from actual temp
        getDifferencePenalty: (actual, feelsLike) => {
            const diff = Math.abs(actual - feelsLike);
            if (diff <= 2) return 0;
            if (diff <= 5) return 0.3;
            if (diff <= 8) return 0.6;
            return 0.9;
        }
    },
    
    // UV Index (for longer activities)
    uvIndex: {
        weight: 5,
        thresholds: [
            { max: 2, penalty: 0 },        // Low
            { max: 5, penalty: 0.1 },      // Moderate
            { max: 7, penalty: 0.3 },      // High
            { max: 10, penalty: 0.6 },     // Very high
            { max: 15, penalty: 1.0 }      // Extreme
        ]
    },
    
    // Visibility
    visibility: {
        weight: 5,
        thresholds: [
            { min: 10000, penalty: 0 },    // Excellent (10km+)
            { min: 5000, penalty: 0.2 },   // Good
            { min: 2000, penalty: 0.5 },   // Moderate
            { min: 1000, penalty: 0.75 },  // Poor
            { min: 0, penalty: 1.0 }       // Very poor
        ]
    }
};

// =====================================================
// ACTIVITY-SPECIFIC ADJUSTMENTS
// =====================================================
const ACTIVITY_PROFILES = {
    hiking: {
        name: 'Hiking',
        tempRange: { min: 5, max: 25 },
        windTolerance: 1.2,      // More tolerant of wind
        rainTolerance: 0.8,      // Less tolerant of rain
        uvSensitivity: 1.5       // More sun exposure
    },
    cycling: {
        name: 'Cycling',
        tempRange: { min: 8, max: 28 },
        windTolerance: 0.7,      // Less tolerant (headwinds)
        rainTolerance: 0.6,      // Much less tolerant
        uvSensitivity: 1.2
    },
    walking: {
        name: 'Walking',
        tempRange: { min: 5, max: 28 },
        windTolerance: 1.0,
        rainTolerance: 0.9,
        uvSensitivity: 1.0
    },
    running: {
        name: 'Running',
        tempRange: { min: 3, max: 22 },   // Runners prefer cooler
        windTolerance: 0.9,
        rainTolerance: 0.7,
        uvSensitivity: 1.3
    },
    picnic: {
        name: 'Picnic',
        tempRange: { min: 15, max: 28 },
        windTolerance: 0.7,      // Wind ruins picnics
        rainTolerance: 0.3,      // Rain definitely ruins picnics
        uvSensitivity: 1.0
    },
    default: {
        name: 'General Outdoor',
        tempRange: { min: 10, max: 25 },
        windTolerance: 1.0,
        rainTolerance: 1.0,
        uvSensitivity: 1.0
    }
};

// =====================================================
// MAIN SCORING FUNCTION
// =====================================================

/**
 * Compute OutdoorScore for given conditions
 * 
 * @param {Object} conditions
 * @param {number} conditions.temperature - Current temp in °C
 * @param {number} conditions.feelsLike - Feels like temp in °C
 * @param {number} conditions.precipProbability - Precipitation probability 0-100
 * @param {number} conditions.precipAmount - Precipitation amount in mm
 * @param {number} conditions.windSpeed - Wind speed in km/h
 * @param {number} conditions.humidity - Humidity 0-100%
 * @param {number} conditions.uvIndex - UV index 0-11+
 * @param {number} conditions.visibility - Visibility in meters
 * @param {string} conditions.weatherCondition - e.g., 'clear', 'rain', 'snow'
 * @param {string} [activity='default'] - Activity type
 * @param {Object} [userPrefs] - User preferences for temp ranges
 * 
 * @returns {Object} Score result with breakdown
 */
function computeOutdoorScore(conditions, activity = 'default', userPrefs = {}) {
    const {
        temperature = 15,
        feelsLike = 15,
        precipProbability = 0,
        precipAmount = 0,
        windSpeed = 10,
        humidity = 50,
        uvIndex = 3,
        visibility = 10000,
        weatherCondition = 'clear'
    } = conditions;

    const profile = ACTIVITY_PROFILES[activity] || ACTIVITY_PROFILES.default;
    const tempRange = userPrefs.tempRange || profile.tempRange;

    let score = 100;
    const factors = {};
    const reasons = [];

    // =====================================================
    // FACTOR 1: Precipitation
    // =====================================================
    let precipPenalty = calculatePenalty(precipProbability, WEIGHTS.precipitation.thresholds);
    
    // Adjust for activity tolerance
    precipPenalty = Math.min(1, precipPenalty / profile.rainTolerance);
    
    // Extra penalty if it's actively raining/snowing
    if (weatherCondition.includes('rain') || weatherCondition.includes('snow')) {
        precipPenalty = Math.max(precipPenalty, 0.7);
    }
    
    const precipPoints = Math.round(WEIGHTS.precipitation.weight * precipPenalty);
    score -= precipPoints;
    
    factors.precipitation = {
        probability: precipProbability,
        amount: precipAmount,
        condition: weatherCondition,
        penalty: precipPoints,
        maxPenalty: WEIGHTS.precipitation.weight
    };
    
    if (precipProbability <= 10 && !weatherCondition.includes('rain')) {
        reasons.push('Dry conditions expected');
    } else if (precipProbability <= 30) {
        reasons.push(`Low rain chance (${precipProbability}%)`);
    } else if (precipProbability <= 60) {
        reasons.push(`Rain possible (${precipProbability}% chance)`);
    } else {
        reasons.push(`Rain likely (${precipProbability}%)`);
    }

    // =====================================================
    // FACTOR 2: Temperature
    // =====================================================
    const tempPenalty = calculateTemperaturePenalty(temperature, tempRange);
    const tempPoints = Math.round(WEIGHTS.temperature.weight * tempPenalty);
    score -= tempPoints;
    
    factors.temperature = {
        value: temperature,
        idealRange: tempRange,
        inIdealRange: temperature >= tempRange.min && temperature <= tempRange.max,
        penalty: tempPoints,
        maxPenalty: WEIGHTS.temperature.weight
    };
    
    if (temperature >= tempRange.min && temperature <= tempRange.max) {
        reasons.push(`Comfortable temperature (${Math.round(temperature)}°C)`);
    } else if (temperature < tempRange.min) {
        reasons.push(`Cool (${Math.round(temperature)}°C) - dress warmly`);
    } else {
        reasons.push(`Warm (${Math.round(temperature)}°C) - stay hydrated`);
    }

    // =====================================================
    // FACTOR 3: Wind
    // =====================================================
    let windPenalty = calculatePenalty(windSpeed, WEIGHTS.wind.thresholds);
    windPenalty = Math.min(1, windPenalty / profile.windTolerance);
    
    const windPoints = Math.round(WEIGHTS.wind.weight * windPenalty);
    score -= windPoints;
    
    factors.wind = {
        speed: windSpeed,
        penalty: windPoints,
        maxPenalty: WEIGHTS.wind.weight
    };
    
    if (windSpeed <= 15) {
        reasons.push('Light winds');
    } else if (windSpeed <= 30) {
        reasons.push(`Breezy (${Math.round(windSpeed)} km/h)`);
    } else if (windSpeed <= 45) {
        reasons.push(`Windy (${Math.round(windSpeed)} km/h)`);
    } else {
        reasons.push(`Very windy (${Math.round(windSpeed)} km/h) - caution advised`);
    }

    // =====================================================
    // FACTOR 4: Feels Like
    // =====================================================
    const feelsLikePenalty = WEIGHTS.feelsLike.getDifferencePenalty(temperature, feelsLike);
    const feelsLikePoints = Math.round(WEIGHTS.feelsLike.weight * feelsLikePenalty);
    score -= feelsLikePoints;
    
    factors.feelsLike = {
        value: feelsLike,
        difference: Math.round(feelsLike - temperature),
        penalty: feelsLikePoints,
        maxPenalty: WEIGHTS.feelsLike.weight
    };
    
    if (Math.abs(feelsLike - temperature) > 5) {
        if (feelsLike < temperature) {
            reasons.push(`Feels colder (${Math.round(feelsLike)}°C) due to wind chill`);
        } else {
            reasons.push(`Feels warmer (${Math.round(feelsLike)}°C) due to humidity`);
        }
    }

    // =====================================================
    // FACTOR 5: UV Index
    // =====================================================
    let uvPenalty = calculatePenalty(uvIndex, WEIGHTS.uvIndex.thresholds);
    uvPenalty = Math.min(1, uvPenalty * profile.uvSensitivity);
    
    const uvPoints = Math.round(WEIGHTS.uvIndex.weight * uvPenalty);
    score -= uvPoints;
    
    factors.uvIndex = {
        value: uvIndex,
        level: getUVLevel(uvIndex),
        penalty: uvPoints,
        maxPenalty: WEIGHTS.uvIndex.weight
    };
    
    if (uvIndex >= 6) {
        reasons.push(`High UV (${uvIndex}) - sun protection needed`);
    }

    // =====================================================
    // FACTOR 6: Visibility
    // =====================================================
    const visPenalty = calculateVisibilityPenalty(visibility);
    const visPoints = Math.round(WEIGHTS.visibility.weight * visPenalty);
    score -= visPoints;
    
    factors.visibility = {
        value: visibility,
        penalty: visPoints,
        maxPenalty: WEIGHTS.visibility.weight
    };
    
    if (visibility < 2000) {
        reasons.push('Poor visibility');
    }

    // =====================================================
    // FINAL SCORE
    // =====================================================
    score = Math.max(0, Math.min(100, score));

    return {
        score,
        rating: getOutdoorRating(score),
        activity: profile.name,
        factors,
        reasons: reasons.slice(0, 4),
        recommendation: getOutdoorRecommendation(score, factors, profile),
        hourSummary: getHourSummary(temperature, precipProbability, windSpeed),
        timestamp: new Date().toISOString()
    };
}

// =====================================================
// WINDOW DETECTION
// =====================================================

/**
 * Find best outdoor windows from hourly forecast
 */
function findOutdoorWindows(hourlyForecast, activity = 'default', options = {}) {
    const {
        minScore = 65,
        minDurationMinutes = 60,
        maxWindows = 3
    } = options;

    const windows = [];
    let currentWindow = null;

    for (let i = 0; i < hourlyForecast.length; i++) {
        const hour = hourlyForecast[i];
        
        const result = computeOutdoorScore({
            temperature: hour.temp ?? hour.temperature,
            feelsLike: hour.feels_like ?? hour.feelsLike ?? hour.temp,
            precipProbability: hour.pop ? hour.pop * 100 : (hour.precipProbability ?? 0),
            windSpeed: (hour.wind_speed ?? hour.windSpeed ?? 0) * 3.6, // m/s to km/h if needed
            humidity: hour.humidity ?? 50,
            uvIndex: hour.uvi ?? hour.uvIndex ?? 0,
            visibility: hour.visibility ?? 10000,
            weatherCondition: hour.weather?.[0]?.description ?? 'clear'
        }, activity);

        hour.outdoorScore = result.score;
        hour.outdoorFactors = result.factors;

        if (result.score >= minScore) {
            if (!currentWindow) {
                currentWindow = {
                    start: hour.datetime || new Date(hour.dt * 1000).toISOString(),
                    startIndex: i,
                    scores: [result.score],
                    temps: [hour.temp ?? hour.temperature],
                    hours: [hour]
                };
            } else {
                currentWindow.scores.push(result.score);
                currentWindow.temps.push(hour.temp ?? hour.temperature);
                currentWindow.hours.push(hour);
            }
        } else if (currentWindow) {
            currentWindow = finalizeOutdoorWindow(currentWindow, hourlyForecast[i - 1]);
            if (currentWindow.durationMinutes >= minDurationMinutes) {
                windows.push(currentWindow);
            }
            currentWindow = null;
        }
    }

    // Handle window extending to end
    if (currentWindow) {
        currentWindow = finalizeOutdoorWindow(currentWindow, hourlyForecast[hourlyForecast.length - 1]);
        if (currentWindow.durationMinutes >= minDurationMinutes) {
            windows.push(currentWindow);
        }
    }

    return windows.sort((a, b) => b.peakScore - a.peakScore).slice(0, maxWindows);
}

function finalizeOutdoorWindow(window, lastHour) {
    window.end = lastHour.datetime || new Date(lastHour.dt * 1000).toISOString();
    window.peakScore = Math.max(...window.scores);
    window.avgScore = Math.round(window.scores.reduce((a, b) => a + b, 0) / window.scores.length);
    window.avgTemp = Math.round(window.temps.reduce((a, b) => a + b, 0) / window.temps.length);
    window.durationMinutes = window.scores.length * 60;
    
    const peakIndex = window.scores.indexOf(window.peakScore);
    window.peakTime = window.hours[peakIndex]?.datetime;
    
    delete window.scores;
    delete window.temps;
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

function calculateTemperaturePenalty(temp, range) {
    if (temp >= range.min && temp <= range.max) {
        return 0;  // In ideal range
    }
    
    // Calculate how far outside the range
    let distance;
    if (temp < range.min) {
        distance = range.min - temp;
    } else {
        distance = temp - range.max;
    }
    
    // Penalty increases with distance from range
    if (distance <= 3) return 0.2;
    if (distance <= 6) return 0.4;
    if (distance <= 10) return 0.6;
    if (distance <= 15) return 0.8;
    return 1.0;
}

function calculateVisibilityPenalty(visibility) {
    for (const threshold of WEIGHTS.visibility.thresholds) {
        if (visibility >= threshold.min) {
            return threshold.penalty;
        }
    }
    return 1;
}

function getUVLevel(uvIndex) {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very High';
    return 'Extreme';
}

function getOutdoorRating(score) {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 55) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Not Recommended';
}

function getOutdoorRecommendation(score, factors, profile) {
    if (score >= 85) {
        return `Excellent conditions for ${profile.name.toLowerCase()}! Get outside and enjoy.`;
    }
    
    if (score >= 70) {
        let rec = `Good conditions for ${profile.name.toLowerCase()}.`;
        if (factors.precipitation.probability > 30) {
            rec += ' Pack a rain jacket just in case.';
        }
        return rec;
    }
    
    if (score >= 55) {
        if (factors.precipitation.probability > 50) {
            return 'Rain likely - consider rescheduling or bring waterproof gear.';
        }
        if (factors.wind.speed > 35) {
            return 'Quite windy - may be unpleasant for extended outdoor time.';
        }
        if (!factors.temperature.inIdealRange) {
            return `Temperature outside comfort zone - dress appropriately.`;
        }
        return `Fair conditions. Possible but not ideal for ${profile.name.toLowerCase()}.`;
    }
    
    if (score >= 40) {
        return 'Conditions are poor. Consider indoor alternatives.';
    }
    
    return 'Not recommended for outdoor activities today.';
}

function getHourSummary(temp, precip, wind) {
    const parts = [];
    parts.push(`${Math.round(temp)}°C`);
    if (precip > 30) parts.push(`${precip}% rain`);
    if (wind > 25) parts.push(`${Math.round(wind)}km/h wind`);
    return parts.join(', ');
}

/**
 * Prepare data for AI narrator
 */
function prepareOutdoorForAI(scoreResult, window, location, activity) {
    return {
        decision: scoreResult.score >= 70 ? 'yes' : scoreResult.score >= 50 ? 'maybe' : 'no',
        confidence: scoreResult.score >= 80 ? 'high' : scoreResult.score >= 60 ? 'medium' : 'low',
        activity: scoreResult.activity,
        location: { name: location.name },
        rating: scoreResult.rating,
        conditions: {
            temperature: `${Math.round(scoreResult.factors.temperature.value)}°C`,
            rain: `${scoreResult.factors.precipitation.probability}% chance`,
            wind: `${Math.round(scoreResult.factors.wind.speed)} km/h`
        },
        window: window ? {
            start: formatTime(window.start),
            end: formatTime(window.end),
            duration: `${Math.round(window.durationMinutes / 60)} hours`,
            avgTemp: `${window.avgTemp}°C`
        } : null,
        reasons: scoreResult.reasons,
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
    computeOutdoorScore,
    findOutdoorWindows,
    prepareOutdoorForAI,
    ACTIVITY_PROFILES,
    WEIGHTS
};