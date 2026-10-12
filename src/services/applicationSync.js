import { supabase } from '../utils/Supabase';

const LOCAL_APPS_KEY = 'place4u_tenant_applications';
const EVENT_NAME = 'place4u:application-updated';

/**
 * Update the local storage cache with the latest application record
 */
export function updateLocalApplicationCache(applicationId, updates = {}) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = localStorage.getItem(LOCAL_APPS_KEY);
    let apps = raw ? JSON.parse(raw) : [];
    let updated = false;

    apps = apps.map((app) => {
      if (app && app.id === applicationId) {
        updated = true;
        return {
          ...app,
          ...updates,
          updated_at: new Date().toISOString()
        };
      }
      return app;
    });

    if (!updated && updates.tenant_id) {
      apps.unshift({
        id: applicationId,
        ...updates,
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

  const payload = {
    applicationId,
    status: newStatus,
    ...extraData,
    timestamp: Date.now()
  };

  // 1. Update localStorage cache
  updateLocalApplicationCache(applicationId, {
    status: newStatus,
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
      status: newStatus,
      t: Date.now()
    }));
  } catch {}
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
 * Merge local applications with authoritative database records
 */
export function mergeLocalAndDbApplications(localList = [], dbList = []) {
  const dbMap = new Map();
  (dbList || []).forEach((item) => {
    if (item?.id) dbMap.set(item.id, item);
  });

  // DB records take precedence for status, assignment, and agent info, while preserving settled fee_paid
  const merged = (dbList || []).map((dbItem) => {
    const localItem = (localList || []).find((l) => l && l.id === dbItem.id);
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
      status: dbItem.status || localItem?.status || 'submitted',
      assigned_to: dbItem.assigned_to !== undefined ? dbItem.assigned_to : localItem?.assigned_to,
      agent: dbItem.agent || localItem?.agent
    };
  });

  // Add any offline/guest local applications not yet in DB
  (localList || []).forEach((localItem) => {
    if (localItem?.id && !dbMap.has(localItem.id)) {
      merged.push(localItem);
    }
  });

  return merged;
}
