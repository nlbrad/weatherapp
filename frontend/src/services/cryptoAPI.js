/**
 * Crypto API Service
 *
 * Frontend API calls for the Crypto Hub page.
 * Communicates with GetCryptoData, GetCryptoPortfolio, SaveCryptoPortfolio endpoints.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://weather-alert-backend-cxc6ghhhagd7dgb8.westeurope-01.azurewebsites.net/api';

export const cryptoAPI = {
  /**
   * Fetch crypto data (markets, news, sentiment, defi, topCoins, trending)
   * @param {string[]} sections - Array of sections to fetch (default: all)
   * @param {object} options - Additional options (newsLimit, coinsLimit)
   */
  getCryptoData: async (sections = null, options = {}) => {
    let url = `${API_BASE_URL}/crypto-data`;
    const params = new URLSearchParams();

    if (sections && sections.length > 0) {
      params.set('sections', sections.join(','));
    }
    if (options.newsLimit) {
      params.set('newsLimit', options.newsLimit.toString());
    }
    if (options.coinsLimit) {
      params.set('coinsLimit', options.coinsLimit.toString());
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch crypto data');
    return response.json();
  },

  /**
   * Search for coins by name or symbol
   * @param {string} query - Search query
   */
  searchCoins: async (query) => {
    if (!query || query.length < 2) return { searchResults: [] };
    const url = `${API_BASE_URL}/crypto-data?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search coins');
    return response.json();
  },

  /**
   * Get user's crypto portfolio with live prices
   * @param {string} userId
   */
  getPortfolio: async (userId) => {
    const url = `${API_BASE_URL}/crypto-portfolio?userId=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch portfolio');
    return response.json();
  },

  /**
   * Save user's crypto portfolio holdings
   * @param {string} userId
   * @param {Array} holdings - Array of holding objects
   */
  savePortfolio: async (userId, holdings) => {
    const response = await fetch(`${API_BASE_URL}/crypto-portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, holdings }),
    });
    if (!response.ok) throw new Error('Failed to save portfolio');
    return response.json();
  },
};

export default cryptoAPI;
