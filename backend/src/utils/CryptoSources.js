/**
 * CryptoSources.js - Crypto Digest Data Fetching
 * 
 * Fetches comprehensive crypto data:
 * - News from multiple sources (balanced selection)
 * - Market prices (BTC, ETH, S&P 500, Gold)
 * - Fear & Greed Index
 * - DeFi metrics (TVL, DEX volume, gas prices)
 */

// ============================================
// NEWS SOURCES
// ============================================

const CRYPTO_NEWS_SOURCES = [
    // Tier 1 — Major outlets, slightly preferred
    {
        name: 'CoinDesk',
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        weight: 1.2,
        tier: 1,
    },
    {
        name: 'The Block',
        url: 'https://www.theblock.co/rss.xml',
        weight: 1.2,
        tier: 1,
    },
    {
        name: 'DL News',
        url: 'https://www.dlnews.com/arc/outboundfeeds/rss/',
        weight: 1.2,
        tier: 1,
    },

    // Tier 2 — Strong editorial sources
    {
        name: 'Decrypt',
        url: 'https://decrypt.co/feed',
        weight: 1.0,
        tier: 2,
    },
    {
        name: 'CoinTelegraph',
        url: 'https://cointelegraph.com/rss',
        weight: 1.0,
        tier: 2,
    },
    {
        name: 'Blockworks',
        url: 'https://blockworks.co/feed',
        weight: 1.1,
        tier: 2,
    },
    {
        name: 'Bitcoin Magazine',
        url: 'https://bitcoinmagazine.com/feed',
        weight: 1.0,
        tier: 2,
    },
    {
        name: 'The Defiant',
        url: 'https://thedefiant.io/feed',
        weight: 1.0,
        tier: 2,
    },

    // Tier 3 — Additional breadth
    {
        name: 'CryptoSlate',
        url: 'https://cryptoslate.com/feed/',
        weight: 0.9,
        tier: 3,
    },
    {
        name: 'Unchained',
        url: 'https://unchainedcrypto.com/feed/',
        weight: 0.9,
        tier: 3,
    },
];

// ============================================
// COINGECKO RATE-LIMIT HELPER + IN-MEMORY CACHE
// ============================================

const cgDelay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simple in-memory cache for CoinGecko responses.
 * TTL: 90 seconds. Prevents redundant API calls within the same
 * Azure Functions host instance (shared across requests).
 */
const cgCache = new Map();
const CG_CACHE_TTL_MS = 90_000; // 90 seconds

function getCached(url) {
    const entry = cgCache.get(url);
    if (entry && Date.now() - entry.timestamp < CG_CACHE_TTL_MS) {
        console.log(`CoinGecko cache HIT: ${url.substring(0, 60)}...`);
        return entry.data;
    }
    return null;
}

function setCache(url, data) {
    cgCache.set(url, { data, timestamp: Date.now() });
    // Evict old entries (keep cache small)
    if (cgCache.size > 20) {
        const oldestKey = cgCache.keys().next().value;
        cgCache.delete(oldestKey);
    }
}

/**
 * Fetch from CoinGecko with:
 *  1. In-memory cache (90s TTL)
 *  2. Automatic retry on 429 with exponential backoff (1.5s, 3s, 6s)
 */
async function fetchCoinGecko(url, options = {}) {
    // Check cache first
    const cached = getCached(url);
    if (cached) return new Response(JSON.stringify(cached), { status: 200 });

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(options.timeout || 10000),
        });

        if (response.status === 429) {
            if (attempt < maxRetries) {
                const waitMs = Math.pow(2, attempt) * 1500; // 1.5s, 3s, 6s
                console.warn(`CoinGecko 429 rate limit, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
                await cgDelay(waitMs);
                continue;
            }
            console.error(`CoinGecko 429 after ${maxRetries} retries: ${url}`);
            return response;
        }

        // Cache successful responses
        if (response.ok) {
            const data = await response.json();
            setCache(url, data);
            // Return a new Response so callers can still call .json()
            return new Response(JSON.stringify(data), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return response;
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];
        
        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');
        const pubDate = extractTag(itemXml, 'pubDate');
        
        if (title) {
            items.push({
                title: cleanText(title),
                link: cleanLink(link),
                pubDate: pubDate ? new Date(pubDate) : new Date(),
            });
        }
    }
    
    return items;
}

function extractTag(xml, tag) {
    const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRegex);
    if (cdataMatch) return cdataMatch[1];
    
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1] : null;
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function cleanLink(link) {
    if (!link) return null;
    return link.trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
}

async function fetchRSS(url, sourceName, limit = 10) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000),
            headers: { 'User-Agent': 'OmniAlert/1.0' }
        });
        
        if (!response.ok) {
            console.warn(`Failed to fetch ${sourceName}: ${response.status}`);
            return [];
        }
        
        const xml = await response.text();
        const items = parseRSS(xml);
        
        return items.slice(0, limit).map(item => ({
            ...item,
            source: sourceName
        }));
    } catch (error) {
        console.warn(`Error fetching ${sourceName}:`, error.message);
        return [];
    }
}

// ============================================
// SOURCE-BALANCED NEWS SELECTION
// ============================================

/**
 * Fetch news with guaranteed source diversity
 * Uses weighted round-robin selection ensuring broad coverage.
 * With 10 sources, fetches more per source and deduplicates aggressively.
 */
async function fetchCryptoNews(limit = 15) {
    console.log(`Fetching crypto news from ${CRYPTO_NEWS_SOURCES.length} sources...`);

    // Fetch from all sources in parallel — get top 8 from each
    const results = await Promise.all(
        CRYPTO_NEWS_SOURCES.map(s =>
            fetchRSS(s.url, s.name, 8)
        )
    );

    // Group by source, attach weight
    const bySource = {};
    for (let i = 0; i < results.length; i++) {
        const src = CRYPTO_NEWS_SOURCES[i];
        bySource[src.name] = {
            articles: results[i].filter(item => item.title && item.link),
            weight: src.weight,
            tier: src.tier,
        };
    }

    const activeSources = Object.keys(bySource).filter(s => bySource[s].articles.length > 0);
    console.log('Articles per source:', activeSources.map(s => `${s}: ${bySource[s].articles.length}`).join(', '));

    // Weighted round-robin: tier 1 sources get picked first each round
    // Sort by tier ascending so tier-1 leads each cycle
    const sortedSources = [...activeSources].sort((a, b) => {
        return (bySource[a].tier || 2) - (bySource[b].tier || 2);
    });

    const selected = [];
    let currentIndex = 0;
    let attempts = 0;
    const maxAttempts = limit * sortedSources.length * 2;

    while (selected.length < limit && attempts < maxAttempts) {
        const sourceName = sortedSources[currentIndex % sortedSources.length];
        const sourceData = bySource[sourceName];

        if (sourceData.articles.length > 0) {
            const article = sourceData.articles.shift();

            // Aggressive dedup: check title similarity against ALL selected
            const isDuplicate = selected.some(existing =>
                areTitlesSimilar(existing.title, article.title)
            );

            if (!isDuplicate) {
                selected.push(article);
            }
        }

        currentIndex++;
        attempts++;
    }

    // Sort final selection by publish date (newest first)
    selected.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    const sourceCount = new Set(selected.map(a => a.source)).size;
    console.log(`Final selection: ${selected.length} articles from ${sourceCount} sources`);

    return selected;
}

/**
 * Check if two titles are similar (likely duplicates).
 * Uses multi-level detection:
 *  1. Exact normalised match
 *  2. Substring containment (ignoring very short titles)
 *  3. Significant-word overlap (drops stop words)
 *  4. Key entity match — if the same names/numbers appear, likely same story
 */
const STOP_WORDS = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','is','it',
    'by','as','its','was','are','be','has','had','have','with','from','that',
    'this','will','can','could','would','should','may','might','says','said',
    'new','how','why','what','when','where','who','which','not','no','more',
    'about','after','than','into','over','also','just','most','been',
]);

function areTitlesSimilar(title1, title2) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const t1 = normalize(title1);
    const t2 = normalize(title2);

    // 1. Exact match
    if (t1 === t2) return true;

    // 2. Substring containment (only if both titles have >4 words — avoids false positives on short titles)
    const w1 = t1.split(/\s+/);
    const w2 = t2.split(/\s+/);
    if (w1.length > 4 && w2.length > 4) {
        if (t1.includes(t2) || t2.includes(t1)) return true;
    }

    // 3. Significant-word overlap (drop stop words)
    const significant = (words) => words.filter(w => w.length > 2 && !STOP_WORDS.has(w));
    const sig1 = new Set(significant(w1));
    const sig2 = new Set(significant(w2));

    if (sig1.size >= 3 && sig2.size >= 3) {
        const intersection = [...sig1].filter(w => sig2.has(w));
        const minSig = Math.min(sig1.size, sig2.size);
        if (intersection.length / minSig > 0.6) return true;
    }

    // 4. Key entity match — numbers + proper nouns (capitalised in original)
    //    e.g. "Bitcoin ETF hits $10B" vs "Bitcoin ETF surpasses $10 billion"
    const extractEntities = (str) => {
        const nums = str.match(/\d+/g) || [];
        const caps = str.match(/[A-Z][a-z]+/g) || [];
        return new Set([...nums, ...caps.map(c => c.toLowerCase())]);
    };
    const ent1 = extractEntities(title1);
    const ent2 = extractEntities(title2);
    if (ent1.size >= 3 && ent2.size >= 3) {
        const entOverlap = [...ent1].filter(e => ent2.has(e));
        const minEnt = Math.min(ent1.size, ent2.size);
        if (entOverlap.length / minEnt > 0.7) return true;
    }

    return false;
}

// ============================================
// MARKET DATA
// ============================================

async function fetchMarketData() {
    const data = {
        crypto: [],
        traditional: [],
        totalMarketCap: null,
        totalMarketCapChange24h: null,
        btcDominance: null,
        fetchedAt: new Date().toISOString(),
    };
    
    // Crypto prices from CoinGecko (free, no API key)
    try {
        const cryptoResponse = await fetchCoinGecko(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
            { timeout: 8000 }
        );
        const prices = await cryptoResponse.json();

        if (prices.bitcoin) {
            data.crypto = [
                {
                    symbol: 'BTC',
                    price: prices.bitcoin.usd,
                    change24h: prices.bitcoin.usd_24h_change
                },
                {
                    symbol: 'ETH',
                    price: prices.ethereum?.usd,
                    change24h: prices.ethereum?.usd_24h_change
                },
            ];
        }

        // Delay between CoinGecko calls to avoid rate limits
        await cgDelay(500);

        // Get global market data
        const globalResponse = await fetchCoinGecko(
            'https://api.coingecko.com/api/v3/global',
            { timeout: 8000 }
        );
        const globalData = await globalResponse.json();
        
        if (globalData.data) {
            data.totalMarketCap = globalData.data.total_market_cap?.usd;
            data.totalMarketCapChange24h = globalData.data.market_cap_change_percentage_24h_usd;
            data.btcDominance = globalData.data.market_cap_percentage?.btc;
        }
        
        console.log('Crypto prices fetched successfully');
    } catch (err) {
        console.warn('Failed to fetch crypto prices:', err.message);
    }
    
    // Traditional markets via Twelve Data API
    const twelveDataKey = process.env.TWELVE_DATA_API_KEY;
    
    if (twelveDataKey) {
        try {
            console.log('Fetching traditional markets from Twelve Data...');
            
            // Fetch S&P 500 via SPY ETF (free tier compatible)
            // Use time_series endpoint with 1day interval to get latest close + change
            const spUrl = `https://api.twelvedata.com/time_series?symbol=SPY&interval=1day&outputsize=2&apikey=${twelveDataKey}`;
            const spResponse = await fetch(spUrl, { signal: AbortSignal.timeout(8000) });
            
            console.log(`S&P 500 (SPY) response status: ${spResponse.status}`);
            
            if (spResponse.ok) {
                const spData = await spResponse.json();
                console.log('S&P 500 raw response:', JSON.stringify(spData).substring(0, 500));
                
                // Check for errors
                if (spData.status === 'error') {
                    console.error('S&P 500 API error:', spData.message);
                } else if (spData.values && spData.values.length >= 2) {
                    // Get latest (today) and previous day
                    const today = spData.values[0];
                    const yesterday = spData.values[1];
                    
                    const spyPrice = parseFloat(today.close);
                    const spyPrevPrice = parseFloat(yesterday.close);
                    
                    // SPY tracks S&P 500 at ~1/10 ratio, so multiply by 10
                    const price = spyPrice * 10;
                    const change = ((spyPrice - spyPrevPrice) / spyPrevPrice) * 100;
                    
                    console.log(`S&P 500: ${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%) [via SPY: $${spyPrice.toFixed(2)}]`);
                    
                    data.traditional.push({
                        symbol: 'SP500',
                        name: 'S&P 500',
                        price: price,
                        change24h: change,
                    });
                } else {
                    console.warn('S&P 500 data missing values array or insufficient data');
                }
            } else {
                const errorText = await spResponse.text();
                console.error(`S&P 500 HTTP error: ${spResponse.status} - ${errorText}`);
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Fetch Gold via GLD ETF (free tier compatible)
            const goldUrl = `https://api.twelvedata.com/time_series?symbol=GLD&interval=1day&outputsize=2&apikey=${twelveDataKey}`;
            const goldResponse = await fetch(goldUrl, { signal: AbortSignal.timeout(8000) });
            
            console.log(`Gold (GLD) response status: ${goldResponse.status}`);
            
            if (goldResponse.ok) {
                const goldData = await goldResponse.json();
                console.log('Gold raw response:', JSON.stringify(goldData).substring(0, 500));
                
                // Check for errors
                if (goldData.status === 'error') {
                    console.error('Gold API error:', goldData.message);
                } else if (goldData.values && goldData.values.length >= 2) {
                    // Get latest (today) and previous day
                    const today = goldData.values[0];
                    const yesterday = goldData.values[1];
                    
                    const gldPrice = parseFloat(today.close);
                    const gldPrevPrice = parseFloat(yesterday.close);
                    
                    // GLD tracks gold at ~1/10 ratio, so multiply by 10
                    const price = gldPrice * 10;
                    const change = ((gldPrice - gldPrevPrice) / gldPrevPrice) * 100;
                    
                    console.log(`Gold: $${price.toFixed(2)}/oz (${change > 0 ? '+' : ''}${change.toFixed(2)}%) [via GLD: $${gldPrice.toFixed(2)}]`);
                    
                    data.traditional.push({
                        symbol: 'GOLD',
                        name: 'Gold',
                        price: price,
                        change24h: change,
                    });
                } else {
                    console.warn('Gold data missing values array or insufficient data');
                }
            } else {
                const errorText = await goldResponse.text();
                console.error(`Gold HTTP error: ${goldResponse.status} - ${errorText}`);
            }
            
            console.log(`Traditional market prices fetched: ${data.traditional.length} assets`);
            
        } catch (err) {
            console.error('Failed to fetch traditional markets from Twelve Data:', err.message);
            console.error('Error stack:', err.stack);
        }
    } else {
        console.warn('TWELVE_DATA_API_KEY not configured - skipping traditional markets');
    }
    
    return data;
}

// ============================================
// FEAR & GREED INDEX
// ============================================

async function fetchFearGreedIndex() {
    try {
        const response = await fetch(
            'https://api.alternative.me/fng/?limit=1',
            { signal: AbortSignal.timeout(5000) }
        );
        
        const data = await response.json();
        
        if (data.data && data.data[0]) {
            const value = parseInt(data.data[0].value);
            let label = data.data[0].value_classification;
            
            // Ensure consistent capitalization
            label = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
            
            console.log(`Fear & Greed Index: ${value} (${label})`);
            
            return {
                value: value,
                label: label,
                timestamp: data.data[0].timestamp
            };
        }
    } catch (err) {
        console.warn('Failed to fetch Fear & Greed Index:', err.message);
    }
    
    return null;
}

// ============================================
// DEFI METRICS
// ============================================

async function fetchDeFiMetrics() {
    const metrics = {
        tvl: null,
        dexVolume24h: null,
        ethGasGwei: null,
    };
    
    // Total Value Locked from DefiLlama
    try {
        const tvlResponse = await fetch(
            'https://api.llama.fi/v2/chains',
            { signal: AbortSignal.timeout(8000) }
        );
        
        const chains = await tvlResponse.json();
        
        // Sum TVL across all chains
        const totalTvl = chains.reduce((sum, chain) => sum + (chain.tvl || 0), 0);
        metrics.tvl = totalTvl;
        
        console.log(`Total DeFi TVL: $${(totalTvl / 1e9).toFixed(2)}B`);
    } catch (err) {
        console.warn('Failed to fetch DeFi TVL:', err.message);
    }
    
    // DEX Volume from DefiLlama
    try {
        const dexResponse = await fetch(
            'https://api.llama.fi/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true',
            { signal: AbortSignal.timeout(8000) }
        );
        
        const dexData = await dexResponse.json();
        
        if (dexData.total24h) {
            metrics.dexVolume24h = dexData.total24h;
            console.log(`24h DEX Volume: $${(dexData.total24h / 1e9).toFixed(2)}B`);
        }
    } catch (err) {
        console.warn('Failed to fetch DEX volume:', err.message);
    }
    
    // Ethereum Gas Price from Etherscan (requires API key, optional)
    const etherscanKey = process.env.ETHERSCAN_API_KEY;
    if (etherscanKey) {
        try {
            const gasResponse = await fetch(
                `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${etherscanKey}`,
                { signal: AbortSignal.timeout(5000) }
            );
            
            const gasData = await gasResponse.json();
            
            if (gasData.status === '1' && gasData.result) {
                metrics.ethGasGwei = parseInt(gasData.result.SafeGasPrice);
                console.log(`ETH Gas: ${metrics.ethGasGwei} gwei`);
            }
        } catch (err) {
            console.warn('Failed to fetch gas prices:', err.message);
        }
    }
    
    return metrics;
}

// ============================================
// FETCH ALL CRYPTO DATA
// ============================================

async function fetchAllCryptoData(options = {}) {
    const { newsLimit = 7 } = options;
    
    console.log('=== Fetching Crypto Digest Data ===');
    
    const [news, markets, sentiment, defi] = await Promise.all([
        fetchCryptoNews(newsLimit),
        fetchMarketData(),
        fetchFearGreedIndex(),
        fetchDeFiMetrics(),
    ]);
    
    console.log('=== Crypto Digest Data Fetched ===');
    console.log(`News: ${news.length} articles`);
    console.log(`Markets: ${markets.crypto.length} crypto + ${markets.traditional.length} traditional`);
    console.log(`Sentiment: ${sentiment ? sentiment.label : 'N/A'}`);
    console.log(`DeFi: TVL ${defi.tvl ? 'OK' : 'N/A'}, DEX ${defi.dexVolume24h ? 'OK' : 'N/A'}`);
    
    return {
        news,
        markets,
        sentiment,
        defi,
        fetchedAt: new Date().toISOString(),
    };
}

// ============================================
// TOP COINS (by market cap)
// ============================================

async function fetchTopCoins(limit = 20) {
    try {
        const response = await fetchCoinGecko(
            `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h,7d`
        );

        if (!response.ok) {
            console.warn(`Failed to fetch top coins: ${response.status}`);
            return [];
        }

        const coins = await response.json();

        console.log(`Fetched ${coins.length} top coins`);

        return coins.map(coin => ({
            id: coin.id,
            symbol: coin.symbol?.toUpperCase(),
            name: coin.name,
            image: coin.image,
            price: coin.current_price,
            change24h: coin.price_change_percentage_24h,
            change7d: coin.price_change_percentage_7d_in_currency,
            marketCap: coin.market_cap,
            marketCapRank: coin.market_cap_rank,
            volume24h: coin.total_volume,
            sparkline7d: coin.sparkline_in_7d?.price || [],
            high24h: coin.high_24h,
            low24h: coin.low_24h,
            ath: coin.ath,
            athChangePercent: coin.ath_change_percentage,
        }));
    } catch (err) {
        console.warn('Failed to fetch top coins:', err.message);
        return [];
    }
}

// ============================================
// TRENDING COINS
// ============================================

async function fetchTrending() {
    try {
        const response = await fetchCoinGecko(
            'https://api.coingecko.com/api/v3/search/trending',
            { timeout: 8000 }
        );

        if (!response.ok) {
            console.warn(`Failed to fetch trending: ${response.status}`);
            return [];
        }

        const data = await response.json();

        const trending = (data.coins || []).map(item => ({
            id: item.item?.id,
            symbol: item.item?.symbol?.toUpperCase(),
            name: item.item?.name,
            image: item.item?.small || item.item?.thumb,
            marketCapRank: item.item?.market_cap_rank,
            price: item.item?.data?.price,
            change24h: item.item?.data?.price_change_percentage_24h?.usd,
            sparkline: item.item?.data?.sparkline,
        }));

        console.log(`Fetched ${trending.length} trending coins`);
        return trending;
    } catch (err) {
        console.warn('Failed to fetch trending coins:', err.message);
        return [];
    }
}

// ============================================
// SEARCH COINS (for portfolio add)
// ============================================

async function searchCoins(query) {
    try {
        const response = await fetchCoinGecko(
            `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
            { timeout: 8000 }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return (data.coins || []).slice(0, 10).map(coin => ({
            id: coin.id,
            symbol: coin.symbol?.toUpperCase(),
            name: coin.name,
            image: coin.thumb,
            marketCapRank: coin.market_cap_rank,
        }));
    } catch (err) {
        console.warn('Failed to search coins:', err.message);
        return [];
    }
}

module.exports = {
    fetchCryptoNews,
    fetchMarketData,
    fetchFearGreedIndex,
    fetchDeFiMetrics,
    fetchAllCryptoData,
    fetchTopCoins,
    fetchTrending,
    searchCoins,
};