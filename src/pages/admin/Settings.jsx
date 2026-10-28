import React, { useState } from 'react'
import {
  Save,
  CheckCircle2,
  Mail,
  FileCheck2
} from 'lucide-react'
import { openEmailClient } from './db/queries'

export default function SettingsPage() {
  const [adminEmail, setAdminEmail] = useState('support@place4u.xyz')
  const [appFee, setAppFee] = useState('100')
  const [notifyOnNewApp, setNotifyOnNewApp] = useState(true)
  const [toast, setToast] = useState(null)

  const handleSave = (e) => {
    e.preventDefault()
    setToast('Application processing configuration saved.')
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Application & Dispatch Settings</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Configure application processing rules and email communication defaults
          </p>
        </div>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <Save size={14} />
          Save Settings
        </button>
      </div>

      <div className="space-y-5">
        {/* Section 1: Application Fee & Processing */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 size={16} className="text-blue-600" />
            Application Fee & Placement Rules
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Tenant Application Assistance Fee (ZAR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500">R</span>
                <input
                  type="number"
                  value={appFee}
                  onChange={(e) => setAppFee(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 font-mono text-xs"
                />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Set in application intake flow</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Operations Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Receives agent assignment confirmations</span>
            </div>
          </div>
        </div>

        {/* Section 2: Email Communication Channels */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Mail size={16} className="text-blue-600" />
            Email Communications
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">Open your mail client</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Composes a prefilled email — with tenant applicant and agent details — in whichever mail app the
                  operator already uses. No webmail provider is assumed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEmailClient(adminEmail, 'Place4U Admin Test', 'Testing the email link.')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition-colors flex-shrink-0"
              >
                <Mail size={13} />
                Test Email Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
