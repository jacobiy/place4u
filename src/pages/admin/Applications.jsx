import React, { useEffect, useMemo, useState } from 'react'
import {
  getAdminApplications,
  getAgentsList,
  assignAgentToApplication,
  updateApplicationStatus,
  formatCurrency,
  formatDate,
  openGmail
} from './db/queries'
import {
  subscribeToApplicationUpdates,
  broadcastApplicationUpdate
} from '../../services/applicationSync'
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  UserCheck,
  AlertCircle,
  FileCheck2,
  Calendar,
  X
} from 'lucide-react'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [agentFilter, setAgentFilter] = useState('All')
  const [toast, setToast] = useState(null)
  const [selectedApp, setSelectedApp] = useState(null)

  useEffect(() => {
    fetchData()

    // Real-time synchronization listener across dashboards
    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchData()
    })
    return () => unsubscribe()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [appsData, agentsData] = await Promise.all([
      getAdminApplications(),
      getAgentsList()
    ])
    setApplications(appsData || [])
    setAgents(agentsData || [])
    setLoading(false)
  }

  const handleAssign = async (appId, agentId) => {
    try {
      await assignAgentToApplication(appId, agentId)
      const targetAgent = agents.find((a) => a.id === agentId)
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === appId) {
            return {
              ...app,
              assigned_to: agentId || null,
              status: agentId ? 'under_review' : 'submitted',
              agent: targetAgent || null
            }
          }
          return app
        })
      )

      // Broadcast update across all dashboards (Agent, Tenant, Landlord)
      broadcastApplicationUpdate(appId, agentId ? 'under_review' : 'submitted', {
        assigned_to: agentId || null,
        agent: targetAgent || null
      })

      setToast(agentId ? `Assigned to ${targetAgent?.full_name}` : 'Unassigned application')
    } catch (err) {
      setToast(`Failed to assign agent: ${err.message}`)
    }
    setTimeout(() => setToast(null), 3500)
  }

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus)
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app))
      )

      // Broadcast status update across all dashboards
      broadcastApplicationUpdate(appId, newStatus)

      setToast(`Status updated to ${newStatus.replace('_', ' ')}`)
    } catch (err) {
      setToast(`Failed to update status: ${err.message}`)
    }
    setTimeout(() => setToast(null), 3500)
  }

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const tenantName = app.tenant?.full_name || ''
      const tenantEmail = app.tenant?.email || ''
      const agentName = app.agent?.full_name || ''
      const areas = Array.isArray(app.preferred_areas) ? app.preferred_areas.join(' ') : ''
      const haystack = `${tenantName} ${tenantEmail} ${agentName} ${areas} ${app.id}`.toLowerCase()

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'All' || app.status === statusFilter
      const matchesAgent =
        agentFilter === 'All'
          ? true
          : agentFilter === 'Unassigned'
            ? !app.assigned_to
            : app.assigned_to === agentFilter

      return matchesQuery && matchesStatus && matchesAgent
    })
  }, [applications, query, statusFilter, agentFilter])

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tenant Applications Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Process tenant search applications, assign licensed agents, and communicate via Gmail
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors self-start sm:self-auto"
        >
          Refresh Live List
        </button>
      </section>

      {/* Filters and Search Bar */}
      <section className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tenant name, email, area…"
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 w-64 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>

            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Agent Allocations</option>
              <option value="Unassigned">Unassigned Only</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.full_name}
                </option>
              ))}
            </select>

            <span className="text-slate-400 text-xs ml-auto">
              {filtered.length} application{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Applications List */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-slate-400 text-xs">Loading real applications from database…</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="text-left px-5 py-3">Application ID</th>
                  <th className="text-left px-4 py-3">Tenant Details</th>
                  <th className="text-left px-4 py-3">Preferred Areas & Type</th>
                  <th className="text-left px-4 py-3">Budget Range</th>
                  <th className="text-left px-4 py-3">Submission Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Assign Agent</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const tenantName = app.tenant?.full_name || 'Tenant'
                  const tenantEmail = app.tenant?.email || ''
                  const tenantPhone = app.tenant?.phone || 'No phone'
                  const agentName = app.agent?.full_name || 'Unassigned'
                  const agentEmail = app.agent?.email || ''
                  const areas = Array.isArray(app.preferred_areas) ? app.preferred_areas.join(', ') : 'Any area'
                  const types = Array.isArray(app.preferred_types) ? app.preferred_types.join(', ') : 'Any'

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-blue-600">
                        <div>{app.id.slice(0, 8)}…</div>
                        <span className="text-[10px] text-slate-400">{app.lease_duration_months || 12} mo</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{tenantName}</p>
                        <p className="text-[10px] text-slate-400">{tenantEmail || tenantPhone}</p>
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-medium text-slate-800 truncate">{areas}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          Type: {types} {app.special_requirements ? `· "${app.special_requirements}"` : ''}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                        {formatCurrency(app.min_budget)} – {formatCurrency(app.max_budget)}
                      </td>

                      <td className="px-4 py-3.5 text-slate-500">
                        <div>{formatDate(app.submitted_at)}</div>
                        <span className="text-[10px] text-slate-400">
                          Move-in: {formatDate(app.move_in_date)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={app.status || 'submitted'}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors ${
                            app.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : app.status === 'under_review'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : app.status === 'expired'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="submitted">Submitted</option>
                          <option value="under_review">Under Review</option>
                          <option value="completed">Completed</option>
                          <option value="expired">Expired</option>
                        </select>
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={app.assigned_to || ''}
                          onChange={(e) => handleAssign(app.id, e.target.value)}
                          className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600 max-w-[150px]"
                        >
                          <option value="">-- Unassigned --</option>
                          {agents.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.full_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tenantEmail && (
                            <button
                              onClick={() =>
                                openGmail(
                                  tenantEmail,
                                  `Place4U Application Status [${app.id.slice(0, 8)}]`,
                                  `Hi ${tenantName},\n\nWe are processing your rental application for ${areas}.\nYour assigned agent: ${agentName}.\n\nBest regards,\nPlace4U Team`
                                )
                              }
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1"
                              title="Email Tenant via Gmail"
                            >
                              <Mail size={12} className="text-red-500" />
                              Tenant
                            </button>
                          )}

                          {agentEmail && (
                            <button
                              onClick={() =>
                                openGmail(
                                  agentEmail,
                                  `Assigned Application: ${tenantName} [${app.id.slice(0, 8)}]`,
                                  `Hi ${agentName},\n\nPlease review application ${app.id}.\nTenant: ${tenantName} (${tenantPhone})\nRequirements: ${app.special_requirements || 'None'}\n\nPlace4U Admin`
                                )
                              }
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] inline-flex items-center gap-1"
                              title="Email Agent via Gmail"
                            >
                              <Mail size={12} className="text-blue-600" />
                              Agent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
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
  )
}
