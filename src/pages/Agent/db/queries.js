import { supabase } from "../../../utils/Supabase";

export const AgentQueries = {
  async getAgentProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('agent_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  async createAgentProfile(profileData) {
    try {
      const { data, error } = await supabase
        .from('agent_profiles')
        .insert([{
          user_id: profileData.userId,
          agency_name: profileData.agencyName || null
        }])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateAgentProfile(profileId, updates) {
    try {
      const { data, error } = await supabase
        .from('agent_profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating agent profile:', error);
      return { success: false, error: error.message };
    }
  },

  async listApplications(limit = 50) {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return { success: true, data: data || [] };
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

      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, user_type")
        .in("id", uniqueIds);
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching users:", error);
      return { success: false, error: error.message };
    }
  },

  async updateApplicationStatus(applicationId, status) {
    try {
      const { data, error } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", applicationId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
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
        .in("user_type", ["tenant", "landlord"])
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
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        if (error.code === "42P01") return { success: true, data: [], missingTable: true };
        throw error;
      }
      return { success: true, data: data || [] };
    } catch (error) {
      console.error("Error fetching messages:", error);
      return { success: false, error: error.message };
    }
  },

  async sendDirectMessage(senderId, receiverId, content) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([{ sender_id: senderId, receiver_id: receiverId, content }])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error sending message:", error);
      return { success: false, error: error.message };
    }
  }
};

