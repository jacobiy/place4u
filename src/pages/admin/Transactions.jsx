import React, { useMemo, useState } from 'react'
import { Download, Flag } from 'lucide-react'

const mockTransactions = [
  {
    id: '#TXN-9041',
    payer: { name: 'Sarah Boateng', initials: 'SB', role: 'Tenant', color: 'bg-amber-100 text-amber-800' },
    payee: { name: 'Michael Nkosi', initials: 'MN', role: 'Landlord', color: 'bg-blue-100 text-blue-800' },
    type: 'Rent',
    property: '12 Oak Ave, 3B',
    amount: 1850,
    date: '13 May 2026',
    time: '09:14 AM',
    method: 'Card',
    status: 'Completed'
  },
  {
    id: '#TXN-9040',
    payer: { name: 'David Mensah', initials: 'DM', role: 'Agent', color: 'bg-indigo-100 text-indigo-800' },
    payee: { name: 'James Osei', initials: 'JO', role: 'Landlord', color: 'bg-emerald-100 text-emerald-800' },
    type: 'Commission',
    property: '45 Palm Grove',
    amount: 4200,
    date: '12 May 2026',
    time: '03:42 PM',
    method: 'Bank',
    status: 'Completed'
  },
  {
    id: '#TXN-9039',
    payer: { name: 'Amara Kamara', initials: 'AK', role: 'Tenant', color: 'bg-pink-100 text-pink-800' },
    payee: { name: 'Michael Nkosi', initials: 'MN', role: 'Landlord', color: 'bg-blue-100 text-blue-800' },
    type: 'Rent',
    property: '8 Riverside Close',
    amount: 2100,
    date: '12 May 2026',
    time: '11:05 AM',
    method: 'Card',
    status: 'Pending'
  },
  {
    id: '#TXN-9038',
    payer: { name: 'James Osei', initials: 'JO', role: 'Landlord', color: 'bg-emerald-100 text-emerald-800' },
    payee: { name: 'ServicePro Ltd', initials: 'SV', role: 'Contractor', color: 'bg-slate-100 text-slate-600' },
    type: 'Maintenance',
    property: '5 Highland Blvd',
    amount: 620,
    date: '11 May 2026',
    time: '02:30 PM',
    method: 'Bank',
    status: 'Failed'
  },
  {
    id: '#TXN-9037',
    payer: { name: 'Kwame Asante', initials: 'KA', role: 'Tenant', color: 'bg-purple-100 text-purple-800' },
    payee: { name: 'Fatima Toure', initials: 'FT', role: 'Agent', color: 'bg-indigo-100 text-indigo-800' },
    type: 'Rent',
    property: '22 Sunrise Park',
    amount: 14500,
    date: '10 May 2026',
    time: '11:58 PM',
    method: 'Card',
    status: 'Flagged'
  }
]

const money = (value) =>
  `R${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const statusPill = (status) => {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-600'
  if (status === 'Pending') return 'bg-amber-50 text-amber-600'
  if (status === 'Failed') return 'bg-red-50 text-red-600'
  return 'bg-red-50 text-red-600 border border-red-200'
}

const typePill = (type) => {
  if (type === 'Rent') return 'bg-blue-50 text-blue-600'
  if (type === 'Commission') return 'bg-indigo-50 text-indigo-600'
  if (type === 'Maintenance') return 'bg-orange-50 text-orange-700'
  return 'bg-emerald-50 text-emerald-700'
}

const TransactionsPage = () => {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Statuses')

  const filtered = useMemo(() => {
    return mockTransactions.filter((t) => {
      const haystack = `${t.id} ${t.payer.name} ${t.payee.name} ${t.property}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesType = typeFilter === 'All Types' || t.type === typeFilter
      const matchesStatus = statusFilter === 'All Statuses' || t.status === statusFilter
      return matchesQuery && matchesType && matchesStatus
    })
  }, [query, statusFilter, typeFilter])

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Total Volume (May)</p>
          <p className="text-[#0F1E35] text-2xl font-bold">R847,230</p>
          <p className="text-slate-400 text-[11px] mt-1.5">+14.2% vs Apr</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Completed</p>
          <p className="text-emerald-600 text-2xl font-bold">3,842</p>
          <p className="text-slate-400 text-[11px] mt-1.5">94.1% success rate</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Pending</p>
          <p className="text-amber-500 text-2xl font-bold">148</p>
          <p className="text-slate-400 text-[11px] mt-1.5">Awaiting confirmation</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Failed / Refunded</p>
          <p className="text-red-500 text-2xl font-bold">93</p>
          <p className="text-slate-400 text-[11px] mt-1.5">+3 vs yesterday</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide mb-2">Flagged</p>
          <p className="text-red-500 text-2xl font-bold">3</p>
          <p className="text-slate-400 text-[11px] mt-1.5">Requires review</p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-4 border-b border-slate-100 gap-3">
          <h3 className="text-[#0F1E35] font-semibold text-sm">All Transactions</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="text"
                placeholder="Search by ID, name, property..."
                className="pl-4 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-[#0F1E35] placeholder-slate-400 w-64 focus:outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-100"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              type="button"
              className="flex items-center gap-2 bg-red-50 text-red-500 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 hover:bg-red-100"
            >
              <Flag size={14} />
              Flagged (3)
            </button>
          </div>
        </div>

        <div className="px-6 py-4 flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option>All Types</option>
            <option>Rent</option>
            <option>Commission</option>
            <option>Maintenance</option>
            <option>Deposit</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
          >
            <option>All Statuses</option>
            <option>Completed</option>
            <option>Pending</option>
            <option>Failed</option>
            <option>Flagged</option>
          </select>
          <div className="text-xs text-slate-400">May 1 – 13, 2026</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">Txn ID</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Payer</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Payee</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Type</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Property</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Date &amp; Time</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Method</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className={`row-hover ${t.status === 'Pending' ? 'bg-amber-50/40' : t.status === 'Failed' || t.status === 'Flagged' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-6 py-3.5 text-xs font-mono font-semibold text-blue-600">{t.id}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${t.payer.color}`}>
                        {t.payer.initials}
                      </div>
                      <div>
                        <p className="text-xs text-[#0F1E35] font-medium">{t.payer.name}</p>
                        <p className="text-[10px] text-slate-400">{t.payer.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${t.payee.color}`}>
                        {t.payee.initials}
                      </div>
                      <div>
                        <p className="text-xs text-[#0F1E35] font-medium">{t.payee.name}</p>
                        <p className="text-[10px] text-slate-400">{t.payee.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${typePill(t.type)}`}>{t.type}</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{t.property}</td>
                  <td className={`px-4 py-3.5 text-xs font-bold ${t.status === 'Flagged' ? 'text-red-500' : 'text-[#0F1E35]'}`}>
                    {money(t.amount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs text-[#0F1E35]">{t.date}</p>
                    <p className="text-[11px] text-slate-400">{t.time}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-500">{t.method}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusPill(t.status)}`}>{t.status}</span>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={9} className="px-6 py-6 text-xs text-slate-400">
                    No transactions match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default TransactionsPage
