import { supabase } from '../../../utils/Supabase'

const safeCount = async (queryPromise) => {
  try {
    const { count, error } = await queryPromise
    if (error) return 0
    return typeof count === 'number' ? count : 0
  } catch {
    return 0
  }
}

const initialsFromName = (name) => {
  if (!name) return '??'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export const getAdminDashboardData = async () => {
  const [totalUsers, totalLandlords, totalTenants, totalAgents] = await Promise.all([
    safeCount(supabase.from('users').select('*', { count: 'exact', head: true })),
    safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord')),
    safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'tenant')),
    safeCount(supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'agent'))
  ])

  let recentUsers = []
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, user_type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error && Array.isArray(data)) {
      recentUsers = data.map((u) => ({
        id: u.id,
        name: u.full_name ?? 'Unknown',
        initials: initialsFromName(u.full_name),
        type: u.user_type ?? 'User',
        date: formatDate(u.created_at),
        status: u.status ?? 'active'
      }))
    }
  } catch {
    recentUsers = []
  }

  return {
    stats: { totalUsers, totalLandlords, totalTenants, totalAgents },
    recentTransactions: [],
    systemAlerts: [],
    recentUsers
  }
}

