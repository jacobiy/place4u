import React, { useEffect, useMemo, useState } from 'react';
import { getAdminProperties } from './db/queries';
import PropertyDetailView from './PropertyDetailView';

const pill = (status) => {
  if (status === 'active') return 'bg-emerald-50 text-emerald-600';
  if (status === 'pending') return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600';
};

const PropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    const data = await getAdminProperties();
    setProperties(data || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const landlordName = p.landlord?.full_name || '';
      const haystack = `${p.address} ${p.area} ${p.city} ${landlordName}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
      const pStatus = p.is_active ? 'active' : 'inactive';
      const matchesStatus = statusFilter === 'All Statuses' || pStatus === statusFilter.toLowerCase();
      return matchesQuery && matchesStatus;
    });
  }, [properties, query, statusFilter]);

  if (selectedProperty) {
    return <PropertyDetailView property={selectedProperty} onBack={() => setSelectedProperty(null)} />;
  }

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F1E35]">Properties</h2>
          <p className="text-sm text-slate-500">View and manage all active, pending, and suspended property listings.</p>
        </div>
        <button onClick={fetchProperties} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
          Refresh List
        </button>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search properties..."
              className="pl-4 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-[#0F1E35] placeholder-slate-400 w-64 focus:outline-none focus:border-blue-600"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
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
              <p className="text-slate-400 font-medium">Loading properties...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">Property</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Landlord</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Location</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Price</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="row-hover hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-[#0F1E35] max-w-[200px] truncate">{p.address || p.property_type || 'Unnamed Property'}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.id.split('-')[0]}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-[#0F1E35]">{p.landlord?.full_name || 'Unknown'}</p>
                      <p className="text-[11px] text-slate-400">{p.landlord?.email || 'No email'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs text-[#0F1E35] font-semibold">{p.area || 'Unknown Area'}</p>
                      <p className="text-[11px] text-slate-400">{p.city || 'Unknown City'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-[#0F1E35]">
                      R{Number(p.price || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${pill(p.is_active ? 'active' : 'inactive')}`}>
                        {p.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => setSelectedProperty(p)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                      No properties found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default PropertiesPage;
