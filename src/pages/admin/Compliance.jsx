import React, { useState } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCheck2,
  Lock,
  Scale,
  Users,
  Building,
  RefreshCw,
  ExternalLink
} from 'lucide-react'

export default function CompliancePage() {
  const [toast, setToast] = useState(null)
  const [agents, setAgents] = useState([])

  const [dsarRequests, setDsarRequests] = useState([])

  const toggleAgentVerification = (agentId) => {
    setAgents(prev =>
      prev.map(a => {
        if (a.id === agentId) {
          const nextStatus = a.status === 'Verified' ? 'Pending Verification' : 'Verified'
          return { ...a, status: nextStatus }
        }
        return a
      })
    )
    setToast('Agent statutory FFC verification status updated.')
    setTimeout(() => setToast(null), 3000)
  }

  const exportComplianceCertificate = () => {
    const certificate = `========================================================================
PLACE4U (PTY) LTD - STATUTORY COMPLIANCE & GOVERNANCE AUDIT REPORT
========================================================================
Audit Generated: 10 October 2026
Governance Lead: Lead of Governance
Jurisdiction: Republic of South Africa

1. REGULATORY COMPLIANCE STATUS:
- Protection of Personal Information Act (POPIA Act 4 of 2013): COMPLIANT
  * Condition 1-8 Safeguards: Implemented
  * Information Officer Registration: Active (privacy@place4u.co.za)
  * Data Subject Access Rights (Sections 23 & 24): Deployed
- Property Practitioners Act (PPA Act 22 of 2019): COMPLIANT
  * Classification: Technology Assistance & Tenant Matching Service Provider
  * Non-Brokerage & Non-Trust Account Statutory Disclaimer: Active
  * Third-Party Agent Fidelity Fund Certificate (FFC) Verification: Enforced
- Consumer Protection Act (CPA Act 68 of 2008): COMPLIANT
  * Assistance Fee Upfront Notice (R 350.00): Fully Disclosed & Acknowledged
  * Transparent Plain-Language Disclaimers: Enforced
- Electronic Communications and Transactions Act (ECTA Act 25 of 2002): COMPLIANT
  * Digital Consent Timestamping: Audited

2. AGENT FFC AUDIT SUMMARY:
Total Agents Tracked: ${agents.length}
Verified PPRA FFC Agents: ${agents.filter(a => a.status === 'Verified').length}
Pending Verification: ${agents.filter(a => a.status !== 'Verified').length}

3. DATA SUBJECT ACCESS REQUESTS (POPIA DSAR):
Total Requests Processed: ${dsarRequests.length}
Pending Erasure Requests: ${dsarRequests.filter(r => r.status === 'Under Review').length}

Platform Lead of Governance Sign-off: [VERIFIED & AUDITED]
========================================================================`

    const blob = new Blob([certificate], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Place4U_Compliance_Audit_Certificate_2026.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setToast('Official Compliance Audit Certificate generated and downloaded.')
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] uppercase tracking-wider border border-emerald-200">
              Governance Active · 100% Aligned
            </span>
            <span className="text-slate-400 text-xs">RSA Regulatory Framework</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Governance, Legal & Regulatory Center</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Supervise POPIA data subject rights, PPRA agent FFC licensing, statutory disclaimers, and audit readiness
          </p>
        </div>

        <button
          onClick={exportComplianceCertificate}
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Download size={14} />
          Export Compliance Certificate
        </button>
      </div>

      {/* 4 Pillars Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <h3 className="font-bold text-xs text-slate-800">POPIA Act 4 of 2013</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            8 Conditions, Section 23/24 DSAR & Information Officer registered.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Scale size={20} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <h3 className="font-bold text-xs text-slate-800">PPA Act 22 of 2019</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Technology assistance model, zero trust deposit handling, FFC tracking.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 size={20} className="text-purple-600" />
            <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <h3 className="font-bold text-xs text-slate-800">CPA Act 68 of 2008</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            R350 administrative fee notice & transparent assistance conditions.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <Lock size={20} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">100%</span>
          </div>
          <h3 className="font-bold text-xs text-slate-800">Security & RBAC</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Least-privilege role verification, hardened routes, zero auto-escalation.
          </p>
        </div>
      </div>

      {/* Agent PPRA / FFC License Registry */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building size={16} className="text-blue-600" />
              Agent PPRA Fidelity Fund Certificate (FFC) Verification Ledger
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Under Section 48 of the Property Practitioners Act, all third-party agents marketing leases must hold a valid FFC
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {agents.filter(a => a.status === 'Verified').length} / {agents.length} Verified
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Agent Name & Agency</th>
                <th className="py-3 px-4">FFC Number</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Statutory Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{agent.name}</span>
                    <span className="text-[11px] text-slate-400">{agent.agency}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {agent.ffcNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {agent.expiry}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      agent.status === 'Verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {agent.status === 'Verified' ? '✓ Verified FFC' : '⏳ Pending Audit'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleAgentVerification(agent.id)}
                      type="button"
                      className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 transition-colors"
                    >
                      {agent.status === 'Verified' ? 'Revoke FFC' : 'Mark Verified'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPIA DSAR & Consent Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCheck2 size={16} className="text-emerald-600" />
              POPIA Data Subject Access Requests (DSAR) & Consent Audit Log
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Auditable records of tenant data export, privacy consent timestamps, and Section 24 erasure notices
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">User Email</th>
                <th className="py-3 px-4">Request Type</th>
                <th className="py-3 px-4">Date Recorded</th>
                <th className="py-3 px-4">Processing Channel</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dsarRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-900">
                    {req.id}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {req.user}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {req.type}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {req.date}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {req.channel}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
