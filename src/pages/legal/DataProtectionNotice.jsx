import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Lock, Eye, FileText, CheckCircle, ArrowLeft, Mail, Phone, MapPin, Cookie } from 'lucide-react'
import { openConsentNotice } from '../../utils/privacyConsent'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

export default function DataProtectionNotice() {
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

        {/* Header */}
        <div className="border-b border-[#dae2fd] pb-8 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#85f8c4]/50 border border-[#68dba9] text-[#005137] text-xs font-semibold mb-4">
            <ShieldCheck size={14} />
            POPIA Compliant · Act No. 4 of 2013
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#131b2e] mb-3">
            Privacy Policy & POPIA Compliance Statement
          </h1>
          <p className="text-sm text-[#707881] leading-relaxed">
            Effective Date: October 2026 · Place4U (Pty) Ltd (Reg. No. 2024/000000/07)
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-10 text-sm text-[#3f4850] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">1.</span> Introduction & Purpose
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
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">2.</span> The 8 POPIA Conditions for Lawful Processing
            </h2>
            <p className="text-[#707881] text-xs">
              We govern all data processing operations in accordance with Chapter 3 of POPIA:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 1: Accountability
                </h3>
                <p className="text-xs text-[#3f4850]">
                  We assign accountability to our designated Information Officer to ensure compliance with all statutory provisions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 2: Processing Limitation
                </h3>
                <p className="text-xs text-[#3f4850]">
                  Data is processed only with your explicit, voluntary consent, necessary for tenant matching and relocation assistance.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 3: Purpose Specification
                </h3>
                <p className="text-xs text-[#3f4850]">
                  We collect personal information solely to authenticate accounts, screen housing preferences, and facilitate introductions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 4: Further Processing Limitation
                </h3>
                <p className="text-xs text-[#3f4850]">
                  We never resell, lease, or distribute your personal data to third-party marketing companies without authorization.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 5: Information Quality
                </h3>
                <p className="text-xs text-[#3f4850]">
                  We provide self-service profile controls allowing users to keep their contact and housing credentials accurate and up to date.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 6: Openness
                </h3>
                <p className="text-xs text-[#3f4850]">
                  We maintain full transparency regarding the identity of our processing team, data categories collected, and purpose of usage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 7: Security Safeguards
                </h3>
                <p className="text-xs text-[#3f4850]">
                  Data is protected via TLS 1.3 encryption in transit, AES-256 at rest, Row-Level Security (RLS), and rigorous access auditing.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#dae2fd]">
                <h3 className="font-semibold text-[#131b2e] text-xs mb-1.5 flex items-center gap-2">
                  <CheckCircle size={14} className="text-[#006c4a]" />
                  Condition 8: Data Subject Participation
                </h3>
                <p className="text-xs text-[#3f4850]">
                  You have the statutory right under Sections 23 & 24 to request access to your data or request complete deletion/destruction.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Categories of Data */}
          <section className="space-y-3">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">3.</span> Categories of Personal Information Collected
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-[#3f4850] text-xs sm:text-sm">
              <li><strong>Identity Information:</strong> Full legal name, date of birth, South African National ID number or passport number.</li>
              <li><strong>Contact Information:</strong> Phone/WhatsApp number, verified email address, residential address.</li>
              <li><strong>Financial & Housing Information:</strong> Monthly income range, employment category, preferred rental budget, and lease duration.</li>
              <li><strong>Property & Landlord Verification:</strong> Landlord proof of ownership, property address, title verification records.</li>
              <li><strong>Technical & Usage Data:</strong> IP address, device fingerprints, session audit logs, and authentication tokens.</li>
            </ul>
          </section>

          {/* Section 4: Cookies & Tracking Technologies */}
          <section className="space-y-4 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#131b2e] flex items-center gap-2 font-['Space_Grotesk']">
                  <Cookie size={18} className="text-[#006194]" />
                  <span>4. Cookies & Tracking Technologies</span>
                </h2>
                <p className="text-xs text-[#707881] mt-1">
                  Essential browser storage helps keep your account session secure and the platform working.
                </p>
              </div>
              <button
                type="button"
                onClick={openConsentNotice}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#006194] hover:bg-[#004b73] shadow-[0_12px_30px_-16px_rgba(0,97,148,0.7)] transition-all cursor-pointer shrink-0"
              >
                <span>View Cookie Notice</span>
              </button>
            </div>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              Place4U currently uses essential browser storage for account access and core platform functions. The site does not currently use analytics or advertising cookies.
            </p>
          </section>

          {/* Section 5: Data Subject Rights */}
          <section className="space-y-4 bg-[#eaedff] border border-[#93ccff]/60 rounded-2xl p-6">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <Lock size={18} className="text-[#006194]" />
              <span>5. Your Data Subject Rights (POPIA Sections 23 & 24)</span>
            </h2>
            <p className="text-xs text-[#3f4850]">
              As a Data Subject in South Africa, you possess statutory rights enforceable against Place4U:
            </p>
            <div className="space-y-2 text-xs text-[#3f4850]">
              <p>• <strong>Right of Access (Section 23):</strong> You may request confirmation of whether we hold personal information about you and receive a machine-readable export of that data.</p>
              <p>• <strong>Right to Correction or Deletion (Section 24):</strong> You may request the correction of inaccurate data or the destruction/deletion of personal information that is no longer authorized or necessary for the original purpose.</p>
              <p>• <strong>Right to Object (Section 11(3)):</strong> You may object at any time to the processing of your personal information on reasonable grounds.</p>
              <p>• <strong>Right to Lodge a Complaint:</strong> You have the right to lodge a formal complaint with the South African Information Regulator if you believe your rights under POPIA have been infringed.</p>
            </div>
          </section>

          {/* Section 6: Statutory Information Officer */}
          <section className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">6.</span> Designated Information Officer Contact
            </h2>
            <p className="text-xs text-[#3f4850] mb-3">
              In accordance with Section 55(1) of POPIA and Section 17 of PAIA, inquiries or Data Subject Access Requests (DSAR) should be directed to our Information Officer:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#3f4850]">
              <div className="flex items-center gap-2.5">
                <Mail className="text-[#006194] w-4 h-4 flex-shrink-0" />
                <span>privacy@place4u.co.za / legal@place4u.co.za</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="text-[#006194] w-4 h-4 flex-shrink-0" />
                <span>082 482 2611 (Governance Desk)</span>
              </div>
              <div className="flex items-center gap-2.5 sm:col-span-2">
                <MapPin className="text-[#006194] w-4 h-4 flex-shrink-0" />
                <span>Coming Soon</span>
              </div>
            </div>
          </section>

          {/* Section 7: Information Regulator Details */}
          <section className="space-y-2 text-xs text-[#707881] border-t border-[#dae2fd] pt-6">
            <h3 className="font-bold text-[#131b2e] uppercase tracking-wider text-[11px] font-['Space_Grotesk']">
              South African Information Regulator
            </h3>
            <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
            <p>Complaints: <a href="mailto:POPIAComplaints@inforegulator.org.za" className="text-[#006194] underline">POPIAComplaints@inforegulator.org.za</a></p>
          </section>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
