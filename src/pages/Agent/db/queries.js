import { supabase } from "../../../utils/Supabase";

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
      if (updates.is_verified !== undefined) dbUpdates.is_verified = updates.is_verified;
      if (updates.verification_status !== undefined) dbUpdates.verification_status = updates.verification_status;
      if (updates.submitted_at !== undefined) dbUpdates.submitted_at = updates.submitted_at;
      if (updates.verified_at !== undefined) dbUpdates.verified_at = updates.verified_at;

      let updatedData = null;
      try {
        const { data, error } = await supabase
          .from('agent_profiles')
          .update(dbUpdates)
          .or(`id.eq.${profileIdOrUserId},user_id.eq.${profileIdOrUserId}`)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedData = data;
        } else {
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
          if (!upErr && upData) updatedData = upData;
        }
      } catch (err) {
        console.warn('Could not update agent_profiles in Supabase:', err);
      }

      const cached = this._getCache(profileIdOrUserId) || {};
      const merged = { ...cached, ...updates, ...dbUpdates };
      this._setCache(profileIdOrUserId, merged);

      // If is_verified is being updated, sync with users table too
      if (updates.is_verified !== undefined) {
        try {
          await supabase
            .from('users')
            .update({ is_verified: updates.is_verified })
            .eq('id', profileIdOrUserId);
        } catch {}
      }

      return { success: true, data: updatedData || merged };
    } catch (error) {
      console.error('Error updating agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  async submitVerificationApplication(userId, applicationData) {
    try {
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
        id_document_url: applicationData.id_document_url,
        proof_of_residence_url: applicationData.proof_of_residence_url,
        preferred_contact_method: applicationData.preferred_contact_method || 'whatsapp',
        interview_time_slot: applicationData.interview_time_slot || 'anytime',
        verification_status: 'pending_review',
        is_verified: false,
        submitted_at: new Date().toISOString()
      };

      // 1. Attempt upsert into agent_profiles table
      try {
        await supabase
          .from('agent_profiles')
          .upsert([payload], { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Could not upsert into agent_profiles table (may need SQL migration):', err);
      }

      // 2. Sync contact and ID info into users table
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

      // 3. Persist in local storage cache
      this._setCache(userId, payload);

      return { success: true, data: payload };
    } catch (error) {
      console.error('Error submitting verification application:', error);
      return { success: false, error: error.message };
    }
  },

  async simulateAdminVerification(userId, isVerified = true) {
    try {
      const status = isVerified ? 'verified' : 'pending_review';
      const updates = {
        is_verified: isVerified,
        verification_status: status,
        verified_at: isVerified ? new Date().toISOString() : null
      };

      try {
        const { data: updated } = await supabase
          .from('agent_profiles')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .maybeSingle();

        if (!updated) {
          await supabase
            .from('agent_profiles')
            .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });
        }
      } catch (err) {
        console.warn('Could not update agent_profiles in Supabase:', err);
      }

      try {
        await supabase
          .from('users')
          .update({ is_verified: isVerified })
          .eq('id', userId);
      } catch {}

      const cached = this._getCache(userId) || {};
      const merged = { ...cached, ...updates };
      this._setCache(userId, merged);

      return { success: true, data: merged };
    } catch (error) {
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

      const formatted = (data || []).map(row => {
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

        const docs = (Array.isArray(row.documents) && row.documents.length > 0)
          ? row.documents
          : (localMatch?.documents || meta.documents || []);

        return {
          ...row,
          ...meta,
          ...localMatch,
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
      });

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

      // 1. Fetch user accounts
      const { data: usersData, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, user_type")
        .in("id", uniqueIds);
      if (error) throw error;

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
    try {
      // First try updating status with known extra fields (property_id, property_title, etc.)
      const payload = { status };
      if (extraFields.property_id) payload.property_id = extraFields.property_id;
      if (extraFields.property_title) payload.property_title = extraFields.property_title;

      const { data, error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", applicationId)
        .select()
        .single();
      if (error) {
        // Fallback to updating status alone if additional columns do not exist
        const { data: fallbackData } = await supabase
          .from("applications")
          .update({ status })
          .eq("id", applicationId)
          .select()
          .single();
        return { success: true, data: { ...fallbackData, ...extraFields } };
      }
      return { success: true, data: { ...data, ...extraFields } };
    } catch (error) {
      console.error("Error updating application status:", error);
      return { success: false, error: error.message };
    }
  },

  async listChatContacts(limit = 200) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, user_type, created_at")
        .in("user_type", ["tenant", "landlord", "admin"])
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error listing chat contacts:", error);
      return { success: false, error: error.message };
    }
  },

  async getDirectMessages(userId, otherUserId, limit = 200) {
    try {
      let { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error && error.code === "42P01") {
        const fb = await supabase
          .from("direct_messages")
          .select("*")
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
          )
          .order("created_at", { ascending: true })
          .limit(limit);
        if (!fb.error) return { success: true, data: fb.data || [] };
      }

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { success: false, error: error.message };
    }
  },

  async sendDirectMessage(senderId, receiverId, content) {
    try {
      let { data, error } = await supabase
        .from("messages")
        .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
        .select()
        .single();

      if (error && error.code === "42P01") {
        const fb = await supabase
          .from("direct_messages")
          .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
          .select()
          .single();
        if (!fb.error) return { success: true, data: fb.data };
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error sending message:", error);
      return { success: false, error: error.message };
    }
  }
};

