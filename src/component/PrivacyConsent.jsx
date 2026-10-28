import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, X } from 'lucide-react';
import {
  acknowledgeCookieNotice,
  getConsentState,
  CONSENT_EVENT_UPDATED,
  CONSENT_EVENT_OPEN_NOTICE,
} from '../utils/privacyConsent';

export default function PrivacyConsent() {
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    if (!getConsentState().hasSeenNotice) {
      const timer = window.setTimeout(() => setShowNotice(true), 700);
      return () => window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleConsentUpdated = (event) => {
      const updated = event.detail || getConsentState();
      if (updated.hasSeenNotice) setShowNotice(false);
    };

    const handleOpenNotice = () => setShowNotice(true);

    window.addEventListener(CONSENT_EVENT_UPDATED, handleConsentUpdated);
    window.addEventListener(CONSENT_EVENT_OPEN_NOTICE, handleOpenNotice);
    return () => {
      window.removeEventListener(CONSENT_EVENT_UPDATED, handleConsentUpdated);
      window.removeEventListener(CONSENT_EVENT_OPEN_NOTICE, handleOpenNotice);
    };
  }, []);

  const dismissNotice = () => {
    acknowledgeCookieNotice();
    setShowNotice(false);
  };

  return (
    <AnimatePresence>
      {showNotice && (
        <motion.aside
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-5 pointer-events-none"
          aria-label="Cookie notice"
        >
          <div className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-[#d5e0df] bg-white p-4 text-[#18262d] shadow-[0_20px_60px_-24px_rgba(24,38,45,0.35)] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d5e0df] bg-[#e7eef0] text-[#006194]">
                <Cookie className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">A note about cookies</h2>
                <p className="max-w-2xl text-sm leading-relaxed text-[#4d6066]">
                  Place4U uses essential cookies and browser storage to keep the platform secure and working.{' '}
                  <a
                    href="/cookie-preferences"
                    className="font-medium text-[#006194] underline decoration-[#9bbbc2] underline-offset-2 hover:text-[#004b73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
                  >
                    Learn more
                  </a>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissNotice}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#006194] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#004b73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
            >
              Got it
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
