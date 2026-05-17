import React from 'react'
import { FileText, Home, Heart, Search } from 'lucide-react'
import { PROPERTIES } from '../Data/constants'

export default function DashboardView({ onPropertyClick, onApplyClick, onOpenCustomApplication }) {
  const stats = [
    { label: 'Applications', value: 0, icon: FileText, color: 'from-blue-500/20 to-purple-500/20' },
    { label: 'Available Properties', value: PROPERTIES.length, icon: Home, color: 'from-emerald-500/20 to-teal-500/20' },
    { label: 'Matches', value: 0, icon: Heart, color: 'from-rose-500/20 to-orange-500/20' }
  ]

  return (
    <div className="space-y-8 pb-12">
      <header>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-white/40">Track your applications, saved homes, and messages.</p>
          </div>
          <button
            type="button"
            onClick={onOpenCustomApplication}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition-colors text-sm font-bold shadow-lg shadow-blue-600/20"
          >
            Submit Application
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-gradient p-6 rounded-3xl relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-50`} />
            <div className="relative z-10 flex items-center gap-4">
              <div className="p-3 bg-white/5 rounded-2xl">
                <stat.icon className="text-white/80" size={24} />
              </div>
              <div>
                <span className="text-white/40 text-sm font-medium">{stat.label}</span>
                <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Properties</h2>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
              <input
                type="text"
                placeholder="Search"
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 outline-none focus:border-blue-500 transition-all text-sm w-64"
              />
            </div>
            <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none cursor-pointer">
              <option>All Properties</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROPERTIES.map((property) => (
            <div
              key={property.id}
              className="glass rounded-3xl overflow-hidden group cursor-pointer hover:border-blue-500/50 transition-all"
              onClick={() => onPropertyClick(property)}
            >
              <div className="h-48 overflow-hidden relative">
                <img
                  src={property.imageUrl}
                  alt={property.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="text-lg font-bold">{property.price}</div>
                  <div className="text-xs text-white/60">
                    {property.address}, {property.city}
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="w-full bg-white/10 hover:bg-white/15 transition-colors py-2 rounded-xl text-sm font-bold"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPropertyClick(property)
                    }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-500 transition-colors py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApplyClick?.(property)
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
