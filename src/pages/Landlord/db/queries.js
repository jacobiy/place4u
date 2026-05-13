import { supabase } from '../../../utils/Supabase';

export const LandlordQueries = {
  
  // Get landlord profile by user ID
  async getLandlordProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select(`
          *,
          users:user_id (
            email,
            created_at
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error fetching landlord profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Get landlord profile by ID
  async getLandlordProfileById(profileId) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error fetching landlord profile by ID:', error);
      return { success: false, error: error.message };
    }
  },

  // Get landlord profile by landlord code
  async getLandlordProfileByCode(landlordCode) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('landlord_code', landlordCode)
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data: data || null };
    } catch (error) {
      console.error('Error fetching landlord profile by code:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new landlord profile
  async createLandlordProfile(profileData) {
    try {
      // Check if profile already exists to prevent duplicate
      const existingProfile = await this.getLandlordProfile(profileData.userId);
      if (existingProfile.success && existingProfile.data) {
        return { success: true, data: existingProfile.data, message: 'Profile already exists' };
      }

      // Generate landlord code if not provided
      const landlordCode = profileData.landlordCode || await this.generateLandlordCode();

      const { data, error } = await supabase
        .from('landlord_profiles')
        .insert([{
          user_id: profileData.userId,
          landlord_code: landlordCode,
          full_name: profileData.fullName || null,
          company_name: profileData.companyName || null,
          tax_id: profileData.taxId || null,
          profile_image_url: profileData.profileImageUrl || null,
          email: profileData.email || null,
          phone: profileData.phone || null,
          alternative_phone: profileData.alternativePhone || null,
          contact_preference: profileData.contactPreference || 'both',
          address: profileData.address || null,
          city: profileData.city || null,
          state: profileData.state || null,
          country: profileData.country || null,
          postal_code: profileData.postalCode || null,
          id_verified: profileData.idVerified || false,
          email_verified: profileData.emailVerified || false,
          phone_verified: profileData.phoneVerified || false,
          ownership_proof_verified: profileData.ownershipProofVerified || false,
          verification_documents: profileData.verificationDocuments || [],
          total_properties: profileData.totalProperties || 0,
          total_tenants: profileData.totalTenants || 0,
          total_income: profileData.totalIncome || 0,
          currency: profileData.currency || 'ZAR',
          join_date: profileData.joinDate || new Date().toISOString().split('T')[0],
          notification_preferences: profileData.notificationPreferences || {
            email: true,
            sms: true,
            push: false,
            maintenance: true,
            payments: true,
            messages: true
          },
          two_factor_enabled: profileData.twoFactorEnabled || false,
          two_factor_secret: profileData.twoFactorSecret || null,
          account_status: profileData.accountStatus || 'active',
          account_tier: profileData.accountTier || 'basic',
          language: profileData.language || 'en',
          timezone: profileData.timezone || 'Africa/Johannesburg',
          date_format: profileData.dateFormat || 'DD/MM/YYYY',
          metadata: profileData.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating landlord profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Update landlord profile
  async updateLandlordProfile(profileId, updates) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating landlord profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Update specific sections of the profile
  async updatePersonalInfo(profileId, personalInfo) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          full_name: personalInfo.fullName,
          company_name: personalInfo.companyName,
          tax_id: personalInfo.taxId,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating personal info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateContactInfo(profileId, contactInfo) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          email: contactInfo.email,
          phone: contactInfo.phone,
          alternative_phone: contactInfo.alternativePhone,
          contact_preference: contactInfo.contactPreference,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating contact info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateAddressInfo(profileId, addressInfo) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          address: addressInfo.address,
          city: addressInfo.city,
          state: addressInfo.state,
          country: addressInfo.country,
          postal_code: addressInfo.postalCode,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating address info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateNotificationPreferences(profileId, preferences) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return { success: false, error: error.message };
    }
  },

  // Update profile image
  async updateProfileImage(profileId, imageUrl) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile image:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload profile image to storage
  async uploadProfileImage(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/profile-${Date.now()}.${fileExt}`;
      const filePath = `landlord-profiles/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return { success: false, error: error.message };
    }
  },

  // Update statistics (properties, tenants, income)
  async updateStatistics(profileId) {
    try {
      // Get total properties count
      const { count: propertiesCount, error: propertiesError } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', profileId);
      
      if (propertiesError && propertiesError.code !== '42P01') throw propertiesError;
      
      // Get total tenants count
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', profileId);
      
      if (tenantsError && tenantsError.code !== '42P01') throw tenantsError;
      
      // Get total income
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('landlord_id', profileId)
        .eq('status', 'completed');
      
      if (paymentsError && paymentsError.code !== '42P01') throw paymentsError;
      
      const totalIncome = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          total_properties: propertiesCount || 0,
          total_tenants: tenantsCount || 0,
          total_income: totalIncome,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating statistics:', error);
      // Don't throw error for missing tables, just return success with current data
      return { success: true, data: null };
    }
  },

  // Update verification status
  async updateVerificationStatus(profileId, verificationType, status) {
    try {
      const updates = {};
      switch(verificationType) {
        case 'id':
          updates.id_verified = status;
          break;
        case 'email':
          updates.email_verified = status;
          break;
        case 'phone':
          updates.phone_verified = status;
          break;
        case 'ownership':
          updates.ownership_proof_verified = status;
          break;
      }
      
      updates.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating verification status:', error);
      return { success: false, error: error.message };
    }
  },

  // Add verification document
  async addVerificationDocument(profileId, document) {
    try {
      // First get current documents
      const { data: profile, error: fetchError } = await supabase
        .from('landlord_profiles')
        .select('verification_documents')
        .eq('id', profileId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentDocs = profile.verification_documents || [];
      const updatedDocs = [...currentDocs, { ...document, uploadedAt: new Date().toISOString() }];
      
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          verification_documents: updatedDocs,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error adding verification document:', error);
      return { success: false, error: error.message };
    }
  },

  // Update account status
  async updateAccountStatus(profileId, status) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          account_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating account status:', error);
      return { success: false, error: error.message };
    }
  },

  // Update account tier
  async updateAccountTier(profileId, tier) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          account_tier: tier,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating account tier:', error);
      return { success: false, error: error.message };
    }
  },

  // Update last login timestamp
  async updateLastLogin(profileId) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating last login:', error);
      return { success: false, error: error.message };
    }
  },

  // Update last activity
  async updateLastActivity(profileId) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating last activity:', error);
      return { success: false, error: error.message };
    }
  },

  // Update 2FA settings
  async updateTwoFactor(profileId, enabled, secret = null) {
    try {
      const updates = {
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString()
      };
      
      if (secret) {
        updates.two_factor_secret = secret;
      }
      
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate unique landlord code
  async generateLandlordCode() {
    try {
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const code = `LD-${year}-${randomNum}`;
      
      // Check if code exists
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select('landlord_code')
        .eq('landlord_code', code)
        .maybeSingle();
      
      // If code exists, generate new one recursively
      if (data) {
        return await this.generateLandlordCode();
      }
      
      return code;
    } catch (error) {
      console.error('Error generating landlord code:', error);
      return `LD-${Date.now()}`;
    }
  },

  // Get landlord activity log
  async getActivityLog(profileId, limit = 50) {
    try {
      // Check if table exists
      const { data: tableExists, error: checkError } = await supabase
        .from('landlord_activity_log')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist yet, return empty array
        return { success: true, data: [] };
      }
      
      const { data, error } = await supabase
        .from('landlord_activity_log')
        .select('*')
        .eq('landlord_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return { success: true, data: [] }; // Return empty array instead of error
    }
  },

  // Log activity
  async logActivity(profileId, activityType, description, metadata = {}) {
    try {
      // Check if table exists
      const { error: checkError } = await supabase
        .from('landlord_activity_log')
        .select('id')
        .limit(1);
      
      if (checkError && checkError.code === '42P01') {
        // Table doesn't exist yet, skip logging
        return { success: true, message: 'Activity log table not available' };
      }
      
      const { data, error } = await supabase
        .from('landlord_activity_log')
        .insert([{
          landlord_id: profileId,
          activity_type: activityType,
          activity_description: description,
          metadata: metadata,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error logging activity:', error);
      return { success: false, error: error.message };
    }
  },

  // Get landlord properties (properties.landlord_id references users.id)
  async getLandlordProperties(userId) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') return { success: true, data: [] }; // table missing
        throw error;
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching landlord properties:', error);
      return { success: false, error: error.message };
    }
  },

  // Create property
  async createProperty(userId, propertyData) {
    try {
      const payload = {
        landlord_id: userId,
        ...propertyData,
        created_at: propertyData.created_at || new Date().toISOString(),
        updated_at: propertyData.updated_at || new Date().toISOString()
      };

      const attemptInsert = async (p) =>
        supabase.from('properties').insert([p]).select().single();

      let { data, error } = await attemptInsert(payload);
      if (error && typeof error.message === 'string') {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match?.[1] && Object.prototype.hasOwnProperty.call(payload, match[1])) {
          const { [match[1]]: _removed, ...retryPayload } = payload;
          ({ data, error } = await attemptInsert(retryPayload));
        }
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating property:', error);
      return { success: false, error: error.message };
    }
  },

  // Update property
  async updateProperty(propertyId, updates) {
    try {
      const attemptUpdate = async (u) =>
        supabase
          .from('properties')
          .update({
            ...u,
            updated_at: new Date().toISOString()
          })
          .eq('id', propertyId)
          .select()
          .single();

      let { data, error } = await attemptUpdate(updates);
      if (error && typeof error.message === 'string') {
        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match?.[1] && Object.prototype.hasOwnProperty.call(updates, match[1])) {
          const { [match[1]]: _removed, ...retryUpdates } = updates;
          ({ data, error } = await attemptUpdate(retryUpdates));
        }
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating property:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload property image to storage (best-effort; bucket must exist)
  async uploadPropertyImage(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/property-${Date.now()}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      const tryBucket = async (bucket) => {
        const upload = await supabase.storage.from(bucket).upload(filePath, file);
        if (upload.error) return { ok: false, error: upload.error };
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
        return { ok: true, publicUrl };
      };

      // Prefer a dedicated bucket if you have one
      let res = await tryBucket('properties');
      if (!res.ok) res = await tryBucket('profiles');
      if (!res.ok) throw res.error;
      
      return { success: true, url: res.publicUrl };
    } catch (error) {
      console.error('Error uploading property image:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user contacts for messaging (fallback: all tenants)
  async listTenantContacts(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, user_type, created_at')
        .eq('user_type', 'tenant')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error listing tenant contacts:', error);
      return { success: false, error: error.message };
    }
  },

  // Get messages between two users (requires public.messages table)
  async getDirectMessages(userId, otherUserId, limit = 100) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        if (error.code === '42P01') return { success: true, data: [], missingTable: true };
        throw error;
      }
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return { success: false, error: error.message };
    }
  },

  // Send a direct message (requires public.messages table)
  async sendDirectMessage(senderId, receiverId, content) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error sending direct message:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete landlord profile (soft delete or hard delete)
  async deleteLandlordProfile(profileId, softDelete = true) {
    try {
      if (softDelete) {
        const { data, error } = await supabase
          .from('landlord_profiles')
          .update({
            account_status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .eq('id', profileId)
          .select()
          .single();
        
        if (error) throw error;
        return { success: true, data };
      } else {
        const { error } = await supabase
          .from('landlord_profiles')
          .delete()
          .eq('id', profileId);
        
        if (error) throw error;
        return { success: true, message: 'Profile permanently deleted' };
      }
    } catch (error) {
      console.error('Error deleting landlord profile:', error);
      return { success: false, error: error.message };
    }
  }
};
