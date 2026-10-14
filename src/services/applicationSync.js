import { supabase } from '../utils/Supabase';
import { normalizeApplicationStatus } from './applicationStatus';

const LOCAL_APPS_KEY = 'place4u_tenant_applications';
const EVENT_NAME = 'place4u:application-updated';

/**
 * Update the local storage cache with the latest application record
 */
export function updateLocalApplicationCache(applicationId, updates = {}) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.status !== undefined && normalizedUpdates.status !== null) {
      normalizedUpdates.status = normalizeApplicationStatus(normalizedUpdates.status);
    }

    const raw = localStorage.getItem(LOCAL_APPS_KEY);
    let apps = raw ? JSON.parse(raw) : [];
    let updated = false;

    apps = apps.map((app) => {
      if (app && app.id === applicationId) {
        updated = true;
        return {
          ...app,
          ...normalizedUpdates,
          updated_at: new Date().toISOString()
        };
      }
      return app;
    });

    if (!updated && updates.tenant_id) {
      apps.unshift({
        id: applicationId,
        ...normalizedUpdates,
        created_at: updates.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(apps));
  } catch (err) {
    console.warn('Failed to update local application cache:', err);
  }
}

/**
 * Broadcast an application change to all open tabs and components
 */
export function broadcastApplicationUpdate(applicationId, newStatus, extraData = {}) {
  if (typeof window === 'undefined') return;

  const status = newStatus ? normalizeApplicationStatus(newStatus) : newStatus;

  const payload = {
    applicationId,
    status,
    ...extraData,
    timestamp: Date.now()
  };

  // 1. Update localStorage cache
  updateLocalApplicationCache(applicationId, {
    status,
    ...extraData
  });

  // 2. Dispatch custom in-page event
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
  } catch (err) {
    console.warn('Could not dispatch custom event:', err);
  }

  // 3. Trigger a storage ping so other open tabs react immediately
  try {
    localStorage.setItem('place4u_sync_ping', JSON.stringify({
      type: 'application_updated',
      applicationId,
      status,
      t: Date.now()
    }));
  } catch {}
}

/**
 * Apply an application change from any dashboard: normalise the status,
 * mirror it into the local cache and fan the update out to every other
 * dashboard. This is the one helper all four portals should call after a
 * successful DB write so no status change is ever local-only.
 *
 * @param {string} applicationId
 * @param {string} status        canonical (or aliased) status
 * @param {object} [extraData]   any additional row fields that changed
 */
export function applyApplicationUpdate(applicationId, status, extraData = {}) {
  if (!applicationId) return;
  broadcastApplicationUpdate(applicationId, status, extraData);
}

/**
 * Subscribe to application updates across all dashboards (Realtime + Local + Storage)
 */
export function subscribeToApplicationUpdates(callback) {
  if (typeof window === 'undefined') return () => {};

  // 1. Local custom event listener
  const handleCustomEvent = (event) => {
    if (callback && event.detail) {
      callback({ source: 'local', ...event.detail });
    }
  };
  window.addEventListener(EVENT_NAME, handleCustomEvent);

  // 2. Cross-tab storage event listener
  const handleStorageEvent = (event) => {
    if (event.key === 'place4u_sync_ping' && event.newValue) {
      try {
        const ping = JSON.parse(event.newValue);
        if (callback) {
          callback({ source: 'cross_tab', ...ping });
        }
      } catch {}
    }
    if (event.key === LOCAL_APPS_KEY && callback) {
      callback({ source: 'storage_change' });
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 3. Supabase Realtime Channel
  let channel = null;
  try {
    const channelName = `p4u-apps-${Math.random().toString(36).slice(2, 9)}`;
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
          const appRecord = payload.new || payload.old;
          if (appRecord?.id) {
            updateLocalApplicationCache(appRecord.id, appRecord);
          }
          if (callback) {
            callback({
              source: 'supabase_realtime',
              eventType: payload.eventType,
              record: payload.new,
              applicationId: appRecord?.id,
              status: payload.new?.status
            });
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription unavailable:', err);
  }

  // Return unsubscribe cleanup function
  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  };
}

/**
 * Merge local applications with authoritative database records.
 *
 * `userId` scopes the local cache to the signed-in tenant. `place4u_tenant_applications`
 * is a single shared localStorage key, so on a shared browser it still holds the
 * PREVIOUS tenant's rows after they sign out. Without this scope a brand-new
 * account would inherit those cached applications. When `userId` is known we only
 * ever surface local rows explicitly owned by that user; DB rows are always the
 * caller's own (the query filters by tenant_id and RLS enforces it).
 */
export function mergeLocalAndDbApplications(localList = [], dbList = [], userId = null) {
  const scopedLocal = (localList || []).filter((item) => {
    if (!item) return false;
    if (!userId) return true; // guest / offline mode — no identity to scope against
    return item.tenant_id != null && String(item.tenant_id) === String(userId);
  });

  const dbMap = new Map();
  (dbList || []).forEach((item) => {
    if (item?.id) dbMap.set(item.id, item);
  });

  // DB records take precedence for status, assignment, and agent info, while preserving settled fee_paid
  const merged = (dbList || []).map((dbItem) => {
    const localItem = scopedLocal.find((l) => l && l.id === dbItem.id);
    const feePaidResolved = Boolean(
      dbItem.fee_paid === true ||
      dbItem.fee_paid === 'true' ||
      dbItem.fee_receipt ||
      localItem?.fee_paid === true ||
      localItem?.fee_paid === 'true' ||
      localItem?.fee_receipt
    );

    const paymentIdResolved = dbItem.payment_id || localItem?.payment_id || null;

    return {
      ...(localItem || {}),
      ...dbItem,
      fee_paid: feePaidResolved,
      fee_receipt: dbItem.fee_receipt || localItem?.fee_receipt || null,
      payment_id: paymentIdResolved,
      // The database is the single source of truth for status; the local cache
      // only fills the gap when the row has not landed in Supabase yet.
      status: normalizeApplicationStatus(dbItem.status || localItem?.status),
      assigned_to: dbItem.assigned_to !== undefined ? dbItem.assigned_to : localItem?.assigned_to,
      agent: dbItem.agent || localItem?.agent
    };
  });

  // Add any offline/guest local applications not yet in DB (normalised so a
  // locally-cached legacy status renders identically to a DB row).
  scopedLocal.forEach((localItem) => {
    if (localItem?.id && !dbMap.has(localItem.id)) {
      merged.push({ ...localItem, status: normalizeApplicationStatus(localItem.status) });
    }
  });

  return merged;
}
