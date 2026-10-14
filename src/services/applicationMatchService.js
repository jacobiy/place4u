/**
 * Place4U — Application Match Service
 *
 * Data access for the Agent Application Manager draft-match workflow.
 * One row per (application_id, property_id) pair in
 * public.application_property_matches, with state: 'flagged' | 'skipped' | 'shipped'.
 *
 * Mirrors the applicationSync.js pattern:
 *   1. Supabase is the source of truth.
 *   2. localStorage mirrors pair states for instant/offline responsiveness.
 *   3. Updates fan out over Supabase Realtime + a custom event + a cross-tab
 *      storage ping so every open draft view stays in sync.
 *
 * Degrades gracefully: if the migration (database/application_match_draft.sql)
 * has not been run yet, the workflow still operates against the local cache.
 */
import { supabase } from '../utils/Supabase';

const LOCAL_KEY = 'place4u_application_matches';
const EVENT_NAME = 'place4u:match-updated';
const PING_KEY = 'place4u_match_sync_ping';

export const MATCH_STATE = {
  FLAGGED: 'flagged',
  SKIPPED: 'skipped',
  SHIPPED: 'shipped'
};

/* ------------------------------------------------------------------ */
/*  Local cache helpers                                                */
/* ------------------------------------------------------------------ */

function readAll() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** Read the local cache for one application as { [propertyId]: row }. */
export function readLocalMatchMap(applicationId) {
  if (!applicationId) return {};
  const all = readAll();
  return all[applicationId] || {};
}

function writeLocalMatch(applicationId, propertyId, row) {
  if (!applicationId || !propertyId) return;
  const all = readAll();
  const bucket = { ...(all[applicationId] || {}) };
  if (row) {
    bucket[propertyId] = row;
  } else {
    delete bucket[propertyId];
  }
  all[applicationId] = bucket;
  writeAll(all);
}

/** Broadcast a pair-state change to every open tab / component. */
export function broadcastMatchUpdate(applicationId, propertyId, state, extra = {}) {
  if (typeof window === 'undefined') return;
  const payload = { applicationId, propertyId, state, ...extra, timestamp: Date.now() };

  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  } catch {
    /* ignore */
  }

  try {
    localStorage.setItem(PING_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Normalization                                                      */
/* ------------------------------------------------------------------ */

function normalizeRow(row) {
  if (!row) return null;
  return {
    id: row.id || null,
    applicationId: row.application_id,
    propertyId: row.property_id,
    agentId: row.agent_id,
    state: row.state,
    skipReason: row.skip_reason || '',
    matchNote: row.match_note || '',
    declineReason: row.decline_reason || '',
    shippedAt: row.shipped_at || null,
    shippedBy: row.shipped_by || null,
    tenantAcceptedAt: row.tenant_accepted_at || null,
    tenantOptInSession: row.tenant_opt_in_session === true,
    agentForwardedAt: row.agent_forwarded_at || null,
    landlordAcceptedAt: row.landlord_accepted_at || null,
    adminApprovedAt: row.admin_approved_at || null,
    sessionStatus: row.session_status || null,
    sessionScheduledAt: row.session_scheduled_at || null,
    sessionLocation: row.session_location || null,
    sessionNotes: row.session_notes || null,
    updatedAt: row.pipeline_updated_at || row.updated_at || null
  };
}

/** How far along the acceptance pipeline a state is (used to pick one card per property). */
const PIPELINE_RANK = {
  shipped: 1,
  tenant_accepted: 2,
  agent_forwarded: 3,
  landlord_accepted: 4,
  admin_approved: 5,
  scheduled: 6
};
const pipelineRank = (state) => PIPELINE_RANK[state] || 0;

function toDbRow(match) {
  return {
    application_id: match.applicationId,
    property_id: match.propertyId,
    agent_id: match.agentId,
    state: match.state,
    skip_reason: match.skipReason || null,
    match_note: match.matchNote || null,
    shipped_at: match.shippedAt || null,
    shipped_by: match.shippedBy || null
  };
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

/**
 * List every pair state for one application, merging DB (authoritative) over
 * the local cache. Returns an array of normalized matches.
 */
export async function listMatches(applicationId) {
  if (!applicationId) return { success: true, data: [] };

  const localMap = readLocalMatchMap(applicationId);
  const merged = { ...localMap };

  let dbError = null;
  try {
    const { data, error } = await supabase
      .from('application_property_matches')
      .select('*')
      .eq('application_id', applicationId);

    if (error) {
      dbError = error;
    } else {
      (data || []).forEach((row) => {
        merged[row.property_id] = normalizeRow(row);
      });
    }
  } catch (err) {
    dbError = err;
  }

  // Re-mirror the merged (DB-authoritative) view back into the local cache.
  if (!dbError) {
    const all = readAll();
    all[applicationId] = merged;
    writeAll(all);
  }

  return {
    success: true,
    data: Object.values(merged).filter(Boolean),
    offline: Boolean(dbError)
  };
}

/** Shipped matches for the signed-in tenant (RLS-scoped), with property objects. */
export async function listShippedMatchesForTenant() {
  try {
    const { data, error } = await supabase
      .from('application_property_matches')
      .select('*')
      .eq('state', 'shipped')
      .order('shipped_at', { ascending: true });

    if (error) throw error;

    const rows = data || [];
    const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
    if (propertyIds.length === 0) return { success: true, data: [] };

    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);
    if (propErr) throw propErr;

    const propMap = new Map((props || []).map((p) => [p.id, p]));

    const mapped = rows
      .map((r) => ({ ...normalizeRow(r), property: propMap.get(r.property_id) || null }))
      .filter((m) => m.property);

    // Tag the most recent shipment batch so the UI can flag "new" items.
    const latestBatch = mapped.reduce(
      (max, m) => (m.shippedAt && m.shippedAt > max ? m.shippedAt : max),
      ''
    );
    mapped.forEach((m) => {
      m.isNewBatch = Boolean(m.shippedAt) && m.shippedAt === latestBatch;
    });

    return { success: true, data: mapped };
  } catch (error) {
    return { success: false, data: [], error: error?.message };
  }
}

/**
 * Every acceptance-pipeline match for the signed-in tenant (RLS-scoped), with
 * property objects attached. Unlike listShippedMatchesForTenant this returns
 * the whole journey — shipped, tenant_accepted, agent_forwarded,
 * landlord_accepted, admin_approved, scheduled — so the tenant's Matched
 * Properties tab can show all of their agent's matches at once, each with its
 * current status. Draft rows (flagged/skipped) stay private to the agent.
 */
export async function listTenantMatches() {
  try {
    const { data, error } = await supabase
      .from('application_property_matches')
      .select('*')
      .not('state', 'in', '(flagged,skipped)')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const rows = data || [];
    const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];
    if (propertyIds.length === 0) return { success: true, data: [] };

    const { data: props, error: propErr } = await supabase
      .from('properties')
      .select('*')
      .in('id', propertyIds);
    if (propErr) throw propErr;

    const propMap = new Map((props || []).map((p) => [p.id, p]));

    // One card per property: if the same home appears on more than one of the
    // tenant's applications, keep the row furthest along the pipeline.
    const byProperty = new Map();
    rows.forEach((r) => {
      const property = propMap.get(r.property_id);
      if (!property) return;
      const row = { ...normalizeRow(r), property };
      const existing = byProperty.get(r.property_id);
      if (
        !existing ||
        pipelineRank(row.state) > pipelineRank(existing.state) ||
        (pipelineRank(row.state) === pipelineRank(existing.state) &&
          String(row.updatedAt || '') > String(existing.updatedAt || ''))
      ) {
        byProperty.set(r.property_id, row);
      }
    });

    const mapped = [...byProperty.values()].sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    );

    // Tag the most recent shipment batch so the UI can flag "new" items.
    const latestBatch = mapped.reduce(
      (max, m) => (m.shippedAt && m.shippedAt > max ? m.shippedAt : max),
      ''
    );
    mapped.forEach((m) => {
      m.isNewBatch = Boolean(m.shippedAt) && m.shippedAt === latestBatch;
    });

    return { success: true, data: mapped };
  } catch (error) {
    return { success: false, data: [], error: error?.message };
  }
}

/* ------------------------------------------------------------------ */
/*  Writes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Upsert (or clear) the state of a single (application, property) pair.
 * @param {Object} p
 * @param {string} p.applicationId
 * @param {string} p.propertyId
 * @param {string} p.agentId
 * @param {'flagged'|'skipped'|null} p.state  null clears the pair
 * @param {string} [p.skipReason]
 * @param {string} [p.matchNote]
 */
export async function setMatchState({
  applicationId,
  propertyId,
  agentId,
  state,
  skipReason = null,
  matchNote = null
}) {
  if (!applicationId || !propertyId || !agentId) {
    return { success: false, error: 'Missing application, property, or agent id.' };
  }

  // Clearing a pair: delete the row (and the local mirror).
  if (!state) {
    writeLocalMatch(applicationId, propertyId, null);
    try {
      const { error } = await supabase
        .from('application_property_matches')
        .delete()
        .eq('application_id', applicationId)
        .eq('property_id', propertyId);
      if (error) throw error;
    } catch (err) {
      // Local-only fallback (migration not run)
      broadcastMatchUpdate(applicationId, propertyId, null);
      return { success: true, offline: true, warning: err?.message };
    }
    broadcastMatchUpdate(applicationId, propertyId, null);
    return { success: true };
  }

  const row = {
    applicationId,
    propertyId,
    agentId,
    state,
    skipReason: state === MATCH_STATE.SKIPPED ? skipReason : null,
    matchNote: matchNote || null
  };

  // Optimistic local mirror first (instant UI).
  writeLocalMatch(applicationId, propertyId, { ...row, updatedAt: new Date().toISOString() });

  try {
    const { data, error } = await supabase
      .from('application_property_matches')
      .upsert([toDbRow(row)], { onConflict: 'application_id,property_id' })
      .select()
      .maybeSingle();

    if (error) throw error;

    if (data) writeLocalMatch(applicationId, propertyId, normalizeRow(data));
    broadcastMatchUpdate(applicationId, propertyId, state, {
      skipReason: row.skipReason,
      matchNote: row.matchNote
    });
    return { success: true, data: normalizeRow(data) || row };
  } catch (err) {
    broadcastMatchUpdate(applicationId, propertyId, state, {
      skipReason: row.skipReason,
      matchNote: row.matchNote,
      offline: true
    });
    return { success: true, offline: true, warning: err?.message, data: row };
  }
}

/** Persist an optional per-match note on an existing pair. */
export async function saveMatchNote(applicationId, propertyId, note) {
  if (!applicationId || !propertyId) return { success: false, error: 'Missing ids.' };

  const localMap = readLocalMatchMap(applicationId);
  const current = localMap[propertyId];
  if (current) {
    writeLocalMatch(applicationId, propertyId, { ...current, matchNote: note || '' });
  }

  try {
    const { data, error } = await supabase
      .from('application_property_matches')
      .update({ match_note: note || null })
      .eq('application_id', applicationId)
      .eq('property_id', propertyId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (data) writeLocalMatch(applicationId, propertyId, normalizeRow(data));
    return { success: true, data: data ? normalizeRow(data) : null };
  } catch (err) {
    return { success: true, offline: true, warning: err?.message };
  }
}

/** Best-effort flip of the application's agent working status to 'working'. */
export async function markWorking(applicationId) {
  if (!applicationId) return { success: false };
  try {
    await supabase
      .from('applications')
      .update({ agent_working_status: 'working' })
      .eq('id', applicationId)
      .is('agent_working_status', null);
    return { success: true };
  } catch (err) {
    return { success: false, warning: err?.message };
  }
}

/**
 * Ship every currently-flagged pair for the application atomically.
 * Returns { success, count } — count is how many pairs were shipped.
 */
export async function shipMatches(applicationId) {
  if (!applicationId) return { success: false, error: 'Missing application id.' };

  try {
    const { data, error } = await supabase.rpc('ship_flagged_matches', {
      p_application_id: applicationId
    });
    if (error) throw error;

    // Re-sync the local cache from the DB so shipped rows carry stamps.
    await listMatches(applicationId);
    broadcastMatchUpdate(applicationId, null, MATCH_STATE.SHIPPED, { count: data || 0 });
    return { success: true, count: Number(data) || 0 };
  } catch (err) {
    return {
      success: false,
      error:
        err?.message ||
        'Could not ship the shortlist. Ensure database/application_match_draft.sql has been run.'
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Realtime                                                           */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to pair-state changes across the app. Returns an unsubscribe fn.
 * callback receives { source, applicationId, propertyId, state, ... }.
 */
export function subscribeToMatchUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event) => {
    if (callback && event.detail) callback({ source: 'local', ...event.detail });
  };
  window.addEventListener(EVENT_NAME, handleCustomEvent);

  const handleStorageEvent = (event) => {
    if (event.key === PING_KEY && event.newValue) {
      try {
        callback({ source: 'cross_tab', ...JSON.parse(event.newValue) });
      } catch {
        /* ignore */
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  let channel = null;
  try {
    const channelName = `p4u-matches-${Math.random().toString(36).slice(2, 9)}`;
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'application_property_matches' },
        (payload) => {
          const rec = payload.new || payload.old;
          if (rec?.application_id && rec?.property_id) {
            writeLocalMatch(
              rec.application_id,
              rec.property_id,
              payload.eventType === 'DELETE' ? null : normalizeRow(rec)
            );
          }
          if (callback) {
            callback({
              source: 'supabase_realtime',
              eventType: payload.eventType,
              applicationId: rec?.application_id,
              propertyId: rec?.property_id,
              state: payload.new?.state
            });
          }
        }
      )
      .subscribe();
  } catch {
    /* realtime unavailable */
  }

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }
  };
}
