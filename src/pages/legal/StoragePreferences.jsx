import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, ShieldCheck, Check, Lock, SlidersHorizontal, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import {
  getConsentState,
  saveConsentState,
  acceptAllConsent,
  rejectNonEssentialConsent,
  CONSENT_CATEGORIES,
  CONSENT_EVENT_UPDATED,
  openConsentPreferences
} from '../../utils/privacyConsent'

export default function CookiePreferences() {
  const [consentState, setConsentState] = useState(() => getConsentState())
  const [categories, setCategories] = useState(() => getConsentState().categories)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const handleUpdate = (e) => {
      const updated = e.detail || getConsentState()
      setConsentState(updated)
      setCategories(updated.categories)
    }
    window.addEventListener(CONSENT_EVENT_UPDATED, handleUpdate)
    return () => window.removeEventListener(CONSENT_EVENT_UPDATED, handleUpdate)
  }, [])

  const toggleCategory = (cat) => {
    if (cat === CONSENT_CATEGORIES.ESSENTIAL) return
    setCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }))
  }

  const handleSave = () => {
    saveConsentState(categories, 'custom')
    setToast('Cookie and privacy preferences saved successfully.')
    setTimeout(() => setToast(null), 3500)
  }

  const handleAcceptAll = () => {
    acceptAllConsent()
    setToast('All cookie categories accepted.')
    setTimeout(() => setToast(null), 3500)
  }

  const handleRejectNonEssential = () => {
    rejectNonEssentialConsent()
    setToast('Non-essential cookies disabled.')
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col selection:bg-[#006194] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#006194] hover:text-[#004b73] mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-white text-[#131b2e] px-4 py-2.5 rounded-xl shadow-[0_18px_45px_-20px_rgba(0,97,148,0.55)] border border-[#dae2fd] text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#006c4a]" />
            <span>{toast}</span>
          </div>
        )}

        {/* Header */}
        <div className="border-b border-[#dae2fd] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] border border-[#93ccff]/60 text-[#006194] text-xs font-semibold mb-4">
            <Cookie size={14} />
            POPIA Cookie & Tracking Governance
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#131b2e] mb-3">
            Cookie Preferences & Tracking Controls
          </h1>
          <p className="text-sm text-[#707881] leading-relaxed">
            Manage your personal data processing and device storage preferences in compliance with the Protection of Personal Information Act (POPIA Act 4 of 2013).
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#dae2fd] mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
          <div>
            <h2 className="text-sm font-bold text-[#131b2e] font-['Space_Grotesk']">Current Consent Status: {consentState.status.toUpperCase()}</h2>
            <p className="text-xs text-[#707881] mt-0.5">
              {consentState.timestamp ? `Last updated: ${new Date(consentState.timestamp).toLocaleDateString()}` : 'Default privacy settings active'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleRejectNonEssential}
              type="button"
              className="px-3.5 py-2 rounded-xl bg-[#f2f3ff] hover:bg-[#eaedff] border border-[#dae2fd] text-xs font-semibold text-[#3f4850] transition-colors"
            >
              Reject Non-Essential
            </button>
            <button
              onClick={handleAcceptAll}
              type="button"
              className="px-4 py-2 rounded-xl bg-[#006194] hover:bg-[#004b73] text-xs font-semibold text-white shadow-[0_12px_30px_-16px_rgba(0,97,148,0.7)] transition-colors"
            >
              Accept All Cookies
            </button>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-4 mb-10">
          {/* 1. Essential */}
          <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock size={18} className="text-[#006c4a]" />
                <h3 className="font-bold text-sm text-[#131b2e]">Strictly Necessary (Essential)</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#85f8c4]/50 text-[#005137] text-[10px] font-bold uppercase tracking-wider border border-[#68dba9]">
                Always Active
              </span>
            </div>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Required for the fundamental security and operation of Place4U. These include secure Supabase authentication tokens, session verification, and CSRF protection during tenant inquiry submissions.
            </p>
          </div>

          {/* 2. Functional */}
          <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal size={18} className="text-[#006194]" />
                <h3 className="font-bold text-sm text-[#131b2e]">Functional & Preferences</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={categories[CONSENT_CATEGORIES.FUNCTIONAL]}
                  onChange={() => toggleCategory(CONSENT_CATEGORIES.FUNCTIONAL)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dae2fd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#bfc7d2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006194]"></div>
              </label>
            </div>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Allows the platform to remember your active search preferences, saved favorite properties, student Digs filters, and chosen dashboard display density.
            </p>
          </div>

          {/* 3. Analytics */}
          <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-[#006194]" />
                <h3 className="font-bold text-sm text-[#131b2e]">Performance & Analytics</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={categories[CONSENT_CATEGORIES.ANALYTICS]}
                  onChange={() => toggleCategory(CONSENT_CATEGORIES.ANALYTICS)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dae2fd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#bfc7d2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006194]"></div>
              </label>
            </div>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Provides aggregated telemetry on page performance, API latency, and load times across South African cellular networks. No personally identifiable identity information is collected.
            </p>
          </div>

          {/* 4. Marketing */}
          <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cookie size={18} className="text-amber-700" />
                <h3 className="font-bold text-sm text-[#131b2e]">Personalization & Outreach</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={categories[CONSENT_CATEGORIES.MARKETING]}
                  onChange={() => toggleCategory(CONSENT_CATEGORIES.MARKETING)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#dae2fd] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#bfc7d2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006194]"></div>
              </label>
            </div>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Enables personalized accommodation recommendations and campus referral bonuses. Place4U does not sell your personal information or track your activity on third-party websites.
            </p>
          </div>
        </div>

        {/* Save Preferences Button */}
        <div className="flex items-center justify-between pt-4 border-t border-[#dae2fd]">
          <button
            onClick={() => openConsentPreferences()}
            type="button"
            className="text-xs text-[#006194] hover:text-[#004b73] underline underline-offset-4"
          >
            Open Quick Preference Popup
          </button>

          <button
            onClick={handleSave}
            type="button"
            className="px-6 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-xs font-semibold text-white shadow-[0_14px_34px_-18px_rgba(0,97,148,0.8)] transition-all"
          >
            Save My Preferences
          </button>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
