import React, { useEffect, useState } from 'react'
import {
  FileCheck2,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { getAdminDashboardData, formatCurrency } from './db/queries'

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminDashboardData().then((res) => {
      setData(res)
      setLoading(false)
    })
  }, [])

  const stats = data?.stats ?? {
    totalApplications: 0,
    unassignedApplications: 0,
    underReviewApplications: 0,
    completedApplications: 0,
    expiredApplications: 0,
    totalProperties: 0,
    activeProperties: 0,
    totalUsers: 0,
    totalLandlords: 0,
    totalTenants: 0,
    totalAgents: 0
  }

  const applications = data?.recentApplications ?? []
  const properties = data?.recentProperties ?? []

  // Real status breakdown for chart
  const statusChartData = [
    { name: 'Submitted (New)', count: stats.submittedApplications, color: '#F59E0B' },
    { name: 'Under Review', count: stats.underReviewApplications, color: '#3B82F6' },
    { name: 'Completed', count: stats.completedApplications, color: '#10B981' },
    { name: 'Expired', count: stats.expiredApplications, color: '#64748B' }
  ]

  // Real property type breakdown
  const propertyTypeCounts = {}
  properties.forEach((p) => {
    const t = p.property_type || 'Other'
    propertyTypeCounts[t] = (propertyTypeCounts[t] || 0) + 1
  })
  const propertyChartData = Object.keys(propertyTypeCounts).map((key, idx) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    count: propertyTypeCounts[key],
    color: ['#2563EB', '#059669', '#D97706', '#7C3AED'][idx % 4]
  }))

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Placement & Operations Analytics</h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Real metrics calculated from active tenant applications and listed properties
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            Total Inbound Applications
          </p>
          <p className="text-slate-900 text-2xl font-bold">{stats.totalApplications}</p>
          <span className="text-slate-400 text-[10px]">Submitted by registered tenants</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            Active Processing Pipeline
          </p>
          <p className="text-blue-600 text-2xl font-bold">{stats.underReviewApplications}</p>
          <span className="text-slate-400 text-[10px]">Under review with agents</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            Unassigned Queue
          </p>
          <p className="text-amber-600 text-2xl font-bold">{stats.unassignedApplications}</p>
          <span className="text-slate-400 text-[10px]">Awaiting agent allocation</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
            Properties Available
          </p>
          <p className="text-emerald-600 text-2xl font-bold">{stats.activeProperties}</p>
          <span className="text-slate-400 text-[10px]">Active for tenant matching</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left 6 cols: Applications by Status */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-slate-900 font-bold text-sm mb-1">Applications by Processing State</h3>
          <p className="text-slate-400 text-xs mb-4">Distribution of tenant placement files</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F1E35', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 6 cols: Property Types */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-slate-900 font-bold text-sm mb-1">Listed Property Inventory</h3>
          <p className="text-slate-400 text-xs mb-4">Breakdown by registered property type</p>

          {propertyChartData.length > 0 ? (
            <div className="space-y-3 pt-2">
              {propertyChartData.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {item.count} unit{item.count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(15, (item.count / (stats.totalProperties || 1)) * 100)}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs py-8 text-center">No property records available.</p>
          )}
        </div>
      </div>
    </div>
  )
}
