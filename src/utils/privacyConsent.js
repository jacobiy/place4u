/**
 * Stores whether the visitor has seen Place4U's cookie notice.
 * This is an acknowledgement, not a manager for optional tracking consent.
 */

export const COOKIE_NOTICE_STORAGE_KEY = 'place4u_cookie_notice_v1';
const LEGACY_CONSENT_STORAGE_KEY = 'place4u_privacy_consent_v1';
export const CONSENT_EVENT_UPDATED = 'place4u:privacy-consent-updated';
export const CONSENT_EVENT_OPEN_NOTICE = 'place4u:open-privacy-notice';

export const DEFAULT_CONSENT = {
  hasSeenNotice: false,
  timestamp: null,
  version: '1.0',
};

export function getConsentState() {
  if (typeof window === 'undefined') return DEFAULT_CONSENT;

  try {
    const raw =
      window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) ||
      window.localStorage.getItem(LEGACY_CONSENT_STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;

    const savedState = JSON.parse(raw);
    return {
      hasSeenNotice: true,
      timestamp: savedState?.timestamp || null,
      version: '1.0',
    };
  } catch (error) {
    console.warn('Failed to read cookie notice state:', error);
    return DEFAULT_CONSENT;
  }
}

export function acknowledgeCookieNotice() {
  if (typeof window === 'undefined') return;

  const noticeState = {
    hasSeenNotice: true,
    timestamp: new Date().toISOString(),
    version: '1.0',
  };

  try {
    window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, JSON.stringify(noticeState));
    window.localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to save cookie notice state:', error);
  }

  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT_UPDATED, { detail: noticeState })
  );
  return noticeState;
}

export function resetConsentState() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(COOKIE_NOTICE_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear cookie notice state:', error);
  }
  window.dispatchEvent(
    new CustomEvent(CONSENT_EVENT_UPDATED, { detail: DEFAULT_CONSENT })
  );
}

export function openConsentNotice() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT_OPEN_NOTICE));
}
