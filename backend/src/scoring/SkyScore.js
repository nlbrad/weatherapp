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
 * @param {number} moonData.moonrise - Moonrise timestamp
 * @param {number} moonData.moonset - Moonset timestamp
 * @returns {Object} SkyScore result with score and breakdown
 */
function calculateSkyScore(weather, moonData) {
    // Component scores (each 0-100)
    const cloudScore = calculateCloudScore(weather.clouds);
    const moonScore = calculateMoonScore(moonData.phase);
    const humidityScore = calculateHumidityScore(weather.humidity);
    const windScore = calculateWindScore(weather.windSpeed);
    const visibilityScore = calculateVisibilityScore(weather.visibility);

    // Weighted average
    const totalScore = Math.round(
        cloudScore * 0.40 +
        moonScore * 0.25 +
        humidityScore * 0.15 +
        windScore * 0.10 +
        visibilityScore * 0.10
    );

    // Determine rating
    const rating = getRating(totalScore);

    return {
        score: totalScore,
        rating: rating,
        breakdown: {
            clouds: { score: cloudScore, value: weather.clouds, weight: 40 },
            moon: { score: moonScore, value: moonData.phase, weight: 25 },
            humidity: { score: humidityScore, value: weather.humidity, weight: 15 },
            wind: { score: windScore, value: weather.windSpeed, weight: 10 },
            visibility: { score: visibilityScore, value: weather.visibility, weight: 10 }
        },
        moonPhase: getMoonPhaseName(moonData.phase),
        moonIllumination: Math.round(getMoonIllumination(moonData.phase) * 100)
    };
}

/**
 * Cloud score - Lower clouds = higher score
 */
function calculateCloudScore(cloudPercent) {
    // 0% clouds = 100 score, 100% clouds = 0 score
    return Math.max(0, 100 - cloudPercent);
}

/**
 * Moon score - New moon = best, full moon = worst
 */
function calculateMoonScore(moonPhase) {
    // moonPhase: 0 or 1 = new moon, 0.5 = full moon
    // Distance from full moon (0.5)
    const distanceFromFull = Math.abs(moonPhase - 0.5);
    // Convert to 0-100 scale (0.5 distance = 100 score)
    return Math.round(distanceFromFull * 200);
}

/**
 * Get moon illumination percentage from phase
 */
function getMoonIllumination(moonPhase) {
    // Approximate illumination based on phase
    // 0 or 1 = 0% (new), 0.5 = 100% (full)
    const distanceFromNew = Math.abs(moonPhase <= 0.5 ? moonPhase : 1 - moonPhase);
    return distanceFromNew * 2;
}

/**
 * Humidity score - Lower humidity = higher score
 */
function calculateHumidityScore(humidity) {
    // Below 50% is ideal, above 80% is bad
    if (humidity <= 50) return 100;
    if (humidity >= 90) return 0;
    // Linear scale between 50-90%
    return Math.round(100 - ((humidity - 50) * 2.5));
}

/**
 * Wind score - Calm = best for telescopes
 */
function calculateWindScore(windSpeedMs) {
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
 */
function calculateVisibilityScore(visibilityMeters) {
    // 10km+ is excellent
    if (visibilityMeters >= 10000) return 100;
    // Below 1km is poor
    if (visibilityMeters <= 1000) return 0;
    // Linear scale between 1-10km
    return Math.round((visibilityMeters - 1000) / 90);
}

/**
 * Get rating description from score
 */
function getRating(score) {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 35) return 'Poor';
    return 'Bad';
}

/**
 * Get moon phase name from phase value
 */
function getMoonPhaseName(phase) {
    if (phase < 0.03 || phase > 0.97) return 'New Moon';
    if (phase < 0.22) return 'Waxing Crescent';
    if (phase < 0.28) return 'First Quarter';
    if (phase < 0.47) return 'Waxing Gibbous';
    if (phase < 0.53) return 'Full Moon';
    if (phase < 0.72) return 'Waning Gibbous';
    if (phase < 0.78) return 'Last Quarter';
    return 'Waning Crescent';
}

/**
 * Find the best viewing window tonight
 * Looks at hourly forecast to find clearest period after sunset
 * 
 * @param {Array} hourlyForecast - Array of hourly weather data
 * @param {number} sunset - Sunset timestamp
 * @param {number} sunrise - Next sunrise timestamp
 * @returns {Object} Best viewing window
 */
function findBestWindow(hourlyForecast, sunset, sunrise) {
    // Filter to nighttime hours only
    const nightHours = hourlyForecast.filter(hour => {
        const hourTime = new Date(hour.dt * 1000).getTime();
        return hourTime > sunset * 1000 && hourTime < sunrise * 1000;
    });

    if (nightHours.length === 0) {
        return null;
    }

    // Find the window with lowest cloud cover
    let bestStart = null;
    let bestEnd = null;
    let bestAvgClouds = 100;
    
    // Simple approach: find contiguous hours with clouds < 30%
    let windowStart = null;
    let windowHours = [];

    for (const hour of nightHours) {
        if (hour.clouds <= 30) {
            if (!windowStart) {
                windowStart = hour;
            }
            windowHours.push(hour);
        } else {
            // Window ended, check if it's the best
            if (windowHours.length >= 2) {
                const avgClouds = windowHours.reduce((sum, h) => sum + h.clouds, 0) / windowHours.length;
                if (avgClouds < bestAvgClouds) {
                    bestAvgClouds = avgClouds;
                    bestStart = windowStart;
                    bestEnd = windowHours[windowHours.length - 1];
                }
            }
            windowStart = null;
            windowHours = [];
        }
    }

    // Check final window
    if (windowHours.length >= 2) {
        const avgClouds = windowHours.reduce((sum, h) => sum + h.clouds, 0) / windowHours.length;
        if (avgClouds < bestAvgClouds) {
            bestStart = windowStart;
            bestEnd = windowHours[windowHours.length - 1];
        }
    }

    if (!bestStart) {
        // No good window found, return the clearest single hour
        const clearestHour = nightHours.reduce((best, hour) => 
            hour.clouds < best.clouds ? hour : best
        );
        return {
            found: false,
            clearestHour: new Date(clearestHour.dt * 1000),
            clouds: clearestHour.clouds,
            message: `Mostly cloudy tonight. Clearest around ${formatTime(clearestHour.dt)} (${clearestHour.clouds}% clouds)`
        };
    }

    return {
        found: true,
        start: new Date(bestStart.dt * 1000),
        end: new Date(bestEnd.dt * 1000),
        duration: Math.round((bestEnd.dt - bestStart.dt) / 3600),
        avgClouds: Math.round(bestAvgClouds),
        message: `Best window: ${formatTime(bestStart.dt)} - ${formatTime(bestEnd.dt)}`
    };
}

/**
 * Format unix timestamp to time string
 */
function formatTime(timestamp) {
    return new Date(timestamp * 1000).toLocaleTimeString('en-IE', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

module.exports = {
    calculateSkyScore,
    findBestWindow,
    getMoonPhaseName,
    getMoonIllumination,
    getRating
};