/**
 * Place4U Live Exchange Rate Service (USD/ZAR)
 *
 * Provides real-time and cached currency conversion between South African Rand (ZAR)
 * and US Dollars (USD) for international payment gateways (e.g., PayPal).
 *
 * Architecture:
 * - Fetches from high-availability, open CORS endpoints (open.er-api.com).
 * - Caches in localStorage with a 4-hour TTL to minimize network requests.
 * - Fails safely to a sensible fallback rate (~18.00 ZAR/USD) if offline or blocked.
 */

import { useState, useEffect } from 'react';

const FX_STORAGE_KEY = 'place4u_fx_usd_zar';
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
export const FALLBACK_USD_ZAR_RATE = 18.00;

// In-memory cache for fast synchronous access
let memoryCachedRate = null;
let memoryCachedTimestamp = 0;

/**
 * Returns the currently cached rate synchronously without awaiting network.
 * Falls back to 18.00 if no cache is available.
 */
export function getCachedUsdZarRate() {
  if (memoryCachedRate && Date.now() - memoryCachedTimestamp < CACHE_TTL_MS) {
    return memoryCachedRate;
  }

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(FX_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.rate && typeof parsed.rate === 'number' && parsed.rate > 0) {
        memoryCachedRate = parsed.rate;
        memoryCachedTimestamp = parsed.timestamp || Date.now();
        return parsed.rate;
      }
    }
  } catch (err) {
    console.warn('Failed to read cached FX rate:', err);
  }

  return FALLBACK_USD_ZAR_RATE;
}

/**
 * Fetches the live USD/ZAR rate, respecting cache TTL and network timeouts.
 * Always resolves to a positive number.
 */
export async function getLiveUsdZarRate() {
  // Check memory & localStorage cache
  const cached = getCachedUsdZarRate();
  const isFresh = memoryCachedTimestamp && Date.now() - memoryCachedTimestamp < CACHE_TTL_MS;

  if (isFresh && memoryCachedRate) {
    return memoryCachedRate;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const liveRate = data?.rates?.ZAR;

      if (liveRate && typeof liveRate === 'number' && liveRate > 0) {
        memoryCachedRate = Number(liveRate.toFixed(4));
        memoryCachedTimestamp = Date.now();

        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(
              FX_STORAGE_KEY,
              JSON.stringify({
                rate: memoryCachedRate,
                timestamp: memoryCachedTimestamp
              })
            );
          }
        } catch {
          // Ignore localStorage quota or private browsing errors
        }

        return memoryCachedRate;
      }
    }
  } catch (err) {
    console.warn('Live FX rate fetch failed, using fallback:', err?.message || err);
  }

  return cached || FALLBACK_USD_ZAR_RATE;
}

/**
 * Converts a ZAR amount to USD using a given rate or live rate.
 * @param {number|string} amountZar - The amount in ZAR
 * @param {number} [customRate] - Optional custom or cached USD/ZAR rate
 * @returns {string} Two-decimal USD string (e.g. "5.88")
 */
export function convertZarToUsdSync(amountZar, customRate) {
  const zar = Math.max(Number(amountZar) || 0, 0);
  if (zar === 0) return '0.00';

  const rate = customRate && customRate > 0 ? customRate : getCachedUsdZarRate();
  const usd = zar / rate;
  return usd.toFixed(2);
}

/**
 * Asynchronously converts a ZAR amount to USD using the freshest live rate.
 */
export async function convertZarToUsd(amountZar) {
  const rate = await getLiveUsdZarRate();
  return convertZarToUsdSync(amountZar, rate);
}

/**
 * React Hook for consuming live USD/ZAR rates in UI components.
 */
export function useUsdZarRate() {
  const [rate, setRate] = useState(getCachedUsdZarRate);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getLiveUsdZarRate().then((liveRate) => {
      if (active) {
        setRate(liveRate);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return {
    rate,
    loading,
    convertZarToUsd: (amountZar) => convertZarToUsdSync(amountZar, rate)
  };
}
