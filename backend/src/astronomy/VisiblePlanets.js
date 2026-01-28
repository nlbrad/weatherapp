/**
 * VisiblePlanets.js - Fetch currently visible planets
 * 
 * Uses the FREE visibleplanets.dev API (no API key required!)
 * Returns planets currently above the horizon at a given location.
 * 
 * API: https://api.visibleplanets.dev/v3
 */

/**
 * Fetch visible planets for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Array>} Visible planets with positions
 */
async function getVisiblePlanets(lat, lon) {
    const url = `https://api.visibleplanets.dev/v3?latitude=${lat}&longitude=${lon}`;
    
    try {
        const response = await fetch(url, { 
            signal: AbortSignal.timeout(10000) 
        });
        
        if (!response.ok) {
            console.error(`Planets API error: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (!data?.data) return [];
        
        // Transform and filter
        return data.data
            .filter(body => 
                body.aboveHorizon && 
                body.name !== 'Sun' && 
                body.name !== 'Earth'
            )
            .map(body => ({
                name: body.name,
                altitude: Math.round(body.altitude || 0),
                azimuth: Math.round(body.azimuth || 0),
                direction: getCompassDirection(body.azimuth),
                constellation: body.constellation || null,
                magnitude: body.magnitude ?? null,
                nakedEyeVisible: body.nakedEyeObject !== false
            }))
            .sort((a, b) => b.altitude - a.altitude);
            
    } catch (error) {
        console.error('Error fetching visible planets:', error.message);
        return [];
    }
}

/**
 * Convert azimuth degrees to compass direction
 */
function getCompassDirection(azimuth) {
    if (azimuth == null) return 'Unknown';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(azimuth / 45) % 8];
}

/**
 * Get altitude description
 */
function getAltitudeDescription(altitude) {
    if (altitude >= 60) return 'high in sky';
    if (altitude >= 30) return 'mid-sky';
    if (altitude >= 15) return 'low';
    return 'near horizon';
}

/**
 * Planet display info
 */
const PLANET_INFO = {
    Mercury: { emoji: '☿️', tip: 'Hard to spot - look low on horizon after sunset' },
    Venus:   { emoji: '♀️', tip: 'Brightest planet! The "Evening/Morning Star"' },
    Mars:    { emoji: '♂️', tip: 'Look for its distinctive red/orange color' },
    Jupiter: { emoji: '♃', tip: 'Binoculars show its 4 largest moons!' },
    Saturn:  { emoji: '🪐', tip: 'Small telescope reveals the famous rings' },
    Uranus:  { emoji: '⛢', tip: 'Barely visible to naked eye in dark skies' },
    Neptune: { emoji: '♆', tip: 'Requires binoculars or telescope' },
    Moon:    { emoji: '🌙', tip: 'Best detail visible along the terminator line' }
};

/**
 * Format planets for Telegram message
 */
function formatPlanetsForMessage(planets) {
    // Filter to naked-eye planets
    const visible = planets.filter(p => 
        ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Moon'].includes(p.name) &&
        p.altitude > 5
    );
    
    if (visible.length === 0) return null;
    
    const lines = ['🪐 *Visible Planets:*'];
    
    for (const planet of visible.slice(0, 5)) {
        const info = PLANET_INFO[planet.name] || { emoji: '🪐' };
        const position = getAltitudeDescription(planet.altitude);
        lines.push(`   ${info.emoji} ${planet.name} - ${planet.direction}, ${position}`);
    }
    
    // Add tips for well-placed planets
    const jupiter = visible.find(p => p.name === 'Jupiter' && p.altitude > 20);
    const saturn = visible.find(p => p.name === 'Saturn' && p.altitude > 20);
    
    if (jupiter) {
        lines.push("   _💡 Jupiter's moons visible with binoculars!_");
    } else if (saturn) {
        lines.push("   _💡 Saturn's rings visible with telescope!_");
    }
    
    return lines.join('\n');
}

module.exports = {
    getVisiblePlanets,
    formatPlanetsForMessage,
    getCompassDirection,
    getAltitudeDescription,
    PLANET_INFO
};