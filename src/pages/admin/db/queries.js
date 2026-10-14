import { supabase } from '../../../utils/Supabase'
import { resolveDocumentUrl, LANDLORD_DOCUMENTS_BUCKET } from '../../../utils/documentUrls'

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
    const matchesFoundApps = appList.filter((a) => a.status === 'matches_found')
    const completedApps = appList.filter((a) => a.status === 'completed')
    const expiredApps = appList.filter((a) => a.status === 'expired')
    const cancelledApps = appList.filter((a) => a.status === 'cancelled')
    const rejectedApps = appList.filter((a) => a.status === 'rejected')
    const rejectedAssignments = appList.filter((a) => a.assignment_status === 'rejected')
    const acceptedAssignments = appList.filter((a) => a.assignment_status === 'accepted')

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
        matchesFoundApplications: matchesFoundApps.length,
        completedApplications: completedApps.length,
        expiredApplications: expiredApps.length,
        cancelledApplications: cancelledApps.length,
        rejectedApplications: rejectedApps.length,
        rejectedAssignments: rejectedAssignments.length,
        acceptedAssignments: acceptedAssignments.length,
        unverifiedUsersCount: userList.filter((u) => !u.is_verified).length
      },
      // Full list powers the operations desk (filters + agent workload must see
      // every application, not just the newest slice).
      applications: appList,
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
        matchesFoundApplications: 0,
        completedApplications: 0,
        expiredApplications: 0,
        cancelledApplications: 0,
        rejectedApplications: 0,
        rejectedAssignments: 0,
        acceptedAssignments: 0,
        unverifiedUsersCount: 0
      },
      applications: [],
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
  // The tenant client can embed a base64 metadata token in special_requirements
  // (documents, fee state, etc). Strip it so the admin table never renders a
  // wall of base64 as if it were a requirement the applicant typed.
  return (data || []).map((row) => {
    const cleaned = String(row.special_requirements || '')
      .replace(/\n?\[(?:P4U_DATA|PLACE4U_APP_DATA):[A-Za-z0-9+/=]+\]/g, '')
      .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
      .trim()
    return { ...row, special_requirements: cleaned || null }
  })
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
  const selectClause = `
      *,
      tenant:users!applications_tenant_id_fkey(*),
      agent:users!applications_assigned_to_fkey(*)
    `

  // Reassignment always resets the previous agent's Accept/Reject response so the
  // (new) agent gets a fresh prompt and any prior rejection is cleared.
  const updatePayload = {
    assigned_to: agentId || null,
    // Database constraint allows: 'submitted', 'under_review', 'completed', 'expired'
    status: agentId ? 'under_review' : 'submitted',
    assignment_status: agentId ? 'assigned' : 'unassigned',
    assignment_assigned_at: agentId ? new Date().toISOString() : null,
    assignment_responded_at: null,
    assignment_rejection_reason: null
  }

  let { data, error } = await supabase
    .from('applications')
    .update(updatePayload)
    .eq('id', applicationId)
    .select(selectClause)
    .single()

  // Graceful fallback if the assignment-response columns have not been migrated yet.
  if (
    error &&
    /assignment_status|assignment_assigned_at|assignment_responded_at|assignment_rejection_reason|PGRST204|42703|schema cache/i.test(
      error.message || ''
    )
  ) {
    console.warn(
      'Assignment response columns missing — run database/agent_job_acceptance.sql. Falling back to assigned_to + status only.'
    )
    const retry = await supabase
      .from('applications')
      .update({ assigned_to: agentId || null, status: agentId ? 'under_review' : 'submitted' })
      .eq('id', applicationId)
      .select(selectClause)
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('Error assigning agent:', error)
    throw error
  }
  return data
}

// Applications whose assigned agent rejected the job and now need a new agent.
export const getApplicationsNeedingReassignment = async () => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, tenant_id, assigned_to, assignment_status, assignment_responded_at,
      assignment_rejection_reason, min_budget, max_budget, submitted_at,
      tenant:users!applications_tenant_id_fkey(full_name, email),
      agent:users!applications_assigned_to_fkey(full_name, email)
    `)
    .eq('assignment_status', 'rejected')
    .order('assignment_responded_at', { ascending: false })

  if (error) {
    // Columns not migrated yet — there is no reassignment queue to surface.
    return []
  }
  return data || []
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

// Admin officially approves an application completion
export const approveApplicationCompletion = async (applicationId, note = null) => {
  try {
    const { data, error } = await supabase.rpc('admin_approve_completion', {
      p_application_id: applicationId,
      p_note: note
    });
    if (!error && data) {
      return Array.isArray(data) ? data[0] : data;
    }
  } catch {}

  const nowIso = new Date().toISOString();
  let adminId = null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    adminId = authData?.user?.id || null;
  } catch {}

  const { data, error } = await supabase
    .from('applications')
    .update({
      status: 'completed',
      completion_approved_at: nowIso,
      completion_approved_by: adminId
    })
    .eq('id', applicationId)
    .select(`
      *,
      tenant:users!applications_tenant_id_fkey(*),
      agent:users!applications_assigned_to_fkey(*)
    `)
    .single();

  if (error) {
    // Fallback if completion_approved_at column not present in DB
    const { data: fbData, error: fbErr } = await supabase
      .from('applications')
      .update({ status: 'completed' })
      .eq('id', applicationId)
      .select(`
        *,
        tenant:users!applications_tenant_id_fkey(*),
        agent:users!applications_assigned_to_fkey(*)
      `)
      .single();
    if (fbErr) throw fbErr;
    return fbData;
  }
  return data;
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

// Approve or reject a landlord-submitted listing
export const setPropertyApprovalStatus = async (propertyId, status, { notes = null, reviewerId = null } = {}) => {
  const payload = {
    approval_status: status,
    approval_notes: notes,
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
    updated_at: new Date().toISOString(),
    // Approving makes the listing live to tenants; anything else keeps it offline.
    is_active: status === 'approved'
  }

  const { data, error } = await supabase
    .from('properties')
    .update(payload)
    .eq('id', propertyId)
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .single()

  if (error) {
    console.error('Error updating property approval status:', error)
    throw error
  }
  return data
}

// ============================================================================
// Property Approval Queue — landlord-submitted listings awaiting review
//   Lifecycle: draft -> pending_approval -> approved | rejected
//   (see database/property_approval_schema.sql)
// ============================================================================

// Every listing a landlord has submitted for approval (newest submission first).
export const getPropertySubmissions = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*, landlord:users!properties_landlord_id_fkey(*)')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Error fetching property submissions:', error)
    return []
  }
  return data || []
}

// Count of landlord listings still awaiting an admin decision (sidebar badge).
// Must mirror the review queue in getPropertySubmissions(): only listings that
// have actually been *submitted* for review count — an unsubmitted draft is the
// landlord's work-in-progress and is not waiting on the admin.
export const getPropertySubmissionCount = async () => {
  const { count, error } = await supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .in('approval_status', ['draft', 'pending_approval'])
    .not('landlord_id', 'is', null)
    .not('submitted_at', 'is', null)

  if (error) {
    console.warn('Could not count property submissions:', error.message)
    return 0
  }
  return count || 0
}

// Record an approval decision on a submitted listing (approve / reject).
export const reviewPropertySubmission = async (propertyId, status, opts = {}) =>
  setPropertyApprovalStatus(propertyId, status, opts)

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

export const getAdminAgentApplications = async () => {
  try {
    // The agent "application" IS the agent_profiles row — there is no separate
    // agent_applications table. Pull every submitted profile (the applicant's
    // data + verification state) and join the owning account for identity.
    let profileRows = []
    try {
      const { data: profiles } = await supabase
        .from('agent_profiles')
        .select('*')
      if (Array.isArray(profiles)) profileRows = profiles
    } catch {}

    let userRows = []
    try {
      const { data: users } = await supabase
        .from('users')
        .select('*')
      if (Array.isArray(users)) userRows = users
    } catch {}

    const usersById = new Map(userRows.map((u) => [u.id, u]))

    const list = profileRows.map((p) => {
      const u = usersById.get(p.user_id) || {}
      const vStatus = p.verification_status || (p.is_verified ? 'verified' : 'pending_review')

      return {
        id: p.user_id,
        user_id: p.user_id,
        profile_id: p.id,
        full_name: p.full_name || u.full_name || 'Agent Applicant',
        email: p.email || u.email || '',
        phone: p.phone || u.phone || '',
        id_number: p.id_number || u.id_number || null,
        address: p.address || null,
        city: p.city || null,
        province: p.province || 'Gauteng',
        postal_code: p.postal_code || null,
        agency_name: p.agency_name || 'Registered Agent',
        experience_years: p.experience_years ?? null,
        tax_number: p.tax_number || null,
        id_document_url: p.id_document_url || null,
        proof_of_residence_url: p.proof_of_residence_url || null,
        fidelity_fund_cert_url: p.fidelity_fund_cert_url || null,
        preferred_contact_method: p.preferred_contact_method || 'whatsapp',
        interview_time_slot: p.interview_time_slot || 'morning',
        verification_status: vStatus,
        is_verified: Boolean(p.is_verified ?? u.is_verified),
        submitted_at: p.submitted_at || u.created_at || new Date().toISOString(),
        verified_at: p.verified_at || (p.is_verified ? u.updated_at || u.created_at : null),
        interview_date: p.interview_date || null,
        rejection_reason: p.rejection_reason || null,
        admin_notes: 'Agent verification record synced from agent_profiles.'
      }
    })

    // Newest submissions first.
    list.sort(
      (a, b) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime()
    )

    return list
  } catch (err) {
    console.error('Error fetching agent applications:', err)
    return []
  }
}

// Update agent application status (Approve, Reject, Under Review)
export const updateAgentApplicationStatus = async (appIdOrUserId, newStatus, adminNotes = null) => {
  const isVerified = newStatus === 'verified'
  const now = new Date().toISOString()

  // Resolve the target user id from the identifier the UI passed.
  let targetUserId = appIdOrUserId && appIdOrUserId.length > 20 ? appIdOrUserId : null
  if (!targetUserId && appIdOrUserId && String(appIdOrUserId).includes('@')) {
    try {
      const { data: matched } = await supabase
        .from('users')
        .select('id')
        .eq('email', appIdOrUserId)
        .maybeSingle()
      targetUserId = matched?.id || null
    } catch {}
  }

  // 1. Sync is_verified to users table in Supabase
  try {
    if (targetUserId) {
      await supabase
        .from('users')
        .update({ is_verified: isVerified, updated_at: now })
        .eq('id', targetUserId)
    }
  } catch (err) {
    console.warn('Could not update users table for agent:', err)
  }

  // 2. Sync to agent_profiles table in Supabase
  try {
    if (targetUserId) {
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

  return {
    id: appIdOrUserId,
    user_id: targetUserId,
    verification_status: newStatus,
    is_verified: isVerified,
    verified_at: isVerified ? now : null,
    admin_notes: adminNotes
  }
}

// Schedule an interview for an agent applicant
export const scheduleAgentInterview = async (appIdOrUserId, interviewDate, interviewTimeSlot, notes = '') => {
  const targetUserId = appIdOrUserId && appIdOrUserId.length > 20 ? appIdOrUserId : null

  // Sync to agent_profiles if available
  try {
    if (targetUserId) {
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

  return {
    id: appIdOrUserId,
    user_id: targetUserId,
    verification_status: 'interview_scheduled',
    interview_date: interviewDate,
    interview_time_slot: interviewTimeSlot,
    admin_notes: notes
  }
}

// ========================================================
// LANDLORD APPLICATIONS & OWNERSHIP VERIFICATION MANAGEMENT
// ========================================================

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

    // 3. Build application records from real landlord accounts only. No seeded
    //    or simulated applications are injected — the database is the source.
    const list = []
    if (Array.isArray(realLandlords)) {
      for (const u of realLandlords) {
        const ownedProps = props.filter((p) => p.landlord_id === u.id)
        const portfolioValue = ownedProps.reduce((sum, p) => sum + (Number(p.price) || 0), 0)
        const lpRow = landlordProfileRows.find((lp) => lp.user_id === u.id)
        const vStatus = lpRow?.application_status || 'not_applied'

        list.push({
          id: u.id,
          user_id: u.id,
          full_name: u.full_name || 'Landlord Applicant',
          email: u.email,
          phone: u.phone || '0710000000',
          id_number: u.id_number || null,
          entity_type: 'Private Landlord',
          company_name: 'Direct Property Owner',
          tax_id: null,
          address: lpRow?.address || null,
          city: lpRow?.city || null,
          province: lpRow?.province || 'Gauteng',
          postal_code: lpRow?.postal_code || null,
          property_count: ownedProps.length || 1,
          estimated_portfolio_value: portfolioValue || 0,
          title_deed_url: lpRow?.ownership_doc_url || null,
          rates_taxes_url: lpRow?.rates_taxes_doc_url || null,
          id_document_url: lpRow?.id_document_url || null,
          verification_status: vStatus,
          application_status: vStatus,
          is_verified: Boolean(u.is_verified),
          id_verified: Boolean(u.is_verified),
          ownership_proof_verified: Boolean(u.is_verified),
          submitted_at: lpRow?.application_submitted_at || u.created_at || new Date().toISOString(),
          approved_at: u.is_verified ? u.updated_at || u.created_at : null,
          rejection_reason: lpRow?.rejection_reason || null,
          admin_notes: lpRow?.application_notes || 'Direct landlord registration synced from Supabase.'
        })
      }
    }

    // Documents sit in a private bucket — sign them for the review UI. A missing
    // document (null) stays null.
    return Promise.all(
      list.map(async (app) => ({
        ...app,
        title_deed_url: (await resolveDocumentUrl(app.title_deed_url, { bucket: LANDLORD_DOCUMENTS_BUCKET })) || app.title_deed_url || null,
        rates_taxes_url: (await resolveDocumentUrl(app.rates_taxes_url, { bucket: LANDLORD_DOCUMENTS_BUCKET })) || app.rates_taxes_url || null,
        id_document_url: (await resolveDocumentUrl(app.id_document_url, { bucket: LANDLORD_DOCUMENTS_BUCKET })) || app.id_document_url || null
      }))
    )
  } catch (err) {
    console.error('Error fetching landlord applications:', err)
    return []
  }
}

// Update landlord application status (Approved, Rejected, Under Review)
export const updateLandlordApplicationStatus = async (appIdOrUserId, newStatus, adminNotes = null) => {
  const isApproved = newStatus === 'approved'
  const now = new Date().toISOString()

  // Resolve the target user id from the identifier the UI passed (id, user_id, or email).
  let targetUserId =
    appIdOrUserId && String(appIdOrUserId).length > 20 && !String(appIdOrUserId).includes('@')
      ? appIdOrUserId
      : null
  const targetEmail =
    !targetUserId && appIdOrUserId && String(appIdOrUserId).includes('@') ? appIdOrUserId : null

  let userRow = null
  try {
    if (targetUserId) {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', targetUserId)
        .maybeSingle()
      userRow = data
    } else if (targetEmail) {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('email', targetEmail)
        .maybeSingle()
      userRow = data
      targetUserId = data?.id || null
    }
  } catch {}

  // 1. Sync is_verified to users table in Supabase
  try {
    if (targetUserId) {
      await supabase
        .from('users')
        .update({ is_verified: isApproved, updated_at: now })
        .eq('id', targetUserId)
    }
  } catch (err) {
    console.warn('Could not update users table for landlord:', err)
  }

  // 2. Sync to landlord_profiles table in Supabase if present
  try {
    if (targetUserId) {
      const updatePayload = {
        application_status: newStatus,
        account_status: isApproved ? 'active' : 'pending',
        id_verified: isApproved,
        ownership_proof_verified: isApproved,
        approved_at: isApproved ? now : null,
        rejection_reason: newStatus === 'rejected' ? (adminNotes || null) : null,
        updated_at: now
      }
      if (adminNotes !== null) updatePayload.application_notes = adminNotes

      const { data: updatedLP } = await supabase
        .from('landlord_profiles')
        .update(updatePayload)
        .eq('user_id', targetUserId)
        .select()

      // If no row exists yet to update, attempt an insert
      if (!updatedLP || updatedLP.length === 0) {
        await supabase
          .from('landlord_profiles')
          .insert([{
            user_id: targetUserId,
            landlord_code: `LD-${targetUserId.substring(0, 6).toUpperCase()}`,
            full_name: userRow?.full_name || 'Landlord',
            email: userRow?.email || targetEmail || null,
            application_status: newStatus,
            account_status: isApproved ? 'active' : 'pending',
            id_verified: isApproved,
            ownership_proof_verified: isApproved,
            approved_at: isApproved ? now : null,
            rejection_reason: newStatus === 'rejected' ? (adminNotes || null) : null,
            application_notes: adminNotes || null,
            created_at: now,
            updated_at: now
          }])
      }
    }
  } catch (lpErr) {
    console.warn('Notice syncing landlord_profiles table:', lpErr?.message)
  }

  return {
    id: appIdOrUserId,
    user_id: targetUserId,
    verification_status: newStatus,
    application_status: newStatus,
    is_verified: isApproved,
    approved_at: isApproved ? now : null,
    admin_notes: adminNotes
  }
}


