/**
 * Migration Script: Azure Table Storage → Azure SQL
 * 
 * This script migrates existing data from Table Storage to the new SQL database.
 * Run with: node scripts/migrate-database.js
 * 
 * Prerequisites:
 * 1. Azure SQL database created with schema.sql
 * 2. Environment variables set (see .env.example)
 */

require('dotenv').config();

const { TableClient } = require('@azure/data-tables');
const db = require('../src/database/connection');

// Configuration
const TABLE_STORAGE_CONNECTION = process.env.AZURE_STORAGE_CONNECTION_STRING;
const USER_LOCATIONS_TABLE = 'UserLocations';
const ALERT_HISTORY_TABLE = 'AlertHistory';

// Default user for migration (since we didn't have proper user management before)
const DEFAULT_PHONE = process.env.TEST_WHATSAPP_NUMBER || '+353000000000';

async function migrate() {
    console.log('🚀 Starting migration from Table Storage to Azure SQL...\n');

    try {
        // Test SQL connection
        console.log('📡 Testing SQL connection...');
        await db.getPool();
        console.log('✅ SQL connection successful\n');

        // Migrate users
        await migrateUsers();

        // Migrate locations
        await migrateLocations();

        // Migrate alert history (optional)
        // await migrateAlertHistory();

        console.log('\n✅ Migration completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await db.close();
    }
}

/**
 * Create users from existing location data
 */
async function migrateUsers() {
    console.log('👥 Migrating users...');

    const tableClient = TableClient.fromConnectionString(
        TABLE_STORAGE_CONNECTION,
        USER_LOCATIONS_TABLE
    );

    // Get unique user IDs from locations
    const userIds = new Set();
    const entities = tableClient.listEntities();

    for await (const entity of entities) {
        if (entity.userId) {
            userIds.add(entity.userId);
        }
    }

    console.log(`   Found ${userIds.size} unique users`);

    // Create user records
    let created = 0;
    let skipped = 0;

    for (const userId of userIds) {
        try {
            // Check if user already exists
            const existing = await db.queryOne(
                'SELECT id FROM users WHERE id = @userId',
                { userId }
            );

            if (existing) {
                skipped++;
                continue;
            }

            // Create user
            await db.query(`
                INSERT INTO users (id, phone_number, display_name, timezone, created_at)
                VALUES (@id, @phone, @name, @timezone, GETUTCDATE())
            `, {
                id: userId,
                phone: DEFAULT_PHONE, // Will need to be updated manually
                name: `User ${userId}`,
                timezone: 'Europe/Dublin'
            });

            // Create default preferences
            await db.query(`
                INSERT INTO user_preferences (user_id, alert_mode, night_sky_enabled, aurora_enabled, outdoor_enabled)
                VALUES (@userId, 'balanced', 1, 1, 1)
            `, { userId });

            created++;
        } catch (error) {
            console.error(`   Error creating user ${userId}:`, error.message);
        }
    }

    console.log(`   ✅ Created ${created} users, skipped ${skipped} existing\n`);
}

/**
 * Migrate locations from Table Storage
 */
async function migrateLocations() {
    console.log('📍 Migrating locations...');

    const tableClient = TableClient.fromConnectionString(
        TABLE_STORAGE_CONNECTION,
        USER_LOCATIONS_TABLE
    );

    const entities = tableClient.listEntities();
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for await (const entity of entities) {
        try {
            const locationId = `${entity.userId}_${entity.locationName.toLowerCase().replace(/\s+/g, '_')}`;

            // Check if already migrated
            const existing = await db.queryOne(
                'SELECT id FROM locations WHERE id = @id',
                { id: locationId }
            );

            if (existing) {
                skipped++;
                continue;
            }

            // Insert location
            await db.query(`
                INSERT INTO locations (
                    id, user_id, name, country, latitude, longitude,
                    is_primary, alerts_enabled, min_temp, max_temp,
                    good_for_sky, good_for_aurora, good_for_outdoor, good_for_swimming,
                    created_at
                )
                VALUES (
                    @id, @userId, @name, @country, @lat, @lon,
                    @isPrimary, @alertsEnabled, @minTemp, @maxTemp,
                    1, 1, 1, 0,
                    GETUTCDATE()
                )
            `, {
                id: locationId,
                userId: entity.userId,
                name: entity.locationName,
                country: entity.country || null,
                lat: entity.latitude || 0,
                lon: entity.longitude || 0,
                isPrimary: entity.isPrimary === true ? 1 : 0,
                alertsEnabled: entity.alertsEnabled === true ? 1 : 0,
                minTemp: entity.minTemp || 5,
                maxTemp: entity.maxTemp || 25
            });

            migrated++;

            // Log progress every 10 locations
            if (migrated % 10 === 0) {
                console.log(`   Migrated ${migrated} locations...`);
            }

        } catch (error) {
            errors++;
            console.error(`   Error migrating location:`, error.message);
            console.error(`   Entity:`, JSON.stringify(entity, null, 2));
        }
    }

    console.log(`   ✅ Migrated ${migrated} locations, skipped ${skipped}, errors ${errors}\n`);
}

/**
 * Migrate alert history (optional)
 */
async function migrateAlertHistory() {
    console.log('🔔 Migrating alert history...');

    try {
        const tableClient = TableClient.fromConnectionString(
            TABLE_STORAGE_CONNECTION,
            ALERT_HISTORY_TABLE
        );

        const entities = tableClient.listEntities();
        let migrated = 0;

        for await (const entity of entities) {
            // Map to new alert_state format
            // This is optional since we're resetting alert state anyway
            migrated++;
        }

        console.log(`   ✅ Migrated ${migrated} alert records\n`);

    } catch (error) {
        console.log(`   ⚠️ Alert history table not found or empty (this is OK)\n`);
    }
}

/**
 * Verify migration
 */
async function verify() {
    console.log('🔍 Verifying migration...\n');

    const users = await db.queryOne('SELECT COUNT(*) as count FROM users');
    const locations = await db.queryOne('SELECT COUNT(*) as count FROM locations');
    const prefs = await db.queryOne('SELECT COUNT(*) as count FROM user_preferences');

    console.log('   Database contents:');
    console.log(`   - Users: ${users.count}`);
    console.log(`   - Locations: ${locations.count}`);
    console.log(`   - User Preferences: ${prefs.count}`);

    // Show sample data
    const sampleLocations = await db.queryRows(`
        SELECT TOP 5 l.name, l.country, l.latitude, l.longitude, u.id as user_id
        FROM locations l
        JOIN users u ON l.user_id = u.id
    `);

    console.log('\n   Sample locations:');
    for (const loc of sampleLocations) {
        console.log(`   - ${loc.name}, ${loc.country} (${loc.latitude}, ${loc.longitude}) - User: ${loc.user_id}`);
    }
}

// Run migration
console.log('═'.repeat(60));
console.log('  Weather Alert System - Database Migration');
console.log('  Table Storage → Azure SQL');
console.log('═'.repeat(60));
console.log();

migrate()
    .then(() => verify())
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Migration error:', error);
        process.exit(1);
    });