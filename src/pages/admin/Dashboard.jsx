import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Loading from '../../component/loading'
import {
  FileCheck2,
  Users,
  Building2,
  Clock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mail,
  ChevronRight,
  ShieldCheck,
  MapPin,
  CreditCard
} from 'lucide-react'
import {
  getAdminDashboardData,
  assignAgentToApplication,
  updateApplicationStatus,
  formatCurrency,
  formatDate,
  openEmailClient
} from './db/queries'
import {
  subscribeToApplicationUpdates,
  broadcastApplicationUpdate
} from '../../services/applicationSync'
import {
  APPLICATION_STATUS,
  SELECTABLE_APPLICATION_STATUSES,
  applicationStatusLabel,
  getApplicationStatusMeta,
  normalizeApplicationStatus
} from '../../services/applicationStatus'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState(null)
  const [toast, setToast] = useState(null)
  const [appFilter, setAppFilter] = useState('all') // 'all' | 'unassigned' | 'under_review' | 'completed' | 'expired'

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await getAdminDashboardData()
      setData(res)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()

    // Stay in lock-step with every other dashboard (agent status changes,
    // landlord approvals, tenant withdrawals) instead of only loading once.
    const unsubscribe = subscribeToApplicationUpdates(() => {
      loadData()
    })
    return () => unsubscribe()
  }, [])

  const stats = data?.stats ?? {
    totalUsers: 0,
    totalLandlords: 0,
    totalTenants: 0,
    totalAgents: 0,
    totalProperties: 0,
    activeProperties: 0,
    totalApplications: 0,
    unassignedApplications: 0,
    assignedApplications: 0,
    underReviewApplications: 0,
    submittedApplications: 0,
    matchesFoundApplications: 0,
    completedApplications: 0,
    expiredApplications: 0,
    cancelledApplications: 0,
    rejectedApplications: 0,
    rejectedAssignments: 0,
    acceptedAssignments: 0,
    unverifiedUsersCount: 0
  }

  const agents = data?.agents ?? []
  // Use the full application list so the desk filters and the per-agent workload
  // counts reflect every application, not only the 10 most recent.
  const applications = data?.applications ?? data?.recentApplications ?? []
  const properties = data?.recentProperties ?? []
  const users = data?.recentUsers ?? []

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus)
      setToast(`Application status updated to ${applicationStatusLabel(newStatus).toLowerCase()}.`)
      // Broadcast so the agent, tenant and landlord dashboards update instantly.
      broadcastApplicationUpdate(appId, newStatus)
      loadData()
    } catch (err) {
      setToast(`Failed to update status: ${err.message}`)
    }
    setTimeout(() => setToast(null), 4000)
  }

  const handleAssignAgent = async (appId, targetAgentId) => {
    try {
      await assignAgentToApplication(appId, targetAgentId || null)
      const name = agents.find((a) => a.id === targetAgentId)?.full_name || 'Unassigned'
      setToast(`Assigned application to ${name}`)
      broadcastApplicationUpdate(
        appId,
        targetAgentId ? APPLICATION_STATUS.UNDER_REVIEW : APPLICATION_STATUS.SUBMITTED,
        {
          assigned_to: targetAgentId || null,
          assignment_status: targetAgentId ? 'assigned' : 'unassigned',
          assignment_responded_at: null,
          assignment_rejection_reason: null
        }
      )
      loadData()
    } catch (err) {
      setToast(`Error: ${err.message}`)
    }
    setTimeout(() => setToast(null), 4000)
  }

  const filteredApps = applications.filter((app) => {
    const status = normalizeApplicationStatus(app.status)
    if (appFilter === 'unassigned') return !app.assigned_to
    if (appFilter === 'rejected') return app.assignment_status === 'rejected'
    if (appFilter === 'under_review') return status === 'under_review'
    if (appFilter === 'matches_found') return status === 'matches_found'
    if (appFilter === 'completed') return status === 'completed'
    if (appFilter === 'expired') return status === 'expired'
    return true
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loading message="Connecting to live database & loading real applications..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F1E35] via-[#132847] to-[#1A365D] rounded-2xl p-6 text-white shadow-sm border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Database Active
              </span>
              <span className="text-slate-400 text-xs">Place4U Application Processing Center</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Application & Placement Management</h1>
            <p className="text-slate-300 text-xs mt-1 max-w-2xl leading-relaxed">
              Process incoming tenant applications, delegate files to licensed agents, and manage communication by email.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-colors"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing…' : 'Sync Live Data'}
            </button>

            <Link
              to="/admin/agent-applications"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <ShieldCheck size={13} />
              Agent Applications
            </Link>

            <Link
              to="/admin/landlord-applications"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Building2 size={13} />
              Landlord Applications
            </Link>

            <Link
              to="/admin/payments"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <CreditCard size={13} />
              Release Payments & Refunds
            </Link>

            <p className="inline-flex items-center gap-1.5 text-xs text-slate-300">
              <Mail size={13} className="text-slate-400" />
              Questions? Email us:
              <a
                href="mailto:support@place4u.xyz"
                className="font-semibold text-white hover:text-blue-300 transition-colors"
              >
                support@place4u.xyz
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Real Metrics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Total Applications */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Total Applications</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalApplications}</p>
          <div className="text-[10px] text-slate-400 mt-1">
            Submitted by registered tenants
          </div>
        </div>

        {/* Metric 2: Unassigned + Agent-rejected (action required) */}
        <div className={`rounded-xl border p-4 shadow-xs ${
          stats.rejectedAssignments > 0
            ? 'bg-red-50/60 border-red-200'
            : stats.unassignedApplications > 0
              ? 'bg-amber-50/50 border-amber-200'
              : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${
              stats.rejectedAssignments > 0 ? 'text-red-800' : 'text-amber-800'
            }`}>Needs Agent</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              stats.rejectedAssignments > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              !
            </div>
          </div>
          <p className={`text-2xl font-bold ${stats.rejectedAssignments > 0 ? 'text-red-700' : 'text-amber-900'}`}>
            {stats.unassignedApplications}
          </p>
          <div className={`text-[10px] mt-1 font-semibold ${
            stats.rejectedAssignments > 0 ? 'text-red-600' : 'text-amber-700'
          }`}>
            {stats.rejectedAssignments > 0
              ? `${stats.rejectedAssignments} rejected — reassign now`
              : stats.unassignedApplications > 0
                ? 'Urgent: Assign to agent'
                : 'All applications assigned'}
          </div>
        </div>

        {/* Metric 3: Under Review / Assigned */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Under Review</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.underReviewApplications}</p>
          <div className="text-[10px] text-slate-400 mt-1">
            Active agent placement work
          </div>
        </div>

        {/* Metric 4: Completed Placements */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{stats.completedApplications}</p>
          <div className="text-[10px] text-slate-400 mt-1">
            Successfully concluded files
          </div>
        </div>

        {/* Metric 5: Active Properties */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Live Properties</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats.activeProperties}
            <span className="text-xs font-normal text-slate-400 ml-1">/ {stats.totalProperties}</span>
          </p>
          <div className="text-[10px] text-slate-400 mt-1">
            Available on platform
          </div>
        </div>

        {/* Metric 6: Real Platform Users */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Platform Users</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.totalUsers}</p>
          <div className="text-[10px] text-slate-500 mt-1">
            <span className="font-semibold text-slate-800">{stats.totalLandlords}</span> LL ·{' '}
            <span className="font-semibold text-slate-800">{stats.totalTenants}</span> Ten ·{' '}
            <span className="font-semibold text-slate-800">{stats.totalAgents}</span> Ag
          </div>
        </div>
      </div>

      {/* Main Core Section: Application Processing Desk */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900 font-bold text-base">Application Processing Desk</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                Real-Time
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Assign specific tenant search applications to licensed estate agents and update processing states
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setAppFilter('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({applications.length})
            </button>
            <button
              onClick={() => setAppFilter('unassigned')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'unassigned' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Unassigned ({stats.unassignedApplications})
            </button>
            {stats.rejectedAssignments > 0 && (
              <button
                onClick={() => setAppFilter('rejected')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  appFilter === 'rejected' ? 'bg-white text-red-700 shadow-xs' : 'text-red-500 hover:text-red-700'
                }`}
              >
                Needs Reassign ({stats.rejectedAssignments})
              </button>
            )}
            <button
              onClick={() => setAppFilter('under_review')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'under_review' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Under Review ({stats.underReviewApplications})
            </button>
            <button
              onClick={() => setAppFilter('matches_found')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'matches_found' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Matches ({stats.matchesFoundApplications})
            </button>
            <button
              onClick={() => setAppFilter('completed')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'completed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Completed ({stats.completedApplications})
            </button>
            <button
              onClick={() => setAppFilter('expired')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                appFilter === 'expired' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Expired ({stats.expiredApplications})
            </button>
          </div>
        </div>

        {/* Real Applications Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="text-left px-5 py-3">Application ID</th>
                <th className="text-left px-4 py-3">Tenant Applicant</th>
                <th className="text-left px-4 py-3">Preferences & Requirements</th>
                <th className="text-left px-4 py-3">Budget Range</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Assigned Agent</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-5 py-3">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApps.length > 0 ? (
                filteredApps.map((app) => {
                  const tenantName = app.tenant?.full_name || 'Tenant'
                  const tenantEmail = app.tenant?.email || ''
                  const tenantPhone = app.tenant?.phone || 'No phone'
                  const agentName = app.agent?.full_name || 'Unassigned'
                  const agentEmail = app.agent?.email || ''
                  const areas = Array.isArray(app.preferred_areas) ? app.preferred_areas.join(', ') : 'Any area'
                  const types = Array.isArray(app.preferred_types) ? app.preferred_types.join(', ') : 'Any'

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-blue-600">
                        <div>{app.id.slice(0, 8)}…</div>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {app.lease_duration_months ? `${app.lease_duration_months} mo lease` : 'Standard'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{tenantName}</p>
                        <p className="text-[10px] text-slate-400">{tenantEmail || tenantPhone}</p>
                      </td>

                      <td className="px-4 py-3.5 max-w-[220px]">
                        <div className="flex items-center gap-1 text-slate-800 font-medium">
                          <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">{areas}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
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
                        <div className="flex flex-col items-start gap-1.5">
                          <select
                            value={app.assigned_to || ''}
                            onChange={(e) => handleAssignAgent(app.id, e.target.value || null)}
                            className="bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-600"
                          >
                            <option value="">-- Assign Agent --</option>
                            {agents.map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.full_name} ({ag.email})
                              </option>
                            ))}
                          </select>

                          {app.assigned_to && (
                            app.assignment_status === 'accepted' ? (
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
                            )
                          )}
                        </div>
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
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {tenantEmail && (
                            <button
                              onClick={() =>
                                openEmailClient(
                                  tenantEmail,
                                  `Place4U Application Update [${app.id.slice(0, 8)}]`,
                                  `Hi ${tenantName},\n\nRegarding your rental search application in ${areas} (Budget: R${app.min_budget} - R${app.max_budget}):\n\nYour assigned agent is ${agentName}.\n\nBest regards,\nPlace4U Admin`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                              title="Email tenant"
                            >
                              <Mail size={12} className="text-red-500" />
                              Tenant
                            </button>
                          )}

                          {agentEmail && (
                            <button
                              onClick={() =>
                                openEmailClient(
                                  agentEmail,
                                  `Place4U Application Assignment: ${tenantName} [${app.id.slice(0, 8)}]`,
                                  `Hi ${agentName},\n\nYou have been assigned tenant application ${app.id}.\nApplicant: ${tenantName} (${tenantPhone})\nPreferred Areas: ${areas}\nBudget: R${app.min_budget} - R${app.max_budget}\nSpecial requirements: ${app.special_requirements || 'None'}\n\nPlease proceed with placement.\n\nPlace4U Admin`
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                              title="Email agent"
                            >
                              <Mail size={12} className="text-blue-600" />
                              Agent
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    No applications currently match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Two Column Grid: Agents Team Workload & Live Properties Portfolio */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left 6 cols: Real Agents Workload */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-900 font-bold text-sm">Real Estate Agents & Workload</h3>
              <p className="text-slate-400 text-xs mt-0.5">Assigned licensed agents processing tenant requests</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">{agents.length} active agents</span>
          </div>

          <div className="space-y-3">
            {agents.length > 0 ? (
              agents.map((ag) => {
                const assignedCount = applications.filter((a) => a.assigned_to === ag.id).length
                return (
                  <div key={ag.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {ag.full_name?.slice(0, 2).toUpperCase() || 'AG'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{ag.full_name}</p>
                        <p className="text-[11px] text-slate-400">{ag.email} · {ag.phone || 'No phone'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {assignedCount} Assigned {assignedCount === 1 ? 'App' : 'Apps'}
                      </span>
                      <button
                        onClick={() => openEmailClient(ag.email, 'Place4U Agent Operations Check-in', `Hi ${ag.full_name},\n\nPlease provide an update on your assigned applications.`)}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors"
                        title="Email agent"
                      >
                        <Mail size={13} />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-slate-400 text-xs py-4 text-center">No agent accounts found in the database.</p>
            )}
          </div>
        </div>

        {/* Right 6 cols: Real Properties from Supabase */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-slate-900 font-bold text-sm">Live Properties Portfolio</h3>
              <p className="text-slate-400 text-xs mt-0.5">Real property inventory registered in database</p>
            </div>
            <a href="/admin/properties" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              All properties <ChevronRight size={13} />
            </a>
          </div>

          <div className="space-y-3">
            {properties.length > 0 ? (
              properties.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {p.image_urls && p.image_urls[0] ? (
                        <img src={p.image_urls[0]} alt={p.address} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-xs max-w-[200px] truncate">{p.address}</p>
                      <p className="text-[11px] text-slate-400">
                        {p.city} · {p.bedrooms} bed, {p.bathrooms} bath · {p.landlord?.full_name || 'Landlord'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {formatCurrency(p.price)}/mo
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-xs py-4 text-center">No property records in database.</p>
            )}
          </div>
        </div>
      </div>

      {/* Real Users Directory Snapshot */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-slate-900 font-bold text-sm">Registered Platform Members</h3>
            <p className="text-slate-400 text-xs mt-0.5">Real user accounts from Supabase users table</p>
          </div>
          <a href="/admin/users" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Manage users <ChevronRight size={13} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {users.map((u) => (
            <div key={u.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-xs truncate">{u.full_name || 'User'}</p>
                <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[10px] font-semibold capitalize ${
                  u.user_type === 'landlord'
                    ? 'bg-emerald-50 text-emerald-700'
                    : u.user_type === 'agent'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-blue-50 text-blue-700'
                }`}>
                  {u.user_type}
                </span>
              </div>
              <button
                onClick={() => openEmailClient(u.email, 'Place4U Account Notice', `Hi ${u.full_name},\n\nRegarding your Place4U account:`)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-red-600 transition-colors flex-shrink-0"
                title="Email user"
              >
                <Mail size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
