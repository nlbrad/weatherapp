/**
 * CleanupAlertHistory.js - scheduled cleanup for SentAlerts table
 *
 * Runs weekly to prune old alert history entries.
 */

const { app } = require('@azure/functions');
const { cleanupOldAlerts } = require('../utils/AlertTracker');

// Weekly at 03:15 UTC on Sundays
app.timer('CleanupAlertHistoryTimer', {
    schedule: '0 15 3 * * 0',
    handler: async (timer, context) => {
        context.log('CleanupAlertHistoryTimer triggered');
        try {
            const daysToKeep = parseInt(process.env.ALERT_HISTORY_DAYS || '30', 10);
            await cleanupOldAlerts(daysToKeep);
            context.log(`Alert history cleanup complete (kept ${daysToKeep} days)`);
        } catch (error) {
            context.error('Alert history cleanup failed:', error.message);
        }
    }
});
