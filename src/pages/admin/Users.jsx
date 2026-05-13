import React, { useMemo, useState } from 'react'

const mockUsers = [
  {
    id: '#USR-1042',
    name: 'Michael Nkosi',
    initials: 'MN',
    type: 'Landlord',
    email: 'm.nkosi@email.com',
    phone: '+233 24 123 4567',
    metaPrimary: '7 Properties',
    metaSecondary: '12 Active Leases',
    registered: '13 May 2026',
    kyc: 'Verified',
    status: 'Active',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: '#USR-1041',
    name: 'Sarah Boateng',
    initials: 'SB',
    type: 'Tenant',
    email: 's.boateng@email.com',
    phone: '+233 20 456 7890',
    metaPrimary: '1 Active Lease',
    metaSecondary: '12 Oak Avenue, 3B',
    registered: '12 May 2026',
    kyc: 'Verified',
    status: 'Active',
    color: 'bg-amber-100 text-amber-800'
  },
  {
    id: '#USR-1040',
    name: 'David Mensah',
    initials: 'DM',
    type: 'Agent',
    email: 'd.mensah@realty.com',
    phone: '+233 27 789 0123',
    metaPrimary: '3 Listings',
    metaSecondary: '45 Palm Grove Est.',
    registered: '11 May 2026',
    kyc: 'Pending',
    status: 'Pending',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    id: '#USR-1039',
    name: 'Amara Kamara',
    initials: 'AK',
    type: 'Tenant',
    email: 'a.kamara@email.com',
    phone: '+232 76 345 6789',
    metaPrimary: '1 Active Lease',
    metaSecondary: '8 Riverside Close, 2A',
    registered: '10 May 2026',
    kyc: 'Verified',
    status: 'Active',
    color: 'bg-pink-100 text-pink-800'
  },
  {
    id: '#USR-1038',
    name: 'James Osei',
    initials: 'JO',
    type: 'Landlord',
    email: 'j.osei@email.com',
    phone: '+233 55 234 5678',
    metaPrimary: '2 Properties',
    metaSecondary: '3 Leases (paused)',
    registered: '9 May 2026',
    kyc: 'Flagged',
    status: 'Suspended',
    color: 'bg-emerald-100 text-emerald-800'
  },
  {
    id: '#USR-1037',
    name: 'Fatima Toure',
    initials: 'FT',
    type: 'Agent',
    email: 'f.toure@realty.com',
    phone: '+221 77 901 2345',
    metaPrimary: '8 Listings',
    metaSecondary: '5 Closed Deals (May)',
    registered: '8 May 2026',
    kyc: 'Verified',
    status: 'Active',
    color: 'bg-purple-100 text-purple-800'
  }
]

const pill = (kind, value) => {
  if (kind === 'type') {
    if (value === 'Landlord') return 'bg-emerald-50 text-emerald-600'
    if (value === 'Tenant') return 'bg-blue-50 text-blue-600'
    return 'bg-indigo-50 text-indigo-600'
  }
  if (kind === 'kyc') {
    if (value === 'Verified') return 'bg-emerald-50 text-emerald-600'
    if (value === 'Pending') return 'bg-amber-50 text-amber-600'
    return 'bg-red-50 text-red-600'
  }
  if (value === 'Active') return 'bg-emerald-50 text-emerald-600'
  if (value === 'Pending') return 'bg-amber-50 text-amber-600'
  return 'bg-red-50 text-red-600'
}

const UsersPage = () => {
  const [tab, setTab] = useState('All Users')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Statuses')

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      const matchesTab =
        tab === 'All Users' ? true : tab === 'Landlords' ? u.type === 'Landlord' : tab === 'Tenants' ? u.type === 'Tenant' : u.type === 'Agent'
      const haystack = `${u.name} ${u.email} ${u.phone} ${u.id}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'All Statuses' || u.status === statusFilter
      return matchesTab && matchesQuery && matchesStatus
    })
  }, [query, statusFilter, tab])

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">U</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">All Users</p>
            <p className="text-[#0F1E35] text-2xl font-bold">4,821</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">L</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Landlords</p>
            <p className="text-[#0F1E35] text-2xl font-bold">1,349</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">T</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Tenants</p>
            <p className="text-[#0F1E35] text-2xl font-bold">2,508</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">A</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Agents</p>
            <p className="text-[#0F1E35] text-2xl font-bold">964</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 border-b border-slate-100">
          <div className="flex gap-0">
            {['All Users', 'Landlords', 'Tenants', 'Agents'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                className={`px-5 py-4 text-sm font-semibold -mb-px ${
                  tab === label ? 'border-b-2 border-blue-600 text-blue-600' : 'border-b-2 border-transparent text-slate-500 hover:text-[#0F1E35]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-4 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-[#0F1E35] placeholder-slate-400 w-56 focus:outline-none focus:border-blue-600"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            >
              <option>All Statuses</option>
              <option>Active</option>
              <option>Pending</option>
              <option>Suspended</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">User</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Type</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Contact</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Properties / Leases</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Registered</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">KYC</th>
                <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className={`row-hover ${u.status === 'Pending' ? 'bg-amber-50/40' : u.status === 'Suspended' ? 'bg-red-50/40' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${u.color}`}>
                        {u.initials}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0F1E35]">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill('type', u.type)}`}>{u.type}</span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-[#0F1E35]">{u.email}</p>
                    <p className="text-[11px] text-slate-400">{u.phone}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-xs text-[#0F1E35] font-semibold">{u.metaPrimary}</p>
                    <p className="text-[11px] text-slate-400">{u.metaSecondary}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{u.registered}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${pill('kyc', u.kyc)}`}>{u.kyc}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill('status', u.status)}`}>{u.status}</span>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-6 py-6 text-xs text-slate-400">
                    No users match your filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">Showing 1 – {Math.min(filtered.length, 6)} of {filtered.length} users</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">Pagination UI coming soon</div>
        </div>
      </section>
    </div>
  )
}

export default UsersPage

