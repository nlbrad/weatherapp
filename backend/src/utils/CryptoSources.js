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
    { 
        name: 'CoinDesk', 
        url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
        weight: 1.2  // Slightly prefer mainstream sources
    },
    { 
        name: 'The Block', 
        url: 'https://www.theblock.co/rss.xml',
        weight: 1.2
    },
    { 
        name: 'Decrypt', 
        url: 'https://decrypt.co/feed',
        weight: 1.0
    },
    { 
        name: 'CoinTelegraph', 
        url: 'https://cointelegraph.com/rss',
        weight: 1.0
    },
    { 
        name: 'Blockworks', 
        url: 'https://blockworks.co/feed',
        weight: 1.1
    },
];

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
 * Uses round-robin selection to ensure mix of sources
 */
async function fetchCryptoNews(limit = 7) {
    console.log('Fetching crypto news from multiple sources...');
    
    // Fetch from all sources in parallel
    const results = await Promise.all(
        CRYPTO_NEWS_SOURCES.map(s => 
            fetchRSS(s.url, s.name, 5)  // Get top 5 from each source
        )
    );
    
    // Flatten and group by source
    const bySource = {};
    for (let i = 0; i < results.length; i++) {
        const sourceName = CRYPTO_NEWS_SOURCES[i].name;
        bySource[sourceName] = results[i].filter(item => item.title && item.link);
    }
    
    console.log('Articles per source:', Object.keys(bySource).map(s => `${s}: ${bySource[s].length}`).join(', '));
    
    // Round-robin selection to ensure source diversity
    const selected = [];
    const sourceNames = Object.keys(bySource);
    let currentIndex = 0;
    let attempts = 0;
    const maxAttempts = limit * sourceNames.length;
    
    while (selected.length < limit && attempts < maxAttempts) {
        const sourceName = sourceNames[currentIndex % sourceNames.length];
        const sourceArticles = bySource[sourceName];
        
        if (sourceArticles && sourceArticles.length > 0) {
            const article = sourceArticles.shift();  // Take first available
            
            // Check if we already have this article (by title similarity)
            const isDuplicate = selected.some(existing => 
                areTitlesSimilar(existing.title, article.title)
            );
            
            if (!isDuplicate) {
                selected.push(article);
                console.log(`Selected from ${sourceName}: ${article.title.substring(0, 50)}...`);
            }
        }
        
        currentIndex++;
        attempts++;
    }
    
    console.log(`Final selection: ${selected.length} articles from ${new Set(selected.map(a => a.source)).size} sources`);
    
    return selected;
}

/**
 * Check if two titles are similar (likely duplicates)
 */
function areTitlesSimilar(title1, title2) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
    
    const t1 = normalize(title1);
    const t2 = normalize(title2);
    
    // Exact match
    if (t1 === t2) return true;
    
    // One is substring of the other
    if (t1.includes(t2) || t2.includes(t1)) return true;
    
    // Calculate word overlap
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));
    const intersection = [...words1].filter(w => words2.has(w));
    
    // If >70% of words match, consider duplicate
    const minWords = Math.min(words1.size, words2.size);
    const overlapRatio = intersection.length / minWords;
    
    return overlapRatio > 0.7;
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
        const cryptoResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_market_cap=true',
            { signal: AbortSignal.timeout(8000) }
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
        
        // Get global market data
        const globalResponse = await fetch(
            'https://api.coingecko.com/api/v3/global',
            { signal: AbortSignal.timeout(8000) }
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

module.exports = {
    fetchCryptoNews,
    fetchMarketData,
    fetchFearGreedIndex,
    fetchDeFiMetrics,
    fetchAllCryptoData,
};