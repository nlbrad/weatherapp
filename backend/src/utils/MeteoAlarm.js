/**
 * MeteoAlarm.js - European weather warnings
 * 
 * Fetches official weather warnings from MeteoAlarm.org
 * Aggregates alerts from national services (Met Éireann for Ireland)
 * 
 * API: https://feeds.meteoalarm.org/api/v1/warnings/feeds-ireland
 * No API key required!
 */

// Region codes for Ireland
const IRELAND_REGIONS = {
    'IE001': 'Carlow',
    'IE002': 'Cavan',
    'IE003': 'Clare',
    'IE004': 'Cork',
    'IE005': 'Donegal',
    'IE006': 'Dublin',
    'IE007': 'Galway',
    'IE008': 'Kerry',
    'IE009': 'Kildare',
    'IE010': 'Kilkenny',
    'IE011': 'Laois',
    'IE012': 'Leitrim',
    'IE013': 'Limerick',
    'IE014': 'Longford',
    'IE015': 'Louth',
    'IE016': 'Mayo',
    'IE017': 'Meath',
    'IE018': 'Monaghan',
    'IE019': 'Offaly',
    'IE020': 'Roscommon',
    'IE021': 'Sligo',
    'IE022': 'Tipperary',
    'IE023': 'Waterford',
    'IE024': 'Westmeath',
    'IE025': 'Wexford',
    'IE026': 'Wicklow'
};

// Warning types
const WARNING_TYPES = {
    'Wind': { emoji: '💨', icon: 'wind' },
    'Rain': { emoji: '🌧️', icon: 'rain' },
    'Snow': { emoji: '🌨️', icon: 'snow' },
    'Snow-ice': { emoji: '❄️', icon: 'snow-ice' },
    'Thunderstorm': { emoji: '⛈️', icon: 'thunderstorm' },
    'Fog': { emoji: '🌫️', icon: 'fog' },
    'Extreme high temperature': { emoji: '🌡️', icon: 'heat' },
    'Extreme low temperature': { emoji: '🥶', icon: 'cold' },
    'Coastal event': { emoji: '🌊', icon: 'coastal' },
    'Forest fire': { emoji: '🔥', icon: 'fire' },
    'Avalanche': { emoji: '🏔️', icon: 'avalanche' },
    'Flooding': { emoji: '🌊', icon: 'flood' }
};

// Severity levels
const SEVERITY_LEVELS = {
    'Minor': { color: '🟢', level: 1, name: 'Green' },
    'Moderate': { color: '🟡', level: 2, name: 'Yellow' },
    'Severe': { color: '🟠', level: 3, name: 'Orange' },
    'Extreme': { color: '🔴', level: 4, name: 'Red' }
};

/**
 * Fetch active weather warnings for Ireland
 * @returns {Promise<Array>} Active warnings
 */
async function getIrelandWarnings() {
    const url = 'https://feeds.meteoalarm.org/api/v1/warnings/feeds-ireland';
    
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`MeteoAlarm API error: ${response.status}`);
            return [];
        }
        
        const data = await response.json();
        
        if (!data?.warnings || !Array.isArray(data.warnings)) {
            return [];
        }
        
        // Transform warnings - handle nested structure
        const transformed = [];
        
        for (const warning of data.warnings) {
            const alert = warning.alert;
            if (!alert?.info || !Array.isArray(alert.info)) continue;
            
            for (const info of alert.info) {
                const parsed = parseWarningInfo(info, alert);
                // Only include Yellow (2) or higher severity, and must be active
                if (parsed && parsed.severityLevel >= 2 && isWarningActive(parsed)) {
                    transformed.push(parsed);
                }
            }
        }
        
        // Deduplicate by headline and sort by severity
        const unique = deduplicateWarnings(transformed);
        return unique.sort((a, b) => b.severityLevel - a.severityLevel);
            
    } catch (error) {
        console.error('Error fetching MeteoAlarm:', error.message);
        return [];
    }
}

/**
 * Parse a single warning info block
 */
function parseWarningInfo(info, alert) {
    // Extract awareness type and level from parameters
    let awarenessType = 'Unknown';
    let awarenessLevel = 'Moderate';
    let severityColor = '🟡';
    let severityLevel = 2;
    
    if (info.parameter) {
        for (const param of info.parameter) {
            if (param.valueName === 'awareness_type') {
                // Format: "1; Wind" or "2; Rain"
                const parts = param.value.split(';');
                if (parts.length >= 2) {
                    awarenessType = parts[1].trim();
                }
            }
            if (param.valueName === 'awareness_level') {
                // Format: "2; yellow; Moderate"
                const parts = param.value.split(';');
                if (parts.length >= 3) {
                    const color = parts[1].trim().toLowerCase();
                    awarenessLevel = parts[2].trim();
                    
                    if (color === 'red' || awarenessLevel === 'Extreme') {
                        severityColor = '🔴';
                        severityLevel = 4;
                    } else if (color === 'orange' || awarenessLevel === 'Severe') {
                        severityColor = '🟠';
                        severityLevel = 3;
                    } else if (color === 'yellow' || awarenessLevel === 'Moderate') {
                        severityColor = '🟡';
                        severityLevel = 2;
                    } else {
                        severityColor = '🟢';
                        severityLevel = 1;
                    }
                }
            }
        }
    }
    
    // Get event type - prefer awareness_type, fallback to event field
    const eventType = awarenessType !== 'Unknown' ? awarenessType : (info.event || 'Weather');
    
    // Get area description
    const areas = info.area || [];
    const areaDescs = areas.map(a => a.areaDesc).filter(Boolean);
    const regionsText = areaDescs.length > 0 ? areaDescs.join(', ') : 'All areas';
    
    // Get emoji for event type
    const typeInfo = WARNING_TYPES[eventType] || WARNING_TYPES['Wind'] || { emoji: '⚠️' };
    
    return {
        id: alert.identifier,
        type: eventType,
        emoji: typeInfo.emoji,
        severity: awarenessLevel,
        severityColor: severityColor,
        severityLevel: severityLevel,
        severityName: getSeverityName(severityLevel),
        headline: info.headline || `${awarenessLevel} ${eventType} Warning`,
        description: info.description || '',
        instruction: info.instruction || '',
        regionsText: regionsText,
        onset: info.onset ? new Date(info.onset) : null,
        expires: info.expires ? new Date(info.expires) : null,
        sender: info.senderName || 'Met Éireann',
        isNationwide: regionsText.toLowerCase().includes('ireland') || areaDescs.length === 0
    };
}

/**
 * Get severity name from level
 */
function getSeverityName(level) {
    switch (level) {
        case 4: return 'Red';
        case 3: return 'Orange';
        case 2: return 'Yellow';
        default: return 'Green';
    }
}

/**
 * Deduplicate warnings by headline
 */
function deduplicateWarnings(warnings) {
    const seen = new Map();
    
    for (const w of warnings) {
        const key = `${w.type}-${w.headline}-${w.regionsText}`;
        if (!seen.has(key) || w.severityLevel > seen.get(key).severityLevel) {
            seen.set(key, w);
        }
    }
    
    return Array.from(seen.values());
}

/**
 * Check if warning is currently active
 */
function isWarningActive(warning) {
    const now = Date.now();
    const onset = warning.onset ? warning.onset.getTime() : 0;
    const expires = warning.expires ? warning.expires.getTime() : Infinity;
    
    // Include warnings that start within 48 hours
    const soon = now + (48 * 60 * 60 * 1000);
    
    return onset <= soon && expires > now;
}

/**
 * Format regions for display
 */
function formatRegions(regions) {
    if (!regions || regions.length === 0) return 'All areas';
    if (regions.length >= 20) return 'Nationwide';
    if (regions.length > 5) return `${regions.slice(0, 4).join(', ')} +${regions.length - 4} more`;
    return regions.join(', ');
}

/**
 * Get warnings for a specific county/region
 * @param {string} county - County name (e.g., 'Dublin', 'Cork')
 */
async function getWarningsForCounty(county) {
    const warnings = await getIrelandWarnings();
    
    if (!county) return warnings;
    
    const countyLower = county.toLowerCase();
    
    return warnings.filter(w =>
        w.isNationwide ||
        w.regionsText.toLowerCase().includes(countyLower)
    );
}

/**
 * Get warnings for coordinates (finds nearest county)
 * Simplified - uses Dublin as default for now
 * TODO: Implement proper reverse geocoding
 */
async function getWarningsForLocation(lat, lon) {
    // For now, return all Ireland warnings
    // Could enhance with reverse geocoding to find county
    return await getIrelandWarnings();
}

/**
 * Format warnings for Telegram message (brief version for daily forecast)
 * Shows max 2 highest severity warnings, no "+more" text
 */
function formatWarningsForMessage(warnings, options = {}) {
    const { maxWarnings = 2, brief = true } = options;
    
    if (!warnings || warnings.length === 0) {
        return null;
    }
    
    // Sort by severity (highest first) and take top N
    const topWarnings = [...warnings]
        .sort((a, b) => b.severityLevel - a.severityLevel)
        .slice(0, maxWarnings);
    
    const lines = ['⚠️ *Active Weather Warnings:*'];
    
    for (const warning of topWarnings) {
        lines.push('');
        lines.push(`${warning.severityColor} *${warning.severityName} - ${warning.type}*`);
        
        // Show region if not nationwide
        if (!warning.isNationwide && warning.regionsText && warning.regionsText !== 'All areas') {
            lines.push(`   📍 ${warning.regionsText}`);
        }
        
        // Show timing
        if (warning.onset && warning.expires) {
            const onsetStr = formatDateTime(warning.onset);
            const expiresStr = formatDateTime(warning.expires);
            lines.push(`   ⏰ ${onsetStr} - ${expiresStr}`);
        }
        
        // Brief mode: skip description (save for WeatherWarningAlert)
        if (!brief && warning.description && warning.description.length < 80) {
            lines.push(`   _${warning.description}_`);
        }
    }
    
    return lines.join('\n');
}

/**
 * Format warnings for detailed WeatherWarningAlert message
 * Shows all warnings with full details
 */
function formatWarningsDetailed(warnings) {
    if (!warnings || warnings.length === 0) {
        return null;
    }
    
    const lines = ['🚨 *Weather Warnings for Ireland*'];
    lines.push('');
    
    for (const warning of warnings) {
        lines.push(`${warning.severityColor} *${warning.severityName} - ${warning.type}*`);
        
        if (warning.headline) {
            lines.push(`   ${warning.headline}`);
        }
        
        if (!warning.isNationwide && warning.regionsText) {
            lines.push(`   📍 ${warning.regionsText}`);
        }
        
        if (warning.onset && warning.expires) {
            const onsetStr = formatDateTime(warning.onset);
            const expiresStr = formatDateTime(warning.expires);
            lines.push(`   ⏰ ${onsetStr} - ${expiresStr}`);
        }
        
        if (warning.description) {
            lines.push(`   _${warning.description}_`);
        }
        
        if (warning.instruction) {
            lines.push(`   💡 ${warning.instruction}`);
        }
        
        lines.push('');
    }
    
    lines.push(`_Source: ${warnings[0]?.sender || 'Met Éireann'}_`);
    
    return lines.join('\n');
}

/**
 * Format date/time for display
 */
function formatDateTime(date) {
    if (!date) return '';
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const timeStr = date.toLocaleTimeString('en-IE', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
    
    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    
    const dayStr = date.toLocaleDateString('en-IE', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });
    
    return `${dayStr} ${timeStr}`;
}

/**
 * Get highest severity warning level
 */
function getHighestSeverity(warnings) {
    if (!warnings || warnings.length === 0) return null;
    
    const highest = warnings.reduce((max, w) => 
        w.severityLevel > max.severityLevel ? w : max
    );
    
    return {
        level: highest.severityLevel,
        name: highest.severityName,
        color: highest.severityColor,
        type: highest.type
    };
}

module.exports = {
    getIrelandWarnings,
    getWarningsForCounty,
    getWarningsForLocation,
    formatWarningsForMessage,
    formatWarningsDetailed,
    getHighestSeverity,
    IRELAND_REGIONS,
    WARNING_TYPES,
    SEVERITY_LEVELS
};