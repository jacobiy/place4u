import { supabase } from '../../../utils/Supabase'

// Columns shown on the public landing page. The landlord embed gives us the
// verified owner's display name for the trust badge.
const SELECT_WITH_LANDLORD = `
  id, address, area, city, province, property_type, price,
  bedrooms, bathrooms, furnished, pet_friendly, available_from,
  image_urls, image_url, is_active, approval_status, created_at,
  landlord:users!properties_landlord_id_fkey(full_name)
`

/**
 * Fetch live, publicly listable properties for the marketing landing page.
 *
 * Only approved + active listings are returned. The function degrades
 * gracefully across environments: it retries without the approval filter if the
 * approval columns have not been migrated, and retries with a bare `select('*')`
 * if the landlord embed (or anon RLS on `users`) is unavailable.
 *
 * @returns {Promise<Array|null>} rows on success (possibly empty), or `null`
 *   when every query attempt failed (e.g. the table is unreadable).
 */
export const getFeaturedProperties = async ({ limit = 24 } = {}) => {
  const attempts = [
    { select: SELECT_WITH_LANDLORD, approvedOnly: true },
    { select: SELECT_WITH_LANDLORD, approvedOnly: false },
    { select: '*', approvedOnly: true },
    { select: '*', approvedOnly: false }
  ]

  for (const { select, approvedOnly } of attempts) {
    let query = supabase
      .from('properties')
      .select(select)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (approvedOnly) query = query.eq('approval_status', 'approved')

    const { data, error } = await query
    if (!error) return data || []
  }

  console.warn(
    'Could not load live properties for the landing page. Ensure the properties table is publicly readable (see database/public_listings_read.sql).'
  )
  return null
}
