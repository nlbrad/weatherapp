/**
 * ISSPasses.js - International Space Station pass predictions
 * 
 * Uses N2YO.com API to get visible ISS passes.
 * Requires N2YO_API_KEY environment variable (free tier available).
 * 
 * Get a free API key at: https://www.n2yo.com/api/
 */

const ISS_NORAD_ID = 25544;

/**
 * Fetch upcoming visible ISS passes for tonight
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} alt - Altitude in meters (default: 0)
 * @returns {Promise<Array>} Tonight's ISS passes
 */
async function getTonightISSPasses(lat, lon, alt = 0) {
    const apiKey = process.env.N2YO_API_KEY;
    
    if (!apiKey) {
        // No API key - skip ISS data
        return [];
    }
    
    const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/${ISS_NORAD_ID}/${lat}/${lon}/${alt}/2/60/&apiKey=${apiKey}`;
    
    try {
        const response = await fetch(url, { 
            signal: AbortSignal.timeout(10000) 
        });
        
        if (!response.ok) {
            console.error(`N2YO API error: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        console.log(`N2YO API returned ${data?.passes?.length || 0} passes`);
        
        if (!data?.passes || data.passes.length === 0) {
            console.log('No passes in API response');
            return [];
        }
        
        // Filter to tonight only (now until 6am tomorrow)
        // But include passes that started up to 30 min ago (might still be visible)
        const now = Date.now();
        const thirtyMinsAgo = now - (30 * 60 * 1000);
        const tomorrow6am = new Date();
        tomorrow6am.setDate(tomorrow6am.getDate() + 1);
        tomorrow6am.setHours(6, 0, 0, 0);
        
        const filtered = data.passes.filter(pass => {
            const startTime = pass.startUTC * 1000;
            const endTime = pass.endUTC * 1000;
            // Include if: hasn't ended yet AND starts before tomorrow 6am
            return endTime >= now && startTime <= tomorrow6am.getTime();
        });
        
        console.log(`After filtering: ${filtered.length} passes tonight`);
        
        return filtered
            .map(pass => ({
                startTime: new Date(pass.startUTC * 1000),
                endTime: new Date(pass.endUTC * 1000),
                duration: pass.duration, // seconds
                startDirection: getCompassDirection(pass.startAz),
                startElevation: pass.startEl,
                maxDirection: getCompassDirection(pass.maxAz),
                maxElevation: pass.maxEl,
                endDirection: getCompassDirection(pass.endAz),
                endElevation: pass.endEl,
                magnitude: pass.mag,
                brightness: getBrightnessLabel(pass.mag)
            }));
            
    } catch (error) {
        console.error('Error fetching ISS passes:', error.message);
        return [];
    }
}

/**
 * Convert azimuth to compass direction
 */
function getCompassDirection(azimuth) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(azimuth / 22.5) % 16];
}

/**
 * Get brightness description from magnitude
 */
function getBrightnessLabel(magnitude) {
    if (magnitude == null) return 'Bright';
    if (magnitude < -3.5) return 'Extremely bright';
    if (magnitude < -2.5) return 'Very bright';
    if (magnitude < -1.5) return 'Bright';
    if (magnitude < -0.5) return 'Easily visible';
    return 'Visible';
}

/**
 * Format ISS passes for Telegram message
 */
function formatISSForMessage(passes) {
    if (!passes || passes.length === 0) return null;
    
    const lines = [];
    
    for (let i = 0; i < Math.min(passes.length, 2); i++) {
        const pass = passes[i];
        const timeStr = pass.startTime.toLocaleTimeString('en-IE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const durationMin = Math.round(pass.duration / 60);
        
        if (i === 0) {
            lines.push(`🛰️ *ISS Pass* at *${timeStr}*`);
        } else {
            lines.push(`   Also at ${timeStr}`);
        }
        
        lines.push(`   ${pass.startDirection} → ${pass.maxDirection} → ${pass.endDirection} (${durationMin} min)`);
        
        if (pass.maxElevation >= 45) {
            lines.push(`   Max: ${pass.maxElevation}° - ${pass.brightness}!`);
        }
    }
    
    return lines.join('\n');
}

module.exports = {
    getTonightISSPasses,
    formatISSForMessage,
    getCompassDirection,
    getBrightnessLabel,
    ISS_NORAD_ID
};