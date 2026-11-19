import { supabase } from '../../../utils/Supabase'
import { normalizeTenantAllowed } from '../../../services/listingTaxonomy'

// ============================================================================
// Buildings, room types and bulk room generation
//   Schema: database/buildings_and_units_schema.sql
//
//   One building holds many room types, and each room stays a `properties` row
//   carrying building_id + room_type_id + unit_label. That keeps applications,
//   matches, payments and leases pointing at a single lettable unit.
//
//   Reads degrade to [] and writes to a readable error when the migration has
//   not been applied yet, so the rest of the admin registry keeps working on a
//   database that is one migration behind.
// ============================================================================

const missingBuildingSchema = (error) =>
  /does not exist|schema cache|Could not find the table/i.test(error?.message || '')

const BUILDING_FRIENDLY_ERROR =
  'Buildings are not available yet. Run database/buildings_and_units_schema.sql in the Supabase SQL editor first.'

export const getBuildings = async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select('*, landlord:users!buildings_landlord_id_fkey(id, full_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    if (!missingBuildingSchema(error)) console.error('Error fetching buildings:', error)
    return []
  }
  return data || []
}

// Rooms across every building (or one building). Only the columns the registry
// needs, so a large portfolio stays a light query.
export const getBuildingRooms = async (buildingId = null) => {
  let request = supabase
    .from('properties')
    .select('id, title, building_id, room_type_id, unit_label, price, is_active, occupied, property_type, tenant_allowed, approval_status, created_at')

  request = buildingId ? request.eq('building_id', buildingId) : request.not('building_id', 'is', null)

  const { data, error } = await request.order('unit_label', { ascending: true })
  if (error) {
    if (!missingBuildingSchema(error)) console.error('Error fetching building rooms:', error)
    return []
  }
  return data || []
}

export const createAdminBuilding = async (buildingData) => {
  const payload = {
    name: String(buildingData.name || '').trim(),
    description: String(buildingData.description || '').trim() || null,
    property_type: buildingData.property_type || 'student_residence',
    address: String(buildingData.address || '').trim(),
    area: String(buildingData.area || '').trim() || null,
    city: String(buildingData.city || '').trim() || null,
    province: String(buildingData.province || '').trim() || null,
    postal_code: String(buildingData.postal_code || '').trim() || null,
    landlord_id: buildingData.landlord_id || null,
    amenities: Array.isArray(buildingData.amenities) ? buildingData.amenities : [],
    image_urls: Array.isArray(buildingData.image_urls) ? buildingData.image_urls : [],
    is_active: buildingData.is_active !== undefined ? Boolean(buildingData.is_active) : true,
    notes: String(buildingData.notes || '').trim() || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('buildings')
    .insert([payload])
    .select('*, landlord:users!buildings_landlord_id_fkey(id, full_name, email)')
    .single()

  if (error) {
    console.error('Error creating building:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return data
}

export const updateAdminBuilding = async (buildingId, updates) => {
  const payload = { ...updates, updated_at: new Date().toISOString() }

  const { data, error } = await supabase
    .from('buildings')
    .update(payload)
    .eq('id', buildingId)
    .select('*, landlord:users!buildings_landlord_id_fkey(id, full_name, email)')
    .single()

  if (error) {
    console.error('Error updating building:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return data
}

export const deleteAdminBuilding = async (buildingId) => {
  const { error } = await supabase.from('buildings').delete().eq('id', buildingId)
  if (error) {
    console.error('Error deleting building:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return true
}

export const getBuildingRoomTypes = async (buildingId) => {
  if (!buildingId) return []
  const { data, error } = await supabase
    .from('building_room_types')
    .select('*')
    .eq('building_id', buildingId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    if (!missingBuildingSchema(error)) console.error('Error fetching room types:', error)
    return []
  }
  return data || []
}

export const createBuildingRoomType = async (roomTypeData) => {
  const payload = {
    building_id: roomTypeData.building_id,
    name: String(roomTypeData.name || '').trim(),
    description: String(roomTypeData.description || '').trim() || null,
    rent: Number(roomTypeData.rent) || 0,
    deposit: roomTypeData.deposit === '' || roomTypeData.deposit == null ? null : Number(roomTypeData.deposit),
    bedrooms: Number(roomTypeData.bedrooms) || 1,
    bathrooms: Number(roomTypeData.bathrooms) || 1,
    capacity: Math.max(1, Number(roomTypeData.capacity) || 1),
    size: String(roomTypeData.size || '').trim() || null,
    furnished: roomTypeData.furnished !== undefined ? Boolean(roomTypeData.furnished) : true,
    ensuite: Boolean(roomTypeData.ensuite),
    amenities: Array.isArray(roomTypeData.amenities) ? roomTypeData.amenities : [],
    is_active: roomTypeData.is_active !== undefined ? Boolean(roomTypeData.is_active) : true,
    sort_order: Number(roomTypeData.sort_order) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('building_room_types')
    .insert([payload])
    .select('*')
    .single()

  if (error) {
    console.error('Error creating room type:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return data
}

export const updateBuildingRoomType = async (roomTypeId, updates) => {
  const { data, error } = await supabase
    .from('building_room_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roomTypeId)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating room type:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return data
}

export const deleteBuildingRoomType = async (roomTypeId) => {
  const { error } = await supabase.from('building_room_types').delete().eq('id', roomTypeId)
  if (error) {
    console.error('Error deleting room type:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return true
}

// Generate the lettable rooms for a room type in one insert.
// Each room inherits the building address and the room type's commercial terms.
export const generateBuildingRooms = async ({ building, roomType, labels, tenantAllowed = [], availableFrom = null }) => {
  if (!building?.id || !roomType?.id) throw new Error('Pick a building and a room type first.')
  const list = Array.isArray(labels) ? labels.filter(Boolean) : []
  if (list.length === 0) throw new Error('Nothing to generate — the room list is empty.')

  // Student residences list as "Student Accommodation"; everything else as a
  // plain room. Both are room-based, so both require the building link.
  const propertyType = building.property_type === 'student_residence' ? 'student' : 'room'
  const now = new Date().toISOString()

  const rows = list.map((label) => ({
    landlord_id: building.landlord_id || null,
    building_id: building.id,
    room_type_id: roomType.id,
    unit_label: label,
    title: `${building.name} — ${label}`,
    description: roomType.description || building.description || null,
    property_type: propertyType,
    address: building.address,
    area: building.area || null,
    city: building.city || null,
    province: building.province || null,
    postal_code: building.postal_code || null,
    price: Number(roomType.rent) || 0,
    deposit_amount: roomType.deposit != null ? Number(roomType.deposit) : null,
    bedrooms: Number(roomType.bedrooms) || 1,
    bathrooms: Number(roomType.bathrooms) || 1,
    size: roomType.size || null,
    furnished: Boolean(roomType.furnished),
    max_occupants: Math.max(1, Number(roomType.capacity) || 1),
    amenities: Array.isArray(roomType.amenities) && roomType.amenities.length > 0
      ? roomType.amenities
      : (Array.isArray(building.amenities) ? building.amenities : []),
    image_urls: Array.isArray(building.image_urls) ? building.image_urls : [],
    tenant_allowed: normalizeTenantAllowed(tenantAllowed),
    available_from: availableFrom || null,
    is_active: true,
    approval_status: 'approved',
    created_at: now,
    updated_at: now
  }))

  const { data, error } = await supabase.from('properties').insert(rows).select('id')
  if (error) {
    console.error('Error generating rooms:', error)
    throw new Error(missingBuildingSchema(error) ? BUILDING_FRIENDLY_ERROR : error.message)
  }
  return data || []
}
