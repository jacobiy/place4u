import React, { useEffect, useMemo, useState } from 'react'
import {
  getAdminApplications,
  getAgentsList,
  assignAgentToApplication,
  updateApplicationStatus,
  approveApplicationCompletion,
  getApplicationsNeedingReassignment,
  formatCurrency,
  formatDate,
  openGmail
} from './db/queries'
import {
  subscribeToApplicationUpdates,
  broadcastApplicationUpdate
} from '../../services/applicationSync'
import {
  SELECTABLE_APPLICATION_STATUSES,
  applicationStatusLabel,
  getApplicationStatusMeta,
  normalizeApplicationStatus
} from '../../services/applicationStatus'
import {
  Search,
  CheckCircle2,
  Clock,
  Mail,
  AlertCircle
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
  const [reassignQueue, setReassignQueue] = useState([])
  const [needsReassignOnly, setNeedsReassignOnly] = useState(false)
  const [completionOnly, setCompletionOnly] = useState(false)

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
    const [appsData, agentsData, queueData] = await Promise.all([
      getAdminApplications(),
      getAgentsList(),
      getApplicationsNeedingReassignment()
    ])
    setApplications(appsData || [])
    setAgents(agentsData || [])
    setReassignQueue(queueData || [])
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
              // Reassignment resets the previous agent's Accept/Reject response
              assignment_status: agentId ? 'assigned' : 'unassigned',
              assignment_responded_at: null,
              assignment_rejection_reason: null,
              agent: targetAgent || null
            }
          }
          return app
        })
      )

      // Any rejection for this job is resolved by the reassignment
      setReassignQueue((prev) => prev.filter((item) => item.id !== appId))

      // Broadcast update across all dashboards (Agent, Tenant, Landlord)
      broadcastApplicationUpdate(appId, agentId ? 'under_review' : 'submitted', {
        assigned_to: agentId || null,
        assignment_status: agentId ? 'assigned' : 'unassigned',
        assignment_responded_at: null,
        assignment_rejection_reason: null,
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

      setToast(`Status updated to ${applicationStatusLabel(newStatus)}`)
    } catch (err) {
      setToast(`Failed to update status: ${err.message}`)
    }
    setTimeout(() => setToast(null), 3500)
  }

  const handleApproveCompletion = async (appId) => {
    try {
      await approveApplicationCompletion(appId)
      const nowIso = new Date().toISOString()
      setApplications((prev) =>
        prev.map((app) =>
          app.id === appId
            ? { ...app, status: 'completed', completion_approved_at: nowIso }
            : app
        )
      )

      broadcastApplicationUpdate(appId, 'completed', { completion_approved_at: nowIso })
      setToast('Application approved as Completed! Agent 50% commission unlocked.')
    } catch (err) {
      setToast(`Failed to approve completion: ${err.message}`)
    }
    setTimeout(() => setToast(null), 3500)
  }

  const completionQueue = useMemo(
    () => applications.filter((a) => a.completion_requested_at && a.status !== 'completed'),
    [applications]
  )

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      const tenantName = app.tenant?.full_name || ''
      const tenantEmail = app.tenant?.email || ''
      const agentName = app.agent?.full_name || ''
      const areas = Array.isArray(app.preferred_areas) ? app.preferred_areas.join(' ') : ''
      const haystack = `${tenantName} ${tenantEmail} ${agentName} ${areas} ${app.id}`.toLowerCase()

      const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'All' || normalizeApplicationStatus(app.status) === statusFilter
      const matchesAgent =
        agentFilter === 'All'
          ? true
          : agentFilter === 'Unassigned'
            ? !app.assigned_to
            : app.assigned_to === agentFilter

      const matchesReassign = !needsReassignOnly || app.assignment_status === 'rejected'
      const matchesCompletion = !completionOnly || (app.completion_requested_at && app.status !== 'completed')

      return matchesQuery && matchesStatus && matchesAgent && matchesReassign && matchesCompletion
    })
  }, [applications, query, statusFilter, agentFilter, needsReassignOnly, completionOnly])

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

      {/* Agent rejection alerts — jobs needing reassignment */}
      {reassignQueue.length > 0 && (
        <section className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-red-800">
                {reassignQueue.length} assigned job{reassignQueue.length === 1 ? '' : 's'} rejected by
                agent{reassignQueue.length === 1 ? '' : 's'} — needs reassignment
              </h3>
              <p className="text-[11px] text-red-600 mt-0.5">
                These agents declined the job. Assign a different agent to keep the tenant application
                moving.
              </p>
              <ul className="mt-3 space-y-1.5">
                {reassignQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-red-900 bg-white/70 border border-red-100 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="font-mono text-red-500">#{String(item.id).slice(0, 8)}</span>
                    <span className="font-semibold">{item.tenant?.full_name || 'Tenant'}</span>
                    <span className="text-red-300">·</span>
                    <span>
                      declined by <strong>{item.agent?.full_name || 'agent'}</strong>
                    </span>
                    {item.assignment_rejection_reason && (
                      <>
                        <span className="text-red-300">·</span>
                        <span className="italic">“{item.assignment_rejection_reason}”</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setNeedsReassignOnly((v) => !v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                needsReassignOnly
                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
                  : 'bg-white text-red-700 border-red-300 hover:bg-red-100'
              }`}
            >
              {needsReassignOnly ? 'Show all applications' : 'Show rejected only'}
            </button>
          </div>
        </section>
      )}

      {/* Agent completion request alerts — jobs waiting for admin completion approval */}
      {completionQueue.length > 0 && (
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-amber-900">
                {completionQueue.length} job{completionQueue.length === 1 ? '' : 's'} awaiting completion approval
              </h3>
              <p className="text-[11px] text-amber-700 mt-0.5">
                The assigned agent has requested sign-off for completed tenant placement. Approving marks the job completed and unlocks their 50% commission (R50.00).
              </p>
              <ul className="mt-3 space-y-1.5">
                {completionQueue.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-950 bg-white/80 border border-amber-100 rounded-lg px-2.5 py-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-amber-600">#{String(item.id).slice(0, 8)}</span>
                      <span className="font-semibold">{item.tenant?.full_name || 'Tenant'}</span>
                      <span className="text-amber-300">·</span>
                      <span>Agent: <strong>{item.agent?.full_name || 'Assigned Agent'}</strong></span>
                      {item.completion_request_note && (
                        <>
                          <span className="text-amber-300">·</span>
                          <span className="italic text-slate-600">&ldquo;{item.completion_request_note}&rdquo;</span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApproveCompletion(item.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg shadow-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={12} />
                      Approve Job Completed
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setCompletionOnly((v) => !v)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                completionOnly
                  ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                  : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              {completionOnly ? 'Show all applications' : 'Filter requested only'}
            </button>
          </div>
        </section>
      )}

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
            {completionQueue.length > 0 && (
              <button
                type="button"
                onClick={() => setCompletionOnly((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  completionOnly
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Clock size={12} />
                {completionQueue.length} Awaiting Approval
              </button>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Statuses</option>
              {SELECTABLE_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>{applicationStatusLabel(s)}</option>
              ))}
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
                    <tr
                      key={app.id}
                      className={`transition-colors ${
                        app.assignment_status === 'rejected'
                          ? 'bg-red-50/40 hover:bg-red-50/70'
                          : 'hover:bg-slate-50/70'
                      }`}
                    >
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
                          className={`text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors ${getApplicationStatusMeta(app.status).tailwind}`}
                        >
                          {SELECTABLE_APPLICATION_STATUSES.map((s) => (
                            <option key={s} value={s}>{applicationStatusLabel(s)}</option>
                          ))}
                        </select>

                        {app.completion_requested_at && app.status !== 'completed' && (
                          <div className="mt-1.5 flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <Clock size={10} /> Completion Requested
                            </span>
                            {app.completion_request_note && (
                              <p className="text-[10px] text-slate-500 italic truncate max-w-[150px]" title={app.completion_request_note}>
                                &ldquo;{app.completion_request_note}&rdquo;
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleApproveCompletion(app.id)}
                              className="inline-flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-2 py-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 size={11} /> Approve Completed
                            </button>
                          </div>
                        )}
                        {app.completion_approved_at && app.status === 'completed' && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              <CheckCircle2 size={9} /> Approved by Admin
                            </span>
                          </div>
                        )}
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

                        {app.assigned_to && (
                          <div className="mt-1.5">
                            {app.assignment_status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <CheckCircle2 size={10} /> Accepted
                              </span>
                            ) : app.assignment_status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                                <AlertCircle size={10} /> Rejected — reassign
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                <Clock size={10} /> Awaiting response
                              </span>
                            )}
                          </div>
                        )}
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
