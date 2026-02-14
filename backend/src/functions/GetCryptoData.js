/**
 * GetCryptoData.js - Comprehensive Crypto Data API
 *
 * GET /api/crypto-data?sections=markets,news,sentiment,defi,topCoins,trending
 *
 * Returns all crypto data needed by the portal Crypto Hub page.
 * Reuses existing CryptoSources.js functions + new fetchTopCoins/fetchTrending.
 *
 * Query params:
 *   sections (optional) - comma-separated list of data sections to fetch
 *                         Default: all sections
 *   newsLimit (optional) - number of news articles (default 15)
 *   coinsLimit (optional) - number of top coins (default 20)
 *   query (optional) - search query for coin search
 */

const { app } = require('@azure/functions');
const {
    fetchCryptoNews,
    fetchMarketData,
    fetchFearGreedIndex,
    fetchDeFiMetrics,
    fetchTopCoins,
    fetchTrending,
    searchCoins,
} = require('../utils/CryptoSources');

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

app.http('GetCryptoData', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'crypto-data',
    handler: async (request, context) => {
        // CORS preflight
        if (request.method === 'OPTIONS') {
            return { status: 204, headers: corsHeaders() };
        }

        context.log('GetCryptoData triggered');

        try {
            const sectionsParam = request.query.get('sections');
            const newsLimit = parseInt(request.query.get('newsLimit') || '15');
            const coinsLimit = parseInt(request.query.get('coinsLimit') || '20');
            const query = request.query.get('query');

            // If query is provided, do a coin search instead
            if (query) {
                const results = await searchCoins(query);
                return {
                    status: 200,
                    headers: corsHeaders(),
                    jsonBody: { searchResults: results },
                };
            }

            // Determine which sections to fetch
            const allSections = ['markets', 'news', 'sentiment', 'defi', 'topCoins', 'trending'];
            const requestedSections = sectionsParam
                ? sectionsParam.split(',').map(s => s.trim()).filter(s => allSections.includes(s))
                : allSections;

            context.log(`Fetching sections: ${requestedSections.join(', ')}`);

            // Stagger fetches to avoid CoinGecko 429 rate limits.
            // Non-CoinGecko sources (news RSS, Alternative.me, DefiLlama) run in parallel.
            // CoinGecko sources (markets, topCoins, trending) run sequentially with delays.
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            const response = { fetchedAt: new Date().toISOString() };

            // Group 1: Non-CoinGecko (run in parallel)
            const nonCGFetchers = {};
            if (requestedSections.includes('news')) {
                nonCGFetchers.news = fetchCryptoNews(newsLimit);
            }
            if (requestedSections.includes('sentiment')) {
                nonCGFetchers.sentiment = fetchFearGreedIndex();
            }
            if (requestedSections.includes('defi')) {
                nonCGFetchers.defi = fetchDeFiMetrics();
            }

            // Group 2: CoinGecko sources (run sequentially with 300ms gaps)
            const cgSections = ['markets', 'topCoins', 'trending'].filter(s => requestedSections.includes(s));

            // Start non-CG fetches immediately
            const nonCGPromise = (async () => {
                const keys = Object.keys(nonCGFetchers);
                const results = await Promise.all(Object.values(nonCGFetchers));
                keys.forEach((key, i) => { response[key] = results[i]; });
            })();

            // Run CoinGecko fetches sequentially with delays
            const cgPromise = (async () => {
                for (const section of cgSections) {
                    try {
                        if (section === 'markets') {
                            response.markets = await fetchMarketData();
                        } else if (section === 'topCoins') {
                            response.topCoins = await fetchTopCoins(coinsLimit);
                        } else if (section === 'trending') {
                            response.trending = await fetchTrending();
                        }
                    } catch (err) {
                        context.warn(`Failed to fetch ${section}:`, err.message);
                        // Return empty/null so other sections still work
                        if (section === 'markets') response.markets = { crypto: [], traditional: [], totalMarketCap: null, btcDominance: null };
                        else if (section === 'topCoins') response.topCoins = [];
                        else if (section === 'trending') response.trending = [];
                    }
                    // Wait between CoinGecko calls to respect rate limits
                    if (cgSections.indexOf(section) < cgSections.length - 1) {
                        await delay(800);
                    }
                }
            })();

            // Wait for both groups to finish
            await Promise.all([nonCGPromise, cgPromise]);

            context.log('GetCryptoData completed successfully');

            return {
                status: 200,
                headers: corsHeaders(),
                jsonBody: response,
            };
        } catch (error) {
            context.error('Error in GetCryptoData:', error);
            return {
                status: 500,
                headers: corsHeaders(),
                jsonBody: { error: error.message },
            };
        }
    },
});
