import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Eye, FileText, CheckCircle, ArrowLeft, Mail, Phone, MapPin, Cookie, SlidersHorizontal } from 'lucide-react'
import { openConsentPreferences } from '../../utils/privacyConsent'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

export default function DataProtectionNotice() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="border-b border-white/10 pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
            <ShieldCheck size={14} />
            POPIA Compliant · Act No. 4 of 2013
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Privacy Policy & POPIA Compliance Statement
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Effective Date: October 2026 · Place4U (Pty) Ltd (Reg. No. 2024/000000/07)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">1.</span> Introduction & Purpose
            </h2>
            <p>
              Place4U (Pty) Ltd ("Place4U", "we", "us", or "our") respects your privacy and is committed
              to protecting personal information in compliance with the **Protection of Personal Information
              Act, No. 4 of 2013 ("POPIA")** and the **Promotion of Access to Information Act, No. 2 of 2000 ("PAIA")**.
            </p>
            <p>
              This Privacy Policy explains how we collect, process, store, disclose, and protect personal
              information collected through our relocation assistance and tenant–property matching platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">2.</span> The 8 POPIA Conditions for Lawful Processing
            </h2>
            <p className="text-slate-400 text-xs">
              We govern all data processing operations in accordance with Chapter 3 of POPIA:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 1: Accountability
                </h3>
                <p className="text-xs text-slate-400">
                  We assign accountability to our designated Information Officer to ensure compliance with all statutory provisions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 2: Processing Limitation
                </h3>
                <p className="text-xs text-slate-400">
                  Data is processed only with your explicit, voluntary consent, necessary for tenant matching and relocation assistance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 3: Purpose Specification
                </h3>
                <p className="text-xs text-slate-400">
                  We collect personal information solely to authenticate accounts, screen housing preferences, and facilitate introductions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 4: Further Processing Limitation
                </h3>
                <p className="text-xs text-slate-400">
                  We never resell, lease, or distribute your personal data to third-party marketing companies without authorization.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 5: Information Quality
                </h3>
                <p className="text-xs text-slate-400">
                  We provide self-service profile controls allowing users to keep their contact and housing credentials accurate and up to date.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 6: Openness
                </h3>
                <p className="text-xs text-slate-400">
                  We maintain full transparency regarding the identity of our processing team, data categories collected, and purpose of usage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 7: Security Safeguards
                </h3>
                <p className="text-xs text-slate-400">
                  Data is protected via TLS 1.3 encryption in transit, AES-256 at rest, Row-Level Security (RLS), and rigorous access auditing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <h3 className="font-semibold text-white text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  Condition 8: Data Subject Participation
                </h3>
                <p className="text-xs text-slate-400">
                  You have the statutory right under Sections 23 & 24 to request access to your data or request complete deletion/destruction.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Categories of Data */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">3.</span> Categories of Personal Information Collected
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-300 text-xs sm:text-sm">
              <li><strong>Identity Information:</strong> Full legal name, date of birth, South African National ID number or passport number.</li>
              <li><strong>Contact Information:</strong> Phone/WhatsApp number, verified email address, residential address.</li>
              <li><strong>Financial & Housing Information:</strong> Monthly income range, employment category, preferred rental budget, and lease duration.</li>
              <li><strong>Property & Landlord Verification:</strong> Landlord proof of ownership, property address, title verification records.</li>
              <li><strong>Technical & Usage Data:</strong> IP address, device fingerprints, session audit logs, and authentication tokens.</li>
            </ul>
          </section>

          {/* Section 4: Cookies & Tracking Technologies */}
          <section className="space-y-4 bg-slate-900/60 border border-white/[0.08] rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cookie size={18} className="text-blue-400" />
                  <span>4. Cookies & Tracking Technologies</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  How we use cookies to provide secure authentication and comply with POPIA consent mandates.
                </p>
              </div>
              <button
                type="button"
                onClick={openConsentPreferences}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
              >
                <SlidersHorizontal size={14} />
                <span>Manage Cookie Preferences</span>
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We employ strictly necessary cookies for session authentication via Supabase, CSRF defense, and user routing. Non-essential cookies (such as functional filter persistence, diagnostic telemetry, and personalization) are optional and subject to your consent, which can be modified or withdrawn at any time.
            </p>
          </section>

          {/* Section 5: Data Subject Rights */}
          <section className="space-y-4 bg-blue-950/20 border border-blue-500/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock size={18} className="text-blue-400" />
              <span>5. Your Data Subject Rights (POPIA Sections 23 & 24)</span>
            </h2>
            <p className="text-xs text-slate-300">
              As a Data Subject in South Africa, you possess statutory rights enforceable against Place4U:
            </p>
            <div className="space-y-2 text-xs text-slate-300">
              <p>• <strong>Right of Access (Section 23):</strong> You may request confirmation of whether we hold personal information about you and receive a machine-readable export of that data.</p>
              <p>• <strong>Right to Correction or Deletion (Section 24):</strong> You may request the correction of inaccurate data or the destruction/deletion of personal information that is no longer authorized or necessary for the original purpose.</p>
              <p>• <strong>Right to Object (Section 11(3)):</strong> You may object at any time to the processing of your personal information on reasonable grounds.</p>
              <p>• <strong>Right to Lodge a Complaint:</strong> You have the right to lodge a formal complaint with the South African Information Regulator if you believe your rights under POPIA have been infringed.</p>
            </div>
          </section>

          {/* Section 6: Statutory Information Officer */}
          <section className="space-y-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-blue-400">6.</span> Designated Information Officer Contact
            </h2>
            <p className="text-xs text-slate-300 mb-3">
              In accordance with Section 55(1) of POPIA and Section 17 of PAIA, inquiries or Data Subject Access Requests (DSAR) should be directed to our Information Officer:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Mail className="text-blue-400 w-4 h-4 flex-shrink-0" />
                <span>privacy@place4u.co.za / legal@place4u.co.za</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="text-blue-400 w-4 h-4 flex-shrink-0" />
                <span>+27 (0) 11 234 5678 (Governance Desk)</span>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <MapPin className="text-blue-400 w-4 h-4 flex-shrink-0" />
                <span>Office 205, The Zone, 184 Oxford Road, Rosebank, Johannesburg, 2196</span>
              </div>
            </div>
          </section>

          {/* Section 7: Information Regulator Details */}
          <section className="space-y-2 text-xs text-slate-400 border-t border-white/[0.08] pt-6">
            <h3 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              South African Information Regulator
            </h3>
            <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
            <p>Complaints: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="text-blue-400 underline">POPIAComplaints@inforegulator.org.za</a></p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
