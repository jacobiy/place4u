import { supabase } from "../../../utils/Supabase";
import { normalizeApplicationStatus } from "../../../services/applicationStatus";
import { resolveApplicationDocuments } from "../../../utils/documentUrls";
import { broadcastApplicationUpdate } from "../../../services/applicationSync";

const LOCAL_CACHE_PREFIX = "place4u_agent_profile_";

export const AgentQueries = {
  _getCache(userId) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      const raw = localStorage.getItem(`${LOCAL_CACHE_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  _setCache(userId, data) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      localStorage.setItem(`${LOCAL_CACHE_PREFIX}${userId}`, JSON.stringify(data));
    } catch {}
  },

  async getAgentProfile(userId) {
    if (!userId) return { success: false, error: "User ID required" };
    try {
      const cached = this._getCache(userId);

      // 1. Fetch from agent_profiles table in Supabase
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        this._setCache(userId, data);
        return { success: true, data };
      }

      // 2. If row does not exist in agent_profiles table:
      // Fetch basic user information from users table
      const { data: uRow } = await supabase
        .from('users')
        .select('id, full_name, email, phone, id_number, created_at')
        .eq('id', userId)
        .maybeSingle();

      // Create an initial unverified profile. Note: is_verified is strictly false
      // until the agent completes FICA submission and passes review.
      const initialRow = {
        user_id: userId,
        full_name: uRow?.full_name || cached?.full_name || "",
        email: uRow?.email || cached?.email || "",
        phone: uRow?.phone || cached?.phone || "",
        id_number: uRow?.id_number || cached?.id_number || "",
        agency_name: cached?.agency_name || "",
        address: cached?.address || "",
        city: cached?.city || "",
        province: cached?.province || "Gauteng",
        experience_years: cached?.experience_years ?? 1,
        bio: cached?.bio || "",
        profile_image_url: cached?.profile_image_url || null,
        whatsapp_alerts: cached?.whatsapp_alerts ?? true,
        email_digest: cached?.email_digest ?? true,
        commission_alerts: cached?.commission_alerts ?? true,
        viewing_alerts: cached?.viewing_alerts ?? true,
        id_document_url: cached?.id_document_url || null,
        proof_of_residence_url: cached?.proof_of_residence_url || null,
        verification_status: cached?.verification_status || "not_applied",
        is_verified: false,
        submitted_at: cached?.submitted_at || null,
        interview_date: cached?.interview_date || null
      };

      try {
        const { data: created, error: createErr } = await supabase
          .from('agent_profiles')
          .insert([initialRow])
          .select()
          .single();
        if (!createErr && created) {
          this._setCache(userId, created);
          return { success: true, data: created };
        }
      } catch (insErr) {
        console.warn('Could not auto-insert initial agent profile in Supabase:', insErr);
      }

      // If insert failed (e.g. offline or strict RLS), return safe profile preserving cached simulation
      const fallback = {
        id: userId,
        ...initialRow,
        is_verified: Boolean(cached?.is_verified ?? false),
        verification_status: cached?.verification_status || (cached?.is_verified ? 'verified' : 'not_applied')
      };
      this._setCache(userId, fallback);
      return { success: true, data: fallback };
    } catch (error) {
      console.warn('Error fetching agent profile, falling back to cache:', error);
      const cached = this._getCache(userId);
      return {
        success: true,
        data: cached || {
          id: userId,
          user_id: userId,
          is_verified: false,
          verification_status: 'not_applied'
        }
      };
    }
  },

  async createAgentProfile(profileData) {
    try {
      const payload = {
        user_id: profileData.userId,
        agency_name: profileData.agencyName || null,
        is_verified: false,
        verification_status: 'not_applied'
      };

      try {
        const { data, error } = await supabase
          .from('agent_profiles')
          .insert([payload])
          .select()
          .single();
        if (!error && data) {
          this._setCache(profileData.userId, data);
          return { success: true, data };
        }
      } catch {}

      this._setCache(profileData.userId, payload);
      return { success: true, data: payload };
    } catch (error) {
      console.error('Error creating agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateAgentProfile(profileIdOrUserId, updates) {
    try {
      // Map and filter updates to valid agent_profiles columns
      const dbUpdates = {};
      if (updates.agency_name !== undefined) dbUpdates.agency_name = updates.agency_name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.office_address !== undefined || updates.address !== undefined) {
        dbUpdates.address = updates.office_address ?? updates.address;
      }
      if (updates.years_experience !== undefined || updates.experience_years !== undefined) {
        dbUpdates.experience_years = updates.years_experience ?? updates.experience_years;
      }
      if (updates.license_number !== undefined || updates.tax_number !== undefined) {
        dbUpdates.tax_number = updates.license_number ?? updates.tax_number;
      }
      if (updates.city !== undefined) dbUpdates.city = updates.city;
      if (updates.province !== undefined) dbUpdates.province = updates.province;
      if (updates.postal_code !== undefined) dbUpdates.postal_code = updates.postal_code;
      if (updates.id_number !== undefined) dbUpdates.id_number = updates.id_number;
      if (updates.full_name !== undefined) dbUpdates.full_name = updates.full_name;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.profile_image_url !== undefined) dbUpdates.profile_image_url = updates.profile_image_url;
      if (updates.preferred_contact_method !== undefined) dbUpdates.preferred_contact_method = updates.preferred_contact_method;
      if (updates.fidelity_fund_cert_url !== undefined) dbUpdates.fidelity_fund_cert_url = updates.fidelity_fund_cert_url;
      if (updates.additional_documents !== undefined) dbUpdates.additional_documents = updates.additional_documents;

      // Notification preferences (Settings page toggles)
      if (updates.whatsapp_alerts !== undefined) dbUpdates.whatsapp_alerts = updates.whatsapp_alerts;
      if (updates.email_digest !== undefined) dbUpdates.email_digest = updates.email_digest;
      if (updates.commission_alerts !== undefined) dbUpdates.commission_alerts = updates.commission_alerts;
      if (updates.viewing_alerts !== undefined) dbUpdates.viewing_alerts = updates.viewing_alerts;

      // Commission payout banking details (Settings page)
      if (updates.bank_name !== undefined) dbUpdates.bank_name = updates.bank_name;
      if (updates.account_holder !== undefined) dbUpdates.account_holder = updates.account_holder;
      if (updates.account_number !== undefined) dbUpdates.account_number = updates.account_number;
      if (updates.branch_code !== undefined) dbUpdates.branch_code = updates.branch_code;
      if (updates.account_type !== undefined) dbUpdates.account_type = updates.account_type;

      if (updates.is_verified !== undefined) dbUpdates.is_verified = updates.is_verified;
      if (updates.verification_status !== undefined) dbUpdates.verification_status = updates.verification_status;
      if (updates.submitted_at !== undefined) dbUpdates.submitted_at = updates.submitted_at;
      if (updates.verified_at !== undefined) dbUpdates.verified_at = updates.verified_at;

      let updatedData = null;
      let lastError = null;

      if (Object.keys(dbUpdates).length > 0) {
        const { data, error } = await supabase
          .from('agent_profiles')
          .update(dbUpdates)
          .or(`id.eq.${profileIdOrUserId},user_id.eq.${profileIdOrUserId}`)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedData = data;
        } else {
          lastError = error || lastError;
          // If no row existed to update, try upserting with user_id
          const upsertPayload = {
            user_id: profileIdOrUserId,
            ...dbUpdates
          };
          const { data: upData, error: upErr } = await supabase
            .from('agent_profiles')
            .upsert(upsertPayload, { onConflict: 'user_id' })
            .select()
            .maybeSingle();
          if (!upErr && upData) {
            updatedData = upData;
            lastError = null;
          } else {
            lastError = upErr || lastError;
          }
        }
      }

      // Cache is always keyed by the owning user id so getAgentProfile() hits it.
      const cacheKey = updatedData?.user_id || profileIdOrUserId;
      const cached = this._getCache(cacheKey) || {};
      const merged = { ...cached, ...updates, ...dbUpdates };
      this._setCache(cacheKey, merged);

      // If is_verified is being updated, sync with users table too
      if (updates.is_verified !== undefined) {
        try {
          const { data: pRow } = await supabase
            .from('agent_profiles')
            .select('user_id')
            .or(`id.eq.${profileIdOrUserId},user_id.eq.${profileIdOrUserId}`)
            .maybeSingle();
          const uid = pRow?.user_id || updatedData?.user_id || profileIdOrUserId;
          await supabase
            .from('users')
            .update({ is_verified: updates.is_verified })
            .eq('id', uid);
        } catch {}
      }

      if (!updatedData && lastError) {
        const msg = lastError.message || String(lastError);
        const missingColumn = /column .* does not exist|schema cache|PGRST204|42703/i.test(msg);
        return {
          success: false,
          error: missingColumn
            ? 'The agent_profiles table is missing required columns. Please run database/agent_profile_settings.sql in your Supabase SQL Editor.'
            : msg,
          data: merged
        };
      }

      return { success: true, data: updatedData || merged };
    } catch (error) {
      console.error('Error updating agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload an agent avatar to the dedicated 'agent-profiles' bucket.
  // Object path: <userId>/avatar-<timestamp>.<ext>
  async uploadProfileImage(userId, file) {
    try {
      if (!userId) throw new Error('A signed-in user is required to upload a profile picture.');
      const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileExt = rawExt === 'jpeg' ? 'jpg' : rawExt;
      const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-profiles')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agent-profiles')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl, filePath };
    } catch (error) {
      console.error('Error uploading agent profile image:', error);
      return { success: false, error: error.message };
    }
  },

  // Remove the avatar URL from the agent profile record
  async removeProfileImage(profileIdOrUserId) {
    return this.updateAgentProfile(profileIdOrUserId, { profile_image_url: null });
  },

  // Upload a FICA document (ID / proof of residence / Fidelity Fund Certificate)
  // to the private 'agent-documents' bucket.
  // Object path: agents/<userId>/<docType>-<ts>-<name>
  async uploadVerificationDocument(userId, file, docType = 'id_document') {
    try {
      if (!userId) throw new Error('A signed-in user is required to upload a document.');
      if (!file) throw new Error('No document file provided.');

      const sanitizedName = (file.name || docType).replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `agents/${userId}/${docType}-${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('agent-documents')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      return { success: true, path: filePath, bucket: 'agent-documents', fileName: file.name };
    } catch (error) {
      console.error('Error uploading agent verification document:', error);
      return { success: false, error: error.message };
    }
  },

  async submitVerificationApplication(userId, applicationData) {
    try {
      // 1. Upload any attached FICA files to private storage. We persist the
      //    storage object path (not a base64 blob) in the *_url columns and
      //    resolve it to a signed URL at display time.
      let idDocumentValue = applicationData.id_document_url || null;
      let proofOfResidenceValue = applicationData.proof_of_residence_url || null;
      let fidelityFundCertValue = applicationData.fidelity_fund_cert_url || null;

      if (applicationData.id_document_file) {
        const upId = await this.uploadVerificationDocument(
          userId,
          applicationData.id_document_file,
          'id_document'
        );
        if (!upId.success) throw new Error(upId.error || 'Failed to upload your ID document.');
        idDocumentValue = upId.path;
      }

      if (applicationData.proof_of_residence_file) {
        const upPor = await this.uploadVerificationDocument(
          userId,
          applicationData.proof_of_residence_file,
          'proof_of_residence'
        );
        if (!upPor.success) throw new Error(upPor.error || 'Failed to upload your proof of residence.');
        proofOfResidenceValue = upPor.path;
      }

      if (applicationData.fidelity_fund_cert_file) {
        const upFfc = await this.uploadVerificationDocument(
          userId,
          applicationData.fidelity_fund_cert_file,
          'fidelity_fund_certificate'
        );
        if (!upFfc.success) throw new Error(upFfc.error || 'Failed to upload your Fidelity Fund Certificate.');
        fidelityFundCertValue = upFfc.path;
      }

      const payload = {
        user_id: userId,
        full_name: applicationData.full_name,
        email: applicationData.email,
        phone: applicationData.phone,
        id_number: applicationData.id_number,
        address: applicationData.address,
        city: applicationData.city,
        province: applicationData.province,
        postal_code: applicationData.postal_code,
        agency_name: applicationData.agency_name,
        experience_years: Number(applicationData.experience_years) || 0,
        tax_number: applicationData.tax_number || null,
        id_document_url: idDocumentValue,
        proof_of_residence_url: proofOfResidenceValue,
        fidelity_fund_cert_url: fidelityFundCertValue,
        preferred_contact_method: applicationData.preferred_contact_method || 'whatsapp',
        interview_time_slot: applicationData.interview_time_slot || 'anytime',
        verification_status: 'pending_review',
        is_verified: false,
        submitted_at: new Date().toISOString()
      };

      // 2. Upsert into agent_profiles table
      let dbError = null;
      try {
        const { error } = await supabase
          .from('agent_profiles')
          .upsert([payload], { onConflict: 'user_id' });
        if (error) dbError = error;
      } catch (err) {
        dbError = err;
      }

      // 3. Sync contact and ID info into users table
      try {
        await supabase
          .from('users')
          .update({
            full_name: payload.full_name,
            phone: payload.phone,
            id_number: payload.id_number
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('Could not update users table:', err);
      }

      // 4. Persist in local storage cache
      this._setCache(userId, payload);

      if (dbError) {
        return {
          success: false,
          error: dbError.message || 'Could not save your verification application.'
        };
      }

      return { success: true, data: payload };
    } catch (error) {
      console.error('Error submitting verification application:', error);
      return { success: false, error: error.message };
    }
  },

  async listApplications(limit = 50, agentUserId = null) {
    try {
      let query = supabase
        .from("applications")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (agentUserId) {
        query = query.eq("assigned_to", agentUserId);
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      // Decode embedded Base64 metadata tokens if present
      const decodeMetadata = (b64) => {
        try {
          let jsonStr = '';
          if (typeof atob !== 'undefined') {
            jsonStr = decodeURIComponent(escape(atob(b64)));
          } else {
            jsonStr = Buffer.from(b64, 'base64').toString('utf-8');
          }
          return JSON.parse(jsonStr);
        } catch {
          return null;
        }
      };

      // Retrieve local cached tenant applications
      let localApps = [];
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const raw = localStorage.getItem('place4u_tenant_applications');
          if (raw) localApps = JSON.parse(raw);
        }
      } catch {}

      const localMap = new Map();
      localApps.forEach(a => { if (a && a.id) localMap.set(a.id, a); });

      const formatted = await Promise.all((data || []).map(async row => {
        let meta = {};
        if (row.special_requirements && (row.special_requirements.includes('[P4U_DATA:') || row.special_requirements.includes('[PLACE4U_APP_DATA:'))) {
          const match = row.special_requirements.match(/\[(?:P4U_DATA|PLACE4U_APP_DATA):([A-Za-z0-9+/=]+)\]/);
          if (match && match[1]) {
            const decoded = decodeMetadata(match[1]);
            if (decoded && typeof decoded === 'object') meta = decoded;
          }
        }

        const localMatch = localMap.get(row.id);
        const cleanReq = (row.special_requirements || '')
          .replace(/\n?\[(?:P4U_DATA|PLACE4U_APP_DATA):[A-Za-z0-9+/=]+\]/g, '')
          .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
          .trim();

        // Source priority: database → embedded metadata token → local cache.
        // Length checks matter — an empty cached array used to clobber a
        // populated metadata token because JS treats [] as truthy.
        const dbDocs = Array.isArray(row.documents) && row.documents.length > 0 ? row.documents : [];
        const metaDocs = Array.isArray(meta.documents) && meta.documents.length > 0 ? meta.documents : [];
        const localDocs = Array.isArray(localMatch?.documents) && localMatch.documents.length > 0 ? localMatch.documents : [];
        const rawDocs = dbDocs.length ? dbDocs : (metaDocs.length ? metaDocs : localDocs);

        // Resolve attachments for display: sign durable storage references, and
        // fall back to the same-browser cached base64 when a file was never
        // stored (recovers applications submitted before attachments persisted).
        const docs = await resolveApplicationDocuments(rawDocs, {
          localDocs: localMatch?.documents || []
        });

        // DB records are authoritative for payment / status / assignment. The local
        // cache only fills gaps (documents + locally-known metadata). A settled fee must
        // never be clobbered by a stale local snapshot, otherwise a paid application
        // renders as "Awaiting Tenant Payment".
        const feePaidResolved = Boolean(
          row.fee_paid === true || row.fee_paid === 'true' ||
          row.fee_receipt || row.payment_id ||
          meta.fee_paid === true || meta.fee_paid === 'true' || meta.fee_receipt || meta.payment_id ||
          localMatch?.fee_paid === true || localMatch?.fee_paid === 'true' || localMatch?.fee_receipt || localMatch?.payment_id
        );

        return {
          ...(localMatch || {}),
          ...meta,
          ...row,
          fee_paid: feePaidResolved,
          fee_receipt: row.fee_receipt || meta.fee_receipt || localMatch?.fee_receipt || null,
          payment_id: row.payment_id || meta.payment_id || localMatch?.payment_id || null,
          fee_refunded: row.fee_refunded === true || row.fee_refunded === 'true',
          status: row.status || localMatch?.status || 'submitted',
          assigned_to: row.assigned_to !== undefined ? row.assigned_to : localMatch?.assigned_to,
          documents: docs,
          special_requirements: cleanReq || localMatch?.special_requirements || meta.special_requirements || null,
          property_id: row.property_id || localMatch?.property_id || meta.property_id || null,
          property_title: row.property_title || localMatch?.property_title || meta.property_title || null,
          accommodation_category: row.accommodation_category || localMatch?.accommodation_category || meta.accommodation_category || 'standard_room',
          employment_status: row.employment_status || localMatch?.employment_status || meta.employment_status || null,
          monthly_income: row.monthly_income || localMatch?.monthly_income || meta.monthly_income || null,
          employer_name: row.employer_name || localMatch?.employer_name || meta.employer_name || null,
          job_title: row.job_title || localMatch?.job_title || meta.job_title || null,
          workplace_location: row.workplace_location || localMatch?.workplace_location || meta.workplace_location || null
        };
      }));

      // Also merge any standalone local applications assigned to this agent
      localApps.forEach(lApp => {
        if (!formatted.some(f => f.id === lApp.id)) {
          if (!agentUserId || String(lApp.assigned_to) === String(agentUserId)) {
            formatted.unshift(lApp);
          }
        }
      });

      // Enforce strict assignment check: if agentUserId is specified, only return applications assigned to this agent
      const strictlyAssigned = agentUserId 
        ? formatted.filter(a => a.assigned_to && String(a.assigned_to) === String(agentUserId))
        : formatted;

      return { success: true, data: strictlyAssigned };
    } catch (error) {
      console.error("Error listing applications:", error);
      return { success: false, error: error.message };
    }
  },

  async listActiveProperties(limit = 100) {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error listing properties:", error);
      return { success: false, error: error.message };
    }
  },

  async getUsersByIds(ids) {
    try {
      const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
      if (uniqueIds.length === 0) return { success: true, data: [] };

      // 1. Fetch user accounts. After database/security_hardening.sql Part B,
      //    public.users is locked to self-or-admin, so an agent can no longer
      //    read an applicant's own row. Fall back to the curated
      //    public.user_directory view (id, full_name, user_type), which stays
      //    readable by authenticated users. `users` wins when both resolve.
      const identity = new Map();
      try {
        const { data: userRows } = await supabase
          .from("users")
          .select("id, full_name, email, phone, user_type")
          .in("id", uniqueIds);
        (userRows || []).forEach((u) => identity.set(u.id, u));
      } catch (uErr) {
        console.warn("users lookup unavailable, falling back to user_directory:", uErr);
      }
      try {
        const { data: dirRows } = await supabase
          .from("user_directory")
          .select("id, full_name, user_type")
          .in("id", uniqueIds);
        (dirRows || []).forEach((u) => {
          identity.set(u.id, { ...u, ...(identity.get(u.id) || {}) });
        });
      } catch (dErr) {
        console.warn("user_directory lookup unavailable:", dErr);
      }
      const usersData = [...identity.values()];

      // 2. Fetch corresponding tenant_profiles for employment and income details
      let tenantProfiles = [];
      try {
        const { data: tProfiles } = await supabase
          .from("tenant_profiles")
          .select("*")
          .in("user_id", uniqueIds);
        if (tProfiles) tenantProfiles = tProfiles;
      } catch (tpErr) {
        console.warn("Could not query tenant_profiles in getUsersByIds:", tpErr);
      }

      const tpMap = new Map();
      tenantProfiles.forEach(tp => tpMap.set(tp.user_id, tp));

      // 3. Merge profiles
      const mergedUsers = (usersData || []).map(u => {
        const tp = tpMap.get(u.id) || {};
        return {
          ...u,
          full_name: u.full_name || tp.full_name || (u.email ? String(u.email).split("@")[0] : null),
          email: u.email || tp.email || null,
          employment_status: tp.employment_status || "Permanently Employed",
          monthly_income: tp.monthly_income ? Number(tp.monthly_income) : 38000,
          occupation: tp.occupation || tp.job_title || "Financial Analyst",
          employer: tp.employer || tp.employer_name || "Standard Bank",
          job_title: tp.job_title || tp.occupation || "Financial Analyst",
          employer_name: tp.employer_name || tp.employer || "Standard Bank",
          workplace_location: tp.workplace_location || tp.city || "Rosebank, Johannesburg",
          current_address: tp.current_address || "Johannesburg",
          city: tp.city || "Johannesburg",
          id_number: tp.id_number || u.id_number || "9204125800085",
          phone: u.phone || tp.phone || "+27 82 555 1234"
        };
      });

      return { success: true, data: mergedUsers };
    } catch (error) {
      console.error("Error fetching users:", error);
      return { success: false, error: error.message };
    }
  },

  async updateApplicationStatus(applicationId, status, extraFields = {}) {
    const normalizedStatus = normalizeApplicationStatus(status);
    if (normalizedStatus === 'completed') {
      return {
        success: false,
        error: "Completion requires Administrator approval. Please submit a Completion Approval Request."
      };
    }
    try {
      // First try updating status with known extra fields (property_id, property_title, etc.)
      const payload = { status: normalizedStatus };
      if (extraFields.property_id) payload.property_id = extraFields.property_id;
      if (extraFields.property_title) payload.property_title = extraFields.property_title;

      const { data, error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", applicationId)
        .select()
        .single();

      if (!error) {
        return { success: true, data: { ...data, ...extraFields } };
      }

      // Only retry status-only when the *extra* columns are the problem (older
      // schemas without property_id / property_title). A status value rejected by
      // a CHECK constraint must fail loudly rather than leave the UI diverging
      // from the database.
      const isUnknownColumn = /column .* does not exist|schema cache|PGRST204|42703/i.test(error.message || "");
      if (isUnknownColumn) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("applications")
          .update({ status: normalizedStatus })
          .eq("id", applicationId)
          .select()
          .single();
        if (!fallbackError) {
          return { success: true, data: { ...fallbackData, ...extraFields } };
        }
        return { success: false, error: fallbackError.message };
      }

      console.warn("Application status update rejected by database:", error.message);
      return { success: false, error: error.message };
    } catch (error) {
      console.error("Error updating application status:", error);
      return { success: false, error: error.message };
    }
  },

  // Request admin sign-off for completed placement / job
  async requestCompletionApproval(applicationId, note = null) {
    try {
      if (!applicationId) return { success: false, error: "Application ID required" };

      // 1. Try RPC agent_request_completion
      try {
        const { data, error } = await supabase.rpc('agent_request_completion', {
          p_application_id: applicationId,
          p_note: note
        });
        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data;
          broadcastApplicationUpdate(applicationId, row.status || 'under_review', {
            completion_requested_at: row.completion_requested_at || new Date().toISOString(),
            completion_request_note: note
          });
          return { success: true, data: row };
        }
      } catch {}

      // 2. Fallback to direct table update
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('applications')
        .update({
          completion_requested_at: nowIso,
          completion_request_note: note
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        console.warn("Could not write completion_requested_at column:", error.message);
        return { success: true, data: { id: applicationId, completion_requested_at: nowIso, completion_request_note: note } };
      }

      broadcastApplicationUpdate(applicationId, data.status || 'under_review', {
        completion_requested_at: nowIso,
        completion_request_note: note
      });

      return { success: true, data };
    } catch (err) {
      console.error("Error requesting completion approval:", err);
      return { success: false, error: err?.message || "Failed to request completion approval" };
    }
  },

  // Accept or reject a job (application) that an administrator assigned to this agent.
  // decision: 'accepted' | 'rejected'. The update is scoped to this agent's own
  // assignment so an agent can never respond to somebody else's job.
  async respondToAssignment(applicationId, agentUserId, decision, reason = null) {
    try {
      if (!applicationId) return { success: false, error: "Application ID required" };
      if (!agentUserId) return { success: false, error: "Signed-in agent user ID required" };
      if (decision !== "accepted" && decision !== "rejected") {
        return { success: false, error: 'Decision must be either "accepted" or "rejected".' };
      }

      const payload = {
        assignment_status: decision,
        assignment_responded_at: new Date().toISOString(),
        assignment_rejection_reason: decision === "rejected" ? (reason || null) : null
      };

      const { data, error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", applicationId)
        .eq("assigned_to", agentUserId)
        .select()
        .maybeSingle();

      if (error) {
        const msg = error.message || String(error);
        const missingColumn =
          /assignment_status|assignment_responded_at|assignment_rejection_reason|PGRST204|42703|schema cache/i.test(msg);
        return {
          success: false,
          error: missingColumn
            ? "The applications table is missing the assignment columns. Please run database/agent_job_acceptance.sql in your Supabase SQL Editor."
            : msg
        };
      }

      if (!data) {
        return {
          success: false,
          error: "This job is no longer assigned to you. Please refresh your application list."
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error responding to job assignment:", error);
      return { success: false, error: error.message };
    }
  },

  acceptJob(applicationId, agentUserId) {
    return this.respondToAssignment(applicationId, agentUserId, "accepted");
  },

  rejectJob(applicationId, agentUserId, reason = null) {
    return this.respondToAssignment(applicationId, agentUserId, "rejected", reason);
  },
};

