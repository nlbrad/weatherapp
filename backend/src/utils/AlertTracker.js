/**
 * AlertTracker.js - Persistent Alert Tracking
 * 
 * Tracks sent alerts in Azure Table Storage to:
 * 1. Prevent duplicate alerts (deduplication)
 * 2. Provide alert history for users
 * 
 * Table: SentAlerts
 * PartitionKey: {userId}
 * RowKey: {alertType}_{timestamp}
 */

const { TableClient } = require('@azure/data-tables');

const TABLE_NAME = 'SentAlerts';
let tableClient = null;

/**
 * Initialize the table client
 */
function getTableClient() {
    if (tableClient) return tableClient;
    
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        return null; // Development mode - no persistence
    }
    
    tableClient = TableClient.fromConnectionString(connectionString, TABLE_NAME);
    return tableClient;
}

/**
 * Ensure table exists
 */
async function ensureTable() {
    const client = getTableClient();
    if (!client) return false;
    
    try {
        await client.createTable();
    } catch (error) {
        // Table already exists - that's fine
        if (error.statusCode !== 409) {
            console.error('Error creating SentAlerts table:', error.message);
        }
    }
    return true;
}

/**
 * Generate a unique key for an alert
 * 
 * @param {string} alertType - Type of alert (aurora, weather-warning, daily-forecast, etc.)
 * @param {object} alertData - Data specific to this alert
 * @returns {string} Unique key for deduplication
 */
function generateAlertKey(alertType, alertData = {}) {
    switch (alertType) {
        case 'aurora':
            // Key by Kp level rounded to nearest integer
            // This means Kp 5.1 and Kp 5.7 are considered the same event
            const kpLevel = Math.round(alertData.kpIndex || 0);
            return `aurora_kp${kpLevel}`;
            
        case 'weather-warning':
            // Key by warning ID, type, and severity
            // e.g., "weather-warning_wind_orange_2025-01-28"
            const warningDate = alertData.onset 
                ? new Date(alertData.onset).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            return `warning_${alertData.type || 'unknown'}_${alertData.severity || 'unknown'}_${warningDate}`;
            
        case 'daily-forecast':
            // Key by date - only send once per day
            const date = new Date().toISOString().split('T')[0];
            return `daily_${date}`;
            
        case 'tonights-sky':
            // Key by date - only send once per day
            const skyDate = new Date().toISOString().split('T')[0];
            return `sky_${skyDate}`;
            
        default:
            // Generic: use timestamp rounded to hour
            const hourKey = new Date().toISOString().slice(0, 13);
            return `${alertType}_${hourKey}`;
    }
}

/**
 * Check if an alert has already been sent recently
 * 
 * @param {string} userId - User ID
 * @param {string} alertType - Type of alert
 * @param {object} alertData - Alert-specific data for key generation
 * @param {number} cooldownHours - Hours before same alert can be sent again (default: 6)
 * @returns {Promise<boolean>} True if alert was recently sent
 */
async function hasRecentAlert(userId, alertType, alertData = {}, cooldownHours = 6) {
    const client = getTableClient();
    if (!client) {
        // Development mode - allow all alerts
        return false;
    }
    
    const alertKey = generateAlertKey(alertType, alertData);
    const rowKey = `${alertType}_${alertKey}`;
    
    try {
        const entity = await client.getEntity(userId, rowKey);
        
        if (!entity || !entity.sentAt) {
            return false;
        }
        
        // Check if within cooldown period
        const sentAt = new Date(entity.sentAt);
        const cooldownMs = cooldownHours * 60 * 60 * 1000;
        const isWithinCooldown = (Date.now() - sentAt.getTime()) < cooldownMs;
        
        return isWithinCooldown;
        
    } catch (error) {
        if (error.statusCode === 404) {
            // Entity not found - alert hasn't been sent
            return false;
        }
        console.error('Error checking alert history:', error.message);
        return false; // On error, allow the alert
    }
}

/**
 * Record that an alert was sent
 * 
 * @param {string} userId - User ID
 * @param {string} alertType - Type of alert
 * @param {object} alertData - Details about the alert
 * @returns {Promise<boolean>} Success
 */
async function recordAlert(userId, alertType, alertData = {}) {
    const client = getTableClient();
    if (!client) {
        return false; // Development mode
    }
    
    await ensureTable();
    
    const alertKey = generateAlertKey(alertType, alertData);
    const timestamp = new Date().toISOString();
    const rowKey = `${alertType}_${alertKey}`;
    
    const entity = {
        partitionKey: userId,
        rowKey: rowKey,
        alertType: alertType,
        alertKey: alertKey,
        sentAt: timestamp,
        
        // Store details for history display
        title: alertData.title || getDefaultTitle(alertType),
        summary: alertData.summary || '',
        location: alertData.location || '',
        score: alertData.score || null,
        severity: alertData.severity || null,
        
        // Raw data (JSON stringified for complex objects)
        details: JSON.stringify(alertData),
    };
    
    try {
        await client.upsertEntity(entity, 'Replace');
        return true;
    } catch (error) {
        console.error('Error recording alert:', error.message);
        return false;
    }
}

/**
 * Get alert history for a user
 * 
 * @param {string} userId - User ID
 * @param {number} limit - Max number of alerts to return (default: 20)
 * @param {string} alertType - Optional filter by alert type
 * @returns {Promise<Array>} List of sent alerts
 */
async function getAlertHistory(userId, limit = 20, alertType = null) {
    const client = getTableClient();
    if (!client) {
        return []; // Development mode
    }
    
    try {
        let filter = `PartitionKey eq '${userId}'`;
        if (alertType) {
            filter += ` and alertType eq '${alertType}'`;
        }
        
        const alerts = [];
        const entities = client.listEntities({
            queryOptions: { filter }
        });
        
        for await (const entity of entities) {
            alerts.push({
                id: entity.rowKey,
                type: entity.alertType,
                title: entity.title,
                summary: entity.summary,
                location: entity.location,
                score: entity.score,
                severity: entity.severity,
                sentAt: entity.sentAt,
                details: entity.details ? JSON.parse(entity.details) : {},
            });
        }
        
        // Sort by sentAt descending and limit
        alerts.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
        return alerts.slice(0, limit);
        
    } catch (error) {
        console.error('Error fetching alert history:', error.message);
        return [];
    }
}

/**
 * Clean up old alerts (older than 30 days)
 * Call this periodically to keep table size manageable
 */
async function cleanupOldAlerts(daysToKeep = 30) {
    const client = getTableClient();
    if (!client) return;
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    try {
        const entities = client.listEntities();
        
        for await (const entity of entities) {
            if (entity.sentAt && new Date(entity.sentAt) < cutoffDate) {
                await client.deleteEntity(entity.partitionKey, entity.rowKey);
            }
        }
    } catch (error) {
        console.error('Error cleaning up old alerts:', error.message);
    }
}

/**
 * Get default title for alert type
 */
function getDefaultTitle(alertType) {
    const titles = {
        'aurora': 'Aurora Alert',
        'weather-warning': 'Weather Warning',
        'daily-forecast': 'Daily Forecast',
        'tonights-sky': "Tonight's Sky",
        'temperature': 'Temperature Alert',
    };
    return titles[alertType] || 'Alert';
}

module.exports = {
    hasRecentAlert,
    recordAlert,
    getAlertHistory,
    cleanupOldAlerts,
    generateAlertKey,
    ensureTable,
};
