/**
 * Listing taxonomy — the single source of truth for how a listing describes
 * *what* it is and *who* may rent it.
 *
 * Same rule as src/services/applicationStatus.js: one vocabulary, imported
 * everywhere, so the admin registry, the landlord upload form, the review queue
 * and the public landing page cannot drift apart.
 *
 * Values mirror the database (database/buildings_and_units_schema.sql):
 *   properties.property_type    free text, but these are the supported values
 *   properties.tenant_allowed   text[] restricted to TENANT_ALLOWED_VALUES
 *   properties.building_id      set for room-type listings
 */

/* ------------------------------------------------------------------ *
 * Property types
 * ------------------------------------------------------------------ */

export const PROPERTY_TYPE_OPTIONS = [
  { value: 'student', label: 'Student Accommodation', short: 'Student', group: 'Student', isRoomBased: true },
  { value: 'room', label: 'Room / Digs', short: 'Room', group: 'Student', isRoomBased: true },
  { value: 'apartment', label: 'Apartment', short: 'Apartment', group: 'Residential' },
  { value: 'townhouse', label: 'Townhouse', short: 'Townhouse', group: 'Residential' },
  { value: 'house', label: 'House', short: 'House', group: 'Residential' },
  { value: 'studio', label: 'Studio', short: 'Studio', group: 'Residential' },
  { value: 'condo', label: 'Condo', short: 'Condo', group: 'Residential' },
  { value: 'penthouse', label: 'Penthouse', short: 'Penthouse', group: 'Residential' },
  { value: 'backroom', label: 'Backroom / Cottage', short: 'Backroom', group: 'Residential' },
  { value: 'commercial', label: 'Commercial Space', short: 'Commercial', group: 'Commercial' }
]

const PROPERTY_TYPE_MAP = Object.fromEntries(
  PROPERTY_TYPE_OPTIONS.map((option) => [option.value, option])
)

export const PROPERTY_TYPE_VALUES = PROPERTY_TYPE_OPTIONS.map((o) => o.value)

/** Types that must belong to a building (a room cannot exist on its own). */
export const ROOM_BASED_PROPERTY_TYPES = PROPERTY_TYPE_OPTIONS
  .filter((o) => o.isRoomBased)
  .map((o) => o.value)

export const isRoomBasedType = (propertyType) =>
  ROOM_BASED_PROPERTY_TYPES.includes(normalizePropertyType(propertyType))

export const normalizePropertyType = (propertyType) =>
  String(propertyType || '').trim().toLowerCase()

/** Human label, falling back to a title-cased version of whatever is stored. */
export const propertyTypeLabel = (propertyType) => {
  const value = normalizePropertyType(propertyType)
  if (!value) return 'Residence'
  if (PROPERTY_TYPE_MAP[value]) return PROPERTY_TYPE_MAP[value].label
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Compact label for chips and table cells. */
export const propertyTypeShortLabel = (propertyType) => {
  const value = normalizePropertyType(propertyType)
  if (!value) return 'Residence'
  if (PROPERTY_TYPE_MAP[value]) return PROPERTY_TYPE_MAP[value].short
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/* ------------------------------------------------------------------ *
 * Who the room is let to
 * ------------------------------------------------------------------ */

/**
 * Permitted values for properties.tenant_allowed. Kept deliberately small —
 * the DB check constraint rejects anything outside this list, so adding an
 * option here means also extending that constraint.
 */
export const TENANT_ALLOWED_OPTIONS = [
  { value: 'student', label: 'Student', hint: 'Enrolled at a tertiary institution' },
  { value: 'working_professional', label: 'Working professional', hint: 'Employed, non-student' }
]

export const TENANT_ALLOWED_VALUES = TENANT_ALLOWED_OPTIONS.map((o) => o.value)

const TENANT_ALLOWED_MAP = Object.fromEntries(
  TENANT_ALLOWED_OPTIONS.map((option) => [option.value, option.label])
)

/** Keep only known values, de-duplicated, in canonical order. */
export const normalizeTenantAllowed = (value) => {
  const list = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? value.split(',')
      : []

  const cleaned = list
    .map((entry) => String(entry || '').trim().toLowerCase())
    .filter((entry) => TENANT_ALLOWED_VALUES.includes(entry))

  return TENANT_ALLOWED_VALUES.filter((entry) => cleaned.includes(entry))
}

export const tenantAllowedLabel = (value) =>
  TENANT_ALLOWED_MAP[normalizeTenantAllowed(value)[0]] || null

/** e.g. ["student", "working_professional"] -> "Students & working professionals" */
export const tenantAllowedSummary = (value) => {
  const list = normalizeTenantAllowed(value)
  if (list.length === 0) return 'Open to all tenants'
  if (list.length === TENANT_ALLOWED_VALUES.length) return 'Students & working professionals'
  return list
    .map((entry) => `${TENANT_ALLOWED_MAP[entry]}s`)
    .join(' · ')
}

/* ------------------------------------------------------------------ *
 * Buildings & room types
 * ------------------------------------------------------------------ */

export const BUILDING_TYPE_OPTIONS = [
  { value: 'student_residence', label: 'Student residence' },
  { value: 'apartment_block', label: 'Apartment block' },
  { value: 'mixed_use', label: 'Mixed use' },
  { value: 'house_share', label: 'Shared house' },
  { value: 'commercial', label: 'Commercial' }
]

const BUILDING_TYPE_MAP = Object.fromEntries(
  BUILDING_TYPE_OPTIONS.map((option) => [option.value, option.label])
)

export const buildingTypeLabel = (value) =>
  BUILDING_TYPE_MAP[value] || 'Building'

/**
 * Ready-made room type templates, offered as one-click presets when an admin
 * defines the room types inside a building. Rent/deposit stay editable.
 */
export const ROOM_TYPE_PRESETS = [
  {
    name: 'Single Ensuite',
    description: 'Private room with its own bathroom.',
    bedrooms: 1,
    bathrooms: 1,
    capacity: 1,
    ensuite: true,
    furnished: true
  },
  {
    name: 'Single Shared Bathroom',
    description: 'Private room sharing a bathroom with the floor.',
    bedrooms: 1,
    bathrooms: 1,
    capacity: 1,
    ensuite: false,
    furnished: true
  },
  {
    name: 'Sharing Double',
    description: 'Two occupants per room, twin beds.',
    bedrooms: 1,
    bathrooms: 1,
    capacity: 2,
    ensuite: false,
    furnished: true
  },
  {
    name: 'Studio Unit',
    description: 'Self-contained room with kitchenette and en-suite bathroom.',
    bedrooms: 1,
    bathrooms: 1,
    capacity: 1,
    ensuite: true,
    furnished: true
  }
]

/**
 * Build the room labels for a bulk generation run.
 * prefix + start number -> ["Room 1", "Room 2", ...]
 * Numbers are the room's ordinal inside the building, not a global id.
 */
export const buildRoomLabels = ({ prefix = 'Room', startNumber = 1, count = 1 } = {}) => {
  const safePrefix = String(prefix || '').trim() || 'Room'
  const start = Number.isFinite(Number(startNumber)) ? Math.max(1, Math.floor(Number(startNumber))) : 1
  const total = Number.isFinite(Number(count)) ? Math.max(1, Math.floor(Number(count))) : 1
  return Array.from({ length: total }, (_, index) => `${safePrefix} ${start + index}`)
}

/** Display name for a room row: "Room 12 · Single Ensuite". */
export const listingDisplayName = (listing = {}) => {
  const parts = [listing.unit_label, listing.title].filter(Boolean)
  return parts.length > 0 ? parts[0] : propertyTypeLabel(listing.property_type)
}
