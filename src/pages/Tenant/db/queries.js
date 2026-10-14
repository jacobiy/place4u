import { supabase } from '../../../utils/Supabase';
import { broadcastApplicationUpdate } from '../../../services/applicationSync';
import { APPLICATION_STATUS } from '../../../services/applicationStatus';
import { resolveDocumentUrl } from '../../../utils/documentUrls';

// Metadata serialization helpers for bulletproof cross-version persistence
const encodeAppMetadata = (meta) => {
  try {
    const jsonStr = JSON.stringify(meta);
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(jsonStr)));
    }
    return Buffer.from(jsonStr).toString('base64');
  } catch (e) {
    return '';
  }
};

const decodeAppMetadata = (b64) => {
  try {
    let jsonStr = '';
    if (typeof atob !== 'undefined') {
      jsonStr = decodeURIComponent(escape(atob(b64)));
    } else {
      jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
    }
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
};

// Reliable RFC 4122 v4 UUID generator for database linking
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ---------------------------------------------------------------------------
// Application attachments
// ---------------------------------------------------------------------------
// Applicants attach verification PDFs as browser-side base64 data URLs. Those
// bytes MUST be persisted to the private 'documents' bucket, otherwise no other
// role (agent, admin, landlord) can ever open them — the file would only exist
// in the applicant's own browser. These helpers upload on submit/update and
// return a durable storage reference plus a short-lived signed URL for display.
const APPLICATION_DOCUMENTS_BUCKET = 'documents';
const APPLICATION_DOC_SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

const isInlineDataUrl = (value) => typeof value === 'string' && value.startsWith('data:');
const isBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');

const dataUrlToBlob = (dataUrl) => {
  if (!isInlineDataUrl(dataUrl)) return null;
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) return null;
  const header = dataUrl.slice(5, commaIndex); // e.g. "application/pdf;base64"
  const payload = dataUrl.slice(commaIndex + 1);
  const isBase64 = /;base64/i.test(header);
  const mime = header.split(';')[0] || 'application/octet-stream';
  try {
    if (!isBase64) {
      return new Blob([decodeURIComponent(payload)], { type: mime });
    }
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (err) {
    console.warn('Could not decode inline document:', err?.message || err);
    return null;
  }
};

// Upload one inline attachment into '<tenantId>/applications/<unique>-<name>'
// (a path the 'documents' bucket RLS permits the tenant to write).
const uploadInlineDocument = async (doc, tenantId) => {
  const dataUrl = doc?.dataUrl || (isInlineDataUrl(doc?.fileUrl) ? doc.fileUrl : null);
  if (!dataUrl || !tenantId) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  try {
    const safeName = String(doc.fileName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const storagePath = `${tenantId}/applications/${unique}-${safeName}`;

    const { error } = await supabase.storage
      .from(APPLICATION_DOCUMENTS_BUCKET)
      .upload(storagePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: blob.type || 'application/pdf'
      });
    if (error) throw error;

    const { data: signed } = await supabase.storage
      .from(APPLICATION_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, APPLICATION_DOC_SIGNED_URL_TTL);

    return {
      storagePath,
      bucket: APPLICATION_DOCUMENTS_BUCKET,
      fileUrl: signed?.signedUrl || null
    };
  } catch (err) {
    console.warn('Application document upload notice:', err?.message || err);
    return null;
  }
};

// Normalise an application's documents into durable metadata + storage refs.
const buildCleanDocuments = async (docs, tenantId) => {
  return Promise.all(
    (docs || []).filter(Boolean).map(async (doc) => {
      const clean = {
        id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        slotKey: doc.slotKey || 'general_doc',
        title: doc.title || doc.shortLabel || 'Application Document',
        shortLabel: doc.shortLabel || doc.title || 'Document',
        fileName: doc.fileName || 'document.pdf',
        fileSize: doc.fileSize || '1.0 MB',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        verified: doc.verified ?? true
      };

      // Preserve an already-persisted storage reference or external URL.
      let storagePath = doc.storagePath || null;
      let bucket = doc.bucket || null;
      let fileUrl = (typeof doc.fileUrl === 'string' && !isInlineDataUrl(doc.fileUrl) && !isBlobUrl(doc.fileUrl))
        ? doc.fileUrl
        : null;

      // Upload any inline base64 payload so every reviewer can open it later.
      if (!storagePath && (doc.dataUrl || isInlineDataUrl(doc.fileUrl))) {
        const uploaded = await uploadInlineDocument(doc, tenantId);
        if (uploaded) {
          storagePath = uploaded.storagePath;
          bucket = uploaded.bucket;
          fileUrl = uploaded.fileUrl || fileUrl;
        }
      }

      return { ...clean, fileUrl, storagePath, bucket };
    })
  );
};

const KNOWN_APPLICATION_COLUMNS = [
  'id',
  'tenant_id',
  'preferred_areas',
  'preferred_types',
  'min_budget',
  'max_budget',
  'move_in_date',
  'lease_duration_months',
  'special_requirements',
  'status',
  'submitted_at',
  'expires_at',
  'assigned_to'
];

const SCHEMA_APPLICATION_COLUMNS = [
  'id',
  'tenant_id',
  'property_id',
  'property_title',
  'accommodation_category',
  'preferred_areas',
  'preferred_types',
  'min_budget',
  'max_budget',
  'move_in_date',
  'lease_duration_months',
  'special_requirements',
  'documents',
  'fee_paid',
  'fee_amount',
  'fee_currency',
  'fee_receipt',
  'payment_method',
  'payment_id',
  'status',
  'submitted_at',
  'expires_at',
  'assigned_to'
];

export const TenantQueries = {
  
  // Get tenant profile by user ID
  async getTenantProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error; // ignore if not found
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error fetching tenant profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new tenant profile
  async createTenantProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .insert([{
          user_id: profileData.userId,
          full_name: profileData.fullName || profileData.full_name || null,
          email: profileData.email || null,
          phone: profileData.phone || null,
          account_tier: profileData.accountTier || 'basic',
          created_at: profileData.joinDate || new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating tenant profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Update tenant profile
  async updateTenantProfile(profileId, updates) {
    try {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating tenant profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Update personal info
  async updatePersonalInfo(profileId, data) {
    const payload = {
      date_of_birth: data.dateOfBirth || null,
      id_number: data.idNumber || null,
      employment_status: data.employmentStatus || null,
      monthly_income: data.monthlyIncome !== '' && data.monthlyIncome !== undefined && data.monthlyIncome !== null
        ? parseFloat(data.monthlyIncome)
        : null
    };

    // Only touch the name when a value was actually supplied.
    if (data.fullName !== undefined && data.fullName !== null) {
      payload.full_name = data.fullName;
    }

    return this.updateTenantProfile(profileId, payload);
  },

  // Update contact info
  async updateContactInfo(profileId, data) {
    return this.updateTenantProfile(profileId, {
      phone: data.phone || null,
      emergency_contact_name: data.emergencyContactName || null,
      emergency_contact_phone: data.emergencyContactPhone || null
    });
  },

  // Update address and preferences
  async updateAddressInfo(profileId, data) {
    return this.updateTenantProfile(profileId, {
      current_address: data.currentAddress || null,
      city: data.city || null,
      state: data.state || null,
      postal_code: data.postalCode || null,
      has_pets: data.hasPets === 'yes' || data.hasPets === true
    });
  },

  async updateNotificationPreferences(profileId, preferences) {
    return this.updateTenantProfile(profileId, { 
      notification_preferences: preferences 
    });
  },

  /* ------------------------------------------------------------------ */
  /*  Account Settings (public.tenant_settings)                          */
  /* ------------------------------------------------------------------ */

  // Columns that exist on public.tenant_settings (guards PostgREST 400s)
  SETTINGS_COLUMNS: [
    'notify_email',
    'notify_sms',
    'notify_whatsapp',
    'notify_push',
    'notify_rent_reminders',
    'notify_application_updates',
    'notify_property_alerts',
    'notify_marketing',
    'contact_preference',
    'language',
    'currency',
    'timezone',
    'quiet_hours_start',
    'quiet_hours_end',
    'theme',
    'profile_visibility',
    'show_phone',
    'show_email',
    'two_factor_enabled',
    'login_alerts',
    'last_password_change',
    'data_processing_consent',
    'consent_updated_at',
    'deletion_requested_at',
    'account_status',
    'deactivated_at'
  ],

  // Fetch a tenant's settings row (auto-provisions a default one if missing)
  async getTenantSettings(userId) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return await this.ensureTenantSettings(userId);
      }
      return { success: true, data };
    } catch (error) {
      // Table may not exist yet — allow the UI to work in local/demo mode
      console.warn('Error fetching tenant settings:', error?.message);
      return { success: false, error: error.message };
    }
  },

  // Create a settings row if one does not exist yet
  async ensureTenantSettings(userId) {
    if (!userId) return { success: false, error: 'Missing user id' };
    try {
      const { data, error } = await supabase
        .from('tenant_settings')
        .upsert([{ user_id: userId }], { onConflict: 'user_id', ignoreDuplicates: false })
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.warn('Error creating tenant settings:', error?.message);
      return { success: false, error: error.message };
    }
  },

  // Update any subset of settings (whitelisted to real columns)
  async updateTenantSettings(userId, updates = {}) {
    if (!userId) return { success: false, error: 'Missing user id' };

    const payload = {};
    for (const col of this.SETTINGS_COLUMNS) {
      if (updates[col] !== undefined) payload[col] = updates[col];
    }
    if (Object.keys(payload).length === 0) {
      return { success: true, data: null, unchanged: true };
    }

    try {
      // Ensure the row exists first so the update always lands
      await this.ensureTenantSettings(userId);

      const { data, error } = await supabase
        .from('tenant_settings')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating tenant settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Convenience: flip a single notification/boolean toggle
  async updateTenantSetting(userId, key, value) {
    return this.updateTenantSettings(userId, { [key]: value });
  },

  // POPIA: record a data-erasure request
  async requestDataErasure(userId) {
    return this.updateTenantSettings(userId, {
      deletion_requested_at: new Date().toISOString()
    });
  },

  // Account: deactivate or reactivate
  async setAccountStatus(userId, status) {
    return this.updateTenantSettings(userId, {
      account_status: status === 'deactivated' ? 'deactivated' : 'active',
      deactivated_at: status === 'deactivated' ? new Date().toISOString() : null
    });
  },

  // Get all active properties for browsing
  async getProperties() {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching properties:', error);
      return { success: false, error: error.message };
    }
  },

  // Submit General Application with verified PDF attachments and payment data
  async submitApplication(applicationData) {
    try {
      // 1. Persist inline PDF attachments to storage and keep their metadata.
      //    (Stripping the base64 without uploading it is what left reviewers
      //    staring at "0 files attached".)
      const cleanDocs = await buildCleanDocuments(applicationData.documents, applicationData.tenant_id);

      // 2. Build full enhanced payload with deterministic payment linking
      const isFeePaid = Boolean(
        applicationData.fee_paid === true ||
        applicationData.fee_paid === 'true' ||
        applicationData.fee_receipt
      );
      const paymentId = applicationData.payment_id || (isFeePaid ? generateUUID() : null);

      const fullPayload = {
        ...applicationData,
        documents: cleanDocs,
        accommodation_category: applicationData.accommodation_category || applicationData.category || 'standard_room',
        fee_paid: isFeePaid,
        fee_amount: applicationData.fee_amount || 100,
        fee_currency: applicationData.fee_currency || 'ZAR',
        fee_receipt: applicationData.fee_receipt || (isFeePaid ? `REC-P4U-${Date.now().toString().slice(-6)}` : null),
        payment_method: applicationData.payment_method || 'Card (PayPal)',
        payment_id: paymentId,
        property_id: applicationData.property_id || null,
        property_title: applicationData.property_title || null,
        status: applicationData.status || 'submitted',
        submitted_at: applicationData.submitted_at || new Date().toISOString()
      };

      // 3. Whitelist strictly valid schema columns to prevent PostgREST 400 Bad Request
      const schemaPayload = {};
      for (const col of SCHEMA_APPLICATION_COLUMNS) {
        if (fullPayload[col] !== undefined) {
          schemaPayload[col] = fullPayload[col];
        }
      }

      let { data, error } = await supabase
        .from('applications')
        .insert([schemaPayload])
        .select()
        .single();

      // 4. If table lacks new columns (PGRST204), sanitize to standard columns & embed Base64 metadata
      if (error) {
        const metadataToEmbed = {
          documents: cleanDocs,
          accommodation_category: fullPayload.accommodation_category,
          category: fullPayload.accommodation_category,
          property_id: fullPayload.property_id,
          property_title: fullPayload.property_title,
          fee_paid: fullPayload.fee_paid,
          fee_amount: fullPayload.fee_amount,
          fee_currency: fullPayload.fee_currency,
          fee_receipt: fullPayload.fee_receipt,
          payment_method: fullPayload.payment_method,
          payment_id: fullPayload.payment_id
        };

        const encodedToken = `[P4U_DATA:${encodeAppMetadata(metadataToEmbed)}]`;
        const baseReq = (applicationData.special_requirements || '')
          .replace(/\n?\[P4U_DATA:[A-Za-z0-9+/=]+\]/g, '')
          .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
          .trim();
        
        const combinedSpecialReq = baseReq ? `${baseReq}\n${encodedToken}` : encodedToken;

        // Build strictly standard column object
        const sanitized = {};
        for (const col of KNOWN_APPLICATION_COLUMNS) {
          if (col === 'special_requirements') {
            sanitized.special_requirements = combinedSpecialReq;
          } else if (fullPayload[col] !== undefined) {
            sanitized[col] = fullPayload[col];
          }
        }

        const retry = await supabase
          .from('applications')
          .insert([sanitized])
          .select()
          .single();

        if (retry.error) {
          throw retry.error;
        }

        data = {
          ...retry.data,
          ...metadataToEmbed,
          special_requirements: baseReq
        };
      }

      // 5. Insert document records into public.documents for auditing
      if (cleanDocs.length > 0 && fullPayload.tenant_id) {
        const typeMap = {
          university_acceptance: 'other',
          bursary_confirmation: 'proof_of_income',
          student_id: 'id',
          id_document: 'id',
          bank_statement: 'proof_of_income',
          payslip: 'proof_of_income'
        };

        for (const doc of cleanDocs) {
          try {
            await supabase.from('documents').insert([{
              user_id: fullPayload.tenant_id,
              document_type: typeMap[doc.slotKey] || 'other',
              document_url: doc.fileUrl || doc.fileName || 'uploaded_pdf',
              verified: true,
              uploaded_at: new Date().toISOString()
            }]);
          } catch (docErr) {
            console.warn('public.documents tracking notice:', docErr?.message);
          }
        }
      }

      // 6. Record payment in public.payments and mirror in local storage
      if (fullPayload.fee_receipt || fullPayload.payment_id) {
        const payRes = await this.recordPayment({
          id: fullPayload.payment_id,
          payer_id: fullPayload.tenant_id,
          application_id: data?.id || null,
          property_id: fullPayload.property_id,
          amount: fullPayload.fee_amount || 100,
          currency: fullPayload.fee_currency || 'ZAR',
          payment_type: 'application_fee',
          payment_method: 'card',
          receipt_number: fullPayload.fee_receipt || `REC-P4U-${Date.now().toString().slice(-6)}`,
          status: 'completed',
          description: `Place4U Application Screening Fee (R${fullPayload.fee_amount || 100}) - ${fullPayload.property_title || 'Rental Unit'}`
        });

        if (payRes?.data?.id && data) {
          data.payment_id = payRes.data.id;
        }
      }

      if (data) {
        if (!data.payment_id && fullPayload.payment_id) {
          data.payment_id = fullPayload.payment_id;
        }
        data.fee_paid = fullPayload.fee_paid;
        data.fee_receipt = fullPayload.fee_receipt;
      }

      if (data?.id) {
        broadcastApplicationUpdate(data.id, data.status || 'submitted', data);
      }

      return { success: true, data };
    } catch (error) {
      console.warn('Application submission handled via fallback:', error?.message || error);
      return { success: false, error: error?.message || 'Database insert failed' };
    }
  },

  // Get all applications for a user (decodes embedded documents and metadata)
  async getTenantApplications(userId) {
    try {
      let data = [];
      try {
        const res = await supabase
          .from('applications')
          .select(`
            *,
            agent:users!applications_assigned_to_fkey(id, full_name, email, phone)
          `)
          .eq('tenant_id', userId)
          .order('submitted_at', { ascending: false });
        if (!res.error && res.data) {
          data = res.data;
        } else {
          throw res.error;
        }
      } catch {
        const fallbackRes = await supabase
          .from('applications')
          .select('*')
          .eq('tenant_id', userId)
          .order('submitted_at', { ascending: false });
        data = fallbackRes.data || [];
      }

      // Read local payments for cross-referencing and self-healing
      let localPayments = [];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localPayments = JSON.parse(localStorage.getItem('place4u_payments') || '[]');
        }
      } catch {}

      // The same-browser cache may still hold the original base64 payloads for
      // applications submitted before attachments were persisted. Used below to
      // self-heal those rows by uploading the file the next time they load.
      const localDocsByAppId = new Map();
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const cachedApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
          cachedApps.forEach((a) => {
            if (a?.id && Array.isArray(a.documents)) localDocsByAppId.set(a.id, a.documents);
          });
        }
      } catch {}

      const formattedApps = await Promise.all((data || []).map(async row => {
        let meta = {};
        if (row.special_requirements && row.special_requirements.includes('[P4U_DATA:')) {
          const match = row.special_requirements.match(/\[P4U_DATA:([A-Za-z0-9+/=]+)\]/);
          if (match && match[1]) {
            const decoded = decodeAppMetadata(match[1]);
            if (decoded && typeof decoded === 'object') {
              meta = decoded;
            }
          }
        }

        const cleanReq = (row.special_requirements || '')
          .replace(/\n?\[P4U_DATA:[A-Za-z0-9+/=]+\]/g, '')
          .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
          .trim();

        const rawDocs = (Array.isArray(row.documents) && row.documents.length > 0)
          ? row.documents
          : (Array.isArray(meta.documents) ? meta.documents : []);

        const localDocs = localDocsByAppId.get(row.id) || [];
        let healed = false;

        // Attachments live in the private 'documents' bucket. Where a record has
        // no storage reference yet but the original base64 is still cached in this
        // browser, upload it now (one-time backfill) so reviewers can open it.
        // Then exchange the durable reference for a fresh signed URL on every load.
        const docs = await Promise.all(
          rawDocs.map(async (doc) => {
            if (!doc || typeof doc !== 'object') return doc;
            let next = doc;

            if (!next.storagePath) {
              const cached = localDocs.find((ld) => ld && (ld.slotKey === next.slotKey || ld.id === next.id));
              const inline = cached?.dataUrl || (isInlineDataUrl(cached?.fileUrl) ? cached.fileUrl : null);
              if (inline) {
                const uploaded = await uploadInlineDocument(
                  { ...next, dataUrl: inline, fileName: next.fileName || cached.fileName },
                  userId
                );
                if (uploaded) {
                  healed = true;
                  next = {
                    ...next,
                    storagePath: uploaded.storagePath,
                    bucket: uploaded.bucket,
                    fileUrl: uploaded.fileUrl || next.fileUrl
                  };
                }
              }
            }

            const source = next.storagePath || next.fileUrl || null;
            if (!source) return next;
            const url = await resolveDocumentUrl(source, { bucket: next.bucket || APPLICATION_DOCUMENTS_BUCKET });
            return url ? { ...next, fileUrl: url } : next;
          })
        );

        // Persist the backfilled references so other roles can resolve them too.
        if (healed && row.id && !String(row.id).startsWith('app-')) {
          supabase
            .from('applications')
            .update({ documents: docs })
            .eq('id', row.id)
            .then(() => {})
            .catch(() => {});
        }

        const feeReceipt = row.fee_receipt || meta.fee_receipt || null;
        const feePaid = Boolean(
          row.fee_paid === true ||
          row.fee_paid === 'true' ||
          feeReceipt ||
          meta.fee_paid === true ||
          meta.fee_paid === 'true' ||
          row.payment_id ||
          meta.payment_id
        );

        // Self-heal payment_id if fee was paid but payment_id was unlinked
        let resolvedPaymentId = row.payment_id || meta.payment_id || null;
        if (!resolvedPaymentId && (feePaid || feeReceipt)) {
          const matchedPayment = localPayments.find(p => 
            (p && p.application_id && p.application_id === row.id) ||
            (feeReceipt && p && p.receipt_number === feeReceipt)
          );
          if (matchedPayment?.id) {
            resolvedPaymentId = matchedPayment.id;
          } else if (feePaid || feeReceipt) {
            resolvedPaymentId = generateUUID();
          }

          // Asynchronously heal database if id is valid UUID
          if (resolvedPaymentId && row.id && !row.id.startsWith('app-')) {
            supabase
              .from('applications')
              .update({ payment_id: resolvedPaymentId, fee_paid: true })
              .eq('id', row.id)
              .then(() => {})
              .catch(() => {});
          }
        }

        return {
          ...row,
          special_requirements: cleanReq,
          documents: docs,
          accommodation_category: row.accommodation_category || meta.accommodation_category || meta.category || 'standard_room',
          category: row.accommodation_category || meta.accommodation_category || meta.category || 'standard_room',
          property_id: row.property_id || meta.property_id || null,
          property_title: row.property_title || meta.property_title || (meta.category === 'student_room' ? 'Student Accommodation Application' : 'Residential Rental Application'),
          fee_paid: feePaid,
          fee_amount: row.fee_amount || meta.fee_amount || 100,
          fee_currency: row.fee_currency || meta.fee_currency || 'ZAR',
          fee_receipt: feeReceipt,
          payment_method: row.payment_method || meta.payment_method || 'Card (PayPal)',
          payment_id: resolvedPaymentId
        };
      }));

      return { success: true, data: formattedApps };
    } catch (error) {
      console.warn('Error fetching applications:', error);
      return { success: false, error: error.message };
    }
  },

  // Update application with metadata fallback
  async updateApplication(applicationId, data) {
    try {
      // Persist any newly attached inline PDFs (uploads need the owning tenant
      // id, which is present on the update payload — fall back to the session).
      let tenantId = data.tenant_id || null;
      if (!tenantId) {
        try {
          const { data: authData } = await supabase.auth.getUser();
          tenantId = authData?.user?.id || null;
        } catch {}
      }
      const cleanDocs = await buildCleanDocuments(data.documents, tenantId);

      const fullUpdate = {
        ...data,
        documents: cleanDocs
      };

      const schemaUpdate = {};
      for (const col of SCHEMA_APPLICATION_COLUMNS) {
        if (fullUpdate[col] !== undefined) {
          schemaUpdate[col] = fullUpdate[col];
        }
      }

      const { data: result, error } = await supabase
        .from('applications')
        .update(schemaUpdate)
        .eq('id', applicationId)
        .select()
        .single();

      // Mirror updates to local storage cache for instant offline access
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const localSaved = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
          const updatedLocal = localSaved.map(a => a.id === applicationId ? { ...a, ...fullUpdate } : a);
          localStorage.setItem('place4u_tenant_applications', JSON.stringify(updatedLocal));
        } catch {}
      }

      broadcastApplicationUpdate(applicationId, fullUpdate.status || 'submitted', fullUpdate);

      if (!error && result) return { success: true, data: result };

      if (error) {
        const metadataToEmbed = {
          documents: cleanDocs,
          accommodation_category: data.accommodation_category || data.category || 'standard_room',
          category: data.accommodation_category || data.category || 'standard_room',
          property_id: data.property_id || null,
          property_title: data.property_title || null,
          fee_paid: data.fee_paid ?? true,
          fee_amount: data.fee_amount || 100,
          fee_currency: data.fee_currency || 'ZAR',
          fee_receipt: data.fee_receipt || null,
          payment_method: data.payment_method || 'Card (PayPal)',
          payment_id: data.payment_id || null
        };

        const encodedToken = `[P4U_DATA:${encodeAppMetadata(metadataToEmbed)}]`;
        const baseReq = (data.special_requirements || '')
          .replace(/\n?\[P4U_DATA:[A-Za-z0-9+/=]+\]/g, '')
          .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
          .trim();
        const combinedSpecialReq = baseReq ? `${baseReq}\n${encodedToken}` : encodedToken;

        const sanitized = {};
        for (const col of KNOWN_APPLICATION_COLUMNS) {
          if (col === 'special_requirements') {
            sanitized.special_requirements = combinedSpecialReq;
          } else if (data[col] !== undefined) {
            sanitized[col] = data[col];
          }
        }

        const retry = await supabase
          .from('applications')
          .update(sanitized)
          .eq('id', applicationId)
          .select()
          .single();

        if (retry.error) throw retry.error;
        if (retry.data) {
          return {
            success: true,
            data: {
              ...retry.data,
              ...metadataToEmbed,
              special_requirements: baseReq
            }
          };
        }
      }

      throw error;
    } catch (error) {
      console.warn('Error updating application:', error);
      return { success: false, error: error.message };
    }
  },

  // Cancel application (tenant withdrawal). Persist the canonical 'cancelled'
  // status so every dashboard agrees — previously this wrote 'expired' while the
  // UI showed 'cancelled', so the row reverted to 'expired' on the next fetch.
  async cancelApplication(applicationId) {
    try {
      const { data: result, error } = await supabase
        .from('applications')
        .update({ status: APPLICATION_STATUS.CANCELLED })
        .eq('id', applicationId)
        .select()
        .single();
      if (error) throw error;
      broadcastApplicationUpdate(applicationId, APPLICATION_STATUS.CANCELLED, {
        status: APPLICATION_STATUS.CANCELLED
      });
      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling application:', error);
      return { success: false, error: error.message };
    }
  },

  // Get properties the tenant applied for or saved
  async getTenantProperties(tenantProfileId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', tenantProfileId);

      if (error) {
        return { success: true, data: [] };
      }
      return { success: true, data: data || [] };
    } catch {
      return { success: true, data: [] };
    }
  },

  // Profile Image Handling
  async uploadProfileImage(userId, file) {
    try {
      if (!userId) throw new Error('A signed-in user is required to upload a profile picture.');
      const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
      const filePath = `tenant-profiles/${userId}/profile-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl, filePath };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return { success: false, error: error.message };
    }
  },

  // Persist the avatar URL onto the tenant profile record (matches by id or user_id)
  async updateProfileImage(profileId, imageUrl) {
    try {
      if (!profileId) throw new Error('Profile identifier is required to update the profile image.');
      const { data, error } = await supabase
        .from('tenant_profiles')
        .update({ profile_image_url: imageUrl })
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile image:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove the avatar URL from the profile record
  async removeProfileImage(profileId) {
    return this.updateProfileImage(profileId, null);
  },

  // Application & Verification Document Uploads (PDF / Images)
  async uploadDocument(userId, file, slotKey = 'doc') {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${userId}/${slotKey}-${Date.now()}-${sanitizedName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          contentType: file.type || 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      return {
        success: true,
        filePath,
        url: signedData?.signedUrl || filePath,
        fileName: file.name
      };
    } catch (error) {
      console.warn('Storage upload fallback:', error);
      return { success: false, error: error.message };
    }
  },

  // Log Activity
  async logActivity(tenantId, activityType, description) {
    try {
      const { error } = await supabase
        .from('tenant_activity_log')
        .insert([{
          tenant_id: tenantId,
          activity_type: activityType,
          activity_description: description,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  },

  async getActivityLog(tenantId, limit = 5) {
    try {
      const { data, error } = await supabase
        .from('tenant_activity_log')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return { success: false, error: error.message };
    }
  },

  // Messages
  async listLandlordContacts(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, user_type')
        .in('user_type', ['landlord', 'agent', 'admin'])
        .order('full_name', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching contacts:', error);
      return { success: false, error: error.message };
    }
  },

  async getDirectMessages(userId, contactId, limit = 100) {
    try {
      let { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error && error.code === '42P01') {
        const fallbackRes = await supabase
          .from('direct_messages')
          .select('*')
          .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
          .order('created_at', { ascending: true })
          .limit(limit);
        if (fallbackRes.error) throw fallbackRes.error;
        return { success: true, data: fallbackRes.data || [] };
      }
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }
  },

  async sendDirectMessage(senderId, receiverId, content) {
    try {
      let { data, error } = await supabase
        .from('messages')
        .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
        .select()
        .single();

      if (error && error.code === '42P01') {
        const fallbackRes = await supabase
          .from('direct_messages')
          .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
          .select()
          .single();
        if (fallbackRes.error) throw fallbackRes.error;
        return { success: true, data: fallbackRes.data };
      }
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  // Record Application Fee or Rent Payment
  async recordPayment(paymentData) {
    try {
      const paymentId = paymentData.id || generateUUID();
      const record = {
        id: paymentId,
        payer_id: paymentData.payer_id || paymentData.tenant_id || paymentData.userId || null,
        application_id: paymentData.application_id || null,
        property_id: paymentData.property_id ? String(paymentData.property_id) : null,
        amount: Number(paymentData.amount || paymentData.amountZar || 100.00),
        currency: paymentData.currency || 'ZAR',
        payment_type: paymentData.payment_type || 'application_fee',
        payment_method: paymentData.payment_method || 'card',
        gateway: paymentData.gateway || 'paypal',
        gateway_order_id: paymentData.gateway_order_id || paymentData.orderId || null,
        gateway_capture_id: paymentData.gateway_capture_id || paymentData.captureId || null,
        receipt_number: paymentData.receipt_number || paymentData.receiptNumber || `REC-P4U-${Date.now().toString().slice(-6)}`,
        card_brand: paymentData.card_brand || paymentData.cardBrand || 'Card',
        card_last4: paymentData.card_last4 || paymentData.cardLast4 || '4242',
        status: paymentData.status || 'completed',
        payer_name: paymentData.payer_name || paymentData.applicantName || null,
        payer_email: paymentData.payer_email || null,
        description: paymentData.description || `Place4U Tenant Application Screening Fee (R${paymentData.amount || 100})`,
        metadata: paymentData.metadata || {
          propertyTitle: paymentData.propertyTitle || paymentData.property_title || '',
          paidAt: new Date().toISOString()
        }
      };

      // 1. Mirror in localStorage for instant access & offline durability
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const local = JSON.parse(localStorage.getItem('place4u_payments') || '[]');
          const filtered = local.filter(p => p.receipt_number !== record.receipt_number && p.id !== record.id);
          localStorage.setItem('place4u_payments', JSON.stringify([record, ...filtered]));

          // If application_id is provided, also update matching application in localStorage
          if (record.application_id) {
            const localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
            const updatedApps = localApps.map(a => {
              if (a.id === record.application_id) {
                return {
                  ...a,
                  payment_id: record.id,
                  fee_paid: true,
                  fee_receipt: record.receipt_number,
                  fee_amount: record.amount,
                  fee_currency: record.currency,
                  payment_method: 'Card (PayPal)'
                };
              }
              return a;
            });
            localStorage.setItem('place4u_tenant_applications', JSON.stringify(updatedApps));
          }
        }
      } catch (e) {
        console.warn('LocalStorage payment caching notice:', e);
      }

      // If application_id is provided, link payment_id into public.applications table
      if (record.application_id && !record.application_id.startsWith('app-')) {
        try {
          await supabase
            .from('applications')
            .update({
              payment_id: record.id,
              fee_paid: true,
              fee_receipt: record.receipt_number,
              fee_amount: record.amount,
              fee_currency: record.currency,
              payment_method: 'Card (PayPal)'
            })
            .eq('id', record.application_id);
        } catch (appUpdateErr) {
          console.warn('Notice updating application with payment_id:', appUpdateErr);
        }
      }

      // 2. Check if payment was already recorded with this receipt number (idempotent)
      const { data: existing } = await supabase
        .from('payments')
        .select('id, application_id, status')
        .eq('receipt_number', record.receipt_number)
        .maybeSingle();

      if (existing) {
        const finalId = existing.id || record.id;
        // Link to application_id if not yet linked
        if (record.application_id) {
          try {
            const { data: updated } = await supabase
              .from('payments')
              .update({ application_id: record.application_id })
              .eq('id', existing.id)
              .select()
              .maybeSingle();

            if (!record.application_id.startsWith('app-')) {
              await supabase
                .from('applications')
                .update({ payment_id: finalId, fee_paid: true, fee_receipt: record.receipt_number })
                .eq('id', record.application_id);
            }

            return { success: true, data: { ...existing, ...updated, id: finalId } };
          } catch {
            return { success: true, data: { ...existing, id: finalId } };
          }
        }
        return { success: true, data: { ...existing, id: finalId } };
      }

      // 3. Insert to Supabase public.payments
      const { data, error } = await supabase
        .from('payments')
        .insert([record])
        .select()
        .single();

      if (error) {
        // Handle unique constraint error (HTTP 409 / code 23505) gracefully
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          return { success: true, data: record, duplicate: true };
        }
        console.warn('Supabase public.payments insert notice:', error.message);
        return { success: true, data: record, fallback: true };
      }

      return { success: true, data: data || record };
    } catch (err) {
      console.warn('Payment recording fallback:', err);
      return { success: true, data: paymentData, fallback: true };
    }
  },

  // Explicitly link payment record and application record bidirectionally
  async linkPaymentToApplication(paymentId, applicationId, receiptData = {}) {
    if (!paymentId || !applicationId) return { success: false, error: 'Missing IDs' };

    try {
      const receiptNumber = receiptData?.receipt_number || receiptData?.receiptNumber;

      // 1. Update Supabase public.applications
      if (!applicationId.startsWith('app-')) {
        const appUpdates = {
          payment_id: paymentId,
          fee_paid: true
        };
        if (receiptNumber) appUpdates.fee_receipt = receiptNumber;

        await supabase
          .from('applications')
          .update(appUpdates)
          .eq('id', applicationId);
      }

      // 2. Update Supabase public.payments
      if (!paymentId.startsWith('pay-')) {
        await supabase
          .from('payments')
          .update({ application_id: applicationId })
          .eq('id', paymentId);
      }

      // 3. Mirror in localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const localApps = JSON.parse(localStorage.getItem('place4u_tenant_applications') || '[]');
          const updatedApps = localApps.map(a => {
            if (a.id === applicationId) {
              return {
                ...a,
                payment_id: paymentId,
                fee_paid: true,
                fee_receipt: receiptNumber || a.fee_receipt
              };
            }
            return a;
          });
          localStorage.setItem('place4u_tenant_applications', JSON.stringify(updatedApps));

          const localPayments = JSON.parse(localStorage.getItem('place4u_payments') || '[]');
          const updatedPayments = localPayments.map(p => {
            if (p.id === paymentId || (receiptNumber && p.receipt_number === receiptNumber)) {
              return {
                ...p,
                application_id: applicationId
              };
            }
            return p;
          });
          localStorage.setItem('place4u_payments', JSON.stringify(updatedPayments));
        } catch {}
      }

      broadcastApplicationUpdate(applicationId, 'submitted', {
        payment_id: paymentId,
        fee_paid: true,
        fee_receipt: receiptNumber
      });

      return { success: true };
    } catch (err) {
      console.warn('Link payment to application notice:', err);
      return { success: false, error: err?.message };
    }
  },

  // Get tenant payment records
  async getTenantPayments(userId) {
    try {
      let remoteData = [];
      try {
        // Scope server-side to this payer (RLS is the real gate; this narrows
        // the payload and keeps an unscoped read from leaking other tenants).
        let query = supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (userId) query = query.eq('payer_id', userId);

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          remoteData = data;
        }
      } catch (e) {
        // Table may not yet be created in Supabase
      }

      let localData = [];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localData = JSON.parse(localStorage.getItem('place4u_payments') || '[]');
          // Only ever surface this payer's own receipts — a shared browser keeps
          // the previous tenant's rows under the same key.
          if (userId) {
            localData = localData.filter((p) => p.payer_id != null && String(p.payer_id) === String(userId));
          }
        }
      } catch {}

      const all = [...remoteData];
      localData.forEach(lp => {
        if (!all.some(r => r.receipt_number === lp.receipt_number)) {
          all.push(lp);
        }
      });

      return { success: true, data: all };
    } catch (error) {
      console.error('Error fetching tenant payments:', error);
      return { success: false, error: error.message };
    }
  }
};
