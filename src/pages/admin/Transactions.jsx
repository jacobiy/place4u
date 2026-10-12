import React, { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Flag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  X
} from 'lucide-react'
import { getAdminTransactions, formatCurrency } from './db/queries'

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [selectedTx, setSelectedTx] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    getAdminTransactions().then((res) => {
      setTransactions(res || [])
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const haystack = `${t.id} ${t.reference} ${t.payer} ${t.payee} ${t.property}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesType = typeFilter === 'All Types' || t.type === typeFilter
      const matchesStatus = statusFilter === 'All Statuses' || t.status === statusFilter
      return matchesQuery && matchesType && matchesStatus
    })
  }, [transactions, query, statusFilter, typeFilter])

  const totalVolume = transactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0)
  const completedCount = transactions.filter((t) => t.status === 'Settled').length
  const escrowCount = transactions.filter((t) => t.status === 'Escrow').length
  const pendingCount = transactions.filter((t) => t.status === 'Processing').length
  const overdueCount = transactions.filter((t) => t.status === 'Overdue').length

  const handleExportCSV = () => {
    const rows = filtered.map((t) => [
      t.id,
      t.reference,
      `"${t.payer}"`,
      `"${t.payee}"`,
      `"${t.property}"`,
      t.type,
      t.amount,
      t.status,
      t.date
    ])
    const header = ['Transaction ID', 'Reference', 'Payer', 'Payee', 'Property', 'Type', 'Amount (ZAR)', 'Status', 'Date']
    const csvContent = 'data:text/csv;charset=utf-8,' + [header.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Place4U_Ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setToast('Ledger export generated successfully.')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Total Volume</p>
          <p className="text-slate-900 text-2xl font-bold font-mono">{formatCurrency(totalVolume)}</p>
          <span className="text-slate-400 text-[10px]">All categories</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Settled</p>
          <p className="text-emerald-600 text-2xl font-bold">{completedCount}</p>
          <span className="text-slate-400 text-[10px]">Instant EFT / Card</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Escrow Held</p>
          <p className="text-blue-600 text-2xl font-bold">{escrowCount}</p>
          <span className="text-slate-400 text-[10px]">Security deposits</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Processing</p>
          <p className="text-amber-500 text-2xl font-bold">{pendingCount}</p>
          <span className="text-slate-400 text-[10px]">Gateway in-flight</span>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">Overdue / Flagged</p>
          <p className="text-rose-600 text-2xl font-bold">{overdueCount}</p>
          <span className="text-slate-400 text-[10px]">Arrears follow-up</span>
        </div>
      </section>

      {/* Main Ledger Table */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
          <div>
            <h3 className="text-slate-900 font-bold text-sm">Platform Financial Ledger</h3>
            <p className="text-slate-400 text-xs">Audited PayFast and banking settlement logs</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search ID, payer, property…"
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 w-60 focus:outline-none focus:border-blue-600"
              />
            </div>
            <button
              onClick={handleExportCSV}
              type="button"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-600"
          >
            <option>All Types</option>
            <option>Rent</option>
            <option>Security Deposit</option>
            <option>Agent 50% Fee Share</option>
            <option>Maintenance</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-600"
          >
            <option>All Statuses</option>
            <option>Settled</option>
            <option>Escrow</option>
            <option>Processing</option>
            <option>Overdue</option>
          </select>
          <span className="text-slate-400 text-xs ml-auto">Showing {filtered.length} entries</span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-100">
                <th className="text-left px-6 py-3">Tx Ref & ID</th>
                <th className="text-left px-4 py-3">Payer</th>
                <th className="text-left px-4 py-3">Payee</th>
                <th className="text-left px-4 py-3">Property Unit</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-3.5 font-mono font-medium text-blue-600">
                    <div>{t.id}</div>
                    <span className="text-[10px] text-slate-400 font-normal">{t.reference}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-800">{t.payer}</p>
                    <span className="text-[10px] text-slate-400">{t.payerType}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-700">{t.payee}</p>
                    <span className="text-[10px] text-slate-400">{t.payeeType}</span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 max-w-[180px] truncate" title={t.property}>
                    <span className="font-medium text-slate-800">{t.propertyUnit}</span> · {t.property.split(',')[0]}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.type === 'Rent'
                          ? 'bg-blue-50 text-blue-700'
                          : t.type === 'Security Deposit'
                            ? 'bg-indigo-50 text-indigo-700'
                            : t.type === 'Commission' || t.type === 'Agent 50% Fee Share'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    <div>{t.date}</div>
                    <span className="text-[10px] text-slate-400">{t.time}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        t.status === 'Settled'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.status === 'Escrow'
                            ? 'bg-indigo-50 text-indigo-700'
                            : t.status === 'Processing'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          t.status === 'Settled'
                            ? 'bg-emerald-500'
                            : t.status === 'Escrow'
                              ? 'bg-indigo-500'
                              : t.status === 'Processing'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                        }`}
                      />
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTx(t)
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-mono text-blue-600 font-semibold">{selectedTx.id}</span>
                <h3 className="text-base font-bold text-slate-900">Ledger Entry Audit</h3>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Amount</span>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5">{formatCurrency(selectedTx.amount)}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  {selectedTx.status} via {selectedTx.gateway}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium">Payment Reference</span>
                  <span className="font-mono font-semibold text-slate-800 block">{selectedTx.reference}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium">Platform Fee</span>
                  <span className="font-mono font-semibold text-slate-800 block">{formatCurrency(selectedTx.fee)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium">Payer</span>
                  <span className="font-semibold text-slate-800 block">{selectedTx.payer}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-medium">Payee</span>
                  <span className="font-semibold text-slate-800 block">{selectedTx.payee}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Property</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedTx.property} ({selectedTx.propertyUnit})</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
