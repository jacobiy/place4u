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
      .select('id, full_name, user_type, is_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    if (!error && Array.isArray(data)) {
      recentUsers = data.map((u) => ({
        id: u.id,
        name: u.full_name ?? 'Unknown',
        initials: initialsFromName(u.full_name),
        type: u.user_type ?? 'User',
        date: formatDate(u.created_at),
        status: 'active'
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

export const getAdminUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, user_type, is_verified, created_at, phone, email')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  
  return data.map((u) => ({
    id: u.id,
    name: u.full_name ?? 'Unknown',
    initials: initialsFromName(u.full_name),
    type: u.user_type ?? 'User',
    email: u.email ?? '-',
    phone: u.phone ?? '-',
    metaPrimary: '-',
    metaSecondary: '-',
    registered: formatDate(u.created_at),
    kyc: u.is_verified ? 'Verified' : 'Pending',
    status: 'active',
  }));
};

export const getAdminApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, status, submitted_at, min_budget, max_budget,
      tenant_id,
      assigned_to,
      tenant:users!applications_tenant_id_fkey(full_name, email, phone),
      agent:users!applications_assigned_to_fkey(full_name, email, phone)
    `)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error("Error fetching applications:", error);
    return [];
  }
  return data;
};

export const getAgentsList = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('user_type', 'agent')
    .order('full_name', { ascending: true });
    
  if (error) {
    console.error("Error fetching agents:", error);
    return [];
  }
  return data;
};

export const assignAgentToApplication = async (applicationId, agentId) => {
  const { error } = await supabase
    .from('applications')
    .update({ assigned_to: agentId || null })
    .eq('id', applicationId);
    
  if (error) {
    console.error("Error assigning agent:", error);
    throw error;
  }
};

export const getAdminProperties = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      id, address, property_type, price, area, city, is_active, created_at, image_urls,
      landlord:users!properties_landlord_id_fkey(full_name, email, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching admin properties:", error);
    return [];
  }
  return data;
};

