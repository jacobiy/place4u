import React, { useEffect, useMemo, useState } from 'react';
import { getAdminUsers } from './db/queries';

const pill = (kind, value) => {
  if (kind === 'type') {
    if (value === 'landlord') return 'bg-emerald-50 text-emerald-600';
    if (value === 'tenant') return 'bg-blue-50 text-blue-600';
    return 'bg-indigo-50 text-indigo-600';
  }
  if (kind === 'kyc') {
    if (value === 'Verified') return 'bg-emerald-50 text-emerald-600';
    if (value === 'Pending') return 'bg-amber-50 text-amber-600';
    return 'bg-red-50 text-red-600';
  }
  if (value === 'active') return 'bg-emerald-50 text-emerald-600';
  if (value === 'pending') return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600';
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All Users');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAdminUsers();
    setUsers(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesTab =
        tab === 'All Users' ? true : tab === 'Landlords' ? u.type === 'landlord' : tab === 'Tenants' ? u.type === 'tenant' : u.type === 'agent';
      const haystack = `${u.name} ${u.email} ${u.phone} ${u.id}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || u.status === statusFilter.toLowerCase();
      return matchesTab && matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, tab, users]);

  const landlordsCount = users.filter(u => u.type === 'landlord').length;
  const tenantsCount = users.filter(u => u.type === 'tenant').length;
  const agentsCount = users.filter(u => u.type === 'agent').length;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">U</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">All Users</p>
            <p className="text-[#0F1E35] text-2xl font-bold">{users.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">L</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Landlords</p>
            <p className="text-[#0F1E35] text-2xl font-bold">{landlordsCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold">T</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Tenants</p>
            <p className="text-[#0F1E35] text-2xl font-bold">{tenantsCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">A</div>
          <div>
            <p className="text-slate-500 text-xs font-medium">Agents</p>
            <p className="text-[#0F1E35] text-2xl font-bold">{agentsCount}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 border-b border-slate-100">
          <div className="flex gap-0 overflow-x-auto">
            {['All Users', 'Landlords', 'Tenants', 'Agents'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setTab(label)}
                className={`px-5 py-4 text-sm font-semibold -mb-px whitespace-nowrap ${
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

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-slate-400 font-medium">Loading users...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">User</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Type</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Contact</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Registered</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">KYC</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className={`row-hover ${u.status === 'pending' ? 'bg-amber-50/40' : u.status === 'suspended' ? 'bg-red-50/40' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold flex-shrink-0 text-slate-600 border border-slate-200">
                          {u.initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0F1E35]">{u.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">{u.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${pill('type', u.type)}`}>{u.type}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-[#0F1E35]">{u.email}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{u.phone}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{u.registered}</td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${pill('kyc', u.kyc)}`}>{u.kyc}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${pill('status', u.status)}`}>{u.status}</span>
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                      No users match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-500">Showing {filtered.length} users</p>
        </div>
      </section>
    </div>
  );
};

export default UsersPage;
