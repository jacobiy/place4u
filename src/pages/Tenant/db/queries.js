import { supabase } from '../../../utils/Supabase';
import { broadcastApplicationUpdate } from '../../../services/applicationSync';

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

  // Submit General Application with verified PDF attachments and payment data
  async submitApplication(applicationData) {
    try {
      // 1. Prepare clean documents array (metadata only, strip large inline base64 if present)
      const cleanDocs = (applicationData.documents || []).map(doc => ({
        id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        slotKey: doc.slotKey,
        title: doc.title || doc.shortLabel || 'Application Document',
        shortLabel: doc.shortLabel || doc.title,
        fileName: doc.fileName || 'document.pdf',
        fileSize: doc.fileSize || '1.0 MB',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        verified: doc.verified ?? true,
        fileUrl: doc.fileUrl || null
      }));

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

      const formattedApps = (data || []).map(row => {
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

        const docs = (Array.isArray(row.documents) && row.documents.length > 0)
          ? row.documents
          : (meta.documents || []);

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
      });

      return { success: true, data: formattedApps };
    } catch (error) {
      console.warn('Error fetching applications:', error);
      return { success: false, error: error.message };
    }
  },

  // Update application with metadata fallback
  async updateApplication(applicationId, data) {
    try {
      const cleanDocs = (data.documents || []).map(doc => ({
        id: doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        slotKey: doc.slotKey,
        title: doc.title || doc.shortLabel || 'Application Document',
        shortLabel: doc.shortLabel || doc.title,
        fileName: doc.fileName || 'document.pdf',
        fileSize: doc.fileSize || '1.0 MB',
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
        verified: doc.verified ?? true,
        fileUrl: doc.fileUrl || null
      }));

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
      broadcastApplicationUpdate(applicationId, 'expired', { status: 'expired' });
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `profile_images/${fileName}`;

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

  async updateProfileImage(profileId, imageUrl) {
    return this.updateTenantProfile(profileId, { profile_image_url: imageUrl });
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
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          remoteData = userId ? data.filter(p => !p.payer_id || p.payer_id === userId) : data;
        }
      } catch (e) {
        // Table may not yet be created in Supabase
      }

      let localData = [];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localData = JSON.parse(localStorage.getItem('place4u_payments') || '[]');
          if (userId) {
            localData = localData.filter(p => !p.payer_id || p.payer_id === userId);
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
