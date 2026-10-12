import React, { useEffect, useState } from 'react'
import {
  Search,
  Bell,
  Menu,
  X,
  FileCheck2,
  Mail,
  ArrowRight,
  ExternalLink
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../utils/Supabase'
import { openGmail } from '../db/queries'
import { subscribeToApplicationUpdates } from '../../../services/applicationSync'

export default function AdminTopbar({
  title,
  subtitle,
  onToggleSidebar,
  showSearch = true
}) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [unassignedApps, setUnassignedApps] = useState([])

  useEffect(() => {
    const fetchUnassigned = () => {
      supabase
        .from('applications')
        .select('id, tenant_id, min_budget, max_budget, submitted_at, tenant:users!applications_tenant_id_fkey(full_name, email)')
        .is('assigned_to', null)
        .limit(5)
        .then(({ data }) => {
          if (data) setUnassignedApps(data)
        })
    }

    fetchUnassigned()

    const unsubscribe = subscribeToApplicationUpdates(() => {
      fetchUnassigned()
    })

    return () => unsubscribe()
  }, [])

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
        {/* Quick Gmail Button */}
        <button
          onClick={() => openGmail('admin@place4u.co.za', 'Place4U Operations', 'Hi team,')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/60 text-xs font-semibold transition-colors"
          title="Compose Email via Gmail"
        >
          <Mail size={13} className="text-red-500" />
          Gmail
        </button>

        {/* Notifications Popover for Unassigned Applications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/80 transition-colors"
            aria-label="View notifications"
          >
            <Bell size={16} />
            {unassignedApps.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-xs text-slate-900">Application Action Items</h4>
                  {unassignedApps.length > 0 && (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unassignedApps.length} pending agent
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

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto my-1">
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
                  <p className="p-4 text-center text-xs text-slate-400">
                    No pending unassigned applications at this time.
                  </p>
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
