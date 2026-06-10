import { supabase } from '../../../utils/Supabase';

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
          user_id: profileData.userId
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
    return this.updateTenantProfile(profileId, { 
      date_of_birth: data.dateOfBirth,
      id_number: data.idNumber,
      employment_status: data.employmentStatus,
      monthly_income: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null
    });
  },

  // Update contact info
  async updateContactInfo(profileId, data) {
    return this.updateTenantProfile(profileId, { 
      phone: data.phone,
      emergency_contact_name: data.emergencyContactName,
      emergency_contact_phone: data.emergencyContactPhone
    });
  },

  // Update address and preferences
  async updateAddressInfo(profileId, data) {
    return this.updateTenantProfile(profileId, { 
      current_address: data.currentAddress,
      city: data.city,
      state: data.state,
      postal_code: data.postalCode,
      has_pets: data.hasPets === 'yes' || data.hasPets === true
    });
  },

  async updateNotificationPreferences(profileId, preferences) {
    return this.updateTenantProfile(profileId, { 
      notification_preferences: preferences 
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

  // Submit General Application
  async submitApplication(applicationData) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert([applicationData])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting application:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all applications for a user
  async getTenantApplications(userId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', userId)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching applications:', error);
      return { success: false, error: error.message };
    }
  },

  // Update application
  async updateApplication(applicationId, data) {
    try {
      const { data: result, error } = await supabase
        .from('applications')
        .update(data)
        .eq('id', applicationId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data: result };
    } catch (error) {
      console.error('Error updating application:', error);
      return { success: false, error: error.message };
    }
  },

  // Cancel application (by setting status to expired)
  async cancelApplication(applicationId) {
    try {
      const { data: result, error } = await supabase
        .from('applications')
        .update({ status: 'expired' })
        .eq('id', applicationId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data: result };
    } catch (error) {
      console.error('Error cancelling application:', error);
      return { success: false, error: error.message };
    }
  },

  // Get properties the tenant applied for or saved
  async getTenantProperties(tenantProfileId) {
    try {
      // Assuming a tenant_applications table maps them
      const { data, error } = await supabase
        .from('tenant_applications')
        .select(`
          *,
          property:properties(*)
        `)
        .eq('tenant_id', tenantProfileId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching tenant properties:', error);
      return { success: false, error: error.message };
    }
  },

  // Profile Image Handling
  async uploadProfileImage(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `profile_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrl };
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return { success: false, error: error.message };
    }
  },

  async updateProfileImage(profileId, imageUrl) {
    return this.updateTenantProfile(profileId, { profile_image_url: imageUrl });
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
        .in('user_type', ['landlord', 'agent'])
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
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { success: false, error: error.message };
    }
  },

  async sendDirectMessage(senderId, receiverId, content) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ sender_id: senderId, receiver_id: receiverId, content, created_at: new Date().toISOString() }])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error.message };
    }
  },

  async getUserMessages(userId) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching user messages:', error);
      return { success: false, error: error.message };
    }
  }
};
