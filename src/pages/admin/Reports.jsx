import React, { useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  FileCheck2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building
} from 'lucide-react'

export default function ReportsPage() {
  const [downloading, setDownloading] = useState(null)
  const [toast, setToast] = useState(null)

  const reports = [
    {
      id: 'REP-01',
      title: 'Monthly Consolidated Escrow Statement',
      category: 'Financial Audit',
      format: 'CSV / PDF',
      generated: '01 Oct 2026',
      size: '2.4 MB',
      description: 'Breakdown of security deposits held in audited trust accounts per Property Practitioners Regulatory Authority (PPRA, Act 22 of 2019) guidelines.'
    },
    {
      id: 'REP-02',
      title: 'FICA Compliance & Identity Verification Audit',
      category: 'Regulatory',
      format: 'CSV',
      generated: '05 Oct 2026',
      size: '840 KB',
      description: 'Audit log of verified landlord deeds, tenant IDs, and proof of residence documents.'
    },
    {
      id: 'REP-03',
      title: 'Landlord Gross Disbursement Ledger',
      category: 'Disbursements',
      format: 'CSV',
      generated: '07 Oct 2026',
      size: '1.8 MB',
      description: 'Net rental payouts remitted to landlord banking accounts post-management fee deductions.'
    },
    {
      id: 'REP-04',
      title: 'SARS Section 13sex Tax Statement Schedule',
      category: 'Taxation',
      format: 'PDF',
      generated: 'Quarterly Q3 2026',
      size: '3.1 MB',
      description: 'Commercial and residential building depreciation and rental income certificates.'
    }
  ]

  const handleDownload = (rep) => {
    setDownloading(rep.id)
    setTimeout(() => {
      // Simulate real file download
      const content = `Place4U Compliance Report: ${rep.title}\nGenerated on: ${rep.generated}\nAuditor: Super Admin\nPlatform ID: ZAF-PLACE4U-992\n`
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rep.id}_${rep.title.replace(/\s+/g, '_')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setDownloading(null)
      setToast(`Downloaded ${rep.title}`)
      setTimeout(() => setToast(null), 3000)
    }, 800)
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Compliance & Financial Reports</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Download certified audit packages for SARS, FICA compliance officers, and platform trustees
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                  {rep.category}
                </span>
                <span className="text-slate-400 text-[11px] font-mono">{rep.id}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 mt-1">{rep.title}</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{rep.description}</p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">
                {rep.generated} · {rep.size}
              </span>
              <button
                onClick={() => handleDownload(rep)}
                disabled={downloading === rep.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                <Download size={13} />
                {downloading === rep.id ? 'Exporting…' : 'Download Report'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
