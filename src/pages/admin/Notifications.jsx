import React, { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Send,
  Trash2,
  Filter
} from 'lucide-react'

export default function NotificationsPage() {
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState(null)
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [targetAudience, setTargetAudience] = useState('All')

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      title: 'FICA Verification Queue (4 Pending Landlords)',
      description: 'Ownership title deeds and IDs submitted by Cape Town property managers requiring compliance review.',
      time: '12 min ago',
      category: 'Compliance',
      severity: 'warning'
    },
    {
      id: 2,
      title: 'Instant EFT Settlement Completed (R28,000)',
      description: 'Tenant Zanele Ndlovu settled monthly rent for Sandton Suite 5 via PayFast.',
      time: '45 min ago',
      category: 'Financial',
      severity: 'success'
    },
    {
      id: 3,
      title: 'Lease Expiration in 24 Days (Sea Point Unit 102)',
      description: 'Automated 30-day notice sent to Atlantic Cape Holdings and tenant Naledi Sithole.',
      time: '2 hours ago',
      category: 'Leases',
      severity: 'info'
    },
    {
      id: 4,
      title: 'Disputed Maintenance Claim Escalated',
      description: 'Hatfield student flat plumbing repair quote R2,450 requires landlord sign-off.',
      time: '5 hours ago',
      category: 'Maintenance',
      severity: 'danger'
    }
  ])

  const handleBroadcast = (e) => {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    setToast(`Broadcast dispatched to ${targetAudience} users.`)
    setBroadcastMessage('')
    setTimeout(() => setToast(null), 3000)
  }

  const handleDismiss = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
    setToast('Notification dismissed.')
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = alerts.filter((a) => filter === 'All' || a.category === filter)

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Broadcast Box */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Send size={15} className="text-blue-600" />
          Broadcast System Notice
        </h3>
        <p className="text-slate-400 text-xs mb-3">Send in-app notifications and SMS alerts to platform members</p>

        <form onSubmit={handleBroadcast} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-600 sm:w-48"
            >
              <option value="All">All Platform Users</option>
              <option value="Landlords">All Landlords Only</option>
              <option value="Tenants">All Tenants Only</option>
              <option value="Agents">Registered Agents Only</option>
            </select>

            <input
              type="text"
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Type urgent announcement or system maintenance message…"
              className="flex-1 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
            />

            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex-shrink-0"
            >
              Dispatch Alert
            </button>
          </div>
        </form>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">System Alerts & Notices</h3>
            <p className="text-slate-400 text-xs">{filtered.length} active notifications</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Compliance">Compliance & FICA</option>
              <option value="Financial">Financial Settlements</option>
              <option value="Leases">Lease Milestones</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.length > 0 ? (
            filtered.map((a) => (
              <div
                key={a.id}
                className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {a.severity === 'danger' ? (
                      <ShieldAlert size={16} className="text-rose-600" />
                    ) : a.severity === 'warning' ? (
                      <AlertTriangle size={16} className="text-amber-600" />
                    ) : a.severity === 'success' ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <Bell size={16} className="text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900">{a.title}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">
                        {a.category}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{a.description}</p>
                    <span className="text-[10px] text-slate-400 mt-1.5 block font-mono">{a.time}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(a.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  title="Dismiss notification"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              No active alerts in this category.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
