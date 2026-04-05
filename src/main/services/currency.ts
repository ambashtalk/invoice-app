/**
 * Currency exchange rate service using Frankfurter API
 * Caches rates locally with a 6-hour TTL
 */

interface RateCache {
    rates: Record<string, number>
    fetchedAt: number
    baseCurrency: string
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours
const FRANKFURTER_API = 'https://api.frankfurter.app'

let rateCache: RateCache | null = null

export interface ExchangeRateResult {
    rate: number
    source: 'api' | 'cache' | 'fallback'
    fetchedAt: number
}

/**
 * Fetch the latest exchange rates from Frankfurter API
 * with local caching and manual fallback
 */
export async function getExchangeRate(
    from: 'INR' | 'USD' | 'EUR',
    to: 'INR' | 'USD' | 'EUR'
): Promise<ExchangeRateResult> {
    if (from === to) {
        return { rate: 1.0, source: 'api', fetchedAt: Date.now() }
    }

    const now = Date.now()

    // Check cache validity
    if (rateCache && rateCache.baseCurrency === from && now - rateCache.fetchedAt < CACHE_TTL_MS) {
        const rate = rateCache.rates[to]
        if (rate) {
            return { rate, source: 'cache', fetchedAt: rateCache.fetchedAt }
        }
    }

    // Fetch from API
    try {
        const response = await fetch(`${FRANKFURTER_API}/latest?from=${from}&to=${to}`, {
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) {
            throw new Error(`Frankfurter API responded with ${response.status}`)
        }

        const data = await response.json()
        const rate = data.rates[to]

        if (!rate) {
            throw new Error(`No rate found for ${to}`)
        }

        // Update cache
        rateCache = {
            rates: data.rates,
            fetchedAt: now,
            baseCurrency: from
        }

        return { rate, source: 'api', fetchedAt: now }
    } catch (error) {
        console.warn(`Frankfurter API failed: ${error}. Using fallback rates.`)

        // Fallback rates (approximate, last known good rates)
        const fallbackRates: Record<string, Record<string, number>> = {
            INR: { USD: 0.012, EUR: 0.011 },
            USD: { INR: 83.5, EUR: 0.92 },
            EUR: { INR: 90.5, USD: 1.09 }
        }

        const rate = fallbackRates[from]?.[to] ?? 1.0
        return { rate, source: 'fallback', fetchedAt: now }
    }
}

/**
 * Get all current rates relative to INR
 */
export async function getAllRates(): Promise<Record<string, number>> {
    try {
        const response = await fetch(`${FRANKFURTER_API}/latest?from=INR`, {
            signal: AbortSignal.timeout(5000)
        })

        if (!response.ok) throw new Error('API error')

        const data = await response.json()
        return { INR: 1.0, ...data.rates }
    } catch {
        return { INR: 1.0, USD: 0.012, EUR: 0.011 }
    }
}
