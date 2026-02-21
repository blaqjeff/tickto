/**
 * Jupiter Price API Utility
 * 
 * Uses Jupiter Price API v3 to fetch real-time SOL/USD price.
 * Requires API key via NEXT_PUBLIC_JUPITER_API_KEY env var.
 * Falls back to CoinGecko if Jupiter is unavailable.
 * 
 * Get a free key at: https://portal.jup.ag
 * @see https://dev.jup.ag/docs/price/v3.md
 */

// SOL mint address (native SOL wrapped)
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const JUPITER_PRICE_URL = 'https://api.jup.ag/price/v3';
const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

interface JupiterPriceResponse {
    data: {
        [mint: string]: {
            id: string;
            type: string;
            price: string;
            extraInfo?: {
                confidenceLevel: string;
            };
        } | null;
    };
    timeTaken: number;
}

// Cache SOL price for 30 seconds to avoid hammering the API
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Fetch SOL price from CoinGecko (free, no API key needed).
 */
async function getSolPriceFromCoinGecko(): Promise<number> {
    const res = await fetch(COINGECKO_URL, {
        headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const data = await res.json();
    const price = data?.solana?.usd;
    if (!price || typeof price !== 'number' || price <= 0) {
        throw new Error('Invalid SOL price from CoinGecko');
    }
    return price;
}

/**
 * Fetch the current SOL price in USD.
 * Tries Jupiter Price API v3 first (requires API key), falls back to CoinGecko.
 * Results are cached for 30 seconds.
 * 
 * @returns SOL price in USD (e.g. 200.50)
 * @throws Error if price cannot be fetched from any source
 */
export async function getSolPrice(): Promise<number> {
    // Return cached price if still fresh
    if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_TTL_MS) {
        return cachedSolPrice.price;
    }

    let price: number;

    // If running on the client, proxy through our backend to hide the API key
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/price');
            if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            price = data.price;
        } catch (err) {
            console.warn('Proxy failed, falling back to CoinGecko directly:', err);
            price = await getSolPriceFromCoinGecko();
        }
    } else {
        // Running on the server, fetch from Jupiter directly
        price = await fetchPriceFromServerContext();
    }

    cachedSolPrice = { price, timestamp: Date.now() };
    return price;
}

/**
 * Internal helper to fetch price from Jupiter (or CoinGecko fallback)
 * Securely uses the backend environment variable.
 */
async function fetchPriceFromServerContext(): Promise<number> {
    if (cachedSolPrice && Date.now() - cachedSolPrice.timestamp < CACHE_TTL_MS) {
        return cachedSolPrice.price;
    }

    // The API key is now strictly an internal server secret
    const jupiterApiKey = process.env.JUPITER_API_KEY;

    try {
        let price: number;

        if (jupiterApiKey) {
            const res = await fetch(`${JUPITER_PRICE_URL}?ids=${SOL_MINT}`, {
                headers: {
                    'Accept': 'application/json',
                    'x-api-key': jupiterApiKey,
                },
            });

            if (!res.ok) {
                throw new Error(`Jupiter Price API returned ${res.status}`);
            }

            const data = await res.json();
            const solData = data?.[SOL_MINT];

            if (!solData || !solData.usdPrice) {
                throw new Error('SOL price not available from Jupiter v3');
            }

            price = parseFloat(solData.usdPrice);
        } else {
            // No Jupiter key — use CoinGecko directly
            console.info('No JUPITER_API_KEY set, using CoinGecko for SOL price');
            price = await getSolPriceFromCoinGecko();
        }

        if (isNaN(price) || price <= 0) {
            throw new Error(`Invalid SOL price: ${price}`);
        }

        return price;
    } catch (error) {
        // Try CoinGecko as fallback if Jupiter failed
        try {
            console.warn('Primary price source failed, trying CoinGecko fallback:', error);
            const price = await getSolPriceFromCoinGecko();
            return price;
        } catch {
            // If we have a stale cached price, use it
            if (cachedSolPrice) {
                console.warn('All price sources failed, using stale cached price');
                return cachedSolPrice.price;
            }
            throw error;
        }
    }
}

/**
 * Convert a USD amount to SOL using the current market price.
 * 
 * @param usdAmount - Amount in USD (e.g. 25.00)
 * @returns Amount in SOL (e.g. 0.125)
 */
export async function usdToSol(usdAmount: number): Promise<number> {
    if (usdAmount === 0) return 0;
    const solPrice = await getSolPrice();
    return usdAmount / solPrice;
}

/**
 * Convert a SOL amount to USD using the current market price.
 * 
 * @param solAmount - Amount in SOL (e.g. 0.5)
 * @returns Amount in USD (e.g. 100.00)
 */
export async function solToUsd(solAmount: number): Promise<number> {
    if (solAmount === 0) return 0;
    const solPrice = await getSolPrice();
    return solAmount * solPrice;
}

/**
 * Format a USD amount for display.
 * 
 * @param amount - Amount in USD
 * @returns Formatted string like "$25.00"
 */
export function formatUSD(amount: number | undefined | null): string {
    if (amount === undefined || amount === null) return 'Price TBA';
    if (amount === 0) return 'Free';
    return `$${amount.toFixed(2)}`;
}

/**
 * Format a SOL amount for display.
 * 
 * @param amount - Amount in SOL
 * @returns Formatted string like "0.125 SOL"
 */
export function formatSOL(amount: number): string {
    if (amount === 0) return 'Free';
    // Show up to 6 decimal places, trim trailing zeros
    return `${parseFloat(amount.toFixed(6))} SOL`;
}
