/**
 * Place4U — Match acceptance & session-scheduling service
 *
 * Backs the multi-party pipeline defined in database/match_.sql on top of
 * public.application_property_matches:
 *
 *   shipped → tenant_accepted → agent_forwarded → landlord_accepted
 *           → admin_approved → scheduled
 *
 * Off-ramps: tenant_declined | landlord_declined | admin_rejected | cancelled
 *
 * Reads are RLS-scoped: a plain select returns only the rows the signed-in
 * caller may see (their applications / their listings / their assignments /
 * everything for admins). Writes go through SECURITY DEFINER RPCs so each
 * transition is validated for role + current state server-side.
 *
 * Degrades gracefully when database/match_.sql has not been applied yet: the
 * read returns [] and transitions return a helpful error instead of throwing.
 */
import { supabase } from '../utils/Supabase';
import { broadcastMatchUpdate, subscribeToMatchUpdates as subscribeToDraftMatches } from './applicationMatchService';

export const MATCH_STATES = {
  FLAGGED: 'flagged',
  SKIPPED: 'skipped',
  SHIPPED: 'shipped',
  TENANT_ACCEPTED: 'tenant_accepted',
  TENANT_DECLINED: 'tenant_declined',
  AGENT_FORWARDED: 'agent_forwarded',
  LANDLORD_ACCEPTED: 'landlord_accepted',
  LANDLORD_DECLINED: 'landlord_declined',
  ADMIN_APPROVED: 'admin_approved',
  ADMIN_REJECTED: 'admin_rejected',
  SCHEDULED: 'scheduled',
  SCHEDULE_ACCEPTED: 'schedule_accepted',
  LEASE_UPLOADED: 'lease_uploaded',
  LEASE_SIGNED: 'lease_signed',
  MOVE_IN_CONFIRMED: 'move_in_confirmed',
  CANCELLED: 'cancelled'
};

/** Ordered happy-path stages (used to render the progress tracker). */
export const PIPELINE_STAGES = [
  { key: 'shipped', label: 'Shipped', actor: 'agent' },
  { key: 'tenant_accepted', label: 'Tenant accepted', actor: 'tenant' },
  { key: 'agent_forwarded', label: 'Forwarded to landlord', actor: 'agent' },
  { key: 'landlord_accepted', label: 'Landlord accepted', actor: 'landlord' },
  { key: 'admin_approved', label: 'Admin approved', actor: 'admin' },
  { key: 'scheduled', label: 'Meetup scheduled', actor: 'agent' },
  { key: 'schedule_accepted', label: 'Schedule confirmed', actor: 'tenant' },
  { key: 'lease_uploaded', label: 'Lease ready', actor: 'landlord' },
  { key: 'lease_signed', label: 'Lease signed', actor: 'tenant' },
  { key: 'move_in_confirmed', label: 'Move-in confirmed', actor: 'tenant' }
];

export const STAGE_ORDER = PIPELINE_STAGES.map((s) => s.key);

export const TERMINAL_STATES = ['tenant_declined', 'landlord_declined', 'admin_rejected', 'cancelled'];

export const isDeclined = (state) => TERMINAL_STATES.includes(state);
export const isScheduled = (state) =>
  state === MATCH_STATES.SCHEDULED ||
  state === MATCH_STATES.SCHEDULE_ACCEPTED ||
  state === MATCH_STATES.LEASE_UPLOADED ||
  state === MATCH_STATES.LEASE_SIGNED;
export const stageIndex = (state) => STAGE_ORDER.indexOf(state);

const STATE_LABELS = {
  flagged: 'Flagged',
  skipped: 'Skipped',
  shipped: 'Awaiting tenant',
  tenant_accepted: 'Tenant accepted',
  tenant_declined: 'Declined by tenant',
  agent_forwarded: 'Awaiting landlord',
  landlord_accepted: 'Landlord accepted',
  landlord_declined: 'Declined by landlord',
  admin_approved: 'Approved — schedule',
  admin_rejected: 'Rejected by admin',
  scheduled: 'Meetup scheduled',
  schedule_accepted: 'Meetup confirmed',
  lease_uploaded: 'Lease ready for signing',
  lease_signed: 'Lease signed & active',
  cancelled: 'Cancelled'
};

export const stateLabel = (state) => STATE_LABELS[state] || state;

/**
 * Which action is pending for a given role at a given state (null = no action).
 * Returns one of: accept | decline | forward | schedule | approve | reject | accept_schedule | upload_lease | sign_lease
 */
export function pendingActionForRole(state, role, match = null) {
  if (!state || isDeclined(state)) return null;
  switch (role) {
    case 'tenant':
      if (state === MATCH_STATES.SHIPPED) return 'accept';
      if (state === MATCH_STATES.SCHEDULED) return 'accept_schedule';
      if (state === MATCH_STATES.LEASE_UPLOADED) return 'sign_lease';
      if ((state === MATCH_STATES.LEASE_SIGNED || state === MATCH_STATES.MOVE_IN_CONFIRMED) &&
          (match?.moveInDate || match?.leaseTerms?.moveInDate) &&
          !(match?.moveInConfirmedAt || match?.leaseTerms?.moveInConfirmedAt)) {
        return 'confirm_move_in';
      }
      return null;
    case 'agent':
      if (state === MATCH_STATES.TENANT_ACCEPTED) return 'forward';
      if (state === MATCH_STATES.ADMIN_APPROVED) return 'schedule';
      return null;
    case 'landlord':
      if (state === MATCH_STATES.AGENT_FORWARDED) return 'accept';
      if (state === MATCH_STATES.SCHEDULED || state === MATCH_STATES.SCHEDULE_ACCEPTED) return 'upload_lease';
      if ((state === MATCH_STATES.LEASE_SIGNED || state === MATCH_STATES.MOVE_IN_CONFIRMED) &&
          !(match?.moveInDate || match?.leaseTerms?.moveInDate)) {
        return 'set_move_in';
      }
      return null;
    case 'admin':
      if (state === MATCH_STATES.LANDLORD_ACCEPTED) return 'approve';
      return null;
    default:
      return null;
  }
}

/** Human label for the pending action. */
export function actionLabel(action) {
  return {
    accept: 'Accept match',
    decline: 'Decline',
    forward: 'Forward to landlord',
    schedule: 'Schedule meetup',
    approve: 'Approve meetup',
    reject: 'Reject',
    accept_schedule: 'Accept schedule',
    upload_lease: 'Upload lease agreement',
    sign_lease: 'Review & upload signed lease',
    set_move_in: 'Set move-in date',
    confirm_move_in: 'Confirm move-in date'
  }[action] || action;
}

/* ------------------------------------------------------------------ */
/*  Reads                                                              */
/* ------------------------------------------------------------------ */

function normalizeMatch(row) {
  if (!row) return null;
  const terms = row.lease_terms || {};
  return {
    id: row.id,
    applicationId: row.application_id,
    propertyId: row.property_id,
    agentId: row.agent_id,
    state: row.state,
    skipReason: row.skip_reason || '',
    matchNote: row.match_note || '',
    declineReason: row.decline_reason || '',
    shippedAt: row.shipped_at || null,
    tenantAcceptedAt: row.tenant_accepted_at || null,
    tenantOptInSession: row.tenant_opt_in_session === true,
    tenantSessionPrefs: row.tenant_session_prefs || null,
    agentForwardedAt: row.agent_forwarded_at || null,
    landlordAcceptedAt: row.landlord_accepted_at || null,
    adminApprovedAt: row.admin_approved_at || null,
    sessionStatus: row.session_status || null,
    sessionScheduledAt: row.session_scheduled_at || null,
    sessionLocation: row.session_location || null,
    sessionNotes: row.session_notes || null,
    tenantScheduleAcceptedAt: row.tenant_schedule_accepted_at || null,
    leaseUploadedAt: row.lease_uploaded_at || null,
    leaseUrl: row.lease_url || null,
    leaseTitle: row.lease_title || null,
    leaseTerms: terms,
    leaseSignedAt: row.lease_signed_at || null,
    leaseSignature: row.lease_signature || null,
    signedLeaseUrl: row.signed_lease_url || row.lease_signature?.signedLeaseUrl || null,
    moveInDate: row.move_in_date || terms.moveInDate || null,
    moveInTime: row.move_in_time || terms.moveInTime || null,
    moveInLocation: row.move_in_location || terms.moveInLocation || null,
    moveInInstructions: row.move_in_instructions || terms.moveInInstructions || null,
    moveInSetAt: row.move_in_set_at || terms.moveInSetAt || null,
    moveInConfirmedAt: row.move_in_confirmed_at || terms.moveInConfirmedAt || null,
    moveInStatus: row.move_in_status || (row.move_in_confirmed_at || terms.moveInConfirmedAt ? 'confirmed' : ((row.move_in_date || terms.moveInDate) ? 'date_proposed' : 'pending_date')),
    updatedAt: row.pipeline_updated_at || row.updated_at || null
  };
}

function normalizeApplicationData(app) {
  if (!app) return null;
  let docs = Array.isArray(app.documents) ? [...app.documents] : [];
  let meta = {};
  const sr = app.special_requirements || '';
  if (sr.includes('[P4U_DATA:') || sr.includes('[PLACE4U_APP_DATA:')) {
    const m = sr.match(/\[(?:P4U_DATA|PLACE4U_APP_DATA):([A-Za-z0-9+/=]+)\]/);
    if (m?.[1]) {
      try {
        const json = typeof atob !== 'undefined'
          ? decodeURIComponent(escape(atob(m[1])))
          : Buffer.from(m[1], 'base64').toString('utf-8');
        meta = JSON.parse(json) || {};
      } catch {}
    }
  }
  if (docs.length === 0 && Array.isArray(meta.documents)) {
    docs = meta.documents;
  }
  return {
    ...app,
    documents: docs,
    cleanSpecialRequirements: sr
      .replace(/\n?\[(?:P4U_DATA|PLACE4U_APP_DATA):[A-Za-z0-9+/=]+\]/g, '')
      .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
      .trim() || null
  };
}

/**
 * List every pipeline match visible to the caller, enriched with the
 * application, property, tenant, agent and landlord records.
 *
 * @param {{ includeDraft?: boolean }} [options]
 * @returns {Promise<{ success: boolean, data: Array<object>, error?: string }>}
 */
export async function listPipelineMatches(options = {}) {
  const { includeDraft = false } = options;
  try {
    let query = supabase
      .from('application_property_matches')
      .select('*')
      .order('pipeline_updated_at', { ascending: false });

    // By default only show the acceptance pipeline (drop the private draft).
    if (!includeDraft) {
      query = query.not('state', 'in', '(flagged,skipped)');
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return { success: true, data: [] };

    const appIds = [...new Set(rows.map((r) => r.application_id).filter(Boolean))];
    const propIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))];

    const [{ data: apps }, { data: props }] = await Promise.all([
      supabase
        .from('applications')
        .select('*')
        .in('id', appIds),
      supabase
        .from('properties')
        .select('*')
        .in('id', propIds)
    ]);

    const appMap = new Map((apps || []).map((a) => [a.id, normalizeApplicationData(a)]));
    const propMap = new Map((props || []).map((p) => [p.id, p]));

    const userIds = new Set();
    (apps || []).forEach((a) => {
      if (a.tenant_id) userIds.add(a.tenant_id);
      if (a.assigned_to) userIds.add(a.assigned_to);
    });
    (props || []).forEach((p) => { if (p.landlord_id) userIds.add(p.landlord_id); });
    rows.forEach((r) => { if (r.agent_id) userIds.add(r.agent_id); });

    let userMap = new Map();
    if (userIds.size > 0) {
      const ids = [...userIds];
      // public.users is self-or-admin under security_hardening.sql Part B, so
      // cross-user name reads fall back to the curated user_directory view.
      try {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email, phone, user_type')
          .in('id', ids);
        (users || []).forEach((u) => userMap.set(u.id, u));
      } catch { /* users may be RLS-locked */ }
      try {
        const { data: dir } = await supabase
          .from('user_directory')
          .select('id, full_name, user_type')
          .in('id', ids);
        (dir || []).forEach((u) => userMap.set(u.id, { ...u, ...(userMap.get(u.id) || {}) }));
      } catch { /* user_directory not installed */ }
    }

    const data = rows.map((row) => {
      const match = normalizeMatch(row);
      const application = appMap.get(row.application_id) || null;
      const property = propMap.get(row.property_id) || null;
      const agentId = row.agent_id || application?.assigned_to || null;
      return {
        ...match,
        application,
        property,
        tenant: application ? userMap.get(application.tenant_id) || null : null,
        agent: agentId ? userMap.get(agentId) || null : null,
        landlord: property ? userMap.get(property.landlord_id) || null : null
      };
    });

    return { success: true, data };
  } catch (error) {
    // Most likely: database/match_.sql has not been applied yet.
    return { success: false, data: [], error: error?.message || String(error) };
  }
}

/** Count matches awaiting an action from the given role. */
export function actionableCount(matches, role) {
  if (!Array.isArray(matches)) return 0;
  return matches.filter((m) => pendingActionForRole(m.state, role)).length;
}

/** Match audit trail / notification feed, newest first. */
export async function listMatchEvents(matchId) {
  if (!matchId) return { success: true, data: [] };
  try {
    const { data, error } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, data: [], error: error?.message };
  }
}

/* ------------------------------------------------------------------ */
/*  Transitions (thin wrappers over the SQL RPCs)                      */
/* ------------------------------------------------------------------ */

async function callRpc(fn, args, broadcastState, fallbackFn = null) {
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (broadcastState && row?.application_id) {
        broadcastMatchUpdate(row.application_id, row.property_id, broadcastState);
      }
      return { success: true, data: row ? normalizeMatch(row) : null };
    }
    if (fallbackFn) {
      const fb = await fallbackFn();
      if (fb?.success) return fb;
    }
    throw error;
  } catch (error) {
    if (fallbackFn) {
      try {
        const fb = await fallbackFn();
        if (fb?.success) return fb;
      } catch {}
    }
    return {
      success: false,
      error:
        error?.message ||
        'Match update failed. Ensure database/match_.sql and database/match_lease_pipeline.sql have been run.'
    };
  }
}

export const acceptMatchAsTenant = (matchId, { optInSession = true, sessionPrefs = null, note = null } = {}) =>
  callRpc(
    'match_accept_by_tenant',
    { p_match_id: matchId, p_opt_in_session: optInSession, p_session_prefs: sessionPrefs, p_note: note },
    MATCH_STATES.TENANT_ACCEPTED
  );

export const declineMatchAsTenant = (matchId, reason = null) =>
  callRpc('match_decline_by_tenant', { p_match_id: matchId, p_reason: reason }, MATCH_STATES.TENANT_DECLINED);

export const forwardMatchAsAgent = (matchId, note = null) =>
  callRpc('match_forward_by_agent', { p_match_id: matchId, p_note: note }, MATCH_STATES.AGENT_FORWARDED);

export const acceptMatchAsLandlord = (matchId, note = null) =>
  callRpc('match_accept_by_landlord', { p_match_id: matchId, p_note: note }, MATCH_STATES.LANDLORD_ACCEPTED);

export const declineMatchAsLandlord = (matchId, reason = null) =>
  callRpc('match_decline_by_landlord', { p_match_id: matchId, p_reason: reason }, MATCH_STATES.LANDLORD_DECLINED);

export const approveMatchAsAdmin = (matchId, note = null) =>
  callRpc('match_approve_by_admin', { p_match_id: matchId, p_note: note }, MATCH_STATES.ADMIN_APPROVED);

export const rejectMatchAsAdmin = (matchId, reason = null) =>
  callRpc('match_reject_by_admin', { p_match_id: matchId, p_reason: reason }, MATCH_STATES.ADMIN_REJECTED);

export const scheduleMatchSession = (matchId, { scheduledAt, location = null, notes = null } = {}) =>
  callRpc(
    'match_schedule_session',
    { p_match_id: matchId, p_scheduled_at: scheduledAt, p_location: location, p_notes: notes },
    MATCH_STATES.SCHEDULED
  );

/** Tenant accepts the scheduled session / meetup */
export const acceptScheduleAsTenant = (matchId, note = null) =>
  callRpc(
    'match_accept_schedule',
    { p_match_id: matchId, p_note: note },
    MATCH_STATES.SCHEDULE_ACCEPTED,
    async () => {
      const { data, error } = await supabase
        .from('application_property_matches')
        .update({
          state: 'schedule_accepted',
          tenant_schedule_accepted_at: new Date().toISOString(),
          session_status: 'confirmed',
          pipeline_updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data: normalizeMatch(data) };
    }
  );

/** Landlord uploads official lease agreement */
export const uploadLeaseAsLandlord = (matchId, { leaseUrl, leaseTitle = 'Residential Lease Agreement', leaseTerms = {}, note = null } = {}) =>
  callRpc(
    'match_upload_lease',
    {
      p_match_id: matchId,
      p_lease_url: leaseUrl,
      p_lease_title: leaseTitle,
      p_lease_terms: leaseTerms,
      p_note: note
    },
    MATCH_STATES.LEASE_UPLOADED,
    async () => {
      const { data, error } = await supabase
        .from('application_property_matches')
        .update({
          state: 'lease_uploaded',
          lease_uploaded_at: new Date().toISOString(),
          lease_url: leaseUrl,
          lease_title: leaseTitle,
          lease_terms: leaseTerms,
          session_status: 'completed',
          pipeline_updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data: normalizeMatch(data) };
    }
  );

/** Tenant signs the lease agreement */
export const signLeaseAsTenant = (matchId, signatureData = {}, note = null) =>
  callRpc(
    'match_sign_lease',
    {
      p_match_id: matchId,
      p_signature: signatureData,
      p_note: note
    },
    MATCH_STATES.LEASE_SIGNED,
    async () => {
      const { data, error } = await supabase
        .from('application_property_matches')
        .update({
          state: 'lease_signed',
          lease_signed_at: new Date().toISOString(),
          lease_signature: signatureData,
          signed_lease_url: signatureData?.signedLeaseUrl || null,
          pipeline_updated_at: new Date().toISOString()
        })
        .eq('id', matchId)
        .select()
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, data: normalizeMatch(data) };
    }
  );

/** Landlord sets official move-in date and key handover instructions */
export const setMoveInDate = (
  matchId,
  { moveInDate, moveInTime = '10:00', moveInLocation = null, moveInInstructions = null, note = null } = {}
) =>
  callRpc(
    'match_set_move_in_date',
    {
      p_match_id: matchId,
      p_move_in_date: moveInDate,
      p_move_in_time: moveInTime,
      p_move_in_location: moveInLocation,
      p_move_in_instructions: moveInInstructions,
      p_note: note
    },
    null,
    async () => {
      // Retry attempt 1: with shortened parameter names if older SQL signature was applied
      try {
        const retry = await supabase.rpc('match_set_move_in_date', {
          p_match_id: matchId,
          p_move_in_date: moveInDate,
          p_time: moveInTime,
          p_location: moveInLocation,
          p_instructions: moveInInstructions,
          p_note: note
        });
        if (!retry.error && retry.data) {
          const row = Array.isArray(retry.data) ? retry.data[0] : retry.data;
          return { success: true, data: normalizeMatch(row) };
        }
      } catch {}

      const nowIso = new Date().toISOString();
      const { data: current } = await supabase
        .from('application_property_matches')
        .select('lease_terms')
        .eq('id', matchId)
        .maybeSingle();

      const updatedTerms = {
        ...(current?.lease_terms || {}),
        moveInDate,
        moveInTime,
        moveInLocation,
        moveInInstructions,
        moveInSetAt: nowIso,
        moveInStatus: 'date_proposed'
      };

      const { data, error } = await supabase
        .from('application_property_matches')
        .update({
          move_in_date: moveInDate,
          move_in_time: moveInTime,
          move_in_location: moveInLocation,
          move_in_instructions: moveInInstructions,
          move_in_set_at: nowIso,
          move_in_status: 'date_proposed',
          lease_terms: updatedTerms,
          pipeline_updated_at: nowIso
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) {
        // Fallback: update lease_terms if individual columns are not yet in the DB
        const { data: fbData, error: fbErr } = await supabase
          .from('application_property_matches')
          .update({
            lease_terms: updatedTerms,
            pipeline_updated_at: nowIso
          })
          .eq('id', matchId)
          .select()
          .single();
        if (fbErr) return { success: false, error: fbErr.message };
        return { success: true, data: normalizeMatch(fbData) };
      }
      return { success: true, data: normalizeMatch(data) };
    }
  );

/** Tenant confirms proposed move-in date */
export const confirmMoveInDate = (matchId, { note = null } = {}) =>
  callRpc(
    'match_confirm_move_in',
    {
      p_match_id: matchId,
      p_note: note
    },
    MATCH_STATES.MOVE_IN_CONFIRMED,
    async () => {
      const nowIso = new Date().toISOString();
      const { data: current } = await supabase
        .from('application_property_matches')
        .select('lease_terms, move_in_date')
        .eq('id', matchId)
        .maybeSingle();

      const updatedTerms = {
        ...(current?.lease_terms || {}),
        moveInConfirmedAt: nowIso,
        moveInStatus: 'confirmed'
      };

      const { data, error } = await supabase
        .from('application_property_matches')
        .update({
          move_in_confirmed_at: nowIso,
          move_in_status: 'confirmed',
          lease_terms: updatedTerms,
          pipeline_updated_at: nowIso
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) {
        // Fallback: update lease_terms if column is not yet in the DB
        const { data: fbData, error: fbErr } = await supabase
          .from('application_property_matches')
          .update({
            lease_terms: updatedTerms,
            pipeline_updated_at: nowIso
          })
          .eq('id', matchId)
          .select()
          .single();
        if (fbErr) return { success: false, error: fbErr.message };
        return { success: true, data: normalizeMatch(fbData) };
      }
      return { success: true, data: normalizeMatch(data) };
    }
  );

export const cancelMatch = (matchId, reason = null) =>
  callRpc('match_cancel', { p_match_id: matchId, p_reason: reason }, MATCH_STATES.CANCELLED);

/* ------------------------------------------------------------------ */
/*  Realtime                                                           */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to pipeline changes. Fires the callback on both the draft-match
 * bus (agent application manager) and Supabase Realtime for the match tables.
 * Returns an unsubscribe function.
 */
export function subscribeToMatchPipeline(callback) {
  const unsubDraft = subscribeToDraftMatches(callback);

  let channel = null;
  try {
    channel = supabase
      .channel(`p4u-match-pipeline-${Math.random().toString(36).slice(2, 9)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'application_property_matches' },
        (payload) => callback && callback({ source: 'supabase_realtime', payload })
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'match_events' },
        (payload) => callback && callback({ source: 'match_event', payload })
      )
      .subscribe();
  } catch {
    /* realtime unavailable */
  }

  return () => {
    unsubDraft();
    if (channel) {
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    }
  };
}
