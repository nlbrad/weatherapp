/**
 * OutdoorScore Computation Module
 *
 * Calculates a 0-100 score for general outdoor activities.
 * Use cases: Hiking, cycling, walking, picnics, outdoor sports
 *
 * Key factors:
 * 1. Precipitation - rain/snow ruins most outdoor activities (heaviest weight)
 * 2. Temperature - uses feels-like as primary, with comfort band
 * 3. Wind - high winds are unpleasant/dangerous
 * 4. UV Index - for longer activities
 * 5. Visibility - fog/mist
 */

// =====================================================
// SCORING WEIGHTS
// =====================================================
const WEIGHTS = {
    // Precipitation is the biggest factor — active rain should tank the score
    precipitation: {
        weight: 35,
        // Probability-based penalty (when not actively raining)
        probabilityThresholds: [
            { max: 10, penalty: 0 },       // Dry
            { max: 25, penalty: 0.15 },    // Slight chance
            { max: 40, penalty: 0.35 },    // Possible
            { max: 55, penalty: 0.55 },    // Likely
            { max: 70, penalty: 0.75 },    // Very likely
            { max: 85, penalty: 0.9 },     // Almost certain
            { max: 100, penalty: 1.0 }     // Certain
        ],
        // Active rainfall intensity penalty (mm/h)
        intensityThresholds: [
            { max: 0, penalty: 0 },        // No rain
            { max: 0.5, penalty: 0.6 },    // Drizzle
            { max: 2, penalty: 0.8 },      // Light rain
            { max: 5, penalty: 0.9 },      // Moderate rain
            { max: 100, penalty: 1.0 }     // Heavy rain
        ]
    },

    // Temperature comfort — scored on feels-like temperature
    temperature: {
        weight: 30,
        defaults: {
            ideal: { min: 14, max: 22 },       // Perfect range
            comfortable: { min: 10, max: 26 },  // Good range
        }
    },

    // Wind
    wind: {
        weight: 20,
        thresholds: [
            { max: 12, penalty: 0 },       // Calm/light
            { max: 20, penalty: 0.15 },    // Gentle breeze
            { max: 30, penalty: 0.35 },    // Moderate
            { max: 40, penalty: 0.6 },     // Strong
            { max: 50, penalty: 0.8 },     // Very strong
            { max: 100, penalty: 1.0 }     // Dangerous
        ]
    },

    // UV Index
    uvIndex: {
        weight: 10,
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
        tempRange: { min: 6, max: 24 },
        windTolerance: 1.2,      // More tolerant of wind
        rainTolerance: 0.8,      // Less tolerant of rain
        uvSensitivity: 1.5       // More sun exposure
    },
    cycling: {
        name: 'Cycling',
        tempRange: { min: 8, max: 26 },
        windTolerance: 0.7,      // Less tolerant (headwinds)
        rainTolerance: 0.6,      // Much less tolerant
        uvSensitivity: 1.2
    },
    walking: {
        name: 'Walking',
        tempRange: { min: 6, max: 26 },
        windTolerance: 1.0,
        rainTolerance: 0.9,
        uvSensitivity: 1.0
    },
    running: {
        name: 'Running',
        tempRange: { min: 3, max: 20 },   // Runners prefer cooler
        windTolerance: 0.9,
        rainTolerance: 0.7,
        uvSensitivity: 1.3
    },
    picnic: {
        name: 'Picnic',
        tempRange: { min: 15, max: 27 },
        windTolerance: 0.6,      // Wind ruins picnics
        rainTolerance: 0.3,      // Rain definitely ruins picnics
        uvSensitivity: 1.0
    },
    default: {
        name: 'General Outdoor',
        tempRange: { min: 10, max: 24 },
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
 * @param {number} conditions.precipAmount - Precipitation amount in mm/h
 * @param {number} conditions.windSpeed - Wind speed in km/h
 * @param {number} conditions.humidity - Humidity 0-100%
 * @param {number} conditions.uvIndex - UV index 0-11+
 * @param {number} conditions.visibility - Visibility in meters
 * @param {string} conditions.weatherCondition - e.g., 'clear', 'light rain', 'heavy rain'
 * @param {string} [activity='default'] - Activity type
 * @param {Object} [userPrefs] - User preferences for temp ranges
 *
 * @returns {Object} Score result with breakdown
 */
function computeOutdoorScore(conditions, activity = 'default', userPrefs = {}) {
    const {
        temperature = 15,
        feelsLike = temperature,
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

    // Use feels-like as the effective temperature for scoring
    const effectiveTemp = feelsLike;

    let score = 100;
    const factors = {};
    const reasons = [];
    const condLower = weatherCondition.toLowerCase();

    // =====================================================
    // FACTOR 1: Precipitation (weight: 35)
    // =====================================================
    const isActivelyRaining = condLower.includes('rain') || condLower.includes('drizzle');
    const isSnowing = condLower.includes('snow') || condLower.includes('sleet');
    const isActivePrecip = isActivelyRaining || isSnowing;

    let precipPenalty;
    if (isActivePrecip) {
        // When it's actively raining, use the intensity-based penalty (much harsher)
        const intensityPenalty = calculatePenalty(precipAmount, WEIGHTS.precipitation.intensityThresholds);
        // Minimum penalty of 0.6 for any active rain — it IS raining
        precipPenalty = Math.max(0.6, intensityPenalty);
    } else {
        // Not currently raining — use probability
        precipPenalty = calculatePenalty(precipProbability, WEIGHTS.precipitation.probabilityThresholds);
    }

    // Adjust for activity tolerance (lower tolerance = higher penalty)
    precipPenalty = Math.min(1, precipPenalty / profile.rainTolerance);

    const precipPoints = Math.round(WEIGHTS.precipitation.weight * precipPenalty);
    score -= precipPoints;

    factors.precipitation = {
        probability: precipProbability,
        amount: precipAmount,
        condition: weatherCondition,
        isActive: isActivePrecip,
        penalty: precipPoints,
        maxPenalty: WEIGHTS.precipitation.weight
    };

    if (isActivePrecip) {
        if (precipAmount >= 2) {
            reasons.push(`Raining (${precipAmount.toFixed(1)}mm/h)`);
        } else if (condLower.includes('drizzle')) {
            reasons.push('Drizzle');
        } else {
            reasons.push('Rain');
        }
    } else if (precipProbability <= 10) {
        reasons.push('Dry conditions expected');
    } else if (precipProbability <= 30) {
        reasons.push(`Low rain chance (${precipProbability}%)`);
    } else if (precipProbability <= 60) {
        reasons.push(`Rain possible (${precipProbability}% chance)`);
    } else {
        reasons.push(`Rain likely (${precipProbability}%)`);
    }

    // =====================================================
    // FACTOR 2: Temperature — based on feels-like (weight: 30)
    // =====================================================
    const tempPenalty = calculateTemperaturePenalty(effectiveTemp, tempRange);
    const tempPoints = Math.round(WEIGHTS.temperature.weight * tempPenalty);
    score -= tempPoints;

    factors.temperature = {
        actual: temperature,
        feelsLike: feelsLike,
        effective: effectiveTemp,
        idealRange: tempRange,
        inIdealRange: effectiveTemp >= tempRange.min && effectiveTemp <= tempRange.max,
        penalty: tempPoints,
        maxPenalty: WEIGHTS.temperature.weight
    };

    if (effectiveTemp >= tempRange.min && effectiveTemp <= tempRange.max) {
        reasons.push(`Comfortable (feels like ${Math.round(effectiveTemp)}°C)`);
    } else if (effectiveTemp < tempRange.min) {
        const diff = tempRange.min - effectiveTemp;
        if (diff > 8) {
            reasons.push(`Very cold (feels like ${Math.round(effectiveTemp)}°C)`);
        } else {
            reasons.push(`Cool (feels like ${Math.round(effectiveTemp)}°C)`);
        }
    } else {
        reasons.push(`Hot (feels like ${Math.round(effectiveTemp)}°C)`);
    }

    // =====================================================
    // FACTOR 3: Wind (weight: 20)
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

    if (windSpeed <= 12) {
        reasons.push('Calm winds');
    } else if (windSpeed <= 25) {
        reasons.push(`Breezy (${Math.round(windSpeed)} km/h)`);
    } else if (windSpeed <= 40) {
        reasons.push(`Windy (${Math.round(windSpeed)} km/h)`);
    } else {
        reasons.push(`Very windy (${Math.round(windSpeed)} km/h) - caution advised`);
    }

    // =====================================================
    // FACTOR 4: UV Index (weight: 10)
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
    // FACTOR 5: Visibility (weight: 5)
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
    // COMBINED MISERY BONUS — multiple bad factors compound
    // =====================================================
    // If it's raining AND cold AND windy, it's worse than the sum of parts
    const badFactorCount = [
        isActivePrecip,
        effectiveTemp < (tempRange.min - 3),
        windSpeed > 30,
    ].filter(Boolean).length;

    if (badFactorCount >= 2) {
        const miseryPenalty = badFactorCount * 5; // -10 or -15 extra
        score -= miseryPenalty;
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
        hourSummary: getHourSummary(effectiveTemp, precipProbability, windSpeed, isActivePrecip),
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
            precipAmount: hour.rain?.['1h'] ?? hour.rain ?? 0,
            windSpeed: (hour.wind_speed ?? hour.windSpeed ?? 0) * 3.6,
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
        return 0;  // In ideal range — no penalty
    }

    // How far outside the range
    let distance;
    if (temp < range.min) {
        distance = range.min - temp;
    } else {
        distance = temp - range.max;
    }

    // Graduated penalty — steeper than before
    if (distance <= 2) return 0.15;
    if (distance <= 4) return 0.3;
    if (distance <= 6) return 0.5;
    if (distance <= 8) return 0.65;
    if (distance <= 10) return 0.8;
    if (distance <= 15) return 0.9;
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
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 35) return 'Poor';
    return 'Not Recommended';
}

function getOutdoorRecommendation(score, factors, profile) {
    if (score >= 80) {
        return `Excellent conditions for ${profile.name.toLowerCase()}! Get outside and enjoy.`;
    }

    if (score >= 65) {
        let rec = `Good conditions for ${profile.name.toLowerCase()}.`;
        if (factors.precipitation.probability > 30 || factors.precipitation.isActive) {
            rec += ' Pack a rain jacket just in case.';
        }
        return rec;
    }

    if (score >= 50) {
        if (factors.precipitation.isActive) {
            return 'Currently raining - consider waiting for a dry window.';
        }
        if (factors.precipitation.probability > 50) {
            return 'Rain likely - consider rescheduling or bring waterproof gear.';
        }
        if (factors.wind.speed > 35) {
            return 'Quite windy - may be unpleasant for extended outdoor time.';
        }
        if (!factors.temperature.inIdealRange) {
            return `Temperature outside comfort zone (feels like ${Math.round(factors.temperature.feelsLike)}°C) - dress appropriately.`;
        }
        return `Fair conditions. Possible but not ideal for ${profile.name.toLowerCase()}.`;
    }

    if (score >= 35) {
        if (factors.precipitation.isActive) {
            return 'Rain and poor conditions - indoor alternatives recommended.';
        }
        return 'Conditions are poor. Consider indoor alternatives.';
    }

    return 'Not recommended for outdoor activities right now.';
}

function getHourSummary(effectiveTemp, precip, wind, isRaining) {
    const parts = [];
    parts.push(`Feels ${Math.round(effectiveTemp)}°C`);
    if (isRaining) {
        parts.push('raining');
    } else if (precip > 30) {
        parts.push(`${precip}% rain`);
    }
    if (wind > 25) parts.push(`${Math.round(wind)}km/h wind`);
    return parts.join(', ');
}

/**
 * Prepare data for AI narrator
 */
function prepareOutdoorForAI(scoreResult, window, location, activity) {
    return {
        decision: scoreResult.score >= 65 ? 'yes' : scoreResult.score >= 45 ? 'maybe' : 'no',
        confidence: scoreResult.score >= 75 ? 'high' : scoreResult.score >= 55 ? 'medium' : 'low',
        activity: scoreResult.activity,
        location: { name: location.name },
        rating: scoreResult.rating,
        conditions: {
            temperature: `${Math.round(scoreResult.factors.temperature.actual)}°C`,
            feelsLike: `${Math.round(scoreResult.factors.temperature.feelsLike)}°C`,
            rain: scoreResult.factors.precipitation.isActive
                ? `Active (${scoreResult.factors.precipitation.amount}mm/h)`
                : `${scoreResult.factors.precipitation.probability}% chance`,
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
