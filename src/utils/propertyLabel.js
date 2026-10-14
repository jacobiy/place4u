// Single source of truth for naming a property to a human.
//
// public.properties has no `title` / `name` column — a listing's readable
// identity is built from its address / area / city / type fields. Every
// surface that answers "which property was this application for?" must go
// through these helpers, otherwise the label silently degrades to a generic
// placeholder (which is exactly how applications used to lose their property).

const GENERIC_TITLES = [
  'residential rental application',
  'student accommodation application',
  'selected rental property',
  'rental application',
  'rental unit',
  'property details',
  'apartment',
  'property'
];

/** True when `title` carries no useful property identity. */
export const isGenericPropertyTitle = (title) => {
  if (title == null) return true;
  const value = String(title).trim().toLowerCase();
  if (!value) return true;
  return GENERIC_TITLES.includes(value);
};

/**
 * Build a readable property label from whatever real fields exist, e.g.
 * "2 Bed Apartment · 12 Main Rd, Sandton, Gauteng". Returns null when there is
 * nothing meaningful to show.
 */
export const describeProperty = (property) => {
  if (!property || typeof property !== 'object') return null;

  const explicit = property.title || property.name;
  if (explicit && !isGenericPropertyTitle(explicit)) return String(explicit).trim();

  const parts = [property.address, property.area, property.city, property.province]
    .map((part) => (part == null ? '' : String(part).trim()))
    .filter(Boolean)
    // address frequently repeats the suburb/city — drop the duplicates
    .filter((part, index, all) => all.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index);

  const type = property.bedrooms
    ? `${property.bedrooms} Bed ${property.property_type || 'Property'}`
    : property.property_type || '';

  const location = parts.join(', ');
  if (type && location) return `${type} · ${location}`;
  return location || type || property.location || null;
};

/** Short "12 Main Rd, Sandton" style location line, or null. */
export const describePropertyLocation = (property) => {
  if (!property || typeof property !== 'object') return null;
  const address = property.address ? String(property.address).trim() : '';
  const area = property.city || property.area || property.location;
  const parts = [address, area ? String(area).trim() : '']
    .filter(Boolean)
    .filter((part, index, all) => all.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index);
  return parts.join(', ') || null;
};

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

/**
 * Work out which property an application is actually for.
 *
 * Prefers the immutable `property_id` link, then falls back to matching the
 * stored title snapshot so rows persisted before the link existed still
 * resolve. `isLinked` is true when the application targets a specific
 * property (even if we only have its snapshot label).
 */
export const resolveApplicationProperty = (application, properties = []) => {
  const none = { property: null, label: null, isLinked: false, source: 'none' };
  if (!application) return none;

  const list = Array.isArray(properties) ? properties : [];

  if (application.property_id != null) {
    const byId = list.find((p) => sameId(p?.id, application.property_id));
    if (byId) {
      return { property: byId, label: describeProperty(byId), isLinked: true, source: 'id' };
    }
  }

  if (!isGenericPropertyTitle(application.property_title)) {
    const wanted = String(application.property_title).trim().toLowerCase();
    const byTitle = list.find((p) => (describeProperty(p) || '').toLowerCase() === wanted);
    if (byTitle) {
      return { property: byTitle, label: describeProperty(byTitle), isLinked: true, source: 'title' };
    }
    // We know the property by its recorded name, but its row is not loaded here.
    return {
      property: null,
      label: String(application.property_title).trim(),
      isLinked: application.property_id != null,
      source: 'snapshot'
    };
  }

  return {
    property: null,
    label: null,
    isLinked: application.property_id != null,
    source: 'unresolved'
  };
};
