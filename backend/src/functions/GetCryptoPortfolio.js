/**
 * CryptoPortfolio.js - Get & Save user crypto portfolio
 *
 * GET  /api/crypto-portfolio?userId=user123  → returns holdings with live prices
 * POST /api/crypto-portfolio  body: { userId, holdings } → saves holdings
 *
 * Combined into one handler because Azure Functions v4 requires
 * a single handler per route.
 */

const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const cgDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCoinGeckoWithRetry(url, timeout = 8000) {
    for (let attempt = 0; attempt <= 2; attempt++) {
        const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
        if (response.status === 429 && attempt < 2) {
            const waitMs = Math.pow(2, attempt) * 1000;
            console.warn(`CoinGecko 429, retrying in ${waitMs}ms`);
            await cgDelay(waitMs);
            continue;
        }
        return response;
    }
}

// In-memory store for development mode (no Azure Table Storage)
const devStore = new Map();

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

// ─── GET handler ───
async function handleGet(request, context) {
    const userId = request.query.get('userId');

    if (!userId) {
        return {
            status: 400,
            headers: corsHeaders(),
            jsonBody: { error: 'Missing userId parameter' },
        };
    }

    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;

    // Development mode — use in-memory store
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        const devHoldings = devStore.get(userId) || [];
        if (devHoldings.length === 0) {
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: {
                    userId,
                    holdings: [],
                    totalValue: 0,
                    totalPnl: 0,
                    totalPnlPercent: 0,
                    isDefault: true,
                },
            };
        }
        // In dev mode, skip live price fetching — just return holdings with mock values
        let totalValue = 0;
        let totalCost = 0;
        const enriched = devHoldings.map(h => {
            const currentPrice = h.buyPrice; // mock: use buy price as current
            const value = currentPrice * h.amount;
            const cost = h.buyPrice * h.amount;
            totalValue += value;
            totalCost += cost;
            return { ...h, currentPrice, value, cost, pnl: 0, pnlPercent: 0, change24h: 0 };
        });
        return {
            status: 200,
            headers: corsHeaders(),
            jsonBody: { userId, holdings: enriched, totalValue, totalCost, totalPnl: 0, totalPnlPercent: 0 },
        };
    }

    // Production — get from Azure Table Storage
    const tableClient = TableClient.fromConnectionString(connectionString, 'CryptoPortfolios');

    let holdings = [];
    try {
        const entity = await tableClient.getEntity('portfolio', userId);
        holdings = entity.holdingsJson ? JSON.parse(entity.holdingsJson) : [];
    } catch (error) {
        if (error.statusCode === 404) {
            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: {
                    userId,
                    holdings: [],
                    totalValue: 0,
                    totalPnl: 0,
                    totalPnlPercent: 0,
                    isDefault: true,
                },
            };
        }
        throw error;
    }

    if (holdings.length === 0) {
        return {
            status: 200,
            headers: corsHeaders(),
            jsonBody: {
                userId,
                holdings: [],
                totalValue: 0,
                totalPnl: 0,
                totalPnlPercent: 0,
            },
        };
    }

    // Fetch current prices from CoinGecko
    const coinIds = [...new Set(holdings.map(h => h.coinId))];
    let currentPrices = {};

    try {
        const priceResponse = await fetchCoinGeckoWithRetry(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
        );
        currentPrices = await priceResponse.json();
    } catch (err) {
        context.warn('Failed to fetch current prices:', err.message);
    }

    // Calculate P&L for each holding
    let totalValue = 0;
    let totalCost = 0;

    const enrichedHoldings = holdings.map(holding => {
        const priceData = currentPrices[holding.coinId];
        const currentPrice = priceData?.usd || 0;
        const change24h = priceData?.usd_24h_change || 0;
        const value = currentPrice * holding.amount;
        const cost = holding.buyPrice * holding.amount;
        const pnl = value - cost;
        const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;

        totalValue += value;
        totalCost += cost;

        return {
            ...holding,
            currentPrice,
            change24h,
            value,
            cost,
            pnl,
            pnlPercent,
        };
    });

    const totalPnl = totalValue - totalCost;
    const totalPnlPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
        status: 200,
        headers: corsHeaders(),
        jsonBody: {
            userId,
            holdings: enrichedHoldings,
            totalValue,
            totalCost,
            totalPnl,
            totalPnlPercent,
        },
    };
}

// ─── POST handler ───
async function handlePost(request, context) {
    const body = await request.json();
    const { userId, holdings } = body;

    if (!userId) {
        return {
            status: 400,
            headers: corsHeaders(),
            jsonBody: { error: 'Missing userId' },
        };
    }

    if (!Array.isArray(holdings)) {
        return {
            status: 400,
            headers: corsHeaders(),
            jsonBody: { error: 'holdings must be an array' },
        };
    }

    // Validate each holding
    const validatedHoldings = holdings.map(h => ({
        coinId: h.coinId || '',
        symbol: h.symbol || '',
        name: h.name || '',
        image: h.image || '',
        amount: parseFloat(h.amount) || 0,
        buyPrice: parseFloat(h.buyPrice) || 0,
        buyDate: h.buyDate || new Date().toISOString().split('T')[0],
    })).filter(h => h.coinId && h.amount > 0);

    const connectionString = process.env.AzureWebJobsStorage || process.env.AZURE_STORAGE_CONNECTION_STRING;

    // Development mode — persist to in-memory store
    if (!connectionString || connectionString === 'UseDevelopmentStorage=true') {
        devStore.set(userId, validatedHoldings);
        context.log(`Dev mode - saved ${validatedHoldings.length} holdings for ${userId}`);
        return {
            status: 200,
            headers: corsHeaders(),
            jsonBody: {
                success: true,
                userId,
                holdingsCount: validatedHoldings.length,
                message: 'Portfolio saved (development mode)',
            },
        };
    }

    // Production - save to Azure Table Storage
    const tableClient = TableClient.fromConnectionString(connectionString, 'CryptoPortfolios');

    // Ensure table exists
    try {
        await tableClient.createTable();
    } catch (error) {
        if (error.statusCode !== 409) {
            context.log('Table may already exist');
        }
    }

    const entity = {
        partitionKey: 'portfolio',
        rowKey: userId,
        holdingsJson: JSON.stringify(validatedHoldings),
        holdingsCount: validatedHoldings.length,
        updatedAt: new Date().toISOString(),
    };

    await tableClient.upsertEntity(entity);
    context.log(`Saved portfolio for user: ${userId} (${validatedHoldings.length} holdings)`);

    return {
        status: 200,
        headers: corsHeaders(),
        jsonBody: {
            success: true,
            userId,
            holdingsCount: validatedHoldings.length,
            message: 'Portfolio saved successfully',
            updatedAt: entity.updatedAt,
        },
    };
}

// ─── Combined handler ───
app.http('CryptoPortfolio', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'crypto-portfolio',
    handler: async (request, context) => {
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders() };
        }

        context.log(`CryptoPortfolio [${request.method}] triggered`);

        try {
            if (request.method === 'POST') {
                return await handlePost(request, context);
            }
            return await handleGet(request, context);
        } catch (error) {
            context.error('Error in CryptoPortfolio:', error);
            return {
                status: 500,
                headers: corsHeaders(),
                jsonBody: { error: error.message },
            };
        }
    },
});
