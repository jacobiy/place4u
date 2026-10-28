import React, { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Menu,
  FileCheck2,
  Mail,
  ArrowRight,
  AlertTriangle
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../utils/Supabase'
import { subscribeToApplicationUpdates } from '../../../services/applicationSync'

export default function AdminTopbar({
  title,
  subtitle,
  onToggleSidebar,
  showSearch = true
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [unassignedApps, setUnassignedApps] = useState([])
  const [rejectedApps, setRejectedApps] = useState([])
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const notificationsRef = useRef(null)

  useEffect(() => {
    const fetchActionItems = () => {
      // Unassigned tenant requests awaiting an agent (preview list, newest first)
      supabase
        .from('applications')
        .select('id, tenant_id, min_budget, max_budget, submitted_at, tenant:users!applications_tenant_id_fkey(full_name, email)')
        .is('assigned_to', null)
        .order('submitted_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          if (data) setUnassignedApps(data)
        })

      // Jobs an agent rejected — the admin needs to reassign them (preview list)
      supabase
        .from('applications')
        .select('id, tenant_id, assigned_to, assignment_status, assignment_rejection_reason, assignment_responded_at, tenant:users!applications_tenant_id_fkey(full_name, email), agent:users!applications_assigned_to_fkey(full_name)')
        .eq('assignment_status', 'rejected')
        .order('assignment_responded_at', { ascending: false })
        .limit(5)
        .then(({ data, error }) => {
          // Ignore if the assignment columns have not been migrated yet
          if (!error && data) setRejectedApps(data)
        })

      // Exact totals — the preview lists above are capped at 5, so the badges
      // must be counted separately or they would understate the backlog.
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .is('assigned_to', null)
        .then(({ count, error }) => {
          if (!error && typeof count === 'number') setUnassignedCount(count)
        })

      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('assignment_status', 'rejected')
        .then(({ count, error }) => {
          if (!error && typeof count === 'number') setRejectedCount(count)
        })
    }

    fetchActionItems()

    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchActionItems()
    })

    return () => unsubscribe()
  }, [])

  // Close the notifications popover on outside click or Escape
  useEffect(() => {
    if (!showNotifications) return
    const handlePointerDown = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowNotifications(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showNotifications])

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-slate-900 font-bold text-base tracking-tight leading-tight">{title}</h1>
          <p className="text-slate-400 text-[11px] leading-tight hidden sm:block">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Support contact */}
        <p className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
          <Mail size={13} className="text-slate-400" />
          <span>Questions? Email us:</span>
          <a
            href="mailto:support@place4u.xyz"
            className="font-semibold text-slate-700 hover:text-blue-600 transition-colors"
          >
            support@place4u.xyz
          </a>
        </p>

        {/* Notifications Popover for Unassigned Applications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/80 transition-colors"
            aria-label="View notifications"
          >
            <Bell size={16} />
            {unassignedCount + rejectedCount > 0 && (
              <span
                className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full ring-2 ring-white text-[9px] font-bold text-white flex items-center justify-center ${
                  rejectedCount > 0 ? 'bg-red-500' : 'bg-amber-500'
                }`}
              >
                {unassignedCount + rejectedCount > 9 ? '9+' : unassignedCount + rejectedCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-slate-900">Application Action Items</h4>
                  {rejectedCount > 0 && (
                    <span className="bg-red-50 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {rejectedCount} to reassign
                    </span>
                  )}
                  {unassignedCount > 0 && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unassignedCount} pending agent
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto my-1">
                {rejectedApps.length > 0 && (
                  <>
                    {rejectedApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 text-xs flex items-start gap-3 hover:bg-red-50 rounded-lg transition-colors bg-red-50/40"
                      >
                        <div className="mt-0.5 flex-shrink-0 text-red-600">
                          <AlertTriangle size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 leading-tight">
                            Job rejected — reassignment needed
                          </p>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                            {app.agent?.full_name || 'An agent'} declined{' '}
                            {app.tenant?.full_name || "a tenant's"}'s application.
                            {app.assignment_rejection_reason ? ` “${app.assignment_rejection_reason}”` : ''}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                            ID: {String(app.id).slice(0, 8)}…
                          </span>
                        </div>
                        <Link
                          to="/admin/applications"
                          onClick={() => setShowNotifications(false)}
                          className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-700 whitespace-nowrap"
                        >
                          Reassign <ArrowRight size={11} />
                        </Link>
                      </div>
                    ))}
                    {unassignedApps.length > 0 && (
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Unassigned Requests
                      </div>
                    )}
                  </>
                )}
                {unassignedApps.length > 0 ? (
                  unassignedApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 text-xs flex items-start gap-3 hover:bg-slate-50 rounded-lg transition-colors bg-amber-50/30"
                    >
                      <div className="mt-0.5 flex-shrink-0 text-amber-600">
                        <FileCheck2 size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 leading-tight">
                          Unassigned Tenant Request
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                          {app.tenant?.full_name || 'Tenant'} submitted an application awaiting agent allocation.
                        </p>
                        <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                          ID: {app.id.slice(0, 8)}…
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  rejectedApps.length === 0 && (
                    <p className="p-4 text-center text-xs text-slate-400">
                      No pending application action items at this time.
                    </p>
                  )
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-center">
                <Link
                  to="/admin/applications"
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Go to Applications Desk <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Super Admin Status Pill */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0F1E35] to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            SA
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">Administrator</p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
