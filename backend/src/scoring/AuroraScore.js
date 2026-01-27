/**
 * AuroraScore Computation Module
 * 
 * Calculates a 0-100 score for aurora/northern lights viewing conditions.
 * Factors in geomagnetic activity (Kp index), darkness, cloud cover, and location latitude.
 * 
 * IMPORTANT: Aurora viewing depends heavily on:
 * 1. Kp Index (geomagnetic activity) - higher = more visible at lower latitudes
 * 2. Darkness - must be astronomically dark
 * 3. Cloud cover - need clear skies
 * 4. Latitude - Ireland (51-55°N) needs Kp 5+ typically
 */

// =====================================================
// SCORING WEIGHTS
// =====================================================
const WEIGHTS = {
    // Kp Index is critical - determines if aurora is even possible
    kpIndex: {
        weight: 40,
        // Kp thresholds for different latitudes
        // Ireland (53°N) typically needs Kp 5+ for visible aurora
        getMinKpForLatitude: (lat) => {
            const absLat = Math.abs(lat);
            if (absLat >= 66) return 1;    // Arctic circle - almost always visible
            if (absLat >= 62) return 2;    // Northern Scandinavia
            if (absLat >= 58) return 3;    // Scotland, Southern Norway
            if (absLat >= 55) return 4;    // Northern England, Denmark
            if (absLat >= 52) return 5;    // Ireland, Northern Germany
            if (absLat >= 48) return 6;    // Southern England, Northern France
            if (absLat >= 45) return 7;    // Paris, Munich
            return 8;                       // Southern Europe - rare
        }
    },
    
    // Must be dark - aurora not visible in twilight
    darkness: {
        weight: 25,
        // Sun altitude thresholds
        thresholds: {
            astronomical: -18,  // True darkness - best
            nautical: -12,      // Dark enough
            civil: -6,          // Too bright
            horizon: 0          // Way too bright
        }
    },
    
    // Cloud cover blocks the view
    cloudCover: {
        weight: 25,
        thresholds: [
            { max: 10, penalty: 0 },
            { max: 25, penalty: 0.3 },
            { max: 50, penalty: 0.6 },
            { max: 75, penalty: 0.85 },
            { max: 100, penalty: 1.0 }
        ]
    },
    
    // Light pollution / horizon clarity
    viewing: {
        weight: 10
    }
};

// =====================================================
// KP INDEX REFERENCE
// =====================================================
const KP_DESCRIPTIONS = {
    0: { level: 'Quiet', color: 'green', description: 'No geomagnetic activity' },
    1: { level: 'Quiet', color: 'green', description: 'Very low activity' },
    2: { level: 'Unsettled', color: 'green', description: 'Low activity' },
    3: { level: 'Unsettled', color: 'yellow', description: 'Moderate activity' },
    4: { level: 'Active', color: 'yellow', description: 'Elevated activity' },
    5: { level: 'Minor Storm', color: 'orange', description: 'G1 Minor Storm - Aurora visible at 55°N' },
    6: { level: 'Moderate Storm', color: 'orange', description: 'G2 Moderate Storm - Aurora visible at 50°N' },
    7: { level: 'Strong Storm', color: 'red', description: 'G3 Strong Storm - Aurora visible at 45°N' },
    8: { level: 'Severe Storm', color: 'red', description: 'G4 Severe Storm - Widespread aurora' },
    9: { level: 'Extreme Storm', color: 'red', description: 'G5 Extreme Storm - Rare, aurora at low latitudes' }
};

// =====================================================
// MAIN SCORING FUNCTION
// =====================================================

/**
 * Compute AuroraScore for given conditions
 * 
 * @param {Object} conditions
 * @param {number} conditions.kpIndex - Current Kp index (0-9)
 * @param {number} conditions.latitude - Location latitude
 * @param {number} conditions.cloudCover - Cloud coverage 0-100%
 * @param {number} conditions.sunAltitude - Sun altitude in degrees
 * @param {boolean} conditions.isDark - Is it astronomically dark?
 * @param {number} [conditions.forecastKp] - Forecasted Kp (if available)
 * 
 * @returns {Object} Score result with breakdown
 */
function computeAuroraScore(conditions) {
    const {
        kpIndex = 0,
        latitude = 53.3,  // Default to Dublin
        cloudCover = 50,
        sunAltitude = 0,
        isDark = false,
        forecastKp = null
    } = conditions;

    let score = 100;
    const factors = {};
    const reasons = [];

    // =====================================================
    // FACTOR 1: Kp Index vs Latitude (most important)
    // =====================================================
    const minKpNeeded = WEIGHTS.kpIndex.getMinKpForLatitude(latitude);
    const kpDifference = kpIndex - minKpNeeded;
    
    let kpPenalty = 0;
    if (kpDifference < -2) {
        kpPenalty = 1.0;  // Way below threshold
    } else if (kpDifference < -1) {
        kpPenalty = 0.85;
    } else if (kpDifference < 0) {
        kpPenalty = 0.6;  // Just below threshold
    } else if (kpDifference === 0) {
        kpPenalty = 0.3;  // At threshold - possible but not guaranteed
    } else {
        kpPenalty = 0;    // Above threshold - good!
    }
    
    const kpPoints = Math.round(WEIGHTS.kpIndex.weight * kpPenalty);
    score -= kpPoints;
    
    const kpInfo = KP_DESCRIPTIONS[Math.min(Math.floor(kpIndex), 9)];
    factors.kpIndex = {
        value: kpIndex,
        minNeeded: minKpNeeded,
        difference: kpDifference,
        level: kpInfo.level,
        description: kpInfo.description,
        penalty: kpPoints,
        maxPenalty: WEIGHTS.kpIndex.weight
    };
    
    if (kpIndex >= minKpNeeded + 1) {
        reasons.push(`Strong aurora activity (Kp ${kpIndex}) - excellent for your latitude`);
    } else if (kpIndex >= minKpNeeded) {
        reasons.push(`Kp ${kpIndex} - aurora possible at your latitude`);
    } else if (kpIndex >= minKpNeeded - 1) {
        reasons.push(`Kp ${kpIndex} - slightly below ideal (need Kp ${minKpNeeded}+)`);
    } else {
        reasons.push(`Kp ${kpIndex} too low - need Kp ${minKpNeeded}+ for your latitude`);
    }

    // =====================================================
    // FACTOR 2: Darkness (must be dark!)
    // =====================================================
    let darknessPenalty = 0;
    let twilightPhase = 'day';
    
    if (sunAltitude < WEIGHTS.darkness.thresholds.astronomical) {
        darknessPenalty = 0;
        twilightPhase = 'astronomical';
    } else if (sunAltitude < WEIGHTS.darkness.thresholds.nautical) {
        darknessPenalty = 0.2;
        twilightPhase = 'nautical';
    } else if (sunAltitude < WEIGHTS.darkness.thresholds.civil) {
        darknessPenalty = 0.7;
        twilightPhase = 'civil';
    } else if (sunAltitude < WEIGHTS.darkness.thresholds.horizon) {
        darknessPenalty = 0.9;
        twilightPhase = 'horizon';
    } else {
        darknessPenalty = 1.0;
        twilightPhase = 'day';
    }
    
    const darknessPoints = Math.round(WEIGHTS.darkness.weight * darknessPenalty);
    score -= darknessPoints;
    
    factors.darkness = {
        sunAltitude,
        twilightPhase,
        isDark: sunAltitude < WEIGHTS.darkness.thresholds.nautical,
        penalty: darknessPoints,
        maxPenalty: WEIGHTS.darkness.weight
    };
    
    if (twilightPhase === 'astronomical') {
        reasons.push('Astronomically dark - ideal for aurora viewing');
    } else if (twilightPhase === 'nautical') {
        reasons.push('Dark enough for aurora viewing');
    } else if (twilightPhase === 'day') {
        reasons.push('Too bright - wait for darkness');
    } else {
        reasons.push(`${twilightPhase} twilight - not dark enough yet`);
    }

    // =====================================================
    // FACTOR 3: Cloud Cover
    // =====================================================
    const cloudPenalty = calculatePenalty(cloudCover, WEIGHTS.cloudCover.thresholds);
    const cloudPoints = Math.round(WEIGHTS.cloudCover.weight * cloudPenalty);
    score -= cloudPoints;
    
    factors.cloudCover = {
        value: cloudCover,
        penalty: cloudPoints,
        maxPenalty: WEIGHTS.cloudCover.weight
    };
    
    if (cloudCover <= 20) {
        reasons.push(`Clear skies (${cloudCover}% clouds)`);
    } else if (cloudCover <= 50) {
        reasons.push(`Partly cloudy (${cloudCover}%) - gaps may allow viewing`);
    } else {
        reasons.push(`Cloudy (${cloudCover}%) - may block aurora`);
    }

    // =====================================================
    // FACTOR 4: Viewing conditions (simplified)
    // =====================================================
    // In a full implementation, this would factor in:
    // - Light pollution at location
    // - Northern horizon clarity
    // - Moon interference (less critical than for stars)
    const viewingPenalty = 0;  // Placeholder
    const viewingPoints = Math.round(WEIGHTS.viewing.weight * viewingPenalty);
    score -= viewingPoints;
    
    factors.viewing = {
        penalty: viewingPoints,
        maxPenalty: WEIGHTS.viewing.weight
    };

    // =====================================================
    // FINAL SCORE
    // =====================================================
    score = Math.max(0, Math.min(100, score));
    
    // Special case: If Kp is way too low, cap the score
    if (kpIndex < minKpNeeded - 1) {
        score = Math.min(score, 30);
    }
    
    // Special case: If not dark, cap the score
    if (sunAltitude > WEIGHTS.darkness.thresholds.civil) {
        score = Math.min(score, 25);
    }

    return {
        score,
        rating: getAuroraRating(score, kpIndex, minKpNeeded),
        factors,
        reasons: reasons.slice(0, 4),
        recommendation: getAuroraRecommendation(score, kpIndex, minKpNeeded, cloudCover, isDark),
        alert: shouldAlert(kpIndex, minKpNeeded, cloudCover, isDark),
        timestamp: new Date().toISOString()
    };
}

// =====================================================
// AURORA ALERTS
// =====================================================

/**
 * Determine if an aurora alert should be sent
 */
function shouldAlert(kpIndex, minKpNeeded, cloudCover, isDark) {
    // Alert if Kp is at or above threshold AND conditions are viewable
    if (kpIndex >= minKpNeeded && cloudCover <= 50 && isDark) {
        return {
            shouldSend: true,
            priority: kpIndex >= minKpNeeded + 2 ? 'high' : 'normal',
            message: kpIndex >= minKpNeeded + 2 
                ? 'Strong aurora activity! Excellent chance of sighting!'
                : 'Aurora possible tonight - worth checking the sky'
        };
    }
    
    // Alert for exceptional Kp even if clouds
    if (kpIndex >= 7) {
        return {
            shouldSend: true,
            priority: 'high',
            message: `Rare strong geomagnetic storm (Kp ${kpIndex})! Check for cloud breaks.`
        };
    }
    
    return { shouldSend: false };
}

// =====================================================
// WINDOW DETECTION FOR AURORA
// =====================================================

/**
 * Find aurora viewing windows from hourly forecast
 */
function findAuroraWindows(hourlyForecast, latitude, kpForecast = null) {
    const minKpNeeded = WEIGHTS.kpIndex.getMinKpForLatitude(latitude);
    const windows = [];
    let currentWindow = null;

    // Use constant Kp if no forecast array provided
    const getKpForHour = (index) => {
        if (Array.isArray(kpForecast)) {
            return kpForecast[index] ?? kpForecast[kpForecast.length - 1] ?? 3;
        }
        return kpForecast ?? 3;
    };

    for (let i = 0; i < hourlyForecast.length; i++) {
        const hour = hourlyForecast[i];
        const kp = getKpForHour(i);
        
        const result = computeAuroraScore({
            kpIndex: kp,
            latitude,
            cloudCover: hour.clouds ?? hour.cloudCover ?? 50,
            sunAltitude: hour.sunAltitude ?? -20,
            isDark: hour.isDark ?? true
        });

        hour.auroraScore = result.score;
        hour.auroraFactors = result.factors;

        // Window threshold: score >= 60 AND must be dark
        const isGoodWindow = result.score >= 60 && result.factors.darkness.isDark;

        if (isGoodWindow) {
            if (!currentWindow) {
                currentWindow = {
                    start: hour.datetime,
                    startIndex: i,
                    scores: [result.score],
                    kpValues: [kp],
                    hours: [hour]
                };
            } else {
                currentWindow.scores.push(result.score);
                currentWindow.kpValues.push(kp);
                currentWindow.hours.push(hour);
            }
        } else if (currentWindow) {
            currentWindow = finalizeAuroraWindow(currentWindow, hourlyForecast[i - 1]);
            if (currentWindow.durationMinutes >= 30) {
                windows.push(currentWindow);
            }
            currentWindow = null;
        }
    }

    // Handle window extending to end
    if (currentWindow) {
        currentWindow = finalizeAuroraWindow(currentWindow, hourlyForecast[hourlyForecast.length - 1]);
        if (currentWindow.durationMinutes >= 30) {
            windows.push(currentWindow);
        }
    }

    return windows.sort((a, b) => b.peakScore - a.peakScore).slice(0, 3);
}

function finalizeAuroraWindow(window, lastHour) {
    window.end = lastHour.datetime;
    window.peakScore = Math.max(...window.scores);
    window.avgScore = Math.round(window.scores.reduce((a, b) => a + b, 0) / window.scores.length);
    window.maxKp = Math.max(...window.kpValues);
    window.durationMinutes = window.scores.length * 60;
    
    const peakIndex = window.scores.indexOf(window.peakScore);
    window.peakTime = window.hours[peakIndex]?.datetime;
    
    delete window.scores;
    delete window.kpValues;
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

function getAuroraRating(score, kpIndex, minKpNeeded) {
    if (score >= 85 && kpIndex >= minKpNeeded + 1) return 'Excellent';
    if (score >= 70 && kpIndex >= minKpNeeded) return 'Good';
    if (score >= 55) return 'Possible';
    if (score >= 40) return 'Unlikely';
    return 'Not Visible';
}

function getAuroraRecommendation(score, kpIndex, minKpNeeded, cloudCover, isDark) {
    if (!isDark) {
        return "Wait for darkness. Aurora is only visible at night.";
    }
    
    if (kpIndex < minKpNeeded - 1) {
        return `Geomagnetic activity too low for your latitude. Need Kp ${minKpNeeded}+ (currently Kp ${kpIndex}).`;
    }
    
    if (cloudCover > 70) {
        return "Too cloudy to see aurora even if it's active. Wait for clearer skies.";
    }
    
    if (score >= 80) {
        return "Excellent conditions! Head to a dark location with a clear northern horizon.";
    }
    
    if (score >= 65) {
        return "Good chance of aurora. Find a spot away from light pollution with a view north.";
    }
    
    if (score >= 50) {
        return "Aurora possible but not guaranteed. Worth checking if you're already in a dark area.";
    }
    
    return "Conditions not favorable for aurora viewing tonight.";
}

/**
 * Prepare data for AI narrator
 */
function prepareAuroraForAI(scoreResult, window, location) {
    return {
        decision: scoreResult.score >= 65 ? 'yes' : scoreResult.score >= 45 ? 'maybe' : 'no',
        confidence: scoreResult.score >= 80 ? 'high' : scoreResult.score >= 60 ? 'medium' : 'low',
        location: {
            name: location.name,
            latitude: location.latitude
        },
        rating: scoreResult.rating,
        kp: {
            current: scoreResult.factors.kpIndex.value,
            needed: scoreResult.factors.kpIndex.minNeeded,
            level: scoreResult.factors.kpIndex.level
        },
        window: window ? {
            start: formatTime(window.start),
            end: formatTime(window.end),
            duration: `${Math.round(window.durationMinutes / 60)} hours`,
            maxKp: window.maxKp
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
    computeAuroraScore,
    findAuroraWindows,
    prepareAuroraForAI,
    shouldAlert,
    KP_DESCRIPTIONS,
    WEIGHTS
};