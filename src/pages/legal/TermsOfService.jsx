import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, ShieldAlert, CheckCircle, ArrowLeft, AlertTriangle, Scale } from 'lucide-react'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

export default function TermsOfService() {
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
            <Scale size={14} />
            Consumer Protection Act & PPA Aligned
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#131b2e] mb-3">
            Terms of Service & Platform Guidelines
          </h1>
          <p className="text-sm text-[#707881] leading-relaxed">
            Version 2026.1 · Governing Place4U Relocation Assistance & Matchmaking Operations
          </p>
        </div>

        {/* Highlighted Statutory Non-Agency Disclosure */}
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 mb-8 space-y-2">
          <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
            <AlertTriangle size={18} />
            <span>Important Statutory Classification & Disclaimer (PPA Act 22 of 2019)</span>
          </div>
          <p className="text-xs text-[#3f4850] leading-relaxed">
            <strong>Place4U (Pty) Ltd is a technology and relocation assistance service provider, not an estate agency or property practitioner.</strong> Place4U does not broker leases, conduct legal negotiations on behalf of principals, or hold security deposits or rentals in trust. All lease agreements are entered into directly between landlords and tenants.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-sm text-[#3f4850] leading-relaxed">
          {/* Section 1 */}
          <section className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">1.</span> Platform Scope & Assistance Model
            </h2>
            <p>
              Place4U operates an automated matchmaking and verification platform designed to streamline accommodation searches. Our core scope includes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#3f4850]">
              <li>Digital application aggregation and applicant credential verification.</li>
              <li>Landlord ownership and title authenticity screening.</li>
              <li>Algorithmic matching of tenant budget and area criteria with verified inventory.</li>
              <li>Facilitating secure introductions between compatible parties.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">2.</span> Assistance Fee Terms (Consumer Protection Act Compliance)
            </h2>
            <p>
              In accordance with Section 48 and Section 49 of the Consumer Protection Act (No. 68 of 2008):
            </p>
            <div className="space-y-2 text-xs text-[#3f4850] mt-2">
              <p>• <strong>Fee Amount:</strong> Place4U charges a fixed administrative assistance fee of <strong>R 350.00</strong> upon verified application submission.</p>
              <p>• <strong>Scope of Fee:</strong> This fee covers applicant digital passport vetting, identity verification, deed record verification, background checks, and coordination support.</p>
              <p>• <strong>Refundable Administrative Charge:</strong> The fee is fully refundable if no placement is made.</p>
              <p>• <strong>No Placement Guarantee:</strong> While Place4U works diligently to find optimal accommodation matches, payment of the assistance fee does not guarantee successful lease signing or landlord acceptance.</p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">3.</span> User Qualifications & Warranties
            </h2>
            <p className="text-xs text-[#3f4850]">
              <strong>Tenants warrant that they:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[#3f4850]">
              <li>Are at least 18 years of age.</li>
              <li>Provide truthful, verifiable identification, income, and employment information.</li>
              <li>Will not use the platform for unlawful, deceptive, or speculative purposes.</li>
            </ul>

            <p className="text-xs text-[#3f4850] pt-2">
              <strong>Landlords & Agents warrant that they:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-[#3f4850]">
              <li>Hold lawful ownership or formal written mandate to market the designated property.</li>
              <li>The premises comply with South African municipal housing, safety, and health bylaws.</li>
              <li>If acting as an agent, hold a valid Fidelity Fund Certificate (FFC) issued by the Property Practitioners Regulatory Authority (PPRA).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="disputes" className="space-y-3 bg-white border border-[#dae2fd] rounded-2xl p-6 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
            <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
              <span className="text-[#006194]">4.</span> Dispute Resolution & Governing Law
            </h2>
            <p className="text-xs text-[#3f4850]">
              These terms are governed exclusively by the laws of the Republic of South Africa. In the event of any dispute or disagreement:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#3f4850]">
              <li>The parties shall first attempt informal dispute resolution by notifying the Place4U Governance Desk at <span className="text-[#006194]">jacob@place4u.xyz</span>.</li>
              <li>If unresolved within 14 business days, disputes may be referred to the Rental Housing Tribunal having jurisdiction or submitted to arbitration under the rules of the Arbitration Foundation of Southern Africa (AFSA).</li>
              <li>Tenants maintain all rights available under the Consumer Protection Act and Rental Housing Act.</li>
            </ol>
          </section>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
