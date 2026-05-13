import React from 'react'
import { Search, Bell } from 'lucide-react'

const AdminTopbar = ({ title, subtitle, showSearch = true, rightActions }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-[#0F1E35] font-bold text-lg">{title}</h1>
        <p className="text-slate-500 text-xs">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {showSearch ? (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users, properties..."
              className="pl-9 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-[#0F1E35] placeholder-slate-400 w-64 focus:outline-none focus:border-blue-600"
            />
          </div>
        ) : null}

        {rightActions ?? (
          <>
            <button
              type="button"
              className="relative w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              aria-label="Notifications"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              SA
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default AdminTopbar

