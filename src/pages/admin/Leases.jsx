import React, { useEffect, useState } from 'react'
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Send,
  X
} from 'lucide-react'
import { getAdminLeases, formatCurrency } from './db/queries'

export default function LeasesPage() {
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [toast, setToast] = useState(null)
  const [selectedLease, setSelectedLease] = useState(null)

  useEffect(() => {
    getAdminLeases().then((res) => {
      setLeases(res || [])
      setLoading(false)
    })
  }, [])

  const filtered = leases.filter((l) => {
    const text = `${l.id} ${l.property} ${l.tenant} ${l.landlord}`.toLowerCase()
    const matchesQuery = !query.trim() || text.includes(query.toLowerCase())
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter
    return matchesQuery && matchesStatus
  })

  const handleSendRenewal = (lease) => {
    setToast(`Renewal notice dispatched to ${lease.tenant} & ${lease.landlord}`)
    setTimeout(() => setToast(null), 3500)
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Active Leases</p>
          <p className="text-slate-900 text-2xl font-bold">{leases.length}</p>
          <span className="text-slate-400 text-[10px]">Managed in platform</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Expiring in &lt; 30d</p>
          <p className="text-amber-600 text-2xl font-bold">
            {leases.filter((l) => l.status === 'Expiring Soon').length}
          </p>
          <span className="text-slate-400 text-[10px]">Requires renewal offer</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Total Deposit Escrow</p>
          <p className="text-blue-700 text-2xl font-bold font-mono">
            {formatCurrency(leases.reduce((acc, l) => acc + (l.depositHeld || 0), 0))}
          </p>
          <span className="text-slate-400 text-[10px]">Held in compliant trust</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Arrears / Disputed</p>
          <p className="text-rose-600 text-2xl font-bold">
            {leases.filter((l) => l.status === 'Payment Overdue').length}
          </p>
          <span className="text-slate-400 text-[10px]">Follow-up required</span>
        </div>
      </section>

      {/* Main List */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-slate-900 font-bold text-sm">Lease Agreement Registry</h3>
            <p className="text-slate-400 text-xs">Legally binding rental agreements and security deposit status</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search lease, tenant, unit…"
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 w-52 focus:outline-none focus:border-blue-600"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Payment Overdue">Payment Overdue</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-100">
                <th className="text-left px-5 py-3">Lease ID</th>
                <th className="text-left px-3 py-3">Property & Unit</th>
                <th className="text-left px-3 py-3">Tenant</th>
                <th className="text-left px-3 py-3">Landlord</th>
                <th className="text-left px-3 py-3">Monthly Rent</th>
                <th className="text-left px-3 py-3">Term Duration</th>
                <th className="text-left px-3 py-3">Deposit Held</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-blue-600">{l.id}</td>
                  <td className="px-3 py-3 font-medium text-slate-800 max-w-[180px] truncate" title={l.property}>
                    {l.property}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{l.tenant}</td>
                  <td className="px-3 py-3 text-slate-600">{l.landlord}</td>
                  <td className="px-3 py-3 font-mono font-bold text-slate-900">{formatCurrency(l.monthlyRent)}</td>
                  <td className="px-3 py-3 text-slate-500">
                    <div>{l.startDate}</div>
                    <span className="text-[10px] text-slate-400">to {l.endDate}</span>
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-700">{formatCurrency(l.depositHeld)}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        l.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : l.status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleSendRenewal(l)}
                      className="px-2.5 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                    >
                      Renewal Notice
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
