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
            created_at,
            last_sign_in_at
          )
        `)
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, data };
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
        .single();
      
      if (error) throw error;
      return { success: true, data };
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
        .single();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching landlord profile by code:', error);
      return { success: false, error: error.message };
    }
  },

  // Create new landlord profile
  async createLandlordProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('landlord_profiles')
        .insert([{
          user_id: profileData.userId,
          landlord_code: profileData.landlordCode || await this.generateLandlordCode(),
          full_name: profileData.fullName,
          company_name: profileData.companyName,
          tax_id: profileData.taxId,
          profile_image_url: profileData.profileImageUrl,
          email: profileData.email,
          phone: profileData.phone,
          alternative_phone: profileData.alternativePhone,
          contact_preference: profileData.contactPreference || 'both',
          address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          country: profileData.country,
          postal_code: profileData.postalCode,
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
          two_factor_secret: profileData.twoFactorSecret,
          account_status: profileData.accountStatus || 'active',
          account_tier: profileData.accountTier || 'basic',
          language: profileData.language || 'en',
          timezone: profileData.timezone || 'Africa/Johannesburg',
          date_format: profileData.dateFormat || 'DD/MM/YYYY',
          metadata: profileData.metadata || {}
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
      
      if (propertiesError) throw propertiesError;
      
      // Get total tenants count
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', profileId);
      
      if (tenantsError) throw tenantsError;
      
      // Get total income
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .eq('landlord_id', profileId)
        .eq('status', 'completed');
      
      if (paymentsError) throw paymentsError;
      
      const totalIncome = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          total_properties: propertiesCount,
          total_tenants: tenantsCount,
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
      return { success: false, error: error.message };
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
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const code = `LD-${year}-${randomNum}`;
      
      // Check if code exists
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select('landlord_code')
        .eq('landlord_code', code)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
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
      const { data, error } = await supabase
        .from('landlord_activity_log')
        .select('*')
        .eq('landlord_id', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return { success: false, error: error.message };
    }
  },

  // Log activity
  async logActivity(profileId, activityType, description, metadata = {}) {
    try {
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