import { useCallback, useEffect, useState } from 'react';
import {
  defaultFeeQuote,
  quoteApplicationFee,
  subscribeToPromotions
} from '../services/promotionService';

/**
 * The live application-fee quote for a screen.
 *
 * Returns the normal R100 quote until the database answers, so payment UI never
 * flashes a broken amount. Re-quotes when an admin flips a promotion on/off or
 * when a payment lands.
 */
export function useFeeQuote(promotionCode = null) {
  const [quote, setQuote] = useState(defaultFeeQuote);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const next = await quoteApplicationFee(promotionCode);
      setQuote(next);
      setError(null);
      return next;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [promotionCode]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const next = await quoteApplicationFee(promotionCode);
        if (!cancelled) {
          setQuote(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const unsubscribe = subscribeToPromotions(load);

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [promotionCode]);

  return { quote, loading, error, refresh };
}

export default useFeeQuote;
