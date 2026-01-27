/**
 * Database Connection Module
 * 
 * Manages Azure SQL connection pooling and provides query helpers.
 * Supports both direct queries and prepared statements.
 */

const sql = require('mssql');

// Connection configuration
const config = {
    server: process.env.SQL_SERVER || 'weather-alert-sql-server.database.windows.net',
    database: process.env.SQL_DATABASE || 'weather-alert-db',
    user: process.env.SQL_USER || 'weatheradmin',
    password: process.env.SQL_PASSWORD,
    options: {
        encrypt: true, // Required for Azure
        enableArithAbort: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Alternative: Use connection string directly
const connectionString = process.env.SQL_CONNECTION_STRING;

// Global pool instance
let pool = null;

/**
 * Get database connection pool
 * Creates new pool if not exists, returns existing if available
 */
async function getPool() {
    if (pool) {
        return pool;
    }

    try {
        if (connectionString) {
            pool = await sql.connect(connectionString);
        } else {
            pool = await sql.connect(config);
        }
        
        console.log('Database connection established');
        return pool;
    } catch (error) {
        console.error('Database connection failed:', error.message);
        throw error;
    }
}

/**
 * Execute a query with parameters
 * 
 * @param {string} query - SQL query with @param placeholders
 * @param {Object} params - Parameter values { name: value }
 * @returns {Promise<Object>} Query result
 * 
 * @example
 * const result = await db.query(
 *   'SELECT * FROM users WHERE id = @userId',
 *   { userId: 'user123' }
 * );
 */
async function query(queryText, params = {}) {
    const pool = await getPool();
    const request = pool.request();

    // Add parameters
    for (const [name, value] of Object.entries(params)) {
        request.input(name, value);
    }

    return await request.query(queryText);
}

/**
 * Execute a query and return recordset directly
 */
async function queryRows(queryText, params = {}) {
    const result = await query(queryText, params);
    return result.recordset;
}

/**
 * Execute a query and return single row
 */
async function queryOne(queryText, params = {}) {
    const result = await query(queryText, params);
    return result.recordset?.[0] || null;
}

/**
 * Insert a record and return the result
 */
async function insert(table, data) {
    const columns = Object.keys(data);
    const values = columns.map(col => `@${col}`);
    
    const queryText = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${values.join(', ')})
    `;

    return await query(queryText, data);
}

/**
 * Update a record by ID
 */
async function update(table, id, data, idColumn = 'id') {
    const sets = Object.keys(data)
        .filter(key => key !== idColumn)
        .map(key => `${key} = @${key}`)
        .join(', ');

    const queryText = `
        UPDATE ${table}
        SET ${sets}, updated_at = GETUTCDATE()
        WHERE ${idColumn} = @${idColumn}
    `;

    return await query(queryText, { ...data, [idColumn]: id });
}

/**
 * Delete a record by ID
 */
async function remove(table, id, idColumn = 'id') {
    const queryText = `DELETE FROM ${table} WHERE ${idColumn} = @id`;
    return await query(queryText, { id });
}

/**
 * Begin a transaction
 */
async function beginTransaction() {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
}

/**
 * Execute multiple queries in a transaction
 */
async function withTransaction(callback) {
    const transaction = await beginTransaction();
    
    try {
        const result = await callback(transaction);
        await transaction.commit();
        return result;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

/**
 * Close the connection pool
 */
async function close() {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('Database connection closed');
    }
}

// =====================================================
// SPECIFIC QUERY HELPERS
// =====================================================

/**
 * Get user by ID
 */
async function getUserById(userId) {
    return await queryOne(
        'SELECT * FROM users WHERE id = @userId',
        { userId }
    );
}

/**
 * Get user by phone number (for WhatsApp webhook)
 */
async function getUserByPhone(phoneNumber) {
    return await queryOne(
        'SELECT * FROM users WHERE phone_number = @phoneNumber',
        { phoneNumber }
    );
}

/**
 * Get user preferences
 */
async function getUserPreferences(userId) {
    return await queryOne(
        'SELECT * FROM user_preferences WHERE user_id = @userId',
        { userId }
    );
}

/**
 * Get user's locations
 */
async function getUserLocations(userId) {
    return await queryRows(
        'SELECT * FROM locations WHERE user_id = @userId ORDER BY is_primary DESC, name',
        { userId }
    );
}

/**
 * Get location with current state
 */
async function getLocationWithState(locationId) {
    return await queryOne(`
        SELECT 
            l.*,
            ls.sky_score,
            ls.aurora_score,
            ls.outdoor_score,
            ls.swimming_score,
            ls.sky_window_start,
            ls.sky_window_end,
            ls.last_updated as state_updated
        FROM locations l
        LEFT JOIN location_state ls ON l.id = ls.location_id
        WHERE l.id = @locationId
    `, { locationId });
}

/**
 * Get all locations needing score update
 */
async function getLocationsForScoring() {
    return await queryRows(`
        SELECT DISTINCT
            l.id as location_id,
            l.user_id,
            l.name,
            l.latitude,
            l.longitude,
            l.good_for_sky,
            l.good_for_aurora,
            l.good_for_outdoor,
            l.good_for_swimming,
            up.night_sky_enabled,
            up.aurora_enabled,
            up.outdoor_enabled,
            up.swimming_enabled,
            up.alert_mode,
            ls.last_updated
        FROM locations l
        JOIN user_preferences up ON l.user_id = up.user_id
        LEFT JOIN location_state ls ON l.id = ls.location_id
        WHERE l.alerts_enabled = 1
        ORDER BY ls.last_updated ASC
    `);
}

/**
 * Update location state (scores and windows)
 */
async function updateLocationState(locationId, state) {
    const existing = await queryOne(
        'SELECT location_id FROM location_state WHERE location_id = @locationId',
        { locationId }
    );

    if (existing) {
        // Update existing
        const sets = Object.keys(state)
            .map(key => `${key} = @${key}`)
            .join(', ');

        return await query(`
            UPDATE location_state
            SET ${sets}, last_updated = GETUTCDATE()
            WHERE location_id = @locationId
        `, { locationId, ...state });
    } else {
        // Insert new
        return await query(`
            INSERT INTO location_state (location_id, ${Object.keys(state).join(', ')}, last_updated)
            VALUES (@locationId, ${Object.keys(state).map(k => '@' + k).join(', ')}, GETUTCDATE())
        `, { locationId, ...state });
    }
}

/**
 * Get alert state for a location and type
 */
async function getAlertState(locationId, alertType) {
    return await queryOne(`
        SELECT * FROM alert_state 
        WHERE location_id = @locationId AND alert_type = @alertType
    `, { locationId, alertType });
}

/**
 * Update alert state after sending
 */
async function updateAlertState(locationId, alertType, state) {
    const id = `${locationId}_${alertType}`;
    
    return await query(`
        MERGE alert_state AS target
        USING (SELECT @id as id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
            UPDATE SET 
                last_alerted_at = @lastAlertedAt,
                last_alert_score = @lastAlertScore,
                cooldown_until = @cooldownUntil,
                score_at_last_alert = @scoreAtLastAlert,
                must_drop_below = @mustDropBelow,
                total_alerts_sent = total_alerts_sent + 1
        WHEN NOT MATCHED THEN
            INSERT (id, user_id, location_id, alert_type, last_alerted_at, last_alert_score, 
                    cooldown_until, score_at_last_alert, must_drop_below, total_alerts_sent)
            VALUES (@id, @userId, @locationId, @alertType, @lastAlertedAt, @lastAlertScore,
                    @cooldownUntil, @scoreAtLastAlert, @mustDropBelow, 1);
    `, {
        id,
        locationId,
        alertType,
        ...state
    });
}

/**
 * Log a WhatsApp message
 */
async function logMessage(userId, direction, messageText, intent = null, twilioSid = null) {
    return await query(`
        INSERT INTO message_log (user_id, direction, message_text, detected_intent, twilio_sid)
        VALUES (@userId, @direction, @messageText, @intent, @twilioSid)
    `, { userId, direction, messageText, intent, twilioSid });
}

/**
 * Get recent messages for a user
 */
async function getRecentMessages(userId, limit = 20) {
    return await queryRows(`
        SELECT TOP (@limit) *
        FROM message_log
        WHERE user_id = @userId
        ORDER BY created_at DESC
    `, { userId, limit });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Connection
    getPool,
    close,
    
    // Generic queries
    query,
    queryRows,
    queryOne,
    insert,
    update,
    remove,
    
    // Transactions
    beginTransaction,
    withTransaction,
    
    // Specific helpers
    getUserById,
    getUserByPhone,
    getUserPreferences,
    getUserLocations,
    getLocationWithState,
    getLocationsForScoring,
    updateLocationState,
    getAlertState,
    updateAlertState,
    logMessage,
    getRecentMessages,
    
    // SQL types for parameters
    sql
};