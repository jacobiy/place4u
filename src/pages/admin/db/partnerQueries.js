import { supabase } from '../../../utils/Supabase'

// ============================================================================
// Partners Management Queries
//   Schema: dev/partners_schema.sql (or database/partners_schema.sql)
//   Gracefully degrades to localStorage if schema migration is unapplied.
// ============================================================================

export const PARTNER_STATUS_CONFIG = {
  lead: {
    label: 'Lead',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
    color: '#64748b'
  },
  contacted: {
    label: 'Contacted',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    color: '#3b82f6'
  },
  meeting_scheduled: {
    label: 'Meeting Set',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    color: '#a855f7'
  },
  negotiating: {
    label: 'Negotiating',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
    color: '#f59e0b'
  },
  onboarding: {
    label: 'Onboarding',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    color: '#6366f1'
  },
  active: {
    label: 'Active',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    color: '#10b981'
  },
  paused: {
    label: 'Paused',
    bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    color: '#eab308'
  },
  inactive: {
    label: 'Inactive',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    color: '#f43f5e'
  },
  rejected: {
    label: 'Rejected',
    bg: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    color: '#ef4444'
  }
}

export const PARTNER_TYPE_OPTIONS = [
  { value: 'building_manager', label: 'Building Manager' },
  { value: 'caretaker', label: 'Caretaker' },
  { value: 'landlord', label: 'Landlord / Owner' },
  { value: 'developer', label: 'Property Developer' },
  { value: 'agency', label: 'Leasing Agency' },
  { value: 'institution', label: 'Institution / Campus' },
  { value: 'investor', label: 'Property Investor' },
  { value: 'other', label: 'Other' }
]

const LOCAL_STORAGE_KEY = 'place4u_partners_cache_v1'

const INITIAL_FALLBACK_PARTNERS = [
  {
    id: 'demo-p-1',
    first_name: 'Sipho',
    last_name: 'Dlamini',
    location: 'Braamfontein, JHB',
    building_name: 'Apex Student Living',
    partner_type: 'building_manager',
    status: 'active',
    phone: '+27 82 123 4567',
    email: 'sipho@apexliving.co.za',
    units_count: 120,
    commission_deal: '50% placement fee',
    notes: 'Manages 120 student units across 4 floors. Key Place4U contact.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'demo-p-2',
    first_name: 'Lerato',
    last_name: 'Mokoena',
    location: 'Auckland Park, JHB',
    building_name: 'Kingsway Court',
    partner_type: 'caretaker',
    status: 'onboarding',
    phone: '+27 73 987 6543',
    email: 'lerato.m@kingswaycourt.co.za',
    units_count: 45,
    commission_deal: 'R250 referral / unit',
    notes: 'Finalizing room inventory list. Meeting scheduled for next Tuesday.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'demo-p-3',
    first_name: 'Johan',
    last_name: 'Van Der Merwe',
    location: 'Hatfield, Pretoria',
    building_name: 'Varsity Lodge Hatfield',
    partner_type: 'landlord',
    status: 'lead',
    phone: '+27 84 555 1212',
    email: 'johan@varsitylodges.co.za',
    units_count: 250,
    commission_deal: 'Standard commission',
    notes: 'Owns 3 student blocks near UP campus. Initial email outreach sent.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString()
  }
]

const readLocalFallback = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_PARTNERS))
      return INITIAL_FALLBACK_PARTNERS
    }
    return JSON.parse(raw)
  } catch {
    return INITIAL_FALLBACK_PARTNERS
  }
}

const writeLocalFallback = (partners) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partners))
  } catch {
    // Ignore storage write issues
  }
}

const isMissingSchema = (err) =>
  /does not exist|schema cache|could not find the table|relation "public\.partners" does not exist/i.test(
    err?.message || ''
  )

/**
 * Fetch all partners from Supabase or localStorage fallback.
 */
export const getPartners = async () => {
  try {
    const { data, error } = await supabase
      .from('partners')
      .select('*, building:buildings(id, name, address, city)')
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingSchema(error)) {
        return { data: readLocalFallback(), isFallback: true, error: null }
      }
      console.warn('Error querying partners table:', error)
      return { data: readLocalFallback(), isFallback: true, error: error.message }
    }

    // Keep local cache fresh
    if (Array.isArray(data)) {
      writeLocalFallback(data)
    }

    return { data: data || [], isFallback: false, error: null }
  } catch (err) {
    return { data: readLocalFallback(), isFallback: true, error: err.message }
  }
}

/**
 * Create a new partner row.
 */
export const createPartner = async (payload) => {
  const clean = {
    first_name: String(payload.first_name || '').trim(),
    last_name: String(payload.last_name || '').trim(),
    location: String(payload.location || '').trim(),
    building_name: String(payload.building_name || '').trim(),
    building_id: payload.building_id || null,
    partner_type: payload.partner_type || 'building_manager',
    status: payload.status || 'lead',
    phone: String(payload.phone || '').trim(),
    email: String(payload.email || '').trim(),
    contact_person: String(payload.contact_person || '').trim(),
    units_count: Number(payload.units_count) || 0,
    commission_deal: String(payload.commission_deal || '').trim(),
    notes: String(payload.notes || '').trim()
  }

  if (!clean.first_name) {
    return { success: false, error: 'Name is required' }
  }

  try {
    const { data, error } = await supabase
      .from('partners')
      .insert([clean])
      .select('*, building:buildings(id, name, address, city)')
      .single()

    if (error) {
      if (isMissingSchema(error)) {
        const fallbackList = readLocalFallback()
        const newRecord = {
          ...clean,
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        fallbackList.unshift(newRecord)
        writeLocalFallback(fallbackList)
        return { success: true, data: newRecord, isFallback: true }
      }
      return { success: false, error: error.message }
    }

    return { success: true, data, isFallback: false }
  } catch (err) {
    const fallbackList = readLocalFallback()
    const newRecord = {
      ...clean,
      id: `local-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    fallbackList.unshift(newRecord)
    writeLocalFallback(fallbackList)
    return { success: true, data: newRecord, isFallback: true }
  }
}

/**
 * Update an existing partner row.
 */
export const updatePartner = async (id, updates) => {
  if (!id) return { success: false, error: 'Missing partner id' }

  const clean = { ...updates, updated_at: new Date().toISOString() }

  try {
    const { data, error } = await supabase
      .from('partners')
      .update(clean)
      .eq('id', id)
      .select('*, building:buildings(id, name, address, city)')
      .single()

    if (error) {
      if (isMissingSchema(error)) {
        const fallbackList = readLocalFallback()
        const index = fallbackList.findIndex((p) => p.id === id)
        if (index >= 0) {
          fallbackList[index] = { ...fallbackList[index], ...clean }
          writeLocalFallback(fallbackList)
          return { success: true, data: fallbackList[index], isFallback: true }
        }
      }
      return { success: false, error: error.message }
    }

    return { success: true, data, isFallback: false }
  } catch (err) {
    const fallbackList = readLocalFallback()
    const index = fallbackList.findIndex((p) => p.id === id)
    if (index >= 0) {
      fallbackList[index] = { ...fallbackList[index], ...clean }
      writeLocalFallback(fallbackList)
      return { success: true, data: fallbackList[index], isFallback: true }
    }
    return { success: false, error: err.message }
  }
}

/**
 * Delete a partner row.
 */
export const deletePartner = async (id) => {
  if (!id) return { success: false, error: 'Missing partner id' }

  try {
    const { error } = await supabase.from('partners').delete().eq('id', id)

    // Always update fallback as well
    const fallbackList = readLocalFallback()
    const filtered = fallbackList.filter((p) => p.id !== id)
    writeLocalFallback(filtered)

    if (error && !isMissingSchema(error)) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const fallbackList = readLocalFallback()
    const filtered = fallbackList.filter((p) => p.id !== id)
    writeLocalFallback(filtered)
    return { success: true }
  }
}

/**
 * Helper to export partners list as CSV format
 */
export const exportPartnersToCSV = (partners = []) => {
  const headers = [
    'Name',
    'Surname',
    'Location',
    'Building Name',
    'Status',
    'Partner Type',
    'Phone',
    'Email',
    'Units Count',
    'Commission Deal',
    'Notes',
    'Created At'
  ]

  const rows = partners.map((p) => [
    `"${(p.first_name || '').replace(/"/g, '""')}"`,
    `"${(p.last_name || '').replace(/"/g, '""')}"`,
    `"${(p.location || '').replace(/"/g, '""')}"`,
    `"${(p.building_name || p.building?.name || '').replace(/"/g, '""')}"`,
    `"${(p.status || '').replace(/"/g, '""')}"`,
    `"${(p.partner_type || '').replace(/"/g, '""')}"`,
    `"${(p.phone || '').replace(/"/g, '""')}"`,
    `"${(p.email || '').replace(/"/g, '""')}"`,
    p.units_count || 0,
    `"${(p.commission_deal || '').replace(/"/g, '""')}"`,
    `"${(p.notes || '').replace(/"/g, '""')}"`,
    `"${p.created_at || ''}"`
  ])

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `place4u_partners_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
