import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, FileCheck, AlertTriangle, ArrowLeft, Building2, CheckCircle2 } from 'lucide-react'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

export default function ComplianceNotice() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eaedff] border border-[#93ccff]/60 text-[#006194] text-xs font-semibold mb-4">
            <ShieldCheck size={14} />
            Governance & Legal Compliance Charter
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#131b2e] mb-3">
            Statutory Compliance & Regulatory Disclosures
          </h1>
          <p className="text-sm text-[#707881] leading-relaxed">
            Legal & Regulatory Governance Framework · Republic of South Africa
          </p>
        </div>

        {/* Content Body */}
        <div className="space-y-8 text-sm text-[#3f4850] leading-relaxed">
          {/* Statutory Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <div className="flex items-center gap-2 text-[#006c4a] font-semibold text-xs">
                <CheckCircle2 size={16} />
                <span>POPIA Act No. 4 of 2013</span>
              </div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[#131b2e] text-sm">Personal Information Protection</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Registered Information Officer protocol, encrypted storage of National ID and financial information, mandatory user consent, and Section 23/24 self-service Data Subject Access Rights.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <div className="flex items-center gap-2 text-[#006194] font-semibold text-xs">
                <CheckCircle2 size={16} />
                <span>PPA Act No. 22 of 2019</span>
              </div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[#131b2e] text-sm">Property Practitioners Act Alignment</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Place4U is strictly a technology relocation and matching service provider. Any participating brokers/agents are required to maintain a valid Fidelity Fund Certificate (FFC) with the PPRA. Place4U does not handle trust deposits.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs">
                <CheckCircle2 size={16} />
                <span>CPA Act No. 68 of 2008</span>
              </div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[#131b2e] text-sm">Consumer Protection Standards</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Plain-language terms, upfront disclosure of the R350 assistance fee, zero hidden subscription fees, and transparent operational turnaround targets.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <div className="flex items-center gap-2 text-[#006194] font-semibold text-xs">
                <CheckCircle2 size={16} />
                <span>PAIA Act No. 2 of 2000</span>
              </div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[#131b2e] text-sm">Access to Information Manual</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Place4U maintains an accessible PAIA manual detailing categories of records held, available on formal written request to our Information Officer.
              </p>
            </div>
          </div>

          {/* Scam Shield Protocol */}
          <section className="p-6 rounded-2xl bg-[#eaedff] border border-[#93ccff]/60 space-y-3">
            <h2 className="text-base font-bold text-[#131b2e] flex items-center gap-2 font-['Space_Grotesk']">
              <ShieldCheck className="text-[#006194] w-5 h-5" />
              Scam Shield & Anti-Fraud Protocol
            </h2>
            <p className="text-xs text-[#3f4850] leading-relaxed">
              To eliminate common South African rental marketplace scams (such as fake landlords, phantom deposits, and hijacked properties), Place4U executes a multi-point verification protocol:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#3f4850]">
              <li><strong>Deed Authentication:</strong> Cross-referencing property coordinates against municipal records and title deed documentation.</li>
              <li><strong>Premises Verification:</strong> Photo audit and direct landlord contact confirmation before listing activation.</li>
              <li><strong>Zero Direct In-App Deposit Holding:</strong> Tenants are warned never to pay cash deposits outside formal lease contracts with verified owners.</li>
            </ul>
          </section>

          {/* Reporting Hotline */}
          <section className="p-5 rounded-2xl bg-white border border-[#dae2fd] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <div>
              <h3 className="font-['Space_Grotesk'] font-bold text-[#131b2e] text-sm">Governance & Fraud Hotline</h3>
              <p className="text-xs text-[#707881] mt-0.5">
                To report fraud, impersonation, or suspected statutory non-compliance, reach our governance office immediately.
              </p>
            </div>
            <a
              href="mailto:governance@place4u.co.za"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#006194] hover:bg-[#004b73] text-white font-semibold text-xs transition-colors shrink-0 shadow-[0_12px_30px_-16px_rgba(0,97,148,0.7)]"
            >
              Contact Governance Lead
            </a>
          </section>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
