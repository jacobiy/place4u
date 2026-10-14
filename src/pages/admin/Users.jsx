import React, { useEffect, useMemo, useState } from 'react'
import {
  Search,
  CheckCircle2,
  X,
  Mail,
  Phone
} from 'lucide-react'
import {
  getAdminUsers,
  toggleUserVerification,
  formatDate,
  initialsFromName,
  openGmail
} from './db/queries'

const rolePill = (role) => {
  if (role === 'landlord') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (role === 'tenant') return 'bg-blue-50 text-blue-700 border border-blue-200'
  if (role === 'agent') return 'bg-indigo-50 text-indigo-700 border border-indigo-200'
  return 'bg-purple-50 text-purple-700 border border-purple-200'
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('All Users')
  const [query, setQuery] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const data = await getAdminUsers()
    setUsers(data || [])
    setLoading(false)
  }

  const handleToggleVerification = async (user) => {
    try {
      const newStatus = !user.is_verified
      await toggleUserVerification(user.id, newStatus)
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_verified: newStatus } : u))
      )
      setToast(`${user.full_name || 'User'} marked as ${newStatus ? 'Verified' : 'Unverified'}`)
    } catch (err) {
      setToast(`Error: ${err.message}`)
    }
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesTab =
        tab === 'All Users'
          ? true
          : tab === 'Landlords'
            ? u.user_type === 'landlord'
            : tab === 'Tenants'
              ? u.user_type === 'tenant'
              : tab === 'Agents'
                ? u.user_type === 'agent'
                : u.user_type === 'admin'

      const haystack = `${u.full_name || ''} ${u.email || ''} ${u.phone || ''} ${u.id}`.toLowerCase()
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesVerification =
        verificationFilter === 'All'
          ? true
          : verificationFilter === 'Verified'
            ? u.is_verified
            : !u.is_verified

      return matchesTab && matchesQuery && matchesVerification
    })
  }, [query, verificationFilter, tab, users])

  const landlordsCount = users.filter((u) => u.user_type === 'landlord').length
  const tenantsCount = users.filter((u) => u.user_type === 'tenant').length
  const agentsCount = users.filter((u) => u.user_type === 'agent').length

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* KPI Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
            U
          </div>
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">All Users</p>
            <p className="text-slate-900 text-xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
            L
          </div>
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Landlords</p>
            <p className="text-slate-900 text-xl font-bold">{landlordsCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
            T
          </div>
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Tenants</p>
            <p className="text-slate-900 text-xl font-bold">{tenantsCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
            A
          </div>
          <div>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Agents</p>
            <p className="text-slate-900 text-xl font-bold">{agentsCount}</p>
          </div>
        </div>
      </section>

      {/* Main Table */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 border-b border-slate-100">
          <div className="flex gap-0 overflow-x-auto">
            {['All Users', 'Landlords', 'Tenants', 'Agents'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                className={`px-4 py-3.5 text-xs font-semibold -mb-px whitespace-nowrap transition-colors ${
                  tab === label
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-b-2 border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 py-3">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, phone…"
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 w-56 focus:outline-none focus:border-blue-600"
              />
            </div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Verification</option>
              <option value="Verified">Verified Only</option>
              <option value="Pending">Unverified Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-slate-400 font-medium text-xs">Loading real user accounts from database…</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-100">
                  <th className="text-left px-6 py-3">User</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Contact Email</th>
                  <th className="text-left px-4 py-3">Phone</th>
                  <th className="text-left px-4 py-3">Registered Date</th>
                  <th className="text-left px-4 py-3">Verification</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold flex-shrink-0 text-slate-700 border border-slate-200">
                          {initialsFromName(u.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.full_name || 'Unnamed'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{u.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${rolePill(u.user_type)}`}>
                        {u.user_type}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <p className="text-slate-900 font-medium">{u.email || '—'}</p>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {u.phone || '—'}
                    </td>

                    <td className="px-4 py-3.5 text-slate-500">
                      {formatDate(u.created_at)}
                    </td>

                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleVerification(u)}
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full transition-transform active:scale-95 border ${
                          u.is_verified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                        title="Click to toggle user verification status"
                      >
                        {u.is_verified ? 'Verified' : 'Pending'}
                      </button>
                    </td>

                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.email && (
                          <button
                            onClick={() =>
                              openGmail(
                                u.email,
                                `Place4U: Notice for ${u.full_name || 'User'}`,
                                `Hi ${u.full_name || 'there'},\n\nRegarding your Place4U account:\n\nBest regards,\nPlace4U Admin`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                            title="Email via Gmail"
                          >
                            <Mail size={12} className="text-red-500" />
                            Email
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-xs text-slate-400">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">User Account Details</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {initialsFromName(selectedUser.full_name)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedUser.full_name || 'User'}</h4>
                  <span className="capitalize text-[10px] font-semibold text-slate-500">{selectedUser.user_type} Account</span>
                </div>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-400" />
                  <span>{selectedUser.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-slate-400" />
                  <span>{selectedUser.phone || 'No phone provided'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Registered On</span>
                  <p className="font-medium mt-0.5">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Verification</span>
                  <p className="font-medium mt-0.5">{selectedUser.is_verified ? 'Verified' : 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              {selectedUser.email && (
                <button
                  onClick={() => {
                    openGmail(selectedUser.email, `Place4U Account Update`, `Hi ${selectedUser.full_name},\n\n`)
                    setSelectedUser(null)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <Mail size={13} />
                  Email via Gmail
                </button>
              )}
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
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
