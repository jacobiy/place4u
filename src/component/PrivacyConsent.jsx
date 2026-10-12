import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cookie,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Check,
  Info,
  ChevronDown,
  ChevronUp,
  Lock,
  FileText
} from 'lucide-react';
import {
  getConsentState,
  saveConsentState,
  acceptAllConsent,
  rejectNonEssentialConsent,
  CONSENT_CATEGORIES,
  CONSENT_EVENT_UPDATED,
  CONSENT_EVENT_OPEN_PREFERENCES,
  CONSENT_EVENT_OPEN_POLICY,
} from '../utils/privacyConsent';

export default function PrivacyConsent() {
  const [consentState, setConsentState] = useState(() => getConsentState());
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Temporary category state while tweaking preferences in modal
  const [draftCategories, setDraftCategories] = useState({
    [CONSENT_CATEGORIES.ESSENTIAL]: true,
    [CONSENT_CATEGORIES.FUNCTIONAL]: false,
    [CONSENT_CATEGORIES.ANALYTICS]: false,
    [CONSENT_CATEGORIES.MARKETING]: false,
  });

  useEffect(() => {
    // Initial check on mount
    const consent = getConsentState();
    setConsentState(consent);
    setDraftCategories(consent.categories);

    // If user hasn't made a choice yet, reveal banner
    if (!consent.hasConsented) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen to external triggers (e.g. Footer links, settings page)
  useEffect(() => {
    const handleConsentUpdated = (e) => {
      const updated = e.detail || getConsentState();
      setConsentState(updated);
      setDraftCategories(updated.categories);
      if (updated.hasConsented) {
        setShowBanner(false);
      }
    };

    const handleOpenPreferences = () => {
      const current = getConsentState();
      setDraftCategories(current.categories);
      setShowPreferences(true);
      setShowBanner(false);
    };

    const handleOpenPolicy = () => {
      setShowPolicy(true);
    };

    window.addEventListener(CONSENT_EVENT_UPDATED, handleConsentUpdated);
    window.addEventListener(CONSENT_EVENT_OPEN_PREFERENCES, handleOpenPreferences);
    window.addEventListener(CONSENT_EVENT_OPEN_POLICY, handleOpenPolicy);

    return () => {
      window.removeEventListener(CONSENT_EVENT_UPDATED, handleConsentUpdated);
      window.removeEventListener(CONSENT_EVENT_OPEN_PREFERENCES, handleOpenPreferences);
      window.removeEventListener(CONSENT_EVENT_OPEN_POLICY, handleOpenPolicy);
    };
  }, []);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showPolicy) setShowPolicy(false);
        else if (showPreferences) setShowPreferences(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreferences, showPolicy]);

  const handleAcceptAll = () => {
    acceptAllConsent();
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectNonEssential = () => {
    rejectNonEssentialConsent();
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleSaveCustomPreferences = () => {
    saveConsentState(draftCategories, 'custom');
    setShowBanner(false);
    setShowPreferences(false);
  };

  const toggleDraftCategory = (cat) => {
    if (cat === CONSENT_CATEGORIES.ESSENTIAL) return; // Locked
    setDraftCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const toggleCategoryAccordion = (cat) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  const categoryDefinitions = [
    {
      id: CONSENT_CATEGORIES.ESSENTIAL,
      name: 'Strictly Necessary (Essential)',
      required: true,
      description:
        'Crucial for the fundamental operation of the Place4U platform. They enable authentication sessions, secure login via Supabase, CSRF verification, and cross-session tenancy routing.',
      details: [
        { name: 'sb-*-auth-token', purpose: 'Preserves encrypted user authentication state across verified sessions', expiry: 'Session / 1 Year', provider: 'Place4U & Supabase' },
        { name: 'place4u_privacy_consent_v1', purpose: 'Remembers your cookie and POPIA compliance preferences', expiry: '1 Year', provider: 'Place4U Platform' },
        { name: '__Host-csrf_token', purpose: 'Prevents Cross-Site Request Forgery during booking and enquiry requests', expiry: 'Session', provider: 'Place4U Security' },
      ],
    },
    {
      id: CONSENT_CATEGORIES.FUNCTIONAL,
      name: 'Functional & Preferences',
      required: false,
      description:
        'Allows the platform to remember your active search filters (student digs, backyard cottages, budget limits, pet friendliness), saved favorite residences, and chosen theme layout.',
      details: [
        { name: 'place4u_saved_searches', purpose: 'Retains your recent rental search criteria and city preferences', expiry: '6 Months', provider: 'Place4U' },
        { name: 'place4u_favorite_props', purpose: 'Stores bookmarked properties for rapid comparison', expiry: '1 Year', provider: 'Place4U' },
        { name: 'place4u_ui_density', purpose: 'Remembers your preferred dashboard display density & dark mode contrast', expiry: '1 Year', provider: 'Place4U' },
      ],
    },
    {
      id: CONSENT_CATEGORIES.ANALYTICS,
      name: 'Performance & Analytics',
      required: false,
      description:
        'Provides anonymized, aggregated telemetry on how visitors navigate through Place4U. This helps us optimize load times, resolve broken flows, and prioritize high-demand suburban areas.',
      details: [
        { name: '_p4u_perf_timing', purpose: 'Monitors real-time API latency and page load speeds across South African networks', expiry: '30 Days', provider: 'Place4U Diagnostics' },
        { name: '_p4u_anon_metrics', purpose: 'Tracks aggregated user flows without recording any personal identity data', expiry: '90 Days', provider: 'Place4U Telemetry' },
      ],
    },
    {
      id: CONSENT_CATEGORIES.MARKETING,
      name: 'Personalization & Outreach',
      required: false,
      description:
        'Used to deliver tailored listings, student digs discounts, and verify partner referral campaigns. Place4U does not sell your personal information or cross-track you across third-party websites.',
      details: [
        { name: 'place4u_campaign_ref', purpose: 'Attributes verified campus or social referrals to reward community agents', expiry: '30 Days', provider: 'Place4U Network' },
        { name: 'place4u_recommend_v1', purpose: 'Customizes property discovery feed based on verified browsing interests', expiry: '60 Days', provider: 'Place4U' },
      ],
    },
  ];

  return (
    <>
      {/* 1. Main Bottom Privacy Consent Floating Panel */}
      <AnimatePresence>
        {showBanner && !showPreferences && !showPolicy && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-5 pointer-events-none"
            role="dialog"
            aria-live="polite"
            aria-label="Privacy and Cookie Consent"
          >
            <div className="max-w-4xl mx-auto pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-200">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                {/* Information Header & Content */}
                <div className="flex items-start gap-3.5 max-w-2xl">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center flex-shrink-0 text-blue-400 mt-0.5">
                    <Cookie className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white tracking-wide">
                        Cookie & Privacy Compliance
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" />
                        POPIA & GDPR Compliant
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      Place4U uses cookies to ensure secure authentication, personalize your property matching experience, and evaluate network performance in line with the{' '}
                      <strong className="text-slate-100 font-medium">Protection of Personal Information Act (POPIA)</strong>.
                      You can accept all, reject non-essential cookies, or fine-tune your preferences.
                    </p>
                    <div className="flex items-center gap-4 pt-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setShowPolicy(true)}
                        className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors flex items-center gap-1 font-medium cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        Read Cookie Policy & POPIA Notice
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCategories(consentState.categories);
                      setShowPreferences(true);
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                    <span>Preferences</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRejectNonEssential}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer"
                  >
                    <span>Reject Non-Essential</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept All</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Granular Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-preferences-title"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 id="privacy-preferences-title" className="text-base font-semibold text-white">
                      Cookie & Consent Preferences
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tailor how Place4U processes cookies on your device
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreferences(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close preferences"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed">
                <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300">
                    In compliance with the <strong>South African Protection of Personal Information Act (POPIA)</strong>, you have full sovereignty over optional tracking cookies. Strictly necessary cookies are permanently engaged to keep your rental account secure.
                  </p>
                </div>

                {/* Categories Accordion List */}
                <div className="space-y-3">
                  {categoryDefinitions.map((cat) => {
                    const isChecked = draftCategories[cat.id];
                    const isExpanded = expandedCategory === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] transition-all overflow-hidden"
                      >
                        <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm">
                                {cat.name}
                              </span>
                              {cat.required ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-950/60 border border-blue-500/30 px-2 py-0.5 rounded-md">
                                  <Lock className="w-2.5 h-2.5" />
                                  Always Active
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md">
                                  Optional
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 mt-1 text-xs">
                              {cat.description}
                            </p>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-3 shrink-0">
                            {cat.required ? (
                              <div
                                className="w-11 h-6 bg-blue-600/70 rounded-full flex items-center justify-end px-1 cursor-not-allowed opacity-80"
                                title="Strictly necessary cookies cannot be disabled"
                              >
                                <div className="w-4 h-4 rounded-full bg-white shadow" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isChecked}
                                onClick={() => toggleDraftCategory(cat.id)}
                                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                                  isChecked ? 'bg-blue-600' : 'bg-slate-700'
                                }`}
                              >
                                <span
                                  className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                                    isChecked ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleCategoryAccordion(cat.id)}
                              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                              title="Toggle cookie audit details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Cookie Audit Table */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="border-t border-white/[0.06] bg-slate-950/40 p-3 sm:p-4 text-[11px]"
                            >
                              <div className="font-semibold text-slate-300 mb-2">
                                Active Identifiers in this category:
                              </div>
                              <div className="space-y-2">
                                {cat.details.map((detail, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] grid grid-cols-1 sm:grid-cols-3 gap-2"
                                  >
                                    <div>
                                      <span className="text-slate-400 block font-mono text-[10px]">
                                        Key:
                                      </span>
                                      <code className="text-blue-300 font-mono text-[11px]">
                                        {detail.name}
                                      </code>
                                    </div>
                                    <div className="sm:col-span-1">
                                      <span className="text-slate-400 block font-mono text-[10px]">
                                        Lifespan / Source:
                                      </span>
                                      <span className="text-slate-300">
                                        {detail.expiry} · {detail.provider}
                                      </span>
                                    </div>
                                    <div className="sm:col-span-1">
                                      <span className="text-slate-400 block font-mono text-[10px]">
                                        Purpose:
                                      </span>
                                      <span className="text-slate-400">
                                        {detail.purpose}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowPolicy(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors self-start sm:self-center cursor-pointer"
                >
                  View POPIA Compliance Documentation
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleRejectNonEssential}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer"
                  >
                    Reject Optional
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomPreferences}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Comprehensive Policy Modal */}
      <AnimatePresence>
        {showPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-policy-title"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 id="privacy-policy-title" className="text-base font-semibold text-white">
                      Cookie & POPIA Compliance Statement
                    </h2>
                    <p className="text-xs text-slate-400">
                      Protection of Personal Information Act 4 of 2013 · South Africa
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPolicy(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Close policy"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Policy Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed font-light">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">1. Introduction & Statutory Commitment</h3>
                  <p>
                    Place4U (Pty) Ltd (&ldquo;Place4U&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting the constitutional right to privacy of all tenants, landlords, and property agents utilizing our verified rental matching platform.
                  </p>
                  <p>
                    This policy outlines how we utilize cookies, local storage objects, and session identifiers in strict accordance with the <strong>Protection of Personal Information Act No. 4 of 2013 (POPIA)</strong>, the <strong>Electronic Communications and Transactions Act No. 25 of 2002 (ECTA)</strong>, and international data standards including the GDPR.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">2. What Are Cookies and Local Storage?</h3>
                  <p>
                    Cookies are compact text files placed on your browser or device when you navigate our platform. They enable our authentication infrastructure to recognize your session, prevent listing fraud, recall your preferred rent filters, and ensure continuous secure communication with our backend services.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">3. Categories of Cookies Employed</h3>
                  <div className="space-y-2 pl-3 border-l-2 border-blue-500/30">
                    <p>
                      <strong className="text-slate-100">A. Strictly Necessary (Essential):</strong> Indispensable for core service delivery. These handle encrypted Supabase JWT tokens, user verification, anti-tampering guards, and role permissions (Tenant, Landlord, Agent, Admin). Consent is not subject to opt-out as the site cannot operate safely without them.
                    </p>
                    <p>
                      <strong className="text-slate-100">B. Functional:</strong> Retain search parameter filters (price range, verified badges, proximity to campuses), interface density, and draft tenancy applications.
                    </p>
                    <p>
                      <strong className="text-slate-100">C. Performance & Analytics:</strong> Aggregate statistical measures of portal uptime, route response times, and anonymous drop-off points.
                    </p>
                    <p>
                      <strong className="text-slate-100">D. Personalization:</strong> Assist in matching tenants to vetted listings in relevant Johannesburg, Pretoria, and Cape Town submarkets.
                    </p>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">4. Your Rights Under POPIA</h3>
                  <p>
                    As a data subject under South African law, you hold the unequivocal right to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-300">
                    <li>Be notified that your personal information is being collected and processed.</li>
                    <li>Request access to the personal records held by Place4U regarding your identity or rental history.</li>
                    <li>Request the correction, destruction, or deletion of personal data no longer authorized for retention.</li>
                    <li>Object at any time to the processing of personal information for marketing purposes.</li>
                    <li>Withdraw your consent to optional cookie processing at any time through our portal settings.</li>
                  </ul>
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">5. Information Officer & Contact Details</h3>
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1 text-slate-300">
                    <p className="font-medium text-slate-200">Information Officer — Place4U (Pty) Ltd</p>
                    <p>Office 205, The Zone, 184 Oxford Road, Rosebank, Johannesburg, 2196</p>
                    <p>Email: <a href="mailto:privacy@place4u.co.za" className="text-blue-400 hover:underline">privacy@place4u.co.za</a> / <a href="mailto:support@place4u.co.za" className="text-blue-400 hover:underline">support@place4u.co.za</a></p>
                    <p>Phone: +27 (0) 11 234 5678</p>
                    <p className="pt-1 text-[11px] text-slate-400">
                      You also retain the right to lodge a complaint with the South African Information Regulator at <span className="text-slate-300">enquiries@inforegulator.org.za</span>.
                    </p>
                  </div>
                </section>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-slate-900/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Last Updated: October 2026 · Version 1.0
                </span>
                <button
                  type="button"
                  onClick={() => setShowPolicy(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-200 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] transition-colors cursor-pointer"
                >
                  Close Notice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Persistent Re-Open Floating Trigger (Unobtrusive bottom-left badge) */}
      {!showBanner && (
        <div className="fixed bottom-4 left-4 z-40">
          <button
            type="button"
            onClick={() => {
              setDraftCategories(consentState.categories);
              setShowPreferences(true);
            }}
            className="group flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-blue-500/40 shadow-xl backdrop-blur-md text-slate-300 hover:text-white transition-all cursor-pointer text-xs"
            title="Manage Cookie & POPIA Consent Preferences"
            aria-label="Manage Cookie & POPIA Consent Preferences"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Cookie className="w-3 h-3" />
            </div>
            <span className="text-[11px] font-medium hidden sm:inline group-hover:inline text-slate-400 group-hover:text-slate-200 transition-colors">
              Cookie Preferences
            </span>
          </button>
        </div>
      )}
    </>
  );
}
