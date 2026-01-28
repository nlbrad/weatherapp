/**
 * UserLocationHelper.js - Get user's saved location
 * 
 * Fetches user's primary location from UserLocations table.
 * Falls back to Dublin if no location saved.
 * 
 * Used by alert functions to get lat/lon for each user.
 */

const { TableClient } = require('@azure/data-tables');

// Default location (Dublin)
const DEFAULT_LOCATION = {
    latitude: 53.3498,
    longitude: -6.2603,
    locationName: 'Dublin',
    country: 'IE'
};

/**
 * Get user's primary location from UserLocations table
 * 
 * @param {string} userId - User ID
 * @param {object} context - Azure function context for logging
 * @returns {Promise<object>} Location with lat, lon, name
 */
async function getUserLocation(userId, context) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        context?.log?.('Development mode - using default location');
        return DEFAULT_LOCATION;
    }
    
    try {
        const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');
        
        // Query all locations for this user
        const locations = [];
        const entities = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${userId}'` }
        });
        
        for await (const entity of entities) {
            locations.push({
                locationName: entity.locationName || entity.rowKey,
                latitude: entity.latitude,
                longitude: entity.longitude,
                country: entity.country,
                isPrimary: entity.isPrimary === true,
                alertsEnabled: entity.alertsEnabled !== false
            });
        }
        
        if (locations.length === 0) {
            context?.log?.(`No locations found for user ${userId} - using default`);
            return DEFAULT_LOCATION;
        }
        
        // Find primary location, or first one with alertsEnabled, or just first one
        let location = locations.find(l => l.isPrimary);
        if (!location) {
            location = locations.find(l => l.alertsEnabled);
        }
        if (!location) {
            location = locations[0];
        }
        
        // Validate coordinates
        if (!location.latitude || !location.longitude) {
            context?.log?.(`Location ${location.locationName} missing coordinates - using default`);
            return DEFAULT_LOCATION;
        }
        
        context?.log?.(`Using location: ${location.locationName} (${location.latitude}, ${location.longitude})`);
        
        return {
            latitude: location.latitude,
            longitude: location.longitude,
            locationName: location.locationName,
            country: location.country
        };
        
    } catch (error) {
        context?.error?.('Error fetching user location:', error.message);
        return DEFAULT_LOCATION;
    }
}

/**
 * Get all locations for a user
 * 
 * @param {string} userId - User ID
 * @param {object} context - Azure function context
 * @returns {Promise<array>} Array of locations
 */
async function getAllUserLocations(userId, context) {
    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        return [DEFAULT_LOCATION];
    }
    
    try {
        const tableClient = TableClient.fromConnectionString(connectionString, 'UserLocations');
        
        const locations = [];
        const entities = tableClient.listEntities({
            queryOptions: { filter: `PartitionKey eq '${userId}'` }
        });
        
        for await (const entity of entities) {
            if (entity.latitude && entity.longitude) {
                locations.push({
                    locationName: entity.locationName || entity.rowKey,
                    latitude: entity.latitude,
                    longitude: entity.longitude,
                    country: entity.country,
                    isPrimary: entity.isPrimary === true,
                    alertsEnabled: entity.alertsEnabled !== false
                });
            }
        }
        
        return locations.length > 0 ? locations : [DEFAULT_LOCATION];
        
    } catch (error) {
        context?.error?.('Error fetching user locations:', error.message);
        return [DEFAULT_LOCATION];
    }
}

module.exports = {
    getUserLocation,
    getAllUserLocations,
    DEFAULT_LOCATION
};