/**
 * GetAlertHistory.js - Retrieve user's sent alert history
 * 
 * GET /api/alert-history?userId=xxx&limit=20&type=aurora
 * 
 * Returns list of alerts sent to the user, sorted by most recent first.
 */

const { app } = require('@azure/functions');
const { getAlertHistory } = require('../utils/AlertTracker');

app.http('GetAlertHistory', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'alert-history',
    handler: async (request, context) => {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            };
        }

        context.log('GetAlertHistory triggered');

        try {
            const userId = request.query.get('userId');
            const limit = parseInt(request.query.get('limit')) || 20;
            const alertType = request.query.get('type') || null;

            if (!userId) {
                return {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    jsonBody: { error: 'userId parameter required' }
                };
            }

            const history = await getAlertHistory(userId, limit, alertType);

            // Format for frontend
            const formattedHistory = history.map(alert => ({
                id: alert.id,
                type: alert.type,
                title: alert.title,
                summary: alert.summary,
                location: alert.location,
                score: alert.score,
                severity: alert.severity,
                sentAt: alert.sentAt,
                // Format relative time
                timeAgo: getRelativeTime(alert.sentAt),
            }));

            return {
                status: 200,
                headers: { 'Access-Control-Allow-Origin': '*' },
                jsonBody: {
                    userId,
                    count: formattedHistory.length,
                    alerts: formattedHistory,
                }
            };

        } catch (error) {
            context.error('Error fetching alert history:', error);
            return {
                status: 500,
                headers: { 'Access-Control-Allow-Origin': '*' },
                jsonBody: { error: 'Failed to fetch alert history' }
            };
        }
    }
});

/**
 * Get relative time string (e.g., "2 hours ago", "Yesterday")
 */
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Format as date
    return date.toLocaleDateString('en-IE', { 
        day: 'numeric', 
        month: 'short' 
    });
}

module.exports = { getRelativeTime };
