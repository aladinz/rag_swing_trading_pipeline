// Import YahooFinance - this is the constructor function in v2
import YahooFinance from "yahoo-finance2";

// YahooFinance is actually a constructor function that when called returns an instance
// But based on the error, it seems we need to instantiate it
const yahooFinance = new YahooFinance();

export type MarketData = {
  ticker: string;
  price?: string;
  change?: string;
  changePercent?: string;
  news: string[];
  lastUpdated: string;
};

/**
 * Fetch current market data from Yahoo Finance
 * No API key required - uses free Yahoo Finance data
 * Uses v2 API with instantiated YahooFinance
 */
export async function fetchLiveMarketData(ticker: string): Promise<MarketData> {
  console.log(`[MarketData] Fetching live data for ${ticker} from Yahoo Finance...`);

  try {
    // Call quote on the yahooFinance instance
    const quoteData: any = await yahooFinance.quote(ticker.toUpperCase());
    
    if (!quoteData) {
      throw new Error(`No data found for ticker ${ticker}`);
    }

    const currentPrice = (quoteData.regularMarketPrice || quoteData.previousClose || "Unknown").toString();
    const change = quoteData.regularMarketChange?.toFixed(2) || "N/A";
    const changePercent = quoteData.regularMarketChangePercent?.toFixed(2) || "N/A";
    const shortName = quoteData.shortName || ticker;

    console.log(`[MarketData] ✅ Retrieved price for ${ticker}: $${currentPrice}`);
    
    return {
      ticker: ticker.toUpperCase(),
      price: currentPrice,
      change,
      changePercent,
      news: [
        `${shortName} is trading at $${currentPrice}`,
        `Change: ${change} (${changePercent}%)`,
        `Market Cap: ${quoteData.marketCap ? `$${(quoteData.marketCap / 1e9).toFixed(2)}B` : "N/A"}`,
        `PE Ratio: ${quoteData.trailingPE?.toFixed(2) || "N/A"}`,
        `52 Week High: $${quoteData.fiftyTwoWeekHigh?.toFixed(2) || "N/A"}`,
      ],
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[MarketData] ❌ Failed to fetch live data for ${ticker}:`, error);
    throw new Error(
      `Cannot retrieve live market data for ${ticker} from Yahoo Finance. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Helper to extract a ticker from natural language input
 * STRICTLY looks only in userInputs/user-facing text, not analysis content
 */
export function extractTicker(input: any): string | null {
  // Extended list of common English words and UI terms that should never be interpreted as tickers
  const uiWords = new Set([
    // Common words
    "THE", "AND", "FOR", "WITH", "FROM", "THIS", "THAT", "THESE", "THOSE",
    "HAVE", "WERE", "BEEN", "ONLY", "ALSO", "MORE", "THEN", "WHEN", "WHAT",
    "WHICH", "ABOUT", "WOULD", "COULD", "SHOULD", "THAN", "SOME", "EACH",
    // Trading/analysis related but not tickers
    "DAILY", "RITUAL", "TRADING", "MARKET", "PRICE", "STOCK", "ANALYSIS", 
    "SETUP", "SIGNAL", "SWING", "ENTRY", "EXIT", "STOP", "TARGET", "LOSS",
    "ENTRY", "RATIO", "RISK", "REWARD", "TAPE", "FLOW", "ORDER", "BOOK",
    "MOMENTUM", "TREND", "SUPPORT", "RESISTANCE", "LEVEL", "POINT", "MOVE",
    // UI/System terms
    "JSON", "TRUE", "FALSE", "NULL", "STAGE", "RUN", "ALL", 
    "STEP", "USER", "DATA", "LIVE", "FINAL", "YYYY", "PIPE",
    "MODE", "TYPE", "TEST", "ANALYSIS", "PIPELINE", "METADATA",
    "TIMESTAMP", "SOURCE", "SYMBOL", "TICKER", "BUY", "SELL", "HOLD",
    // Market/Financial context
    "HOUR", "DAY", "WEEK", "MONTH", "YEAR", "TIME", "OPEN", "CLOSE",
    "HIGH", "LOW", "VOLUME", "NEWS", "ALERT", "SUMMARY", "REPORT"
  ]);

  const findInString = (str: string): string | null => {
    if (!str || typeof str !== "string" || str.length < 2) return null;

    // 1. Most explicit patterns - user clearly states the ticker
    const explicitPatterns = [
      /(?:analyze|check|trade|buy|sell|watch)\s+([A-Z]{1,5})(?:\s|$|[,\.])/i,
      /(?:ticker|symbol)[\s:]+([A-Z]{1,5})(?:\s|$|[,\.])/i,
      /^([A-Z]{1,5})\s+(?:stock|swing|setup|trade|analysis)/i,
      /(?:for\s+)?([A-Z]{1,5})\s+(?:swing|setup|trade|opportunity)/i,
    ];

    for (const pattern of explicitPatterns) {
      const match = str.match(pattern);
      if (match) {
        const candidate = match[1].toUpperCase();
        if (candidate.length >= 1 && candidate.length <= 5 && !uiWords.has(candidate)) {
          return candidate;
        }
      }
    }

    // 2. Only if no explicit mention, look for standalone 1-4 letter all-caps words
    // This is more restrictive to avoid picking up article fragments
    const matches = Array.from(str.matchAll(/\b([A-Z]{1,4})\b/g));
    for (const match of matches) {
      const candidate = match[1];
      if (!uiWords.has(candidate) && candidate.length >= 1 && candidate.length <= 4) {
        return candidate;
      }
    }

    return null;
  };

  // 1. First, check explicitly for userInputs field (the actual user input)
  if (input?.userInputs && typeof input.userInputs === "string") {
    const found = findInString(input.userInputs);
    if (found) return found;
  }

  // 2. Check other common user input fields, but NOT "ritual" or structured templates
  for (const key of ["input", "prompt", "query", "text", "message", "symbol", "ticker"]) {
    if (input?.[key] && typeof input[key] === "string") {
      const found = findInString(input[key]);
      if (found) return found;
    }
  }

  // 3. As a last resort, if the entire input is a short string (likely just a ticker)
  if (typeof input === "string" && input.length <= 10) {
    const found = findInString(input);
    if (found) return found;
  }

  return null;
}
