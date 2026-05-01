import React, { useState, useCallback, useEffect } from 'react';
import { 
  User, Mail, Phone, MapPin, Building, Calendar, 
  Edit2, Save, X, Camera, Lock, Bell, Globe, 
  CreditCard, FileText, Shield, CheckCircle, 
  AlertCircle, ChevronRight, Copy, Check
} from 'lucide-react';
import { T } from './styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './component/Buttons';
import { Modal } from './component/Modal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth'; // Adjust based on your auth setup

const ProfileSection = ({ title, icon: Icon, children, onEdit, isEditing }) => (
  <div style={{
    background: T.cardBg,
    border: `1px solid ${T.border}`,
    borderRadius: "1rem",
    overflow: "hidden",
    marginBottom: "1.5rem"
  }}>
    <div style={{
      padding: "1rem 1.5rem",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "rgba(79,126,248,0.04)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Icon size={20} color={T.accent} />
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: T.textPrimary }}>{title}</h2>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            padding: "0.5rem",
            background: "transparent",
            border: `1px solid ${T.border}`,
            borderRadius: "8px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: T.textSecondary,
            transition: "all 0.15s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = T.surface;
            e.currentTarget.style.color = T.textPrimary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = T.textSecondary;
          }}
        >
          {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
          <span style={{ fontSize: "0.8rem" }}>{isEditing ? "Save" : "Edit"}</span>
        </button>
      )}
    </div>
    <div style={{ padding: "1.5rem" }}>
      {children}
    </div>
  </div>
);

const InfoField = ({ label, value, icon: Icon, isEditing, onChange, fieldName, type = "text" }) => (
  <div style={{ marginBottom: "1rem" }}>
    <label style={{
      display: "block",
      fontSize: "0.75rem",
      fontWeight: 500,
      color: T.textMuted,
      marginBottom: "0.5rem",
      textTransform: "uppercase",
      letterSpacing: "0.05em"
    }}>
      {label}
    </label>
    {isEditing ? (
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={16} color={T.textMuted} style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)"
          }} />
        )}
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          style={{
            width: "100%",
            padding: Icon ? "0.75rem 0.75rem 0.75rem 2.5rem" : "0.75rem",
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: "0.625rem",
            color: T.textPrimary,
            fontSize: "0.9rem",
            fontFamily: "inherit"
          }}
        />
      </div>
    ) : (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0"
      }}>
        {Icon && <Icon size={16} color={T.accent} />}
        <span style={{ color: T.textPrimary, fontSize: "0.9rem" }}>{value || "Not provided"}</span>
      </div>
    )}
  </div>
);

const VerificationBadge = ({ verified, label }) => (
  <div style={{
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0.75rem",
    background: verified ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
    borderRadius: "8px",
    border: `1px solid ${verified ? T.emerald : T.red}`,
    color: verified ? T.emerald : T.red
  }}>
    {verified ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
    <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>{label}</span>
  </div>
);

const StatCard = ({ label, value, icon: Icon }) => (
  <div style={{
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: "0.75rem",
    padding: "1rem",
    textAlign: "center"
  }}>
    <Icon size={24} color={T.accent} style={{ marginBottom: "0.5rem" }} />
    <p style={{ fontSize: "1.25rem", fontWeight: 700, color: T.textPrimary }}>{value}</p>
    <p style={{ fontSize: "0.7rem", color: T.textMuted }}>{label}</p>
  </div>
);

export const Profile = ({ onClose, isModal = false }) => {
  const [profile, setProfile] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isEditing, setIsEditing] = useState({
    personal: false,
    contact: false,
    address: false,
    business: false
  });
  const [editedData, setEditedData] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [copiedField, setCopiedField] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Get current user from your auth context
  const { user } = useAuth(); // Adjust based on your auth setup

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // First try to get existing profile
      let result = await LandlordQueries.getLandlordProfile(user.id);
      
      if (!result.success || !result.data) {
        // Profile doesn't exist, create one
        const newProfileData = {
          userId: user.id,
          fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Landlord',
          email: user.email,
          phone: user.user_metadata?.phone || '',
          joinDate: new Date().toISOString().split('T')[0],
          accountStatus: 'active',
          accountTier: 'basic'
        };
        
        const createResult = await LandlordQueries.createLandlordProfile(newProfileData);
        if (createResult.success) {
          result = createResult;
        } else {
          throw new Error(createResult.error);
        }
      }
      
      if (result.success && result.data) {
        setProfile(result.data);
        setProfileId(result.data.id);
        setEditedData(result.data);
        
        // Update statistics in background
        await LandlordQueries.updateStatistics(result.data.id);
        
        // Update last login
        await LandlordQueries.updateLastLogin(result.data.id);
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (section) => {
    if (isEditing[section]) {
      handleSave(section);
    } else {
      setIsEditing({ ...isEditing, [section]: true });
    }
  };

  const handleSave = async (section) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      let result;
      const updates = {};
      
      switch(section) {
        case 'personal':
          updates.full_name = editedData.full_name || editedData.name;
          updates.company_name = editedData.company_name || editedData.companyName;
          updates.tax_id = editedData.tax_id || editedData.taxId;
          result = await LandlordQueries.updatePersonalInfo(profileId, {
            fullName: updates.full_name,
            companyName: updates.company_name,
            taxId: updates.tax_id
          });
          break;
        case 'contact':
          updates.email = editedData.email;
          updates.phone = editedData.phone;
          updates.alternative_phone = editedData.alternative_phone || editedData.alternativePhone;
          updates.contact_preference = editedData.contact_preference || 'both';
          result = await LandlordQueries.updateContactInfo(profileId, {
            email: updates.email,
            phone: updates.phone,
            alternativePhone: updates.alternative_phone,
            contactPreference: updates.contact_preference
          });
          break;
        case 'address':
          updates.address = editedData.address;
          updates.city = editedData.city;
          updates.state = editedData.state;
          updates.country = editedData.country;
          updates.postal_code = editedData.postal_code || editedData.postalCode;
          result = await LandlordQueries.updateAddressInfo(profileId, {
            address: updates.address,
            city: updates.city,
            state: updates.state,
            country: updates.country,
            postalCode: updates.postal_code
          });
          break;
        default:
          result = await LandlordQueries.updateLandlordProfile(profileId, editedData);
      }
      
      if (result.success) {
        setProfile(result.data);
        setEditedData(result.data);
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        
        // Log activity
        await LandlordQueries.logActivity(profileId, 'profile_update', `Updated ${section} information`);
      } else {
        throw new Error(result.error);
      }
      
      setIsEditing({ ...isEditing, [section]: false });
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (section) => {
    setEditedData(profile);
    setIsEditing({ ...isEditing, [section]: false });
  };

  const handleFieldChange = (field, value) => {
    setEditedData({ ...editedData, [field]: value });
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError("Passwords don't match");
      return;
    }
    
    if (passwordData.new.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Call your password change API here
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      
      // Log activity
      await LandlordQueries.logActivity(profileId, 'password_change', 'Changed password');
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      setError("Only image files are allowed");
      return;
    }
    
    setUploadingImage(true);
    setError(null);
    
    try {
      // Upload image to storage
      const uploadResult = await LandlordQueries.uploadProfileImage(user.id, file);
      
      if (uploadResult.success) {
        // Update profile with new image URL
        const updateResult = await LandlordQueries.updateProfileImage(profileId, uploadResult.url);
        
        if (updateResult.success) {
          setProfile(updateResult.data);
          setEditedData(updateResult.data);
          setSuccessMessage('Profile image updated successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
          
          // Log activity
          await LandlordQueries.logActivity(profileId, 'profile_update', 'Updated profile image');
        } else {
          throw new Error(updateResult.error);
        }
      } else {
        throw new Error(uploadResult.error);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      setError(error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    const updatedPreferences = {
      ...profile.notification_preferences,
      [key]: value
    };
    
    setProfile({
      ...profile,
      notification_preferences: updatedPreferences
    });
    setEditedData({
      ...editedData,
      notification_preferences: updatedPreferences
    });
    
    // Save to database
    try {
      const result = await LandlordQueries.updateNotificationPreferences(profileId, updatedPreferences);
      if (result.success) {
        setSuccessMessage('Notification preferences updated!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
      setError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        color: T.textPrimary
      }}>
        <div>Loading profile...</div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <AlertCircle size={48} color={T.red} />
        <p style={{ color: T.textPrimary }}>Error loading profile: {error}</p>
        <PrimaryBtn onClick={loadProfile}>Retry</PrimaryBtn>
      </div>
    );
  }

  const content = (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: isModal ? "0" : "0 1rem" }}>
      {/* Success/Error Messages */}
      {successMessage && (
        <div style={{
          background: "rgba(16,185,129,0.1)",
          border: `1px solid ${T.emerald}`,
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1rem",
          color: T.emerald,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}
      
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          border: `1px solid ${T.red}`,
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1rem",
          color: T.red,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {/* Header Section with Profile Image */}
      <div style={{
        background: `linear-gradient(135deg, ${T.navyMid} 0%, ${T.navy} 100%)`,
        borderRadius: "1rem",
        padding: "2rem",
        marginBottom: "2rem",
        border: `1px solid ${T.border}`,
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(79,126,248,0.1) 0%, transparent 70%)`
        }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          {/* Profile Image */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.accent} 0%, #7c5ef8 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: `3px solid ${T.accent}`,
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)"
            }}>
              {uploadingImage ? (
                <div style={{ color: "#fff" }}>Uploading...</div>
              ) : profile?.profile_image_url ? (
                <img src={profile.profile_image_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={48} color="#fff" />
              )}
            </div>
            <label style={{
              position: "absolute",
              bottom: "0",
              right: "0",
              background: T.accent,
              padding: "8px",
              borderRadius: "50%",
              cursor: "pointer",
              border: `2px solid ${T.navyMid}`,
              transition: "transform 0.15s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <Camera size={16} color="#fff" />
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} disabled={uploadingImage} />
            </label>
          </div>

          {/* Basic Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: T.textPrimary }}>
                {profile?.full_name || profile?.name}
              </h1>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <VerificationBadge verified={profile?.email_verified || false} label="Email Verified" />
                <VerificationBadge verified={profile?.id_verified || false} label="ID Verified" />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: T.textMuted, marginBottom: "1rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Building size={14} /> {profile?.total_properties || 0} Properties
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <User size={14} /> {profile?.total_tenants || 0} Tenants
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Calendar size={14} /> Joined {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={14} color={T.accent} />
                <span style={{ fontSize: "0.85rem", color: T.textSecondary }}>{profile?.email}</span>
                <button
                  onClick={() => copyToClipboard(profile?.email, 'email')}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
                >
                  {copiedField === 'email' ? <Check size={12} color={T.emerald} /> : <Copy size={12} color={T.textMuted} />}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={14} color={T.accent} />
                <span style={{ fontSize: "0.85rem", color: T.textSecondary }}>{profile?.phone || 'Not provided'}</span>
                <button
                  onClick={() => copyToClipboard(profile?.phone, 'phone')}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px" }}
                >
                  {copiedField === 'phone' ? <Check size={12} color={T.emerald} /> : <Copy size={12} color={T.textMuted} />}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <StatCard 
              label="Total Income" 
              value={profile?.total_income ? `${profile.currency || 'ZAR'} ${profile.total_income.toLocaleString()}` : 'R0'} 
              icon={CreditCard} 
            />
            <StatCard label="Properties" value={profile?.total_properties || 0} icon={Building} />
            <StatCard label="Tenants" value={profile?.total_tenants || 0} icon={User} />
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <ProfileSection 
        title="Personal Information" 
        icon={User}
        onEdit={() => handleEdit('personal')}
        isEditing={isEditing.personal}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField 
            label="Full Name" 
            value={editedData.full_name || editedData.name} 
            icon={User}
            isEditing={isEditing.personal}
            onChange={handleFieldChange}
            fieldName="full_name"
          />
          <InfoField 
            label="Company Name" 
            value={editedData.company_name || editedData.companyName} 
            icon={Building}
            isEditing={isEditing.personal}
            onChange={handleFieldChange}
            fieldName="company_name"
          />
          <InfoField 
            label="Tax ID / Registration" 
            value={editedData.tax_id || editedData.taxId} 
            icon={FileText}
            isEditing={isEditing.personal}
            onChange={handleFieldChange}
            fieldName="tax_id"
          />
          <InfoField 
            label="Landlord ID" 
            value={profile?.landlord_code} 
            icon={Shield}
            isEditing={false}
          />
        </div>
        {isEditing.personal && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('personal')} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('personal')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      {/* Contact Information Section */}
      <ProfileSection 
        title="Contact Information" 
        icon={Phone}
        onEdit={() => handleEdit('contact')}
        isEditing={isEditing.contact}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField 
            label="Email Address" 
            value={editedData.email} 
            icon={Mail}
            isEditing={isEditing.contact}
            onChange={handleFieldChange}
            fieldName="email"
            type="email"
          />
          <InfoField 
            label="Phone Number" 
            value={editedData.phone} 
            icon={Phone}
            isEditing={isEditing.contact}
            onChange={handleFieldChange}
            fieldName="phone"
          />
          <InfoField 
            label="Alternative Phone" 
            value={editedData.alternative_phone || editedData.alternativePhone} 
            icon={Phone}
            isEditing={isEditing.contact}
            onChange={handleFieldChange}
            fieldName="alternative_phone"
          />
        </div>
        {isEditing.contact && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('contact')} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('contact')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      {/* Address Information Section */}
      <ProfileSection 
        title="Address Information" 
        icon={MapPin}
        onEdit={() => handleEdit('address')}
        isEditing={isEditing.address}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField 
            label="Street Address" 
            value={editedData.address} 
            icon={MapPin}
            isEditing={isEditing.address}
            onChange={handleFieldChange}
            fieldName="address"
          />
          <InfoField 
            label="City" 
            value={editedData.city} 
            icon={MapPin}
            isEditing={isEditing.address}
            onChange={handleFieldChange}
            fieldName="city"
          />
          <InfoField 
            label="State/Province" 
            value={editedData.state} 
            icon={MapPin}
            isEditing={isEditing.address}
            onChange={handleFieldChange}
            fieldName="state"
          />
          <InfoField 
            label="Postal Code" 
            value={editedData.postal_code || editedData.postalCode} 
            icon={MapPin}
            isEditing={isEditing.address}
            onChange={handleFieldChange}
            fieldName="postal_code"
          />
          <InfoField 
            label="Country" 
            value={editedData.country} 
            icon={Globe}
            isEditing={isEditing.address}
            onChange={handleFieldChange}
            fieldName="country"
          />
        </div>
        {isEditing.address && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('address')} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('address')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      {/* Security & Password Section */}
      <ProfileSection title="Security" icon={Lock}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Change Password</p>
            <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Update your password regularly to keep your account secure</p>
          </div>
          <PrimaryBtn onClick={() => setShowPasswordModal(true)}>
            <Lock size={16} style={{ marginRight: "0.5rem" }} />
            Change Password
          </PrimaryBtn>
        </div>
        
        <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Two-Factor Authentication</p>
              <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Add an extra layer of security to your account</p>
            </div>
            <SecondaryBtn>
              {profile?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
            </SecondaryBtn>
          </div>
        </div>
      </ProfileSection>

      {/* Notification Preferences */}
      <ProfileSection title="Notifications" icon={Bell}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.email || false} 
                onChange={(e) => handleNotificationChange('email', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>Email Notifications</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.sms || false} 
                onChange={(e) => handleNotificationChange('sms', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>SMS Notifications</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.push || false} 
                onChange={(e) => handleNotificationChange('push', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>Push Notifications</span>
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.maintenance || false} 
                onChange={(e) => handleNotificationChange('maintenance', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>Maintenance Alerts</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.payments || false} 
                onChange={(e) => handleNotificationChange('payments', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>Payment Notifications</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={profile?.notification_preferences?.messages || false} 
                onChange={(e) => handleNotificationChange('messages', e.target.checked)}
                style={{ accentColor: T.accent }} 
              />
              <span style={{ color: T.textSecondary }}>New Messages</span>
            </label>
          </div>
        </div>
      </ProfileSection>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: T.textMuted,
              marginBottom: "0.5rem"
            }}>
              Current Password
            </label>
            <input
              type="password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "0.625rem",
                color: T.textPrimary,
                fontSize: "0.9rem",
                fontFamily: "inherit"
              }}
            />
          </div>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: T.textMuted,
              marginBottom: "0.5rem"
            }}>
              New Password
            </label>
            <input
              type="password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "0.625rem",
                color: T.textPrimary,
                fontSize: "0.9rem",
                fontFamily: "inherit"
              }}
            />
          </div>
          <div>
            <label style={{
              display: "block",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: T.textMuted,
              marginBottom: "0.5rem"
            }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              style={{
                width: "100%",
                padding: "0.75rem",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: "0.625rem",
                color: T.textPrimary,
                fontSize: "0.9rem",
                fontFamily: "inherit"
              }}
            />
          </div>
          {error && (
            <div style={{ color: T.red, fontSize: "0.8rem" }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving}>
              {isSaving ? 'Updating...' : 'Update Password'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );

  // If used as modal, return content without layout wrapper
  if (isModal) {
    return content;
  }

  // If used as full page
  return (
    <div style={{
      minHeight: "100vh",
      background: T.navy,
      padding: "2rem 0"
    }}>
      {content}
    </div>
  );
};