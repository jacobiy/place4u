import { supabase } from '../../../utils/Supabase';
import { normalizeApplicationStatus } from '../../../services/applicationStatus';
import { resolveLandlordDocuments, resolveApplicationDocuments } from '../../../utils/documentUrls';

/**
 * True when a PostgREST error simply means a relation has not been created in
 * this database yet. `public.tenants` (and its `landlord_id`) ship with the
 * optional `landlord_tenants_and_occupancy.sql` migration, so on databases
 * where that migration has not been applied the query 404s. That must be
 * treated as "nothing there", never logged as an error or allowed to fail an
 * otherwise successful operation.
 */
function isMissingRelationError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  return (
    code === '42P01' || // Postgres: undefined_table
    code === 'PGRST205' || // PostgREST: table not found in schema cache
    /does not exist|schema cache|could not find the (table|relation)/i.test(message)
  );
}

export const LandlordQueries = {
  
  // Get landlord profile by user ID
  async getLandlordProfile(userId) {
    try {
      // 1. Fetch user record from users table to get ground truth verification status
      const { data: userRow } = await supabase
        .from('users')
        .select('id, email, full_name, phone, is_verified, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      // 2. Fetch landlord_profiles row
      const { data, error } = await supabase
        .from('landlord_profiles')
        .select(`
          *,
          users:user_id (
            email,
            created_at,
            is_verified
          )
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      // Single source of truth: landlord_profiles.application_status in the database.
      // No localStorage caching of status. Remove any legacy cached copy from older builds.
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(`place4u_landlord_profile_${userId}`);
        }
      } catch {}
      const determinedStatus = String(data?.application_status || 'not_applied').toLowerCase();
      const isApproved = determinedStatus === 'approved';
      const isRejected = determinedStatus === 'rejected';
      const rejectionReason = data?.rejection_reason || null;

      // Management tier: 'full_management' => full portfolio mode, anything else => listing only
      const determinedTier = data?.management_tier || 'full_management';
      const isFull = determinedTier === 'full_management' || determinedTier === 'full';

      if (data) {
        // Documents live in a private bucket, so hand the UI freshly signed
        // URLs rather than the persisted (now private) storage references.
        const verification_documents = await resolveLandlordDocuments(data.verification_documents);
        return {
          success: true,
          data: {
            ...data,
            verification_documents,
            management_tier: isFull ? 'full_management' : 'listing_only',
            manage_with_platform: isFull,
            application_status: determinedStatus,
            rejection_reason: rejectionReason,
            is_verified: isApproved
          }
        };
      }

      // If landlord_profiles row doesn't exist yet, synthesize a clean "not applied" profile
      if (userRow) {
        const syntheticProfile = {
          is_synthetic: true,
          id: `profile-${userId.substring(0, 8)}`,
          user_id: userId,
          full_name: userRow.full_name || 'Landlord',
          email: userRow.email,
          phone: userRow.phone || '',
          landlord_code: `LD-${userId.substring(0, 6).toUpperCase()}`,
          management_tier: 'full_management',
          manage_with_platform: true,
          application_status: 'not_applied',
          rejection_reason: null,
          is_verified: false,
          id_verified: false,
          ownership_proof_verified: false,
          account_status: 'pending',
          account_tier: 'basic',
          created_at: userRow.created_at,
          updated_at: userRow.updated_at || userRow.created_at,
          users: userRow
        };
        return { success: true, data: syntheticProfile };
      }

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
      if (data) {
        return {
          success: true,
          data: { ...data, verification_documents: await resolveLandlordDocuments(data.verification_documents) }
        };
      }
      return { success: true, data: null };
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
      // Check the real table directly (getLandlordProfile returns a synthesized
      // profile when no row exists, which must not be mistaken for an existing row).
      const { data: existingProfile } = await supabase
        .from('landlord_profiles')
        .select('*')
        .eq('user_id', profileData.userId)
        .maybeSingle();
      if (existingProfile) {
        return { success: true, data: existingProfile, message: 'Profile already exists' };
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
      if (!profileId) throw new Error("Profile identifier is required to update profile.");
      // Exclude relational, primary key, or non-column fields that trigger schema cache / Postgres errors
      const { users, properties, id, user_id, created_at, ...cleanUpdates } = updates || {};

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          ...cleanUpdates,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();
      
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
      if (!profileId) throw new Error("Profile identifier is required to update personal info.");
      const updateData = {
        full_name: personalInfo?.fullName || personalInfo?.full_name || null,
        company_name: personalInfo?.companyName || personalInfo?.company_name || null,
        tax_id: personalInfo?.taxId || personalInfo?.tax_id || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(updateData)
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating personal info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateContactInfo(profileId, contactInfo) {
    try {
      if (!profileId) throw new Error("Profile identifier is required to update contact info.");
      const validPrefs = ['email', 'phone', 'both', 'none'];
      const rawPref = contactInfo?.contactPreference || contactInfo?.contact_preference;
      const pref = validPrefs.includes(rawPref) ? rawPref : 'both';

      const updateData = {
        email: contactInfo?.email || null,
        phone: contactInfo?.phone || null,
        alternative_phone: contactInfo?.alternativePhone || contactInfo?.alternative_phone || null,
        contact_preference: pref,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(updateData)
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating contact info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateAddressInfo(profileId, addressInfo) {
    try {
      if (!profileId) throw new Error("Profile identifier is required to update address info.");
      const updateData = {
        address: addressInfo?.address || null,
        city: addressInfo?.city || null,
        state: addressInfo?.state || null,
        country: addressInfo?.country || null,
        postal_code: addressInfo?.postalCode || addressInfo?.postal_code || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(updateData)
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating address info:', error);
      return { success: false, error: error.message };
    }
  },

  async updateNotificationPreferences(profileId, preferences) {
    try {
      if (!profileId) throw new Error("Profile identifier is required to update notification preferences.");
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${profileId},user_id.eq.${profileId}`)
        .select()
        .maybeSingle();
      
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
      if (!profileId) throw new Error("Profile identifier is required to update profile image.");
      const { data, error } = await supabase
        .from('landlord_profiles')
        .update({
          profile_image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
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

  // Upload deed / FICA verification document to 'documents' bucket
  async uploadVerificationDocument(userId, file, docType = 'title_deed') {
    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `landlords/${userId}/${docType}-${Date.now()}-${sanitizedName}`;

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
      console.error('Error uploading verification document:', error);
      return { success: false, error: error.message };
    }
  },

  // Update statistics (properties, residents, income)
  async updateStatistics(profileId) {
    try {
      // properties/tenants are keyed by users.id, not landlord_profiles.id
      const { data: profileRow } = await supabase
        .from('landlord_profiles')
        .select('user_id')
        .eq('id', profileId)
        .maybeSingle();
      const ownerId = profileRow?.user_id || profileId;

      // The landlord's listings. Their ids are re-used below to scope income,
      // because payments link to a property — there is no payments.landlord_id.
      const { data: propertyRows, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', ownerId);

      if (propertiesError && !isMissingRelationError(propertiesError)) throw propertiesError;

      const propertyIds = (propertyRows || []).map((p) => p.id).filter(Boolean);
      const propertiesCount = propertyIds.length;

      // Resident records live in public.tenants (optional migration) — a missing
      // table means "0 residents", not an error.
      let tenantsCount = 0;
      const tenantsRes = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', ownerId);

      if (tenantsRes?.error) {
        if (!isMissingRelationError(tenantsRes.error)) throw tenantsRes.error;
      } else {
        tenantsCount = tenantsRes?.count || 0;
      }

      // Income: sum completed payments recorded against the landlord's units.
      let totalIncome = 0;
      if (propertyIds.length > 0) {
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .in('property_id', propertyIds)
          .eq('status', 'completed');

        if (paymentsError) {
          if (!isMissingRelationError(paymentsError)) throw paymentsError;
        } else {
          totalIncome = (payments || []).reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0
          );
        }
      }

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
      // Statistics are best-effort and must never block the profile from loading.
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
      const newDoc = {
        id: document.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        uploadedAt: new Date().toISOString(),
        status: document.status || 'under_review',
        ...document
      };
      const updatedDocs = [newDoc, ...currentDocs];
      
      const updates = {
        verification_documents: updatedDocs,
        updated_at: new Date().toISOString()
      };

      // If document is proof of ownership or ID, update corresponding verified flag if requested
      if (document.documentType === 'ownership') {
        updates.ownership_proof_verified = true;
      } else if (document.documentType === 'id') {
        updates.id_verified = true;
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
      console.error('Error adding verification document:', error);
      return { success: false, error: error.message };
    }
  },

  // Upload verification document file to storage
  async uploadVerificationDocumentFile(userId, file) {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${userId}/${Date.now()}-${sanitizedName}`;
      const filePath = `ownership-docs/${fileName}`;

      // Check / prioritize 'landlord-documents', then 'documents', then 'profiles'
      let activeBucket = 'landlord-documents';
      let uploadRes = await supabase.storage
        .from('landlord-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadRes.error) {
        // Try 'documents' bucket
        uploadRes = await supabase.storage
          .from('documents')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        activeBucket = 'documents';
      }

      if (uploadRes.error) {
        // Try 'profiles' bucket fallback
        uploadRes = await supabase.storage
          .from('profiles')
          .upload(`docs/${fileName}`, file, { cacheControl: '3600', upsert: false });
        activeBucket = 'profiles';
      }

      if (uploadRes.error) {
        // Fallback for offline demo / client object URL
        const objectUrl = URL.createObjectURL(file);
        return {
          success: true,
          url: objectUrl,
          storagePath: null,
          bucket: null,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || fileExt
        };
      }

      const storedPath = activeBucket === 'profiles' ? `docs/${fileName}` : filePath;
      // The bucket is private, so persist a durable reference (storagePath +
      // bucket) and return a short-lived signed URL for immediate display.
      const { data: signed } = await supabase.storage
        .from(activeBucket)
        .createSignedUrl(storedPath, 60 * 60 * 24 * 7);

      return {
        success: true,
        url: signed?.signedUrl || storedPath,
        storagePath: storedPath,
        bucket: activeBucket,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || fileExt
      };
    } catch (error) {
      console.warn('Storage upload note, using client URL fallback:', error);
      try {
        const objectUrl = URL.createObjectURL(file);
        return {
          success: true,
          url: objectUrl,
          storagePath: null,
          bucket: null,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
      } catch {
        return { success: false, error: error.message };
      }
    }
  },

  // Remove verification document and delete file from storage
  async removeVerificationDocument(profileId, docId) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('landlord_profiles')
        .select('verification_documents')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;
      const currentDocs = profile.verification_documents || [];
      const targetDoc = currentDocs.find(d => (d.id ? d.id === docId : false));

      // Delete binary object from storage if storagePath is known
      if (targetDoc?.storagePath && targetDoc?.bucket) {
        try {
          await supabase.storage
            .from(targetDoc.bucket)
            .remove([targetDoc.storagePath]);
        } catch (storageErr) {
          console.warn('Storage file deletion notice:', storageErr);
        }
      }

      const updatedDocs = currentDocs.filter(d => (d.id ? d.id !== docId : true));

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
      console.error('Error removing verification document:', error);
      return { success: false, error: error.message };
    }
  },

  // Replace an existing verification document with a new upload
  async replaceVerificationDocument(profileId, docId, newDocData) {
    try {
      const { data: profile, error: fetchError } = await supabase
        .from('landlord_profiles')
        .select('verification_documents')
        .eq('id', profileId)
        .single();

      if (fetchError) throw fetchError;
      const currentDocs = profile.verification_documents || [];
      const targetIndex = currentDocs.findIndex(d => (d.id ? d.id === docId : false));

      if (targetIndex === -1) {
        return { success: false, error: 'Document not found in profile' };
      }

      const existingDoc = currentDocs[targetIndex];

      // Clean up previous storage file if different and storagePath exists
      if (existingDoc.storagePath && existingDoc.bucket && existingDoc.storagePath !== newDocData.storagePath) {
        try {
          await supabase.storage
            .from(existingDoc.bucket)
            .remove([existingDoc.storagePath]);
        } catch (storageErr) {
          console.warn('Storage file cleanup on replacement:', storageErr);
        }
      }

      // Merge existing metadata with replacement payload
      const updatedDoc = {
        ...existingDoc,
        ...newDocData,
        id: docId, // preserve original document ID
        updatedAt: new Date().toISOString(),
        replacedAt: new Date().toISOString(),
        status: newDocData.status || existingDoc.status || 'verified'
      };

      const updatedDocs = [...currentDocs];
      updatedDocs[targetIndex] = updatedDoc;

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
      return { success: true, data, updatedDoc };
    } catch (error) {
      console.error('Error replacing verification document:', error);
      return { success: false, error: error.message };
    }
  },

  // Generate signed temporary preview/download URL if bucket is private
  async createDocumentSignedUrl(bucket, storagePath, expiresIn = 3600) {
    try {
      if (!bucket || !storagePath) return { success: false, error: "Missing path" };
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, expiresIn);
      if (error) throw error;
      return { success: true, signedUrl: data.signedUrl };
    } catch (err) {
      return { success: false, error: err.message };
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

      // Per-listing documents live in the private bucket — sign them for display.
      const rows = await Promise.all(
        (data || []).map(async (property) => ({
          ...property,
          documents: await resolveLandlordDocuments(property.documents)
        }))
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error('Error fetching landlord properties:', error);
      return { success: false, error: error.message };
    }
  },

  // Get applications submitted for this landlord's properties
  async getLandlordApplications(userId, ownedPropertyIds = []) {
    try {
      let propIds = [...(ownedPropertyIds || [])];

      if (propIds.length === 0 && userId) {
        const { data: props } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', userId);
        if (props) propIds = props.map((p) => p.id);
      }

      // A landlord with no listings has no inbound applications. Returning here
      // avoids the unfiltered query below leaking every application in the system.
      if (propIds.length === 0) return { success: true, data: [] };

      let data = [];
      try {
        let query = supabase
          .from('applications')
          .select(`
            *,
            tenant:users!applications_tenant_id_fkey(id, full_name, email, phone),
            agent:users!applications_assigned_to_fkey(id, full_name, email, phone)
          `)
          .order('submitted_at', { ascending: false });

        if (propIds.length > 0) {
          query = query.in('property_id', propIds);
        }

        const res = await query;
        if (!res.error && res.data) data = res.data;
        else throw res.error;
      } catch {
        const fb = await supabase
          .from('applications')
          .select('*')
          .order('submitted_at', { ascending: false });
        data = (fb.data || []).filter((a) => !propIds.length || propIds.includes(a.property_id));
      }

      // Merge local applications matching landlord properties
      let localApps = [];
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = localStorage.getItem('place4u_tenant_applications');
          if (raw) localApps = JSON.parse(raw);
        }
      } catch {}

      const dbMap = new Map();
      (data || []).forEach((d) => dbMap.set(d.id, d));

      const localDocsById = new Map();
      localApps.forEach((la) => {
        if (la?.id && Array.isArray(la.documents)) localDocsById.set(la.id, la.documents);
        if (!dbMap.has(la.id)) {
          if (!propIds.length || propIds.includes(la.property_id)) {
            data.unshift(la);
          }
        }
      });

      // Decode any embedded base64 metadata token (older rows carry their
      // documents there because the dedicated columns did not exist yet), then
      // resolve every attachment to a signed URL — or a same-browser cached copy
      // when the file was never persisted — so the review modal can open it.
      const decodeEmbedded = (b64) => {
        try {
          const json = typeof atob !== 'undefined'
            ? decodeURIComponent(escape(atob(b64)))
            : Buffer.from(b64, 'base64').toString('utf-8');
          return JSON.parse(json);
        } catch {
          return null;
        }
      };

      const enriched = await Promise.all((data || []).map(async (row) => {
        const sr = row.special_requirements || '';
        let meta = {};
        if (sr.includes('[P4U_DATA:') || sr.includes('[PLACE4U_APP_DATA:')) {
          const m = sr.match(/\[(?:P4U_DATA|PLACE4U_APP_DATA):([A-Za-z0-9+/=]+)\]/);
          if (m?.[1]) {
            const decoded = decodeEmbedded(m[1]);
            if (decoded && typeof decoded === 'object') meta = decoded;
          }
        }

        const dbDocs = Array.isArray(row.documents) && row.documents.length > 0 ? row.documents : [];
        const metaDocs = Array.isArray(meta.documents) && meta.documents.length > 0 ? meta.documents : [];
        const localDocs = localDocsById.get(row.id) || [];
        const rawDocs = dbDocs.length ? dbDocs : (metaDocs.length ? metaDocs : localDocs);

        return {
          ...row,
          documents: await resolveApplicationDocuments(rawDocs, { localDocs }),
          special_requirements: sr
            .replace(/\n?\[(?:P4U_DATA|PLACE4U_APP_DATA):[A-Za-z0-9+/=]+\]/g, '')
            .replace(/\n?\[Attached PDFs:[^\]]*\]/g, '')
            .trim() || null
        };
      }));

      return { success: true, data: enriched };
    } catch (error) {
      console.warn('Error fetching landlord applications:', error);
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

      // Strip any columns this deployment's schema doesn't have yet, one at a
      // time, until the insert succeeds (tolerates partially-applied migrations).
      let working = { ...payload };
      let data = null;
      let error = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        ({ data, error } = await attemptInsert(working));
        if (!error) break;
        const match = typeof error.message === 'string' && error.message.match(/Could not find the '([^']+)' column/);
        if (match?.[1] && Object.prototype.hasOwnProperty.call(working, match[1])) {
          const { [match[1]]: _removed, ...rest } = working;
          working = rest;
          continue;
        }
        break;
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

      // Strip columns this deployment's schema doesn't have yet, one at a time.
      let working = { ...updates };
      let data = null;
      let error = null;
      for (let attempt = 0; attempt < 30; attempt++) {
        ({ data, error } = await attemptUpdate(working));
        if (!error) break;
        const match = typeof error.message === 'string' && error.message.match(/Could not find the '([^']+)' column/);
        if (match?.[1] && Object.prototype.hasOwnProperty.call(working, match[1])) {
          const { [match[1]]: _removed, ...rest } = working;
          working = rest;
          continue;
        }
        break;
      }

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating property:', error);
      return { success: false, error: error.message };
    }
  },

  async uploadPropertyImage(userId, file) {
    try {
      const rawExt = file?.name && file.name.includes('.') ? file.name.split('.').pop() : '';
      const fileExt = (rawExt || (file?.type ? file.type.split('/')[1] : '') || 'jpg')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'jpg';
      // Unique per file: Date.now() alone collides when several photos are
      // uploaded in the same tick (Promise.all), so add a random suffix.
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const fileName = `property-${unique}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;
      const bucket = 'properties';
  
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
  
      console.log("UPLOAD ERROR:", uploadError);
      console.log("UPLOAD DATA:", uploadData);
  
      if (uploadError) throw uploadError;
  
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
  
      console.log("PUBLIC URL:", data.publicUrl);
  
      return {
        success: true,
        url: data.publicUrl
      };
  
    } catch (error) {
      console.error("UPLOAD FAILED:", error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /* ------------------------------------------------------------------ *
   *  Property-scoped verification documents
   *  Binary lives in the 'landlord-documents' bucket under
   *  properties/<propertyId>/ ; metadata is stored on properties.documents.
   * ------------------------------------------------------------------ */
  async uploadPropertyDocument(propertyId, file) {
    try {
      const rawExt = file?.name && file.name.includes('.') ? file.name.split('.').pop() : '';
      const fileExt = (rawExt || (file?.type ? file.type.split('/')[1] : '') || 'pdf')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'pdf';
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const safeName = (file.name || 'document').replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 60);
      const filePath = `properties/${propertyId}/${unique}-${safeName}`;
      const bucket = 'landlord-documents';

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf'
        });

      if (uploadError) throw uploadError;

      // Private bucket: return a signed URL for immediate display; the durable
      // storagePath/bucket above are what gets stored on the document record.
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      return {
        success: true,
        url: signed?.signedUrl || filePath,
        storagePath: filePath,
        bucket,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || fileExt
      };
    } catch (error) {
      console.warn('Property document upload failed:', error);
      return { success: false, error: error.message };
    }
  },

  async addPropertyDocument(propertyId, doc) {
    try {
      const { data: row, error: fetchError } = await supabase
        .from('properties')
        .select('documents')
        .eq('id', propertyId)
        .single();
      if (fetchError) throw fetchError;

      const docs = Array.isArray(row?.documents) ? row.documents : [];
      const newDoc = {
        id: doc.id || `pdoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        status: doc.status || 'under_review',
        uploadedAt: new Date().toISOString(),
        ...doc
      };

      const { data, error } = await supabase
        .from('properties')
        .update({ documents: [newDoc, ...docs], updated_at: new Date().toISOString() })
        .eq('id', propertyId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data, document: newDoc };
    } catch (error) {
      console.error('Error adding property document:', error);
      return { success: false, error: error.message };
    }
  },

  async removePropertyDocument(propertyId, docId) {
    try {
      const { data: row, error: fetchError } = await supabase
        .from('properties')
        .select('documents')
        .eq('id', propertyId)
        .single();
      if (fetchError) throw fetchError;

      const docs = Array.isArray(row?.documents) ? row.documents : [];
      const target = docs.find((d) => d.id === docId);
      if (target?.storagePath && target?.bucket) {
        try {
          await supabase.storage.from(target.bucket).remove([target.storagePath]);
        } catch (storageErr) {
          console.warn('Storage file deletion notice:', storageErr);
        }
      }

      const { data, error } = await supabase
        .from('properties')
        .update({ documents: docs.filter((d) => d.id !== docId), updated_at: new Date().toISOString() })
        .eq('id', propertyId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error removing property document:', error);
      return { success: false, error: error.message };
    }
  },

  // Move a listing into the admin review queue
  async submitPropertyForApproval(propertyId) {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update({
          approval_status: 'pending_approval',
          submitted_at: new Date().toISOString(),
          approval_notes: null,
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting property for approval:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user contacts for messaging (tenants, agents, admin)
  async listTenantContacts(limit = 100) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, user_type, created_at')
        .in('user_type', ['tenant', 'agent', 'admin'])
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
      let { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error && error.code === '42P01') {
        const fb = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`
          )
          .order('created_at', { ascending: true })
          .limit(limit);
        if (!fb.error) return { success: true, data: fb.data || [] };
      }

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching direct messages:', error);
      return { success: false, error: error.message };
    }
  },

  // Send a direct message (requires public.messages table)
  async sendDirectMessage(senderId, receiverId, content) {
    try {
      let { data, error } = await supabase
        .from('messages')
        .insert([{
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error && error.code === '42P01') {
        const fb = await supabase
          .from('direct_messages')
          .insert([{
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (!fb.error) return { success: true, data: fb.data };
      }

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
  },

  // Submit Landlord Onboarding Application
  async submitLandlordApplication(userId, applicationData) {
    try {
      const {
        fullName,
        companyName,
        taxId,
        phone,
        alternativePhone,
        address,
        city,
        state,
        postalCode,
        manageWithPlatform,
        idDocUrl,
        ownershipDocUrl,
        ratesTaxesDocUrl,
        notes
      } = applicationData;

      const payload = {
        full_name: fullName,
        company_name: companyName,
        tax_id: taxId,
        phone,
        alternative_phone: alternativePhone,
        address,
        city,
        state,
        postal_code: postalCode,
        manage_with_platform: Boolean(manageWithPlatform),
        management_tier: manageWithPlatform ? 'full_management' : 'listing_only',
        application_status: 'pending_review',
        application_submitted_at: new Date().toISOString(),
        id_document_url: idDocUrl || null,
        ownership_doc_url: ownershipDocUrl || null,
        rates_taxes_doc_url: ratesTaxesDocUrl || null,
        application_notes: notes || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(payload)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error submitting landlord application:', error);
      return { success: false, error: error.message };
    }
  },

  // Toggle or Update Management Mode (Listing Only vs Full Management)
  async updateManagementMode(userId, mode) {
    try {
      const isFull = mode === true || mode === 'full_management' || mode === 'full';
      const managementTier = isFull ? 'full_management' : 'listing_only';
      const modePayload = {
        manage_with_platform: isFull,
        management_tier: managementTier,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('landlord_profiles')
        .update(modePayload)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating management mode:', error);
      return { success: false, error: error.message };
    }
  },

  // Update Tenant Application Status (under_review, completed/approved, rejected)
  async updateApplicationStatus(applicationId, newStatus, reviewNotes = null) {
    const normalizedStatus = normalizeApplicationStatus(newStatus);
    let dbRow = null;
    let dbError = null;

    // 1. Update in Supabase applications table if present
    try {
      const { data, error } = await supabase
        .from('applications')
        .update({
          status: normalizedStatus,
          notes: reviewNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) {
        // PGRST116 / "no rows" = a local-only (demo/offline) application that has
        // no DB row yet; that is not a failure, we still mirror it into the cache.
        const isLocalOnly =
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          /0 rows|no rows|JSON object requested|does not exist/i.test(error.message || '');
        if (isLocalOnly) {
          dbRow = null;
        } else {
          dbError = error;
        }
      } else {
        dbRow = data;
      }
    } catch (err) {
      dbError = err;
    }

    // A real database rejection (e.g. a status CHECK constraint) must NOT be
    // reported as success — otherwise the cache/UI shows a status the database
    // never stored.
    if (dbError) {
      console.warn('Supabase application update failed:', dbError.message);
      return { success: false, error: dbError.message };
    }

    // 2. Sync to localStorage cache so local demo apps update seamlessly
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('place4u_tenant_applications');
        if (raw) {
          const apps = JSON.parse(raw);
          const updated = apps.map(a => 
            String(a.id) === String(applicationId)
              ? { ...a, status: normalizedStatus, notes: reviewNotes, updated_at: new Date().toISOString() }
              : a
          );
          localStorage.setItem('place4u_tenant_applications', JSON.stringify(updated));
        }
      }
    } catch {}

    return { success: true, data: dbRow || { id: applicationId, status: normalizedStatus } };
  },

  // Assign an approved tenant to a property and record them as a resident
  async assignTenantToProperty(propertyId, tenantData) {
    try {
      const {
        tenantName, tenantEmail, tenantPhone, rent,
        leaseStartDate, leaseEndDate, applicationId, tenantUserId
      } = tenantData;

      // 1. Fetch the property (also supplies the owning landlord id + fallback rent)
      const { data: propData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .maybeSingle();

      const landlordId = propData?.landlord_id || null;
      const rentValue = typeof rent === 'number'
        ? rent
        : (parseFloat(String(rent || '').replace(/[^0-9.]/g, '')) || propData?.price || null);

      const existingTenants = Array.isArray(propData?.tenants) ? propData.tenants : [];
      const updatedTenants = tenantName && !existingTenants.includes(tenantName)
        ? [...existingTenants, tenantName]
        : existingTenants;

      // 2. Mark the unit occupied and record the resident names on the listing
      const { error: propError } = await supabase
        .from('properties')
        .update({
          occupied: true,
          tenants: updatedTenants,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);
      if (propError) console.warn('Property occupancy update notice:', propError.message);

      // 3. Persist the resident record (landlord_id is required so the landlord
      //    can list it under Tenants & Applications).
      const { error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          landlord_id: landlordId,
          property_id: propertyId,
          user_id: tenantUserId || null,
          application_id: applicationId || null,
          full_name: tenantName || null,
          email: tenantEmail || null,
          phone: tenantPhone || null,
          rent: rentValue,
          lease_status: 'Active',
          lease_start: leaseStartDate || null,
          lease_end: leaseEndDate || null,
          created_at: new Date().toISOString()
        }]);
      if (tenantError) console.warn('Resident record notice:', tenantError.message);

      return { success: true, message: `Successfully assigned ${tenantName || 'tenant'} to the property.` };
    } catch (err) {
      console.error('Error assigning tenant:', err);
      return { success: false, error: err.message };
    }
  }
};
