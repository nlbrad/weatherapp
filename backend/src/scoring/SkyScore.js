/**
 * SkyScore.js - Stargazing conditions calculator
 * 
 * Calculates a score from 0-100 indicating how good conditions are
 * for stargazing/astronomy based on weather data.
 * 
 * Factors:
 * - Cloud cover (40%) - Most important, can't see through clouds
 * - Moon phase/illumination (25%) - Bright moon washes out stars
 * - Humidity (15%) - High humidity causes haze
 * - Wind speed (10%) - Affects telescope stability
 * - Visibility (10%) - Atmospheric clarity
 * 
 * FIXED: Added null/undefined checks to prevent NaN scores
 */

/**
 * Calculate the SkyScore for stargazing conditions
 * 
 * @param {Object} weather - Current weather data
 * @param {number} weather.clouds - Cloud cover percentage (0-100)
 * @param {number} weather.humidity - Humidity percentage (0-100)
 * @param {number} weather.visibility - Visibility in meters
 * @param {number} weather.windSpeed - Wind speed in m/s
 * @param {Object} moonData - Moon information
 * @param {number} moonData.phase - Moon phase (0-1, where 0=new, 0.5=full)
 * @returns {Object} SkyScore result with score and breakdown
 */
function calculateSkyScore(weather, moonData) {
    // Ensure we have valid inputs with sensible defaults
    const clouds = weather?.clouds ?? 50;
    const humidity = weather?.humidity ?? 70;
    const visibility = weather?.visibility ?? 10000;
    const windSpeed = weather?.windSpeed ?? 5;
    const moonPhase = moonData?.phase ?? 0.5;

    // Component scores (each 0-100)
    const cloudScore = calculateCloudScore(clouds);
    const moonScore = calculateMoonScore(moonPhase);
    const humidityScore = calculateHumidityScore(humidity);
    const windScore = calculateWindScore(windSpeed);
    const visibilityScore = calculateVisibilityScore(visibility);

    // Weighted average
    const totalScore = Math.round(
        cloudScore * 0.40 +
        moonScore * 0.25 +
        humidityScore * 0.15 +
        windScore * 0.10 +
        visibilityScore * 0.10
    );

    // Final safety check - ensure score is a valid number between 0-100
    const finalScore = Number.isNaN(totalScore) ? 50 : Math.max(0, Math.min(100, totalScore));

    // Determine rating
    const rating = getRating(finalScore);

    return {
        score: finalScore,
        rating: rating,
        breakdown: {
            clouds: { score: cloudScore, value: clouds, weight: 40 },
            moon: { score: moonScore, value: moonPhase, weight: 25 },
            humidity: { score: humidityScore, value: humidity, weight: 15 },
            wind: { score: windScore, value: windSpeed, weight: 10 },
            visibility: { score: visibilityScore, value: visibility, weight: 10 }
        },
        moonPhase: getMoonPhaseName(moonPhase),
        moonIllumination: Math.round(getMoonIllumination(moonPhase) * 100)
    };
}

/**
 * Cloud score - Lower clouds = higher score
 * @param {number} cloudPercent - Cloud cover 0-100%
 * @returns {number} Score 0-100
 */
function calculateCloudScore(cloudPercent) {
    // Handle undefined/null/NaN - default to 50% (moderate clouds)
    if (cloudPercent === undefined || cloudPercent === null || Number.isNaN(cloudPercent)) {
        cloudPercent = 50;
    }
    // Clamp to valid range
    cloudPercent = Math.max(0, Math.min(100, cloudPercent));
    // 0% clouds = 100 score, 100% clouds = 0 score
    return Math.max(0, 100 - cloudPercent);
}

/**
 * Moon score - New moon = best, full moon = worst
 * @param {number} moonPhase - Phase 0-1 (0=new, 0.5=full)
 * @returns {number} Score 0-100
 */
function calculateMoonScore(moonPhase) {
    // Handle undefined/null/NaN - default to 0.5 (half moon)
    if (moonPhase === undefined || moonPhase === null || Number.isNaN(moonPhase)) {
        moonPhase = 0.5;
    }
    // Clamp to valid range (0-1)
    moonPhase = Math.max(0, Math.min(1, moonPhase));
    
    // moonPhase: 0 or 1 = new moon, 0.5 = full moon
    // Distance from full moon (0.5)
    const distanceFromFull = Math.abs(moonPhase - 0.5);
    // Convert to 0-100 scale (0.5 distance = 100 score)
    return Math.round(distanceFromFull * 200);
}

/**
 * Get moon illumination percentage from phase
 * @param {number} moonPhase - Phase 0-1
 * @returns {number} Illumination 0-1
 */
function getMoonIllumination(moonPhase) {
    // Handle undefined/null/NaN
    if (moonPhase === undefined || moonPhase === null || Number.isNaN(moonPhase)) {
        moonPhase = 0.5;
    }
    // Clamp to valid range
    moonPhase = Math.max(0, Math.min(1, moonPhase));
    
    // Approximate illumination based on phase
    // 0 or 1 = 0% (new), 0.5 = 100% (full)
    const distanceFromNew = Math.abs(moonPhase <= 0.5 ? moonPhase : 1 - moonPhase);
    return distanceFromNew * 2;
}

/**
 * Humidity score - Lower humidity = higher score
 * @param {number} humidity - Humidity 0-100%
 * @returns {number} Score 0-100
 */
function calculateHumidityScore(humidity) {
    // Handle undefined/null/NaN - default to 70% (typical humidity)
    if (humidity === undefined || humidity === null || Number.isNaN(humidity)) {
        humidity = 70;
    }
    // Clamp to valid range
    humidity = Math.max(0, Math.min(100, humidity));
    
    // Below 50% is ideal, above 80% is bad
    if (humidity <= 50) return 100;
    if (humidity >= 90) return 0;
    // Linear scale between 50-90%
    return Math.round(100 - ((humidity - 50) * 2.5));
}

/**
 * Wind score - Calm = best for telescopes
 * @param {number} windSpeedMs - Wind speed in m/s
 * @returns {number} Score 0-100
 */
function calculateWindScore(windSpeedMs) {
    // Handle undefined/null/NaN - default to 5 m/s (light breeze)
    if (windSpeedMs === undefined || windSpeedMs === null || Number.isNaN(windSpeedMs)) {
        windSpeedMs = 5;
    }
    // Ensure non-negative
    windSpeedMs = Math.max(0, windSpeedMs);
    
    // Convert m/s to km/h for easier reasoning
    const windKmh = windSpeedMs * 3.6;
    
    // Below 10 km/h is ideal
    if (windKmh <= 10) return 100;
    // Above 40 km/h is problematic
    if (windKmh >= 40) return 0;
    // Linear scale between 10-40 km/h
    return Math.round(100 - ((windKmh - 10) * 3.33));
}

/**
 * Visibility score - Higher visibility = better
 * @param {number} visibilityMeters - Visibility in meters
 * @returns {number} Score 0-100
 */
function calculateVisibilityScore(visibilityMeters) {
    // Handle undefined/null/NaN - default to 10000m (10km, good visibility)
    if (visibilityMeters === undefined || visibilityMeters === null || Number.isNaN(visibilityMeters)) {
        visibilityMeters = 10000;
    }
    // Ensure non-negative
    visibilityMeters = Math.max(0, visibilityMeters);
    
    // 10km+ is excellent
    if (visibilityMeters >= 10000) return 100;
    // Below 1km is poor
    if (visibilityMeters <= 1000) return 0;
    // Linear scale between 1-10km
    return Math.round((visibilityMeters - 1000) / 90);
}

/**
 * Get rating description from score
 * @param {number} score - Score 0-100
 * @returns {string} Rating text
 */
function getRating(score) {
    // Handle invalid scores
    if (score === undefined || score === null || Number.isNaN(score)) {
        return 'Unknown';
    }
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 35) return 'Poor';
    return 'Bad';
}

/**
 * Get moon phase name from phase value
 * @param {number} phase - Phase 0-1
 * @returns {string} Phase name
 */
function getMoonPhaseName(phase) {
    // Handle invalid phase
    if (phase === undefined || phase === null || Number.isNaN(phase)) {
        return 'Unknown';
    }
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
}

module.exports = {
    calculateSkyScore,
    calculateCloudScore,
    calculateMoonScore,
    calculateHumidityScore,
    calculateWindScore,
    calculateVisibilityScore,
    getMoonPhaseName,
    getMoonIllumination,
    getRating
};