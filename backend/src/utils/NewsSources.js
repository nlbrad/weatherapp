/**
 * NewsSources.js - Expanded News Fetching
 * 
 * Categories:
 * - Irish News: RTÉ, Irish Times, TheJournal, Irish Independent
 * - World News: BBC, Reuters, Guardian
 * - Tech: Hacker News, Ars Technica
 * - Finance: Reuters Business, CNBC, FT
 * - Crypto: CoinDesk, Decrypt
 * - Science/Space: NASA, Ars Science, Space.com
 * - Markets: Stock indices, Forex rates, Crypto prices
 */

// ============================================
// RSS PARSING
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
        const description = extractTag(itemXml, 'description');
        
        if (title) {
            items.push({
                title: cleanText(title),
                link: cleanLink(link),
                pubDate: pubDate ? new Date(pubDate) : null,
                description: cleanText(description)?.substring(0, 150),
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
    if (!text) return null;
    return text
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function cleanLink(link) {
    if (!link) return null;
    return link.trim().replace(/\s+/g, '');
}

async function fetchRSS(url, sourceName, limit = 5) {
    try {
        // Create abort controller with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'OmniAlert/1.0' },
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return [];
        
        const xml = await response.text();
        const items = parseRSS(xml);
        
        return items.slice(0, limit).map(item => ({
            ...item,
            source: sourceName,
        }));
    } catch (err) {
        console.warn(`Failed to fetch ${sourceName}:`, err.message);
        return [];
    }
}

function dedupeNews(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = item.title
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 40);
        
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ============================================
// IRISH NEWS
// ============================================
async function fetchIrishNews(limit = 5) {
    const sources = [
        { name: 'RTÉ', url: 'https://www.rte.ie/feeds/rss/?index=/news/' },
        { name: 'Irish Times', url: 'https://www.irishtimes.com/cmlink/news-1.1319192' },
        { name: 'TheJournal', url: 'https://www.thejournal.ie/feed/' },
        { name: 'Independent', url: 'https://www.independent.ie/rss/' },
    ];
    
    const results = await Promise.all(
        sources.map(s => fetchRSS(s.url, s.name, 3))
    );
    
    return dedupeNews(results.flat()).slice(0, limit);
}

// ============================================
// WORLD NEWS
// ============================================
async function fetchWorldNews(limit = 5) {
    const sources = [
        { name: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
        { name: 'Guardian', url: 'https://www.theguardian.com/world/rss' },
        { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
    ];
    
    const results = await Promise.all(
        sources.map(s => fetchRSS(s.url, s.name, 3))
    );
    
    return dedupeNews(results.flat()).slice(0, limit);
}

// ============================================
// TECH NEWS
// ============================================
async function fetchTechNews(limit = 5) {
    const items = [];
    
    // Hacker News (top stories)
    try {
        const topResponse = await fetch(
            'https://hacker-news.firebaseio.com/v0/topstories.json',
            { signal: AbortSignal.timeout(5000) }
        );
        const topIds = await topResponse.json();
        
        for (const id of topIds.slice(0, limit + 5)) {
            try {
                const storyResponse = await fetch(
                    `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
                    { signal: AbortSignal.timeout(3000) }
                );
                const story = await storyResponse.json();
                
                if (story && story.title && story.score > 50) {
                    items.push({
                        title: story.title,
                        link: story.url || `https://news.ycombinator.com/item?id=${id}`,
                        source: 'HN',
                        score: story.score,
                    });
                }
            } catch (err) {
                continue;
            }
            
            if (items.length >= limit) break;
        }
    } catch (err) {
        console.warn('Failed to fetch Hacker News:', err.message);
    }
    
    // Ars Technica backup
    if (items.length < limit) {
        const arsItems = await fetchRSS(
            'https://feeds.arstechnica.com/arstechnica/technology-lab',
            'Ars',
            limit - items.length
        );
        items.push(...arsItems);
    }
    
    return items.slice(0, limit);
}

// ============================================
// FINANCE NEWS
// ============================================
async function fetchFinanceNews(limit = 5) {
    const sources = [
        { name: 'CNBC', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10001147' },
        { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
        { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rssindex' },
    ];
    
    const results = await Promise.all(
        sources.map(s => fetchRSS(s.url, s.name, 3))
    );
    
    return dedupeNews(results.flat()).slice(0, limit);
}

// ============================================
// CRYPTO NEWS
// ============================================
async function fetchCryptoNews(limit = 5) {
    const sources = [
        { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
        { name: 'Decrypt', url: 'https://decrypt.co/feed' },
        { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
    ];
    
    const results = await Promise.all(
        sources.map(s => fetchRSS(s.url, s.name, 3))
    );
    
    return dedupeNews(results.flat()).slice(0, limit);
}

// ============================================
// SCIENCE / SPACE NEWS
// ============================================
async function fetchScienceNews(limit = 5) {
    const sources = [
        { name: 'NASA', url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss' },
        { name: 'Ars Science', url: 'https://feeds.arstechnica.com/arstechnica/science' },
        { name: 'Space.com', url: 'https://www.space.com/feeds/all' },
    ];
    
    const results = await Promise.all(
        sources.map(s => fetchRSS(s.url, s.name, 3))
    );
    
    return dedupeNews(results.flat()).slice(0, limit);
}

// ============================================
// MARKET DATA
// ============================================
async function fetchMarketData() {
    const data = {
        crypto: [],
        stocks: [],
        forex: [],
        fetchedAt: new Date().toISOString(),
    };
    
    // Crypto prices from CoinGecko (free, no API key)
    try {
        const cryptoResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano,ripple,dogecoin&vs_currencies=usd,eur&include_24hr_change=true',
            { signal: AbortSignal.timeout(5000) }
        );
        const prices = await cryptoResponse.json();
        
        if (prices.bitcoin) {
            data.crypto = [
                { symbol: 'BTC', price: prices.bitcoin.usd, change: prices.bitcoin.usd_24h_change },
                { symbol: 'ETH', price: prices.ethereum?.usd, change: prices.ethereum?.usd_24h_change },
                { symbol: 'SOL', price: prices.solana?.usd, change: prices.solana?.usd_24h_change },
                { symbol: 'XRP', price: prices.ripple?.usd, change: prices.ripple?.usd_24h_change },
                { symbol: 'ADA', price: prices.cardano?.usd, change: prices.cardano?.usd_24h_change },
                { symbol: 'DOGE', price: prices.dogecoin?.usd, change: prices.dogecoin?.usd_24h_change },
            ];
        }
    } catch (err) {
        console.warn('Failed to fetch crypto prices:', err.message);
    }
    
    // Stock indices and forex via Yahoo Finance
    try {
        const symbols = '^GSPC,^IXIC,^FTSE,^ISEQ,EURUSD=X,EURGBP=X';
        const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
        
        const yahooResponse = await fetch(yahooUrl, {
            headers: { 'User-Agent': 'OmniAlert/1.0' },
            signal: AbortSignal.timeout(8000),
        });
        
        if (yahooResponse.ok) {
            const yahooData = await yahooResponse.json();
            const quotes = yahooData.quoteResponse?.result || [];
            
            for (const q of quotes) {
                const item = {
                    symbol: q.symbol,
                    name: q.shortName || q.symbol,
                    price: q.regularMarketPrice,
                    change: q.regularMarketChangePercent,
                };
                
                if (q.symbol.includes('=X')) {
                    // Forex
                    item.name = q.symbol === 'EURUSD=X' ? 'EUR/USD' : 'EUR/GBP';
                    data.forex.push(item);
                } else {
                    // Stock index
                    const names = {
                        '^GSPC': 'S&P 500',
                        '^IXIC': 'NASDAQ',
                        '^FTSE': 'FTSE 100',
                        '^ISEQ': 'ISEQ',
                    };
                    item.name = names[q.symbol] || q.symbol;
                    data.stocks.push(item);
                }
            }
        }
    } catch (err) {
        console.warn('Failed to fetch Yahoo Finance:', err.message);
    }
    
    return data;
}

// ============================================
// FETCH ALL
// ============================================
async function fetchAllNews(options = {}) {
    const {
        limit = 5,
        includeMarkets = true,
        categories = ['irish', 'world', 'tech', 'finance', 'crypto', 'science'],
    } = options;
    
    const result = {
        fetchedAt: new Date().toISOString(),
    };
    
    // Build fetch promises based on requested categories
    const fetches = [];
    
    if (categories.includes('irish')) {
        fetches.push(fetchIrishNews(limit).then(d => result.irish = d));
    }
    if (categories.includes('world')) {
        fetches.push(fetchWorldNews(limit).then(d => result.world = d));
    }
    if (categories.includes('tech')) {
        fetches.push(fetchTechNews(limit).then(d => result.tech = d));
    }
    if (categories.includes('finance')) {
        fetches.push(fetchFinanceNews(limit).then(d => result.finance = d));
    }
    if (categories.includes('crypto')) {
        fetches.push(fetchCryptoNews(limit).then(d => result.crypto = d));
    }
    if (categories.includes('science')) {
        fetches.push(fetchScienceNews(limit).then(d => result.science = d));
    }
    if (includeMarkets) {
        fetches.push(fetchMarketData().then(d => result.markets = d));
    }
    
    await Promise.all(fetches);
    
    return result;
}

module.exports = {
    fetchIrishNews,
    fetchWorldNews,
    fetchTechNews,
    fetchFinanceNews,
    fetchCryptoNews,
    fetchScienceNews,
    fetchMarketData,
    fetchAllNews,
};
