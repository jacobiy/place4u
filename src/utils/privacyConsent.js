/**
 * Privacy Consent & POPIA Compliance Utility for Place4U
 * Manages user consent state, category permissions, and event dispatching.
 * Uses neutral naming to avoid ad-blocker false positives (ERR_BLOCKED_BY_CLIENT).
 */

export const CONSENT_STORAGE_KEY = 'place4u_privacy_consent_v1';
export const CONSENT_EVENT_UPDATED = 'place4u:privacy-consent-updated';
export const CONSENT_EVENT_OPEN_PREFERENCES = 'place4u:open-privacy-preferences';
export const CONSENT_EVENT_OPEN_POLICY = 'place4u:open-privacy-policy';

export const CONSENT_CATEGORIES = {
  ESSENTIAL: 'essential',
  FUNCTIONAL: 'functional',
  ANALYTICS: 'analytics',
  MARKETING: 'marketing',
};

export const DEFAULT_CONSENT = {
  hasConsented: false,
  status: 'pending', // 'accepted' | 'rejected' | 'custom' | 'pending'
  categories: {
    [CONSENT_CATEGORIES.ESSENTIAL]: true,
    [CONSENT_CATEGORIES.FUNCTIONAL]: false,
    [CONSENT_CATEGORIES.ANALYTICS]: false,
    [CONSENT_CATEGORIES.MARKETING]: false,
  },
  timestamp: null,
  version: '1.0',
};

/**
 * Retrieve current consent status from localStorage.
 */
export function getConsentState() {
  if (typeof window === 'undefined') {
    return DEFAULT_CONSENT;
  }

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;

    const parsed = JSON.parse(raw);
    return {
      hasConsented: true,
      status: parsed.status || 'custom',
      categories: {
        [CONSENT_CATEGORIES.ESSENTIAL]: true, // Always true
        [CONSENT_CATEGORIES.FUNCTIONAL]: Boolean(parsed.categories?.[CONSENT_CATEGORIES.FUNCTIONAL]),
        [CONSENT_CATEGORIES.ANALYTICS]: Boolean(parsed.categories?.[CONSENT_CATEGORIES.ANALYTICS]),
        [CONSENT_CATEGORIES.MARKETING]: Boolean(parsed.categories?.[CONSENT_CATEGORIES.MARKETING]),
      },
      timestamp: parsed.timestamp || null,
      version: parsed.version || '1.0',
    };
  } catch (err) {
    console.warn('Failed to parse privacy consent state:', err);
    return DEFAULT_CONSENT;
  }
}

/**
 * Persist user consent and trigger system-wide event.
 */
export function saveConsentState(categories, status = 'custom') {
  if (typeof window === 'undefined') return;

  const consentPayload = {
    hasConsented: true,
    status,
    categories: {
      [CONSENT_CATEGORIES.ESSENTIAL]: true,
      [CONSENT_CATEGORIES.FUNCTIONAL]: Boolean(categories?.[CONSENT_CATEGORIES.FUNCTIONAL]),
      [CONSENT_CATEGORIES.ANALYTICS]: Boolean(categories?.[CONSENT_CATEGORIES.ANALYTICS]),
      [CONSENT_CATEGORIES.MARKETING]: Boolean(categories?.[CONSENT_CATEGORIES.MARKETING]),
    },
    timestamp: new Date().toISOString(),
    version: '1.0',
  };

  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentPayload));
  } catch (err) {
    console.error('Failed to save consent to localStorage:', err);
  }

  // Dispatch custom event for listeners
  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT_UPDATED, {
      detail: consentPayload,
    })
  );

  return consentPayload;
}

/**
 * Accept all categories.
 */
export function acceptAllConsent() {
  return saveConsentState(
    {
      [CONSENT_CATEGORIES.FUNCTIONAL]: true,
      [CONSENT_CATEGORIES.ANALYTICS]: true,
      [CONSENT_CATEGORIES.MARKETING]: true,
    },
    'accepted'
  );
}

/**
 * Reject non-essential categories.
 */
export function rejectNonEssentialConsent() {
  return saveConsentState(
    {
      [CONSENT_CATEGORIES.FUNCTIONAL]: false,
      [CONSENT_CATEGORIES.ANALYTICS]: false,
      [CONSENT_CATEGORIES.MARKETING]: false,
    },
    'rejected'
  );
}

/**
 * Reset consent state.
 */
export function resetConsentState() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear consent:', err);
  }

  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT_UPDATED, {
      detail: DEFAULT_CONSENT,
    })
  );
}

/**
 * Check if category is consented.
 */
export function isCategoryAllowed(category) {
  if (category === CONSENT_CATEGORIES.ESSENTIAL) return true;
  const current = getConsentState();
  return Boolean(current?.categories?.[category]);
}

/**
 * Programmatically open preferences dialog.
 */
export function openConsentPreferences() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_OPEN_PREFERENCES));
}

/**
 * Programmatically open policy dialog.
 */
export function openConsentPolicy() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_OPEN_POLICY));
}
