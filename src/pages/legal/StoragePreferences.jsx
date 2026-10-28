import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Cookie, Lock, ShieldCheck } from 'lucide-react'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'
import { openConsentNotice } from '../../utils/privacyConsent'

export default function CookieNotice() {
  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#18262d] flex flex-col selection:bg-[#006194] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#006194] hover:text-[#004b73] mb-8 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Home
        </Link>

        <header className="border-b border-[#d5e0df] pb-8 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e7eef0] border border-[#d5e0df] text-[#006194] text-xs font-semibold mb-4">
            <Cookie size={14} aria-hidden="true" />
            Cookie notice
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#18262d] mb-3">
            How Place4U uses browser storage
          </h1>
          <p className="text-base text-[#52656b] leading-relaxed max-w-3xl">
            Place4U uses essential browser storage to keep the platform working and help protect your account. We do not currently use analytics or advertising cookies.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#d5e0df] shadow-[0_14px_38px_-30px_rgba(0,97,148,0.35)]">
            <div className="w-10 h-10 rounded-xl bg-[#e7eef0] flex items-center justify-center text-[#006194] mb-4">
              <Lock size={19} aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-lg mb-2">Essential session storage</h2>
            <p className="text-sm text-[#52656b] leading-relaxed">
              Account access relies on browser storage to maintain your session and connect you to the right part of Place4U.
            </p>
          </section>

          <section className="p-5 sm:p-6 rounded-2xl bg-white border border-[#d5e0df] shadow-[0_14px_38px_-30px_rgba(0,97,148,0.35)]">
            <div className="w-10 h-10 rounded-xl bg-[#e7eef0] flex items-center justify-center text-[#006194] mb-4">
              <ShieldCheck size={19} aria-hidden="true" />
            </div>
            <h2 className="font-semibold text-lg mb-2">No tracking cookies</h2>
            <p className="text-sm text-[#52656b] leading-relaxed">
              Place4U does not currently use advertising or analytics cookies. This page explains the essential storage that supports your account and the platform.
            </p>
          </section>
        </div>

        <section className="mt-6 p-5 sm:p-6 rounded-2xl bg-[#e7eef0] border border-[#d5e0df]">
          <h2 className="font-semibold text-lg mb-2">Questions about privacy?</h2>
          <p className="text-sm text-[#52656b] leading-relaxed">
            For information about personal data, access our{' '}
            <Link to="/privacy" className="font-medium text-[#006194] underline underline-offset-2 hover:text-[#004b73]">
              Privacy Policy
            </Link>{' '}
            or{' '}
            <Link to="/compliance" className="font-medium text-[#006194] underline underline-offset-2 hover:text-[#004b73]">
              POPIA Compliance Notice
            </Link>.
          </p>
          <button
            type="button"
            onClick={openConsentNotice}
            className="mt-4 min-h-11 inline-flex items-center justify-center rounded-xl bg-[#006194] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#004b73] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#006194]"
          >
            Show cookie notice
          </button>
        </section>
      </main>

      <Footer theme="light" />
    </div>
  )
}
