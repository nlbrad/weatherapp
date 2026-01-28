/**
 * MeteorShowers.js - Meteor shower calendar
 * 
 * Static data for major annual meteor showers.
 * No API required - these are predictable annual events.
 */

const METEOR_SHOWERS = [
    {
        name: 'Quadrantids',
        peakMonth: 1,
        peakDay: 3,
        rate: 40,
        radiant: 'Boötes (NE)',
        parent: 'Asteroid 2003 EH1',
        bestViewing: 'After midnight',
        description: 'Strong shower with blue meteors'
    },
    {
        name: 'Lyrids',
        peakMonth: 4,
        peakDay: 22,
        rate: 20,
        radiant: 'Lyra (E)',
        parent: 'Comet Thatcher',
        bestViewing: 'After midnight',
        description: 'Oldest known shower. Can produce bright fireballs'
    },
    {
        name: 'Eta Aquariids',
        peakMonth: 5,
        peakDay: 6,
        rate: 50,
        radiant: 'Aquarius (E)',
        parent: "Halley's Comet",
        bestViewing: 'Just before dawn',
        description: 'Fast meteors that often leave glowing trails'
    },
    {
        name: 'Delta Aquariids',
        peakMonth: 7,
        peakDay: 28,
        rate: 20,
        radiant: 'Aquarius (S)',
        parent: 'Unknown',
        bestViewing: 'After midnight',
        description: 'Good warm-weather shower'
    },
    {
        name: 'Perseids',
        peakMonth: 8,
        peakDay: 12,
        rate: 100,
        radiant: 'Perseus (NE)',
        parent: 'Comet Swift-Tuttle',
        bestViewing: 'After midnight',
        description: 'Most popular shower! Bright, fast meteors with many fireballs',
        highlight: true
    },
    {
        name: 'Draconids',
        peakMonth: 10,
        peakDay: 8,
        rate: 10,
        radiant: 'Draco (NW)',
        parent: 'Comet 21P/Giacobini-Zinner',
        bestViewing: 'Early evening',
        description: 'Best viewed in early evening, unlike most showers'
    },
    {
        name: 'Orionids',
        peakMonth: 10,
        peakDay: 21,
        rate: 20,
        radiant: 'Orion (SE)',
        parent: "Halley's Comet",
        bestViewing: 'After midnight',
        description: 'Fast meteors from the famous comet'
    },
    {
        name: 'Taurids',
        peakMonth: 11,
        peakDay: 5,
        rate: 5,
        radiant: 'Taurus (E)',
        parent: 'Comet Encke',
        bestViewing: 'Midnight',
        description: 'Slow but famous for spectacular fireballs!'
    },
    {
        name: 'Leonids',
        peakMonth: 11,
        peakDay: 17,
        rate: 15,
        radiant: 'Leo (E)',
        parent: 'Comet Tempel-Tuttle',
        bestViewing: 'After midnight',
        description: 'Can produce meteor storms! Very fast meteors'
    },
    {
        name: 'Geminids',
        peakMonth: 12,
        peakDay: 14,
        rate: 150,
        radiant: 'Gemini (overhead)',
        parent: 'Asteroid 3200 Phaethon',
        bestViewing: 'All night (peaks ~2am)',
        description: 'Best meteor shower of the year! Bright, colorful, many meteors',
        highlight: true
    },
    {
        name: 'Ursids',
        peakMonth: 12,
        peakDay: 22,
        rate: 10,
        radiant: 'Ursa Minor (N)',
        parent: 'Comet 8P/Tuttle',
        bestViewing: 'After midnight',
        description: 'Often overlooked, peaks near winter solstice'
    }
];

/**
 * Get active meteor showers (within ±3 days of peak)
 * @param {Date} date - Date to check
 * @returns {Array} Active showers with days from peak
 */
function getActiveShowers(date = new Date()) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return METEOR_SHOWERS
        .map(shower => {
            const daysFromPeak = calculateDaysFromPeak(month, day, shower.peakMonth, shower.peakDay);
            return { ...shower, daysFromPeak };
        })
        .filter(shower => Math.abs(shower.daysFromPeak) <= 3)
        .sort((a, b) => Math.abs(a.daysFromPeak) - Math.abs(b.daysFromPeak));
}

/**
 * Get upcoming meteor showers (next 14 days)
 * @param {Date} date - Start date
 * @returns {Array} Upcoming showers with days until peak
 */
function getUpcomingShowers(date = new Date()) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return METEOR_SHOWERS
        .map(shower => {
            const daysUntil = calculateDaysUntil(month, day, shower.peakMonth, shower.peakDay);
            return { ...shower, daysUntil };
        })
        .filter(shower => shower.daysUntil > 3 && shower.daysUntil <= 14)
        .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * Calculate days from peak (negative = past, positive = future)
 */
function calculateDaysFromPeak(currentMonth, currentDay, peakMonth, peakDay) {
    const current = currentMonth * 31 + currentDay;
    let peak = peakMonth * 31 + peakDay;
    
    // Handle year wrap
    if (peak < current - 180) peak += 372;
    if (peak > current + 180) peak -= 372;
    
    return peak - current;
}

/**
 * Calculate days until peak (always positive, wraps year)
 */
function calculateDaysUntil(currentMonth, currentDay, peakMonth, peakDay) {
    const days = calculateDaysFromPeak(currentMonth, currentDay, peakMonth, peakDay);
    return days < 0 ? days + 365 : days;
}

/**
 * Format meteor showers for Telegram message
 */
function formatMeteorsForMessage(date = new Date()) {
    const active = getActiveShowers(date);
    const upcoming = getUpcomingShowers(date);
    
    const lines = [];
    
    // Active showers
    for (const shower of active) {
        if (shower.daysFromPeak === 0) {
            lines.push(`☄️ *${shower.name}* - PEAK TONIGHT! 🔥`);
            lines.push(`   Up to ${shower.rate} meteors/hour`);
            lines.push(`   Best: ${shower.bestViewing}, look ${shower.radiant}`);
        } else if (Math.abs(shower.daysFromPeak) === 1) {
            const when = shower.daysFromPeak < 0 ? 'peaked yesterday' : 'peaks tomorrow';
            lines.push(`☄️ *${shower.name}* ${when}`);
            lines.push(`   ~${shower.rate} meteors/hour still expected`);
        } else {
            lines.push(`☄️ ${shower.name} active (~${Math.round(shower.rate * 0.5)}/hr)`);
        }
    }
    
    // Upcoming peaks (only if nothing active)
    if (active.length === 0 && upcoming.length > 0) {
        const next = upcoming[0];
        if (next.daysUntil <= 7) {
            lines.push(`📅 ${next.name} meteor shower peaks in ${next.daysUntil} days`);
        }
    }
    
    return lines.length > 0 ? lines.join('\n') : null;
}

module.exports = {
    METEOR_SHOWERS,
    getActiveShowers,
    getUpcomingShowers,
    formatMeteorsForMessage,
    calculateDaysFromPeak
};