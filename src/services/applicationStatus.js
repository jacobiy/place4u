/**
 * Place4U — Application Status (single source of truth)
 *
 * The `applications.status` column drives the tenant, agent, landlord and admin
 * dashboards. Before this module each dashboard hard-coded its own status list,
 * labels and colours, so a status written by one portal could render as a raw
 * string — or be dropped entirely — in another (e.g. `matches_found` on admin,
 * `cancelled` on the agent, `rejected` on the tenant). Everything that reads or
 * writes an application status must go through this module so the four
 * dashboards agree on the vocabulary.
 *
 * Lifecycle:
 *   submitted → under_review → matches_found → completed
 *                     └──────────────┴──────────────→ expired
 *   cancelled / rejected are terminal, actor-initiated exits.
 */

export const APPLICATION_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  MATCHES_FOUND: 'matches_found',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
});

/** Ordered for filter pills / pipeline charts. Only the open funnel is charted. */
export const APPLICATION_STATUS_ORDER = Object.freeze([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.MATCHES_FOUND,
  APPLICATION_STATUS.COMPLETED,
  APPLICATION_STATUS.EXPIRED,
  APPLICATION_STATUS.CANCELLED,
  APPLICATION_STATUS.REJECTED
]);

/** The statuses an application can be *moved into* from the admin UI. */
export const SELECTABLE_APPLICATION_STATUSES = Object.freeze([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.MATCHES_FOUND,
  APPLICATION_STATUS.COMPLETED,
  APPLICATION_STATUS.EXPIRED,
  APPLICATION_STATUS.CANCELLED,
  APPLICATION_STATUS.REJECTED
]);

/** The statuses an agent can directly select. Note: COMPLETED requires admin approval. */
export const AGENT_SELECTABLE_APPLICATION_STATUSES = Object.freeze([
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.MATCHES_FOUND,
  APPLICATION_STATUS.CANCELLED,
  APPLICATION_STATUS.REJECTED
]);

export const ADMIN_SELECTABLE_APPLICATION_STATUSES = SELECTABLE_APPLICATION_STATUSES;

/**
 * Presentation + state metadata for each status.
 *  - label:      human label, identical everywhere.
 *  - tone:       semantic bucket ('amber' | 'blue' | 'indigo' | 'emerald' | 'slate' | 'rose').
 *  - hex:        accent colour for dark dashboards (agent/landlord).
 *  - tailwind:   pill classes for the light Tailwind dashboards (admin/tenant).
 *  - active:     counts toward the tenant's "active applications" badge.
 *  - closed:     terminal — no further work expected.
 *  - actor:      who normally sets the status.
 */
export const APPLICATION_STATUS_META = Object.freeze({
  [APPLICATION_STATUS.SUBMITTED]: {
    label: 'Submitted',
    tone: 'amber',
    hex: '#f59e0b',
    tailwind: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    active: true,
    closed: false,
    actor: 'tenant',
    description: 'Application received and awaiting review.'
  },
  [APPLICATION_STATUS.UNDER_REVIEW]: {
    label: 'Under Review',
    tone: 'blue',
    hex: '#4f7ef8',
    tailwind: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    active: true,
    closed: false,
    actor: 'admin',
    description: 'Assigned and being processed.'
  },
  [APPLICATION_STATUS.MATCHES_FOUND]: {
    label: 'Matches Found',
    tone: 'indigo',
    hex: '#22d3ee',
    tailwind: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    active: true,
    closed: false,
    actor: 'agent',
    description: 'A property shortlist has been shipped to the tenant.'
  },
  [APPLICATION_STATUS.COMPLETED]: {
    label: 'Completed',
    tone: 'emerald',
    hex: '#10b981',
    tailwind: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    active: true,
    closed: true,
    actor: 'landlord',
    description: 'Placement concluded — tenant approved and assigned.'
  },
  [APPLICATION_STATUS.EXPIRED]: {
    label: 'Expired',
    tone: 'slate',
    hex: '#64748b',
    tailwind: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    active: false,
    closed: true,
    actor: 'admin',
    description: 'The application lapsed without a placement.'
  },
  [APPLICATION_STATUS.CANCELLED]: {
    label: 'Cancelled',
    tone: 'rose',
    hex: '#ef4444',
    tailwind: 'bg-rose-50 text-rose-600 border-rose-200',
    dot: 'bg-rose-500',
    active: false,
    closed: true,
    actor: 'tenant',
    description: 'Withdrawn by the applicant.'
  },
  [APPLICATION_STATUS.REJECTED]: {
    label: 'Rejected',
    tone: 'rose',
    hex: '#ef4444',
    tailwind: 'bg-rose-50 text-rose-600 border-rose-200',
    dot: 'bg-rose-500',
    active: false,
    closed: true,
    actor: 'landlord',
    description: 'Declined during review.'
  }
});

/** default bucket used when a legacy/unknown status reaches the UI. */
const FALLBACK_META = Object.freeze({
  label: 'Unknown',
  tone: 'slate',
  hex: '#6b7280',
  tailwind: 'bg-slate-50 text-slate-600 border-slate-200',
  dot: 'bg-slate-400',
  active: true,
  closed: false,
  actor: 'system',
  description: ''
});

/**
 * Aliases seen in older rows, embedded metadata tokens and sibling portals.
 * Keeps the vocabulary converged without a destructive DB migration.
 */
const STATUS_ALIASES = Object.freeze({
  new: APPLICATION_STATUS.SUBMITTED,
  pending: APPLICATION_STATUS.SUBMITTED,
  received: APPLICATION_STATUS.SUBMITTED,
  pending_review: APPLICATION_STATUS.UNDER_REVIEW,
  in_review: APPLICATION_STATUS.UNDER_REVIEW,
  review: APPLICATION_STATUS.UNDER_REVIEW,
  assigned: APPLICATION_STATUS.UNDER_REVIEW,
  matched: APPLICATION_STATUS.MATCHES_FOUND,
  matches: APPLICATION_STATUS.MATCHES_FOUND,
  property_matched: APPLICATION_STATUS.MATCHES_FOUND,
  approved: APPLICATION_STATUS.COMPLETED,
  placed: APPLICATION_STATUS.COMPLETED,
  success: APPLICATION_STATUS.COMPLETED,
  closed: APPLICATION_STATUS.COMPLETED,
  declined: APPLICATION_STATUS.REJECTED,
  declined_by_landlord: APPLICATION_STATUS.REJECTED,
  withdrawn: APPLICATION_STATUS.CANCELLED
});

/**
 * Coerce any raw value to a canonical application status.
 * Unknown values fall back to `submitted` (the DB default) so a stray value
 * never renders as an empty pill.
 */
export function normalizeApplicationStatus(raw) {
  if (raw === null || raw === undefined || raw === '') return APPLICATION_STATUS.SUBMITTED;
  const key = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (APPLICATION_STATUS_META[key]) return key;
  if (STATUS_ALIASES[key]) return STATUS_ALIASES[key];
  return APPLICATION_STATUS.SUBMITTED;
}

/** Metadata for a raw status (alias-aware). Never null. */
export function getApplicationStatusMeta(raw) {
  return APPLICATION_STATUS_META[normalizeApplicationStatus(raw)] || FALLBACK_META;
}

/** Canonical human label for a raw status. */
export function applicationStatusLabel(raw) {
  return getApplicationStatusMeta(raw).label;
}

/** True when the application is finished (expired / cancelled / rejected). */
export function isClosedApplicationStatus(raw) {
  return getApplicationStatusMeta(raw).closed;
}

/** True when the application still counts as in-flight for the tenant badge. */
export function isActiveApplicationStatus(raw) {
  return getApplicationStatusMeta(raw).active;
}

/** Convenience: does this application row represent an active application? */
export function isActiveApplication(app) {
  return isActiveApplicationStatus(app?.status);
}

/** Convenience: does this application row represent a closed application? */
export function isClosedApplication(app) {
  return isClosedApplicationStatus(app?.status);
}

/**
 * Statuses that mean "the agent has produced a match" — used by the tenant
 * "matches" tab so `matches_found`, `completed` and a legacy matched pointer
 * all light up the same navigation badge.
 */
export function hasMatchedProperty(app) {
  if (!app) return false;
  if (app.matched_property_id || app.matchedPropertyId) return true;
  const s = normalizeApplicationStatus(app.status);
  return s === APPLICATION_STATUS.MATCHES_FOUND || s === APPLICATION_STATUS.COMPLETED;
}

/* ------------------------------------------------------------------ */
/*  Assignment status (admin assigns → agent accepts/rejects)          */
/* ------------------------------------------------------------------ */

export const ASSIGNMENT_STATUS = Object.freeze({
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
});

export const ASSIGNMENT_STATUS_META = Object.freeze({
  [ASSIGNMENT_STATUS.UNASSIGNED]: { label: 'Unassigned', tone: 'slate' },
  [ASSIGNMENT_STATUS.ASSIGNED]: { label: 'Awaiting response', tone: 'amber' },
  [ASSIGNMENT_STATUS.ACCEPTED]: { label: 'Accepted', tone: 'emerald' },
  [ASSIGNMENT_STATUS.REJECTED]: { label: 'Rejected — reassign', tone: 'rose' }
});

/** Derive the effective assignment status from a row (with legacy fallback). */
export function normalizeAssignmentStatus(app) {
  const raw = app?.assignment_status;
  if (raw && ASSIGNMENT_STATUS_META[raw]) return raw;
  return app?.assigned_to ? ASSIGNMENT_STATUS.ASSIGNED : ASSIGNMENT_STATUS.UNASSIGNED;
}

export function assignmentStatusLabel(app) {
  return (ASSIGNMENT_STATUS_META[normalizeAssignmentStatus(app)] || ASSIGNMENT_STATUS_META.unassigned).label;
}

export default APPLICATION_STATUS;
