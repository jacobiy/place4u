// One application, several homes.
//
// Place4U's purpose is relocation matching: a tenant should not have to submit
// (and pay for) a separate application per listing. Instead they collect the
// properties they would accept and bundle them into a single application, so
// the matching agent can review every option together.
//
// This module is the single client-side source for that collection. It mirrors
// the existing `place4u_saved_properties` wishlist pattern:
//   * the shortlist is persisted in localStorage so it survives navigation,
//   * it stores a small property snapshot (id + label + location + price) because
//     the catalogue may not be loaded on the screen that reads it,
//   * nothing here is authoritative for authorization — it is a tenant-side
//     basket, and the application row remains DB-authoritative on submit.

import {
  describeProperty,
  describePropertyLocation,
  isGenericPropertyTitle
} from '../utils/propertyLabel';

export const APPLICATION_PROPERTIES_STORAGE_KEY = 'place4u_application_properties';

const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const readRaw = () => {
  if (!hasStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(APPLICATION_PROPERTIES_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Reduce whatever we were handed (a property row, or a previously stored
 * snapshot) to the small, stable shape the basket stores.
 */
export const toApplicationPropertyEntry = (property) => {
  if (!property || typeof property !== 'object') return null;

  const rawId = property.id ?? property.property_id ?? null;
  const label =
    property.label ||
    describeProperty(property) ||
    (!isGenericPropertyTitle(property.property_title) ? property.property_title : null);

  if (rawId == null && !label) return null;

  const price = Number(property.price);
  return {
    // Keep the raw id for API calls; compare with String() elsewhere because
    // some legacy listings were snapshotted with numeric ids.
    id: rawId != null ? rawId : label,
    label: label || 'Property',
    location: property.location || describePropertyLocation(property) || null,
    property_type: property.property_type || null,
    price: Number.isFinite(price) && price > 0 ? price : null
  };
};

const sameProperty = (entry, property) => {
  if (!entry || !property) return false;
  const entryId = entry.id ?? entry.property_id ?? entry.label;
  const wantedId = property.id ?? property.property_id ?? property.label;
  if (entryId != null && wantedId != null) {
    return String(entryId) === String(wantedId);
  }
  return Boolean(entry.label) && entry.label === wantedId;
};

/** Read the current basket, normalised and de-duplicated. */
export const loadApplicationProperties = () => {
  const seen = new Set();
  const entries = [];
  readRaw().forEach((raw) => {
    const entry = toApplicationPropertyEntry(raw);
    if (!entry) return;
    const key = String(entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  });
  return entries;
};

const persist = (entries) => {
  const seen = new Set();
  const clean = [];
  (Array.isArray(entries) ? entries : []).forEach((raw) => {
    const entry = toApplicationPropertyEntry(raw);
    if (!entry) return;
    const key = String(entry.id);
    if (seen.has(key)) return;
    seen.add(key);
    clean.push(entry);
  });

  if (hasStorage()) {
    try {
      window.localStorage.setItem(APPLICATION_PROPERTIES_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // Quota/private-mode failures must not break the application form.
    }
  }
  return clean;
};

/** Replace the basket wholesale (used by the application form). */
export const saveApplicationProperties = (entries) => persist(entries);

export const isInApplication = (entries, property) =>
  (Array.isArray(entries) ? entries : []).some((entry) => sameProperty(entry, property));

/**
 * Add/remove a property from the basket. Returns the new list so callers can
 * keep React state in sync without a second read.
 */
export const toggleApplicationProperty = (property) => {
  const current = loadApplicationProperties();
  const exists = current.some((entry) => sameProperty(entry, property));
  if (exists) return persist(current.filter((entry) => !sameProperty(entry, property)));

  const entry = toApplicationPropertyEntry(property);
  if (!entry) return current;
  return persist([...current, entry]);
};

export const removeApplicationProperty = (propertyOrId) => {
  const target = typeof propertyOrId === 'object' ? propertyOrId : { id: propertyOrId };
  return persist(loadApplicationProperties().filter((entry) => !sameProperty(entry, target)));
};

/** Called after a successful submission — the basket has become an application. */
export const clearApplicationProperties = () => persist([]);
