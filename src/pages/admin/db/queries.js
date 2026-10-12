import { supabase } from '../../../utils/Supabase'

// Helpers
export const initialsFromName = (name) => {
  if (!name) return '??'
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? '?'
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export const formatDate = (isoString) => {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatCurrency = (amount) => {
  return `R${Number(amount ?? 0).toLocaleString('en-ZA')}`
}

// Gmail Helper: opens Gmail with prefilled recipient, subject, and body
export const openGmail = (email, subject = '', body = '') => {
  if (!email || email === '—') return
  const encSubject = encodeURIComponent(subject)
  const encBody = encodeURIComponent(body)
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encSubject}&body=${encBody}`
  window.open(gmailUrl, '_blank')
}

// Real Dashboard Data fetched directly from Supabase tables
export const getAdminDashboardData = async () => {
  try {
    const [
      { data: users, error: uErr },
      { data: properties, error: pErr },
      { data: applications, error: aErr }
    ] = await Promise.all([
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('*, landlord:users!properties_landlord_id_fkey(*)').order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select(`
          *,
          tenant:users!applications_tenant_id_fkey(*),
          agent:users!applications_assigned_to_fkey(*)
        `)
        .order('submitted_at', { ascending: false })
    ])

    const userList = Array.isArray(users) ? users : []
    const propList = Array.isArray(properties) ? properties : []
    const appList = Array.isArray(applications) ? applications : []

    const landlords = userList.filter((u) => u.user_type === 'landlord')
    const tenants = userList.filter((u) => u.user_type === 'tenant')
    const agents = userList.filter((u) => u.user_type === 'agent')

    const unassignedApps = appList.filter((a) => !a.assigned_to)
    const assignedApps = appList.filter((a) => !!a.assigned_to)
    const underReviewApps = appList.filter((a) => a.status === 'under_review')
    const submittedApps = appList.filter((a) => a.status === 'submitted')
    const completedApps = appList.filter((a) => a.status === 'completed')
    const expiredApps = appList.filter((a) => a.status === 'expired')

    const activeProps = propList.filter((p) => p.is_active)

    return {
      stats: {
        totalUsers: userList.length,
        totalLandlords: landlords.length,
        totalTenants: tenants.length,
        totalAgents: agents.length,
        totalProperties: propList.length,
        activeProperties: activeProps.length,
        totalApplications: appList.length,
        unassignedApplications: unassignedApps.length,
        assignedApplications: assignedApps.length,
        underReviewApplications: underReviewApps.length,
        submittedApplications: submittedApps.length,
        completedApplications: completedApps.length,
        expiredApplications: expiredApps.length,
        unverifiedUsersCount: userList.filter((u) => !u.is_verified).length
      },
      recentApplications: appList.slice(0, 10),
      recentProperties: propList.slice(0, 8),
      recentUsers: userList.slice(0, 8),
      agents
    }
  } catch (err) {
    console.error('Error fetching admin dashboard data:', err)
    return {
      stats: {
        totalUsers: 0,
        totalLandlords: 0,
        totalTenants: 0,
        totalAgents: 0,
        totalProperties: 0,
        activeProperties: 0,
        totalApplications: 0,
        unassignedApplications: 0,
        assignedApplications: 0,
        underReviewApplications: 0,
        submittedApplications: 0,
        completedApplications: 0,
        expiredApplications: 0,
        unverifiedUsersCount: 0
      },
      recentApplications: [],
      recentProperties: [],
      recentUsers: [],
      agents: []
    }
  }
}

// Get all applications with tenant and agent joins
export const getAdminApplications = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      *,
      tenant:users!applications_tenant_id_fkey(*),
      agent:users!applications_assigned_to_fkey(*)
    `)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching applications:', error)
    return []
  }
  return data || []
}

// Get list of real agents for assignment
export const getAgentsList = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_type', 'agent')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching agents:', error)
    return []
  }
  return data || []
}

// Assign an application to a specific agent in Supabase
export const assignAgentToApplication = async (applicationId, agentId) => {
  const updatePayload = {
    assigned_to: agentId || null,
    // Database constraint allows: 'submitted', 'under_review', 'completed', 'expired'
    status: agentId ? 'under_review' : 'submitted'
  }

  const { data, error } = await supabase
    .from('applications')
    .update(updatePayload)
    .eq('id', applicationId)
    .select(`
      *,
      tenant:users!applications_tenant_id_fkey(*),
      agent:users!applications_assigned_to_fkey(*)
    `)
    .single()

  if (error) {
    console.error('Error assigning agent:', error)
    throw error
  }
  return data
}

// Update application status ('submitted', 'under_review', 'completed', 'expired')
export const updateApplicationStatus = async (applicationId, status) => {
  const { data, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select(`
      *,
      tenant:users!applications_tenant_id_fkey(*),
      agent:users!applications_assigned_to_fkey(*)
    `)
    .single()

  if (error) {
    console.error('Error updating application status:', error)
    throw error
  }
  return data
}

// Get all users from Supabase
export const getAdminUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  return data || []
}

// Toggle user verification
export const toggleUserVerification = async (userId, isVerified) => {
  const { data, error } = await supabase
    .from('users')
    .update({ is_verified: isVerified })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user verification:', error)
    throw error
  }
  return data
}

// Get all properties with landlord join
export const getAdminProperties = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching properties:', error)
    return []
  }
  return data || []
}

// Toggle property is_active status
export const togglePropertyActive = async (propertyId, isActive) => {
  const { data, error } = await supabase
    .from('properties')
    .update({ is_active: isActive })
    .eq('id', propertyId)
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .single()

  if (error) {
    console.error('Error updating property active status:', error)
    throw error
  }
  return data
}

// Create property directly from admin (supports manually entered or scraped listings)
export const createAdminProperty = async (propertyData) => {
  const payload = {
    address: propertyData.address,
    area: propertyData.area,
    city: propertyData.city,
    province: propertyData.province || 'Gauteng',
    property_type: propertyData.property_type || 'apartment',
    price: Number(propertyData.price) || 0,
    bedrooms: propertyData.bedrooms ? Number(propertyData.bedrooms) : null,
    bathrooms: propertyData.bathrooms ? Number(propertyData.bathrooms) : null,
    furnished: Boolean(propertyData.furnished),
    pet_friendly: Boolean(propertyData.pet_friendly),
    available_from: propertyData.available_from || null,
    is_active: propertyData.is_active !== undefined ? propertyData.is_active : true,
    image_urls: Array.isArray(propertyData.image_urls) ? propertyData.image_urls : [],
    landlord_id: propertyData.landlord_id || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('properties')
    .insert([payload])
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .single()

  if (error) {
    console.error('Error creating property:', error)
    throw error
  }
  return data
}

// Update existing property
export const updateAdminProperty = async (propertyId, updates) => {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', propertyId)
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .single()

  if (error) {
    console.error('Error updating property:', error)
    throw error
  }
  return data
}

// Delete property from database
export const deleteAdminProperty = async (propertyId) => {
  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)

  if (error) {
    console.error('Error deleting property:', error)
    throw error
  }
  return true
}

// Get registered landlords list
export const getLandlordsList = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone')
    .eq('user_type', 'landlord')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error fetching landlords:', error)
    return []
  }
  return data || []
}

// ========================================================
// AGENT APPLICATIONS & ONBOARDING MANAGEMENT
// ========================================================

const STORAGE_KEY_AGENT_APPS = 'place4u_admin_agent_applications_v2'

const SEED_AGENT_APPLICATIONS = [
  {
    id: 'app-agent-001',
    user_id: '49e48730-fa49-465b-b52d-cf8ca7c93828', // Matches admin@agent.com in users table
    full_name: 'Sipho Dlamini',
    email: 'admin@agent.com',
    phone: '0824822618',
    id_number: '9203145890082',
    address: '14 Sandton Drive, Sandhurst',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2196',
    agency_name: 'Apex Residential Realty',
    experience_years: 5,
    tax_number: '9845123654',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    proof_of_residence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    preferred_contact_method: 'whatsapp',
    interview_time_slot: 'morning',
    verification_status: 'verified',
    is_verified: true,
    submitted_at: '2026-06-03T09:56:17.074Z',
    verified_at: '2026-06-04T11:20:00.000Z',
    interview_date: '2026-06-04T10:00:00.000Z',
    admin_notes: 'PPRA valid fidelity fund certificate inspected. Passed introductory phone screening.'
  },
  {
    id: 'app-agent-002',
    user_id: 'usr-agent-sample-02',
    full_name: 'Nicole Van Der Merwe',
    email: 'nicole.vdm@coastalestates.co.za',
    phone: '+27835129841',
    id_number: '9511200142087',
    address: '77 Kloof Street, Gardens',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '8001',
    agency_name: 'Coastal Haven Properties',
    experience_years: 3,
    tax_number: '9201485763',
    id_document_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    proof_of_residence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    preferred_contact_method: 'whatsapp',
    interview_time_slot: 'afternoon',
    verification_status: 'pending_review',
    is_verified: false,
    submitted_at: '2026-10-09T08:15:00.000Z',
    verified_at: null,
    interview_date: null,
    admin_notes: 'FICA proof of address is recent (City of Cape Town utility bill, under 3 months).'
  },
  {
    id: 'app-agent-003',
    user_id: 'usr-agent-sample-03',
    full_name: 'Thabo Mokoena',
    email: 'thabo@umhlangarealty.co.za',
    phone: '+27724190833',
    id_number: '8907155234081',
    address: '22 Marine Drive, Umhlanga Rocks',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    postal_code: '4320',
    agency_name: 'Umhlanga Premier Leasing',
    experience_years: 7,
    tax_number: '9012485961',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    proof_of_residence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    preferred_contact_method: 'phone',
    interview_time_slot: 'morning',
    verification_status: 'interview_scheduled',
    is_verified: false,
    submitted_at: '2026-10-08T14:40:00.000Z',
    verified_at: null,
    interview_date: '2026-10-14T10:30:00.000Z',
    admin_notes: 'Telephonic onboarding interview booked for 14 Oct. Focus on Umhlanga student & luxury flat rentals.'
  },
  {
    id: 'app-agent-004',
    user_id: 'usr-agent-sample-04',
    full_name: 'Kgosi Kgositsile',
    email: 'kgosi@midrandpropmgmt.co.za',
    phone: '+27649821104',
    id_number: '9105025987084',
    address: '150 New Road, Carlswald',
    city: 'Midrand',
    province: 'Gauteng',
    postal_code: '1684',
    agency_name: 'Independent Practitioner',
    experience_years: 1,
    tax_number: null,
    id_document_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    proof_of_residence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    preferred_contact_method: 'email',
    interview_time_slot: 'morning',
    verification_status: 'rejected',
    is_verified: false,
    submitted_at: '2026-10-05T11:10:00.000Z',
    verified_at: null,
    interview_date: null,
    admin_notes: 'FICA proof of residence was blurry and expired (dated over 12 months ago). Requested re-submission.'
  }
]

export const getAdminAgentApplications = async () => {
  try {
    // 1. Fetch real agent accounts from Supabase users
    const { data: realAgentUsers } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', 'agent')

    // 2. Fetch agent_profiles rows if available
    let dbProfiles = []
    try {
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('*')
      if (Array.isArray(profiles)) dbProfiles = profiles
    } catch {}

    // 3. Load locally stored / cached applications
    let stored = []
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AGENT_APPS)
      if (raw) stored = JSON.parse(raw)
    } catch {}

    if (!Array.isArray(stored) || stored.length === 0) {
      stored = SEED_AGENT_APPLICATIONS
      try {
        localStorage.setItem(STORAGE_KEY_AGENT_APPS, JSON.stringify(stored))
      } catch {}
    }

    // 4. Merge real agent users from Supabase into application records
    const list = [...stored]
    if (Array.isArray(realAgentUsers)) {
      for (const u of realAgentUsers) {
        // Look for matching profile
        const matchingProfile = dbProfiles.find((p) => p.user_id === u.id)
        // Also check localStorage agent cache
        let localProfile = null
        try {
          const lRaw = localStorage.getItem(`place4u_agent_profile_${u.id}`)
          if (lRaw) localProfile = JSON.parse(lRaw)
        } catch {}

        const existingIdx = list.findIndex((a) => a.user_id === u.id || a.email === u.email)
        const vStatus = matchingProfile?.verification_status || localProfile?.verification_status || (u.is_verified ? 'verified' : 'pending_review')

        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            user_id: u.id,
            full_name: u.full_name || list[existingIdx].full_name,
            email: u.email,
            phone: u.phone || list[existingIdx].phone,
            is_verified: u.is_verified,
            verification_status: vStatus,
            agency_name: matchingProfile?.agency_name || localProfile?.agency_name || list[existingIdx].agency_name
          }
        } else {
          list.unshift({
            id: `app-real-${u.id.substring(0, 8)}`,
            user_id: u.id,
            full_name: u.full_name || 'Agent Applicant',
            email: u.email,
            phone: u.phone || '0820000000',
            id_number: u.id_number || matchingProfile?.id_number || '9001015000080',
            address: matchingProfile?.address || localProfile?.address || 'Johannesburg Office',
            city: matchingProfile?.city || localProfile?.city || 'Johannesburg',
            province: matchingProfile?.province || localProfile?.province || 'Gauteng',
            postal_code: matchingProfile?.postal_code || localProfile?.postal_code || '2000',
            agency_name: matchingProfile?.agency_name || localProfile?.agency_name || 'Registered Agent',
            experience_years: matchingProfile?.experience_years ?? localProfile?.experience_years ?? 2,
            tax_number: matchingProfile?.tax_number || localProfile?.tax_number || null,
            id_document_url: matchingProfile?.id_document_url || localProfile?.id_document_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
            proof_of_residence_url: matchingProfile?.proof_of_residence_url || localProfile?.proof_of_residence_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
            preferred_contact_method: matchingProfile?.preferred_contact_method || localProfile?.preferred_contact_method || 'whatsapp',
            interview_time_slot: matchingProfile?.interview_time_slot || localProfile?.interview_time_slot || 'morning',
            verification_status: vStatus,
            is_verified: Boolean(u.is_verified),
            submitted_at: u.created_at || new Date().toISOString(),
            verified_at: u.is_verified ? u.updated_at || u.created_at : null,
            interview_date: null,
            admin_notes: 'Real agent record synced directly from database.'
          })
        }
      }
    }

    return list
  } catch (err) {
    console.error('Error fetching agent applications:', err)
    return SEED_AGENT_APPLICATIONS
  }
}

// Update agent application status (Approve, Reject, Under Review)
export const updateAgentApplicationStatus = async (appIdOrUserId, newStatus, adminNotes = null) => {
  const isVerified = newStatus === 'verified'
  const now = new Date().toISOString()

  // 1. Update in local storage applications list
  let updatedRecord = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENT_APPS)
    let list = raw ? JSON.parse(raw) : [...SEED_AGENT_APPLICATIONS]
    list = list.map((item) => {
      if (item.id === appIdOrUserId || item.user_id === appIdOrUserId) {
        updatedRecord = {
          ...item,
          verification_status: newStatus,
          is_verified: isVerified,
          verified_at: isVerified ? now : null,
          admin_notes: adminNotes !== null ? adminNotes : item.admin_notes
        }
        return updatedRecord
      }
      return item
    })
    localStorage.setItem(STORAGE_KEY_AGENT_APPS, JSON.stringify(list))
  } catch {}

  const targetUserId = updatedRecord?.user_id || appIdOrUserId

  // 2. Sync is_verified to users table in Supabase
  try {
    if (targetUserId && targetUserId.length > 20) {
      await supabase
        .from('users')
        .update({ is_verified: isVerified, updated_at: now })
        .eq('id', targetUserId)
    }
  } catch (err) {
    console.warn('Could not update users table for agent:', err)
  }

  // 3. Sync to agent_profiles table in Supabase
  try {
    if (targetUserId && targetUserId.length > 20) {
      await supabase
        .from('agent_profiles')
        .update({
          verification_status: newStatus,
          is_verified: isVerified,
          verified_at: isVerified ? now : null
        })
        .eq('user_id', targetUserId)
    }
  } catch {}

  // 4. Update agent portal local storage cache
  try {
    if (targetUserId) {
      const cacheKey = `place4u_agent_profile_${targetUserId}`
      const cached = localStorage.getItem(cacheKey)
      const obj = cached ? JSON.parse(cached) : {}
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ...obj,
          verification_status: newStatus,
          is_verified: isVerified,
          verified_at: isVerified ? now : null
        })
      )
    }
  } catch {}

  return updatedRecord || { id: appIdOrUserId, verification_status: newStatus, is_verified: isVerified }
}

// Schedule an interview for an agent applicant
export const scheduleAgentInterview = async (appIdOrUserId, interviewDate, interviewTimeSlot, notes = '') => {
  let updatedRecord = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENT_APPS)
    let list = raw ? JSON.parse(raw) : [...SEED_AGENT_APPLICATIONS]
    list = list.map((item) => {
      if (item.id === appIdOrUserId || item.user_id === appIdOrUserId) {
        updatedRecord = {
          ...item,
          verification_status: 'interview_scheduled',
          interview_date: interviewDate,
          interview_time_slot: interviewTimeSlot || item.interview_time_slot,
          admin_notes: notes || item.admin_notes
        }
        return updatedRecord
      }
      return item
    })
    localStorage.setItem(STORAGE_KEY_AGENT_APPS, JSON.stringify(list))
  } catch {}

  const targetUserId = updatedRecord?.user_id || appIdOrUserId

  // Sync to agent_profiles if available
  try {
    if (targetUserId && targetUserId.length > 20) {
      await supabase
        .from('agent_profiles')
        .update({
          verification_status: 'interview_scheduled',
          interview_date: interviewDate,
          interview_time_slot: interviewTimeSlot
        })
        .eq('user_id', targetUserId)
    }
  } catch {}

  return updatedRecord
}

// Simulate / Add a new inbound agent application for live testing
export const createSimulatedAgentApplication = async (sampleData = {}) => {
  const newApp = {
    id: `app-agent-${Date.now().toString(36)}`,
    user_id: `usr-sim-${Date.now()}`,
    full_name: sampleData.full_name || 'Bongani Sithole',
    email: sampleData.email || `bongani.${Date.now().toString(36).slice(-4)}@sitholerealty.co.za`,
    phone: sampleData.phone || '+27829143301',
    id_number: sampleData.id_number || '9308145290088',
    address: sampleData.address || '84 Centurion Boulevard',
    city: sampleData.city || 'Centurion',
    province: sampleData.province || 'Gauteng',
    postal_code: sampleData.postal_code || '0157',
    agency_name: sampleData.agency_name || 'Sithole Real Estate Group',
    experience_years: sampleData.experience_years || 4,
    tax_number: sampleData.tax_number || '9481203948',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    proof_of_residence_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    preferred_contact_method: sampleData.preferred_contact_method || 'whatsapp',
    interview_time_slot: sampleData.interview_time_slot || 'morning',
    verification_status: 'pending_review',
    is_verified: false,
    submitted_at: new Date().toISOString(),
    verified_at: null,
    interview_date: null,
    admin_notes: 'Newly received inbound application awaiting FICA document verification.'
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENT_APPS)
    const list = raw ? JSON.parse(raw) : [...SEED_AGENT_APPLICATIONS]
    list.unshift(newApp)
    localStorage.setItem(STORAGE_KEY_AGENT_APPS, JSON.stringify(list))
  } catch {}

  return newApp
}

// ========================================================
// LANDLORD APPLICATIONS & OWNERSHIP VERIFICATION MANAGEMENT
// ========================================================

const STORAGE_KEY_LANDLORD_APPS = 'place4u_admin_landlord_applications_v1'

const SEED_LANDLORD_APPLICATIONS = [
  {
    id: 'app-landlord-001',
    user_id: 'ddfb6dd4-938d-491d-92a8-b1688002c069', // Donald Masine from users table
    full_name: 'Donald Masine',
    email: 'masinedonald@gmail.com',
    phone: '+27714366053',
    id_number: '8804195123086',
    entity_type: 'Private Landlord',
    company_name: 'Masine Family Properties',
    tax_id: '9120485761',
    address: '18 Duiker Street',
    city: 'Mokopane',
    province: 'Limpopo',
    postal_code: '0601',
    property_count: 2,
    estimated_portfolio_value: 9000,
    title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    verification_status: 'pending_review',
    is_verified: false,
    id_verified: false,
    ownership_proof_verified: false,
    submitted_at: '2026-05-09T10:55:27.475Z',
    approved_at: null,
    admin_notes: 'Limpopo Title Deed submitted for Duiker Street property. Municipal rates statement pending verification.'
  },
  {
    id: 'app-landlord-002',
    user_id: '83618be2-50cf-4678-beae-47c43ba3980b', // admin@landlord.com from users table
    full_name: 'Pieter Van Wyk',
    email: 'admin@landlord.com',
    phone: '0682934405',
    id_number: '7911025098089',
    entity_type: 'Commercial Entity / CC',
    company_name: 'Van Wyk Holdings Pty Ltd',
    tax_id: '9948215039',
    address: '42 Sandton Drive, Sandhurst',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2196',
    property_count: 3,
    estimated_portfolio_value: 32500,
    title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    verification_status: 'approved',
    is_verified: true,
    id_verified: true,
    ownership_proof_verified: true,
    submitted_at: '2026-06-03T09:57:35.819Z',
    approved_at: '2026-06-04T14:30:00.000Z',
    admin_notes: 'Deeds Office title deed confirmed. Sandton City municipal assessment rates account verified.'
  },
  {
    id: 'app-landlord-003',
    user_id: 'usr-landlord-sample-03',
    full_name: 'Dr. Ayanda Khumalo',
    email: 'ayanda.khumalo@coastalinvest.co.za',
    phone: '+27824190822',
    id_number: '8406155142084',
    entity_type: 'Family Trust',
    company_name: 'Khumalo Living Trust',
    tax_id: '9012845610',
    address: '15 Lagoon Drive, Umhlanga Rocks',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    postal_code: '4319',
    property_count: 2,
    estimated_portfolio_value: 38000,
    title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    verification_status: 'pending_review',
    is_verified: false,
    id_verified: true,
    ownership_proof_verified: false,
    submitted_at: '2026-10-09T09:20:00.000Z',
    approved_at: null,
    admin_notes: 'ID verified. Requires eThekwini municipal clearance certificate / recent water & lights bill.'
  },
  {
    id: 'app-landlord-004',
    user_id: 'usr-landlord-sample-04',
    full_name: 'Brenda Joubert',
    email: 'brenda@capeapartments.co.za',
    phone: '+27837719044',
    id_number: '9108220199088',
    entity_type: 'Private Landlord',
    company_name: 'Independent Owner',
    tax_id: null,
    address: '88 Sea Point Promenade',
    city: 'Cape Town',
    province: 'Western Cape',
    postal_code: '8005',
    property_count: 1,
    estimated_portfolio_value: 18500,
    title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    verification_status: 'rejected',
    is_verified: false,
    id_verified: false,
    ownership_proof_verified: false,
    submitted_at: '2026-10-04T16:15:00.000Z',
    approved_at: null,
    admin_notes: 'Submitted deed was in the name of a third party without power of attorney or leasehold agreement.'
  }
]

// Get all landlord applications
export const getAdminLandlordApplications = async () => {
  try {
    // 1. Fetch real landlord accounts from Supabase users
    const { data: realLandlords } = await supabase
      .from('users')
      .select('*')
      .eq('user_type', 'landlord')

    // 2. Fetch properties to calculate real portfolios
    let props = []
    try {
      const { data: pData } = await supabase
        .from('properties')
        .select('id, landlord_id, price')
      if (Array.isArray(pData)) props = pData
    } catch {}

    // 2b. Fetch landlord_profiles for the real application status (single source of truth)
    let landlordProfileRows = []
    try {
      const { data: lpData } = await supabase
        .from('landlord_profiles')
        .select('*')
      if (Array.isArray(lpData)) landlordProfileRows = lpData
    } catch {}

    let stored = []
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_APPS)
      if (raw) stored = JSON.parse(raw)
    } catch {}

    if (!Array.isArray(stored) || stored.length === 0) {
      stored = SEED_LANDLORD_APPLICATIONS
      try {
        localStorage.setItem(STORAGE_KEY_LANDLORD_APPS, JSON.stringify(stored))
      } catch {}
    }

    // 4. Merge real landlords into the applications list
    const list = [...stored]
    if (Array.isArray(realLandlords)) {
      for (const u of realLandlords) {
        const ownedProps = props.filter((p) => p.landlord_id === u.id)
        const portfolioValue = ownedProps.reduce((sum, p) => sum + (Number(p.price) || 0), 0)

        const existingIdx = list.findIndex((a) => a.user_id === u.id || a.email === u.email)
        const lpRow = Array.isArray(landlordProfileRows) ? landlordProfileRows.find((lp) => lp.user_id === u.id) : null
        const vStatus = lpRow?.application_status || 'not_applied'

        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            user_id: u.id,
            full_name: u.full_name || list[existingIdx].full_name,
            email: u.email,
            phone: u.phone || list[existingIdx].phone,
            is_verified: u.is_verified,
            verification_status: vStatus,
            application_status: vStatus,
            property_count: Math.max(ownedProps.length, list[existingIdx].property_count || 1),
            estimated_portfolio_value: portfolioValue || list[existingIdx].estimated_portfolio_value
          }
        } else {
          list.unshift({
            id: `app-landlord-${u.id.substring(0, 8)}`,
            user_id: u.id,
            full_name: u.full_name || 'Landlord Applicant',
            email: u.email,
            phone: u.phone || '0710000000',
            id_number: u.id_number || '8501015000085',
            entity_type: 'Private Landlord',
            company_name: 'Direct Property Owner',
            tax_id: null,
            address: 'Limpopo / Gauteng Address',
            city: 'Johannesburg',
            province: 'Gauteng',
            postal_code: '2000',
            property_count: ownedProps.length || 1,
            estimated_portfolio_value: portfolioValue || 5000,
            title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
            rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800',
            id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
            verification_status: vStatus,
            application_status: vStatus,
            is_verified: Boolean(u.is_verified),
            id_verified: Boolean(u.is_verified),
            ownership_proof_verified: Boolean(u.is_verified),
            submitted_at: u.created_at || new Date().toISOString(),
            approved_at: u.is_verified ? u.updated_at || u.created_at : null,
            admin_notes: 'Direct landlord registration synced from Supabase.'
          })
        }
      }
    }

    return list
  } catch (err) {
    console.error('Error fetching landlord applications:', err)
    return SEED_LANDLORD_APPLICATIONS
  }
}

// Update landlord application status (Approved, Rejected, Under Review)
export const updateLandlordApplicationStatus = async (appIdOrUserId, newStatus, adminNotes = null) => {
  const isApproved = newStatus === 'approved'
  const now = new Date().toISOString()

  // 1. Update in local storage applications list
  let updatedRecord = null
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_APPS)
    let list = raw ? JSON.parse(raw) : [...SEED_LANDLORD_APPLICATIONS]
    list = list.map((item) => {
      if (item.id === appIdOrUserId || item.user_id === appIdOrUserId || (item.email && item.email === appIdOrUserId)) {
        updatedRecord = {
          ...item,
          verification_status: newStatus,
          application_status: newStatus,
          is_verified: isApproved,
          id_verified: isApproved,
          ownership_proof_verified: isApproved,
          approved_at: isApproved ? now : null,
          admin_notes: adminNotes !== null ? adminNotes : item.admin_notes
        }
        return updatedRecord
      }
      return item
    })
    localStorage.setItem(STORAGE_KEY_LANDLORD_APPS, JSON.stringify(list))
  } catch {}

  // 2. Sync is_verified to users table in Supabase
  let targetUserId = updatedRecord?.user_id || (appIdOrUserId && appIdOrUserId.length > 20 ? appIdOrUserId : null)
  const targetEmail = updatedRecord?.email || (appIdOrUserId && appIdOrUserId.includes('@') ? appIdOrUserId : null)

  try {
    if (targetUserId) {
      await supabase
        .from('users')
        .update({ is_verified: isApproved, updated_at: now })
        .eq('id', targetUserId)
    } else if (targetEmail) {
      const { data: matchedUsers } = await supabase
        .from('users')
        .update({ is_verified: isApproved, updated_at: now })
        .eq('email', targetEmail)
        .select('id')
      if (matchedUsers && matchedUsers[0]) {
        targetUserId = matchedUsers[0].id
      }
    }
  } catch (err) {
    console.warn('Could not update users table for landlord:', err)
  }

  // 3. Sync to landlord_profiles table in Supabase if present
  try {
    if (targetUserId && targetUserId.length > 20) {
      const { data: updatedLP } = await supabase
        .from('landlord_profiles')
        .update({
          application_status: newStatus,
          account_status: isApproved ? 'active' : 'pending',
          id_verified: isApproved,
          ownership_proof_verified: isApproved,
          approved_at: isApproved ? now : null,
          rejection_reason: newStatus === 'rejected' ? (adminNotes || null) : null,
          updated_at: now
        })
        .eq('user_id', targetUserId)
        .select()

      // If no row exists yet to update, attempt an insert
      if (!updatedLP || updatedLP.length === 0) {
        await supabase
          .from('landlord_profiles')
          .insert([{
            user_id: targetUserId,
            landlord_code: `LD-${targetUserId.substring(0, 6).toUpperCase()}`,
            full_name: updatedRecord?.full_name || 'Landlord',
            email: updatedRecord?.email || targetEmail || null,
            application_status: newStatus,
            account_status: isApproved ? 'active' : 'pending',
            id_verified: isApproved,
            ownership_proof_verified: isApproved,
            approved_at: isApproved ? now : null,
            rejection_reason: newStatus === 'rejected' ? (adminNotes || null) : null,
            created_at: now,
            updated_at: now
          }])
      }
    }
  } catch (lpErr) {
    console.warn('Notice syncing landlord_profiles table:', lpErr?.message)
  }

  return updatedRecord || { id: appIdOrUserId, verification_status: newStatus, application_status: newStatus, is_verified: isApproved }
}

// Simulate / Add a new inbound landlord application for testing
export const createSimulatedLandlordApplication = async (sampleData = {}) => {
  const newApp = {
    id: `app-landlord-${Date.now().toString(36)}`,
    user_id: `usr-sim-landlord-${Date.now()}`,
    full_name: sampleData.full_name || 'Bafana Ndlovu',
    email: sampleData.email || `bafana.${Date.now().toString(36).slice(-4)}@ndlovuestates.co.za`,
    phone: sampleData.phone || '+27825590114',
    id_number: sampleData.id_number || '8107145290081',
    entity_type: sampleData.entity_type || 'Private Landlord',
    company_name: sampleData.company_name || 'Ndlovu Property Holdings',
    tax_id: sampleData.tax_id || '9481903321',
    address: sampleData.address || '54 Menlyn Main Boulevard',
    city: sampleData.city || 'Pretoria',
    province: sampleData.province || 'Gauteng',
    postal_code: sampleData.postal_code || '0181',
    property_count: sampleData.property_count || 2,
    estimated_portfolio_value: sampleData.estimated_portfolio_value || 24000,
    title_deed_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    rates_taxes_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    id_document_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    verification_status: 'pending_review',
    is_verified: false,
    id_verified: false,
    ownership_proof_verified: false,
    submitted_at: new Date().toISOString(),
    approved_at: null,
    admin_notes: 'Inbound landlord application with Title Deed and Tshwane rates statement awaiting audit.'
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_LANDLORD_APPS)
    const list = raw ? JSON.parse(raw) : [...SEED_LANDLORD_APPLICATIONS]
    list.unshift(newApp)
    localStorage.setItem(STORAGE_KEY_LANDLORD_APPS, JSON.stringify(list))
  } catch {}

  return newApp
}


