import React, { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Home,
  UserCheck,
  Briefcase,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock
} from 'lucide-react'
import { getAdminDashboardData } from './db/queries'

const defaultRevenueData = {
  labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
  values: [45, 52, 48, 55, 62, 58, 65, 70, 68, 75, 82, 89]
}

const defaultSystemAlerts = [
  { title: '3 Overdue Rents', description: 'Past 30-day threshold', type: 'danger', icon: AlertCircle },
  { title: '12 Pending KYC', description: 'Awaiting document review', type: 'warning', icon: FileText },
  { title: '8 Leases Expiring', description: 'Within next 30 days', type: 'info', icon: Clock },
  { title: 'System Backup OK', description: 'Last run: 13 May 02:00 AM', type: 'success', icon: CheckCircle }
]

const StatCard = ({ title, value, change, changeType, icon: Icon, iconBg }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{title}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={16} />
      </div>
    </div>
    <p className="text-gray-900 text-3xl font-bold">{value}</p>
    <div className="flex items-center gap-1 mt-2">
      {changeType === 'up' ? (
        <TrendingUp size={12} className="text-green-500" />
      ) : (
        <TrendingDown size={12} className="text-red-500" />
      )}
      <span className={`text-xs font-semibold ${changeType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
        {change}
      </span>
      <span className="text-gray-400 text-xs">vs last month</span>
    </div>
  </div>
)

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalUsers: 0, totalLandlords: 0, totalTenants: 0, totalAgents: 0 })
  const [recentUsers, setRecentUsers] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])
  const [systemAlerts, setSystemAlerts] = useState([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      const data = await getAdminDashboardData()
      if (cancelled) return
      setStats(data.stats ?? stats)
      setRecentUsers(Array.isArray(data.recentUsers) ? data.recentUsers : [])
      setRecentTransactions(Array.isArray(data.recentTransactions) ? data.recentTransactions : [])
      setSystemAlerts(Array.isArray(data.systemAlerts) && data.systemAlerts.length ? data.systemAlerts : defaultSystemAlerts)
      setLoading(false)
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revenueData = useMemo(() => defaultRevenueData, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-lg">Admin Dashboard</h1>
          <p className="text-gray-400 text-xs mt-0.5">{loading ? 'Loading live data…' : 'Overview of platform activity'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          change="+8.4%"
          changeType="up"
          icon={Users}
          iconBg="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Landlords"
          value={stats.totalLandlords.toLocaleString()}
          change="+5.2%"
          changeType="up"
          icon={Home}
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Tenants"
          value={stats.totalTenants.toLocaleString()}
          change="+11.7%"
          changeType="up"
          icon={UserCheck}
          iconBg="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Agents"
          value={stats.totalAgents.toLocaleString()}
          change="-2.1%"
          changeType="down"
          icon={Briefcase}
          iconBg="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900 font-semibold text-sm">Monthly Revenue</h3>
              <p className="text-gray-400 text-xs mt-0.5">Platform-wide transaction volume — May 2025 to Apr 2026</p>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-2xl font-bold text-gray-900">R847K</span>
              <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-1 rounded-full">
                +14.2% YTD
              </span>
            </div>
          </div>
          <div className="h-64 flex items-end gap-1">
            {revenueData.values.map((value, idx) => (
              <div key={revenueData.labels[idx]} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-600 rounded-t-sm opacity-70 transition-all hover:opacity-100"
                  style={{ height: `${(value / 100) * 100}%` }}
                />
                <span className="text-gray-400 text-[10px]">{revenueData.labels[idx]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-gray-900 font-semibold text-sm mb-1">User Distribution</h3>
          <p className="text-gray-400 text-xs mb-4">Breakdown by user type</p>
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#1E3A5F"
                  strokeWidth="20"
                  strokeDasharray="251.2"
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="20"
                  strokeDasharray="251.2"
                  strokeDashoffset="130.6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="20"
                  strokeDasharray="251.2"
                  strokeDashoffset="200.9"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">{(stats.totalUsers / 1000).toFixed(1)}k</span>
              </div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
                <span className="text-gray-500 text-xs">Landlords</span>
              </div>
              <span className="text-gray-900 text-xs font-semibold">{stats.totalLandlords.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                <span className="text-gray-500 text-xs">Tenants</span>
              </div>
              <span className="text-gray-900 text-xs font-semibold">{stats.totalTenants.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-gray-500 text-xs">Agents</span>
              </div>
              <span className="text-gray-900 text-xs font-semibold">{stats.totalAgents.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold text-sm">Recently Registered Users</h3>
            <span className="text-gray-400 text-xs">{loading ? 'Updating…' : 'Latest 5'}</span>
          </div>
          <div className="space-y-3">
            {recentUsers.length ? (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      user.initials === 'MN'
                        ? 'bg-blue-100 text-blue-800'
                        : user.initials === 'SB'
                          ? 'bg-amber-100 text-amber-800'
                          : user.initials === 'DM'
                            ? 'bg-indigo-100 text-indigo-800'
                            : user.initials === 'AK'
                              ? 'bg-pink-100 text-pink-800'
                              : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-xs font-semibold">{user.name}</p>
                    <p className="text-gray-400 text-[11px]">
                      {user.type} · Joined {user.date}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      user.status === 'active'
                        ? 'bg-emerald-50 text-emerald-600'
                        : user.status === 'pending'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {String(user.status).charAt(0).toUpperCase() + String(user.status).slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs">No recent users found.</p>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold text-sm">System Alerts</h3>
            <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full">new</span>
          </div>
          <div className="space-y-3">
            {systemAlerts.map((alert, idx) => {
              const Icon = alert.icon
              const bgColor =
                alert.type === 'danger'
                  ? 'bg-red-50 border-red-100'
                  : alert.type === 'warning'
                    ? 'bg-amber-50 border-amber-100'
                    : alert.type === 'info'
                      ? 'bg-blue-50 border-blue-100'
                      : 'bg-emerald-50 border-emerald-100'
              const iconBg =
                alert.type === 'danger'
                  ? 'bg-red-500'
                  : alert.type === 'warning'
                    ? 'bg-amber-500'
                    : alert.type === 'info'
                      ? 'bg-blue-600'
                      : 'bg-emerald-500'
              return (
                <div key={idx} className={`flex gap-3 p-3 ${bgColor} rounded-lg border`}>
                  <div className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={12} color="white" />
                  </div>
                  <div>
                    <p className="text-gray-900 text-xs font-semibold">{alert.title}</p>
                    <p className="text-gray-400 text-[11px]">{alert.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-gray-900 font-semibold text-sm mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-500 text-xs">Rent Collected</span>
                <span className="text-gray-900 text-xs font-semibold">R621,400</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '74%' }} />
              </div>
              <span className="text-gray-400 text-[11px]">74% of total portfolio</span>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-500 text-xs">Agent Commissions</span>
                <span className="text-gray-900 text-xs font-semibold">R112,300</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '13%' }} />
              </div>
              <span className="text-gray-400 text-[11px]">13% of total</span>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-500 text-xs">Maintenance Fees</span>
                <span className="text-gray-900 text-xs font-semibold">R89,750</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '10%' }} />
              </div>
              <span className="text-gray-400 text-[11px]">10% of total</span>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-gray-500 text-xs">Overdue Payments</span>
                <span className="text-red-500 text-xs font-semibold">R23,550</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '3%' }} />
              </div>
              <span className="text-gray-400 text-[11px]">3% of total</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-gray-900 font-semibold text-sm">Recent Transactions</h3>
          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <select className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none">
              <option>All Types</option>
              <option>Rent</option>
              <option>Commission</option>
              <option>Maintenance</option>
            </select>
            <span className="text-gray-400 text-xs">Hook up `transactions` to enable</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-6 py-3">
                  Transaction ID
                </th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Payer</th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Type</th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Property</th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Amount</th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Date</th>
                <th className="text-left text-gray-500 text-xs font-semibold uppercase tracking-wide px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentTransactions.length ? (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3.5 text-xs font-mono text-blue-600">{tx.id}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-900">{tx.payer}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{tx.type}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{tx.property}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-900">
                      R{Number(tx.amount ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{tx.date}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-500">{tx.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-6 text-xs text-gray-400" colSpan={7}>
                    No transactions to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
