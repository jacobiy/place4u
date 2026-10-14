import { supabase } from './Supabase';

// Private bucket that holds agent application / FICA documents.
export const AGENT_DOCUMENTS_BUCKET = 'agent-documents';

// Private bucket that holds landlord proof-of-ownership / FICA documents.
export const LANDLORD_DOCUMENTS_BUCKET = 'landlord-documents';

// Default lifetime of a generated signed URL (short, because these are
// access-controlled grants for sensitive documents).
export const DEFAULT_DOCUMENT_EXPIRES_IN = 3600;

// Values that are already directly usable in an <img>/<a> tag and must never be
// sent to Supabase Storage for signing.
const PASSTHROUGH_PATTERN = /^(data:|blob:|https?:|file:)/i;

// Matches a Supabase Storage object URL — public or (possibly expired) signed —
// and captures the bucket + object path so it can be re-signed.
const STORAGE_OBJECT_URL_PATTERN = /\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/i;

/**
 * True when a stored value is an internal Supabase Storage object path
 * (e.g. "agents/<userId>/id_document-123.pdf") rather than a ready URL.
 */
export const isStoragePath = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !value.trim().startsWith('#') &&
  !PASSTHROUGH_PATTERN.test(value.trim());

/**
 * Extract `{ bucket, path }` from a Supabase Storage object URL. Handles both
 * `/object/public/<bucket>/<path>` and `/object/sign/<bucket>/<path>?token=...`.
 * Returns null for anything that is not a Supabase Storage URL.
 */
export function parseStorageObjectRef(value) {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(STORAGE_OBJECT_URL_PATTERN);
  if (!match) return null;
  try {
    return { bucket: decodeURIComponent(match[1]), path: decodeURIComponent(match[2]) };
  } catch {
    return { bucket: match[1], path: match[2] };
  }
}

/** Create a signed URL for a storage object. Returns null on failure. */
async function signStorageObject(bucket, path, expiresIn) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data?.signedUrl || null;
  } catch (err) {
    console.warn(`[documentUrls] Could not sign ${bucket}/${path}:`, err?.message || err);
    return null;
  }
}

/**
 * Convert a data: URL (base64) into an object URL (blob:...) that can be safely
 * opened in a new tab without being blocked by modern browser security policies.
 */
export function dataUrlToBlobUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const parts = dataUrl.split(',');
    const mimeMatch = parts[0]?.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(parts[1] || '');
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([array], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('[documentUrls] Failed to convert dataUrl to Blob:', err);
    return dataUrl;
  }
}

/**
 * Safely open a document URL in a new tab or trigger a download.
 * Handles data: URLs (converting to Blob first), signed Supabase URLs,
 * and blobs. Refuses to navigate to raw relative paths that would break SPA routing.
 */
export function openDocumentSafely(targetUrl, { fileName = 'document.pdf', download = false } = {}) {
  if (!targetUrl || typeof targetUrl !== 'string') {
    alert('Document is currently unavailable or loading.');
    return false;
  }

  let safeUrl = targetUrl.trim();
  if (safeUrl.startsWith('data:')) {
    safeUrl = dataUrlToBlobUrl(safeUrl);
  }

  // Prevent opening relative paths that hit React Router catch-all redirect to '/'
  if (!/^(https?:|blob:|data:)/i.test(safeUrl)) {
    console.warn('[documentUrls] Blocked navigation to relative path:', safeUrl);
    alert('Document storage path could not be resolved to a valid URL.');
    return false;
  }

  if (download) {
    const a = document.createElement('a');
    a.href = safeUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }

  window.open(safeUrl, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Resolve a stored document value into an access-controlled URL a browser can use.
 * - Direct URLs / data URLs / blob URLs are returned untouched (legacy rows).
 * - Storage object paths are exchanged for a signed URL.
 * - Legacy Supabase Storage public/signed URLs are re-signed, so documents that
 *   were stored while a bucket was public keep working after it is made private.
 *
 * @param {string|null} value  Stored column value (path or URL)
 * @param {{bucket?: string, expiresIn?: number}} [options]
 * @returns {Promise<string|null>}
 */
export async function resolveDocumentUrl(value, options = {}) {
  const { bucket = 'documents', expiresIn = DEFAULT_DOCUMENT_EXPIRES_IN } = options;
  if (!value || typeof value !== 'string') return null;

  const raw = value.trim();
  if (!raw) return null;

  // 1. A Supabase Storage URL (public or expired signed) — recover the object
  //    path and exchange it for a fresh, private-bucket signed URL.
  const ref = parseStorageObjectRef(raw);
  if (ref) {
    const signed = await signStorageObject(ref.bucket, ref.path, expiresIn);
    if (signed) return signed;
    try {
      const { data: blob, error } = await supabase.storage.from(ref.bucket).download(ref.path);
      if (!error && blob) {
        return URL.createObjectURL(blob);
      }
    } catch {
      // ignore
    }
    return raw.startsWith('http') ? raw : null;
  }

  // 2. A bare storage object path — sign it with the caller-provided bucket.
  if (isStoragePath(raw)) {
    const bucketsToTry = [bucket];
    if (!bucketsToTry.includes('documents')) bucketsToTry.push('documents');
    if (!bucketsToTry.includes('landlord-documents')) bucketsToTry.push('landlord-documents');

    for (const b of bucketsToTry) {
      const signed = await signStorageObject(b, raw, expiresIn);
      if (signed) return signed;

      try {
        const { data: blob, error } = await supabase.storage.from(b).download(raw);
        if (!error && blob) {
          return URL.createObjectURL(blob);
        }
      } catch {
        // ignore
      }

      try {
        const { data: pubData } = supabase.storage.from(b).getPublicUrl(raw);
        if (pubData?.publicUrl) {
          return pubData.publicUrl;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  // 3. A ready-to-use URL (external / data / blob) — return untouched.
  return raw;
}

/**
 * Resolve several document values at once.
 *
 * @param {Record<string, string|null>} map  e.g. { id: "...", por: "..." }
 * @param {{bucket?: string, expiresIn?: number}} [options]
 * @returns {Promise<Record<string, string|null>>}
 */
export async function resolveDocumentUrls(map, options = {}) {
  const entries = Object.entries(map || {});
  const resolved = await Promise.all(
    entries.map(async ([key, value]) => [key, await resolveDocumentUrl(value, options)])
  );
  return Object.fromEntries(resolved);
}

/**
 * Resolve a landlord document record (as stored on
 * `landlord_profiles.verification_documents` or `properties.documents`) into a
 * displayable, access-controlled URL.
 *
 * Prefers the durable `storagePath` + `bucket`, and falls back to the record's
 * `fileUrl`/`url` (a legacy public URL or an expired signed URL — both are
 * recoverable because the object path is embedded in them).
 *
 * @param {object} doc
 * @param {{expiresIn?: number}} [options]
 * @returns {Promise<string|null>}
 */
export async function resolveLandlordDocumentUrl(doc, options = {}) {
  if (!doc) return null;
  const expiresIn = options.expiresIn ?? DEFAULT_DOCUMENT_EXPIRES_IN;
  const bucket = doc.bucket || LANDLORD_DOCUMENTS_BUCKET;

  if (doc.storagePath) {
    const signed = await signStorageObject(bucket, doc.storagePath, expiresIn);
    if (signed) return signed;
  }

  return resolveDocumentUrl(doc.fileUrl || doc.url || null, { bucket, expiresIn });
}

/**
 * Resolve every document in an array, preserving all other fields. Returns a
 * new array of plain objects with `fileUrl`/`url` pointing at a signed URL.
 *
 * @param {Array<object>} docs
 * @param {{expiresIn?: number}} [options]
 * @returns {Promise<Array<object>>}
 */
export async function resolveLandlordDocuments(docs, options = {}) {
  if (!Array.isArray(docs)) return [];
  return Promise.all(
    docs.map(async (doc) => {
      if (!doc || typeof doc !== 'object') return doc;
      const url = await resolveLandlordDocumentUrl(doc, options);
      return url ? { ...doc, fileUrl: url, url } : doc;
    })
  );
}

const isInlineUrl = (value) => typeof value === 'string' && value.startsWith('data:');

/**
 * Resolve a single document attached to a tenant application.
 *
 * Priority:
 *   1. An inline base64 payload that is still in memory.
 *   2. A durable storage reference (`storagePath` / storage `fileUrl`) — signed.
 *   3. A same-browser cached base64 copy (`localDocs`) when the file was never
 *      persisted to storage, so a reviewer on the submitting device can still
 *      open it. This is what recovers applications created before attachments
 *      were uploaded.
 *
 * @param {object} doc
 * @param {{localDocs?: Array<object>, bucket?: string, expiresIn?: number}} [options]
 * @returns {Promise<object>} the document, with a usable `fileUrl`
 */
export async function resolveApplicationDocumentUrl(doc, options = {}) {
  if (!doc || typeof doc !== 'object') return doc;
  const { localDocs = [], bucket = 'documents', expiresIn = DEFAULT_DOCUMENT_EXPIRES_IN } = options;

  const ownInline = isInlineUrl(doc.dataUrl) ? doc.dataUrl : (isInlineUrl(doc.fileUrl) ? doc.fileUrl : null);
  if (ownInline) return { ...doc, fileUrl: ownInline, dataUrl: ownInline };

  const source = doc.storagePath || doc.fileUrl || null;
  if (source && !isInlineUrl(source)) {
    const url = await resolveDocumentUrl(source, { bucket: doc.bucket || bucket, expiresIn });
    return url ? { ...doc, fileUrl: url } : doc;
  }

  const cached = (Array.isArray(localDocs) ? localDocs : []).find(
    (ld) => ld && ((ld.slotKey && ld.slotKey === doc.slotKey) || (ld.id && ld.id === doc.id))
  );
  const inline = cached?.dataUrl || (isInlineUrl(cached?.fileUrl) ? cached.fileUrl : null);
  if (inline) return { ...doc, fileUrl: inline, dataUrl: inline };

  return doc;
}

/**
 * Resolve an array of application documents (see `resolveApplicationDocumentUrl`).
 *
 * @param {Array<object>} docs
 * @param {{localDocs?: Array<object>, bucket?: string, expiresIn?: number}} [options]
 * @returns {Promise<Array<object>>}
 */
export async function resolveApplicationDocuments(docs, options = {}) {
  if (!Array.isArray(docs)) return [];
  return Promise.all(docs.map((doc) => resolveApplicationDocumentUrl(doc, options)));
}
