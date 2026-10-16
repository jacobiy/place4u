import React from 'react'
import { Link } from 'react-router-dom'
import { Scale, ArrowLeft, ShieldAlert, CheckCircle2, AlertTriangle, Building, Mail, Phone, MapPin, FileText } from 'lucide-react'
import Navbar from '../../component/Navbar'
import Footer from '../../component/Footer'

export default function DisputeResolution() {
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
            Statutory Dispute Resolution Guidelines
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-bold tracking-tight text-[#131b2e] mb-3">
            Dispute Resolution Guidelines
          </h1>
          <p className="text-sm text-[#707881] leading-relaxed">
            Governed by the Rental Housing Act (No. 50 of 1999) & Consumer Protection Act (No. 68 of 2008) · Place4U Platform Operations
          </p>
        </div>

        {/* Overview Banner */}
        <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] mb-8 space-y-3 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
          <div className="flex items-center gap-2 text-[#131b2e] font-bold text-sm font-['Space_Grotesk']">
            <ShieldAlert size={18} className="text-[#006194]" />
            <span>Platform Commitment to Fair Practice & Mediation</span>
          </div>
          <p className="text-xs text-[#3f4850] leading-relaxed">
            Place4U is committed to maintaining a secure, fair, and fraud-free relocation ecosystem. While Place4U is an assistance and matching technology platform (not a party to private lease contracts between landlords and tenants), we enforce a structured 3-tier dispute resolution procedure to resolve grievances swiftly and equitably.
          </p>
        </div>

        {/* 3-Tier Escalation Framework */}
        <div className="space-y-6 mb-10">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
            <span className="text-[#006194]">1.</span> Three-Tier Dispute Escalation Hierarchy
          </h2>

          <div className="space-y-4">
            {/* Tier 1 */}
            <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-[#eaedff] text-[#006194] text-[10px] font-bold uppercase tracking-wider border border-[#93ccff]/60">
                  Tier 1 · Informal Conciliation
                </span>
                <span className="text-xs text-[#707881]">Within 14 Business Days</span>
              </div>
              <h3 className="font-bold text-sm text-[#131b2e]">Place4U Governance & Dispute Desk</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Aggrieved parties must first submit written notification to the Place4U Governance Desk at <strong className="text-[#006194]">disputes@place4u.co.za</strong>. Our compliance team acknowledges receipt within 48 hours and conducts an impartial fact-finding inquiry. Where listing discrepancies or communication breakdowns exist, Place4U mediates a direct informal resolution.
              </p>
            </div>

            {/* Tier 2 */}
            <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-[#85f8c4]/50 text-[#005137] text-[10px] font-bold uppercase tracking-wider border border-[#68dba9]">
                  Tier 2 · Statutory Tribunal
                </span>
                <span className="text-xs text-[#707881]">Provincial Jurisdiction</span>
              </div>
              <h3 className="font-bold text-sm text-[#131b2e]">Rental Housing Tribunal (RHT)</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                In disputes arising between tenants and landlords relating to lease unfair practices (such as deposit deductions, maintenance failures, or illegal evictions), either party may lodge a formal complaint with the relevant provincial Rental Housing Tribunal pursuant to Section 13 of the Rental Housing Act. RHT rulings hold the legal status of an order of a Magistrate’s Court.
              </p>
            </div>

            {/* Tier 3 */}
            <div className="p-5 rounded-2xl bg-[#f2f3ff] border border-[#dae2fd] space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                  Tier 3 · Binding Arbitration
                </span>
                <span className="text-xs text-[#707881]">Commercial Claims</span>
              </div>
              <h3 className="font-bold text-sm text-[#131b2e]">Arbitration Foundation of Southern Africa (AFSA)</h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Any contractual disputes involving platform service fees, agent mandates, or business partnership covenants that cannot be resolved informally may be submitted to expedited commercial arbitration administered by AFSA in Johannesburg in accordance with AFSA’s commercial rules.
              </p>
            </div>
          </div>
        </div>

        {/* Dispute Categories & Protocols */}
        <div className="space-y-6 mb-10">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
            <span className="text-[#006194]">2.</span> Protocols for Common Grievance Scenarios
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#131b2e]">
                A. Listing Discrepancy & Fraud Allegations
              </h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                If a listed property differs substantially from verified photographs or suspected fraudulent landlord conduct occurs, the listing is quarantined within 4 hours. The Scam Shield team verifies deed registry records before taking action.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#131b2e]">
                B. Assistance Fee Refund Criteria
              </h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Under Sections 48 & 49 of the Consumer Protection Act, the R 350 assistance fee covers administrative passport vetting and coordination. Refunds are exclusively considered if Place4U fails to process credentials within advertised SLAs due to technical system outages.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#131b2e]">
                C. Landlord-Tenant Lease Violations
              </h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                All tenancy agreements signed post-matching are direct bilateral contracts. Place4U provides formal breach notice templates complying with the Rental Housing Act and 14-day statutory notification periods.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-[#dae2fd] space-y-2 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#131b2e]">
                D. Agent Mandate & Conduct Inquiries
              </h3>
              <p className="text-xs text-[#3f4850] leading-relaxed">
                Participating agents reported for unprofessional conduct or lack of a current PPRA Fidelity Fund Certificate (FFC) are suspended pending verification through the Property Practitioners Regulatory Authority.
              </p>
            </div>
          </div>
        </div>

        {/* Consumer Protection Ombud */}
        <div className="p-6 rounded-2xl bg-white border border-[#dae2fd] space-y-3 mb-10 shadow-[0_14px_38px_-30px_rgba(0,97,148,0.4)]">
          <h2 className="text-base font-bold text-[#131b2e] flex items-center gap-2 font-['Space_Grotesk']">
            <Building className="text-[#006c4a] w-5 h-5" />
            Statutory Ombudsman Recourse
          </h2>
          <p className="text-xs text-[#3f4850] leading-relaxed">
            Consumers who remain unsatisfied after Tier 1 conciliation retain the statutory right to approach the **Consumer Goods and Services Ombud (CGSO)** or the **National Consumer Commission (NCC)** in terms of the Consumer Protection Act (No. 68 of 2008).
          </p>
          <div className="pt-2 text-xs text-[#707881] space-y-1">
            <p>• CGSO Sharecall: 0860 000 272 | Email: info@cgso.org.za</p>
            <p>• National Consumer Commission: www.thencc.gov.za</p>
          </div>
        </div>

        {/* Contact Dispute Secretariat */}
        <div className="p-6 rounded-2xl bg-[#eaedff] border border-[#93ccff]/60 space-y-4">
          <h3 className="font-bold text-sm text-[#131b2e] font-['Space_Grotesk']">How to File a Dispute with Place4U</h3>
          <p className="text-xs text-[#3f4850] leading-relaxed">
            To register a dispute with our Governance Secretariat, prepare your application reference ID, property address, and a written summary with supporting evidence:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#3f4850] pt-2">
            <div className="flex items-center gap-2.5">
              <Mail className="text-[#006194] w-4 h-4 flex-shrink-0" />
              <span>disputes@place4u.co.za / legal@place4u.co.za</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="text-[#006194] w-4 h-4 flex-shrink-0" />
              <span>082 482 2611 (Governance Secretariat)</span>
            </div>
            <div className="flex items-center gap-2.5 sm:col-span-2">
              <MapPin className="text-[#006194] w-4 h-4 flex-shrink-0" />
              <span>Dispute Office, Suite 205, The Zone, 184 Oxford Road, Rosebank, 2196 (Coming Soon)</span>
            </div>
          </div>
        </div>
      </main>

      <Footer theme="light" />
    </div>
  )
}
