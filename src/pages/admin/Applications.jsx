import React, { useEffect, useMemo, useState } from 'react';
import { getAdminApplications, getAgentsList, assignAgentToApplication } from './db/queries';

const pill = (status) => {
  if (status === 'assigned' || status === 'approved') return 'bg-emerald-50 text-emerald-600';
  if (status === 'submitted' || status === 'pending') return 'bg-amber-50 text-amber-600';
  return 'bg-red-50 text-red-600';
};

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [appsData, agentsData] = await Promise.all([
      getAdminApplications(),
      getAgentsList()
    ]);
    setApplications(appsData || []);
    setAgents(agentsData || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const tenantName = app.tenant?.full_name || '';
      const agentName = app.agent?.full_name || '';
      const haystack = `${tenantName} ${agentName} ${app.id}`.toLowerCase();
      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'All Statuses' || app.status === statusFilter.toLowerCase();
      return matchesQuery && matchesStatus;
    });
  }, [applications, query, statusFilter]);

  const handleAssign = async (appId, agentId) => {
    try {
      await assignAgentToApplication(appId, agentId);
      // Optimistically update
      setApplications(prev => prev.map(app => {
        if (app.id === appId) {
          const selectedAgent = agents.find(a => a.id === agentId);
          return { ...app, assigned_to: agentId, agent: selectedAgent };
        }
        return app;
      }));
    } catch (err) {
      console.error("Failed to assign agent");
    }
  };

  return (
    <div className="space-y-5">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0F1E35]">Applications</h2>
          <p className="text-sm text-slate-500">View and assign tenant applications to specific agents.</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition-colors">
          Refresh List
        </button>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3 py-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search applications..."
              className="pl-4 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-[#0F1E35] placeholder-slate-400 w-64 focus:outline-none focus:border-blue-600"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            >
              <option>All Statuses</option>
              <option>Submitted</option>
              <option>Pending</option>
              <option>Assigned</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-slate-400 font-medium">Loading applications...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">Application ID</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Tenant Details</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Budget Details</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Date Submitted</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => (
                  <tr key={app.id} className="row-hover hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-[#0F1E35] font-mono">{app.id.split('-')[0]}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-[#0F1E35]">{app.tenant?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{app.tenant?.email || 'No email'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-[#0F1E35] font-semibold">
                        R{Number(app.min_budget || 0).toLocaleString()} - R{Number(app.max_budget || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(app.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${pill(app.status)} capitalize`}>
                        {app.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={app.assigned_to || ""}
                        onChange={(e) => handleAssign(app.id, e.target.value)}
                        className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 min-w-[140px]"
                      >
                        <option value="">-- Unassigned --</option>
                        {agents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.full_name || 'Unnamed Agent'}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                      No applications found.
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

export default ApplicationsPage;
