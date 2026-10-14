import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Building, Calendar,
  Edit2, Save, Camera, Globe,
  CreditCard, FileText, Shield, CheckCircle,
  AlertCircle, Copy, Check,
  Trash2, Eye, Plus, RefreshCw, Lock, KeyRound
} from 'lucide-react';
import { T, SERIF } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from './Component/Buttons';
import { StatCard } from './Component/StatCard';
import { Modal } from './Component/Modal';
import { DocumentUploadModal } from './Component/DocumentUploadModal';
import { DocumentPreviewModal } from './Component/DocumentPreviewModal';
import { DocumentReplaceModal } from './Component/DocumentReplaceModal';
import { LandlordQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/Supabase';
import { ConfirmModal } from '../../component/AlertModal';
import { initials } from './Styles/helpers';
import Loading from '../../component/loading';

const EYEBROW = { fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: T.textMuted, margin: 0 };

const ProfileSection = ({ title, subtitle, icon: Icon, children, onEdit, isEditing }) => (
  <div style={{
    background: "#ffffff",
    border: `1px solid ${T.border}`,
    borderRadius: T.radiusLg,
    overflow: "hidden",
    marginBottom: "1.5rem",
    boxShadow: T.shadowSm
  }}>
    <div style={{
      padding: "1rem 1.5rem",
      borderBottom: `1px solid ${T.border}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "1rem",
      flexWrap: "wrap",
      background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "0.75rem", background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={18} color={T.accent} />
        </div>
        <div>
          <h2 style={{ fontFamily: SERIF, fontSize: "1.15rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>{title}</h2>
          {subtitle && <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: 1 }}>{subtitle}</p>}
        </div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            padding: "0.5rem 0.9rem",
            background: isEditing ? T.emeraldSoft : "#ffffff",
            border: `1px solid ${isEditing ? T.emeraldBorder : T.borderHover}`,
            borderRadius: 9999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            color: isEditing ? T.emerald : T.textSecondary,
            fontSize: "0.78rem",
            fontWeight: 600,
            transition: "all 0.15s"
          }}
          onMouseEnter={(e) => { if (!isEditing) { e.currentTarget.style.background = "#f0f9ff"; e.currentTarget.style.color = T.accent; } }}
          onMouseLeave={(e) => { if (!isEditing) { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = T.textSecondary; } }}
        >
          {isEditing ? <Save size={15} /> : <Edit2 size={15} />}
          <span>{isEditing ? "Save" : "Edit"}</span>
        </button>
      )}
    </div>
    <div style={{ padding: "1.5rem" }}>
      {children}
    </div>
  </div>
);

const InfoField = ({ label, value, icon: Icon, isEditing, onChange, fieldName, type = "text" }) => (
  <div>
    <label style={{
      display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted,
      marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em"
    }}>
      {label}
    </label>
    {isEditing ? (
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon size={16} color={T.textMuted} style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)" }} />
        )}
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          style={{
            width: "100%",
            padding: Icon ? "0.7rem 0.75rem 0.7rem 2.5rem" : "0.7rem 0.85rem",
            background: "#ffffff",
            border: `1px solid ${T.borderStrong}`,
            borderRadius: "0.75rem",
            color: T.textPrimary,
            fontSize: "0.9rem",
            fontFamily: "inherit",
            outline: "none"
          }}
        />
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: "0.75rem", minHeight: 42 }}>
        {Icon && <Icon size={15} color={T.accent} />}
        <span style={{ color: value ? T.textPrimary : T.textMuted, fontSize: "0.89rem", fontWeight: 500 }}>{value || "Not provided"}</span>
      </div>
    )}
  </div>
);

const VerificationBadge = ({ verified, label }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.75rem",
    background: verified ? T.emeraldSoft : T.redSoft,
    borderRadius: 9999,
    border: `1px solid ${verified ? T.emeraldBorder : T.redBorder}`,
    color: verified ? T.emerald : T.red,
    fontSize: "0.75rem", fontWeight: 700
  }}>
    {verified ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
    <span>{label}</span>
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
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [docToReplace, setDocToReplace] = useState(null);

  const { user } = useAuth();

  const handleConfirmDeleteDoc = async () => {
    if (!docToDelete || !profileId) return;
    setIsDeletingDoc(true);
    try {
      const res = await LandlordQueries.removeVerificationDocument(profileId, docToDelete.id);
      if (res.success) {
        setProfile(res.data);
        setEditedData(res.data);
        setSuccessMessage(`"${docToDelete.title}" removed.`);
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } finally {
      setIsDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  const handleDocumentReplacedInProfile = (updatedProfile, updatedDoc) => {
    if (updatedProfile) {
      setProfile(updatedProfile);
      setEditedData(updatedProfile);
    } else if (updatedDoc) {
      setProfile(prev => ({
        ...prev,
        verification_documents: (prev.verification_documents || []).map(d => d.id === updatedDoc.id ? updatedDoc : d)
      }));
    }
    setSuccessMessage(`"${updatedDoc?.title || 'Document'}" replaced successfully!`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setDocToReplace(null);
  };

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);
    try {
      // Try to get existing profile
      let result = await LandlordQueries.getLandlordProfile(user.id);

      // If profile exists, use it
      if (result.success && result.data) {
        setProfile(result.data);
        setProfileId(result.data.id);
        setEditedData(result.data);

        // Update statistics and last login in background
        LandlordQueries.updateStatistics(result.data.id).catch(console.error);
        LandlordQueries.updateLastLogin(result.data.id).catch(console.error);
      }
      // If no profile found, create one
      else if (result.success && !result.data) {
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
        if (createResult.success && createResult.data) {
          setProfile(createResult.data);
          setProfileId(createResult.data.id);
          setEditedData(createResult.data);

          // Update last login for new profile
          LandlordQueries.updateLastLogin(createResult.data.id).catch(console.error);
        } else {
          throw new Error(createResult.error || 'Failed to create profile');
        }
      }
      else {
        throw new Error(result.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

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

    const targetId = profileId || profile?.id || user?.id;
    if (!targetId) {
      setError("Unable to identify profile record. Please refresh and try again.");
      setIsSaving(false);
      return;
    }

    try {
      let result;

      switch(section) {
        case 'personal':
          result = await LandlordQueries.updatePersonalInfo(targetId, {
            fullName: editedData.full_name || editedData.name,
            companyName: editedData.company_name || editedData.companyName,
            taxId: editedData.tax_id || editedData.taxId
          });
          break;
        case 'contact':
          result = await LandlordQueries.updateContactInfo(targetId, {
            email: editedData.email,
            phone: editedData.phone,
            alternativePhone: editedData.alternative_phone || editedData.alternativePhone,
            contactPreference: editedData.contact_preference || 'both'
          });
          break;
        case 'address':
          result = await LandlordQueries.updateAddressInfo(targetId, {
            address: editedData.address,
            city: editedData.city,
            state: editedData.state,
            country: editedData.country,
            postalCode: editedData.postal_code || editedData.postalCode
          });
          break;
        default:
          result = await LandlordQueries.updateLandlordProfile(targetId, editedData);
      }

      if (result.success) {
        let updatedProfile = result.data;
        if (!updatedProfile && user?.id) {
          const fresh = await LandlordQueries.getLandlordProfile(user.id);
          if (fresh.success && fresh.data) {
            updatedProfile = fresh.data;
          } else {
            updatedProfile = { ...profile, ...editedData };
          }
        }
        if (updatedProfile) {
          setProfile(updatedProfile);
          setEditedData(updatedProfile);
          if (updatedProfile.id && !profileId) setProfileId(updatedProfile.id);
        }
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);

        // Log activity safely
        try {
          await LandlordQueries.logActivity(targetId, 'profile_update', `Updated ${section} information`);
        } catch {
          // ignore
        }
      } else {
        throw new Error(result.error || "Failed to update profile details.");
      }

      setIsEditing({ ...isEditing, [section]: false });
    } catch (error) {
      console.error("Error saving profile:", error);
      setError(error.message || "Failed to save changes.");
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

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError("Only image files are allowed");
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const uploadResult = await LandlordQueries.uploadProfileImage(user.id, file);

      if (uploadResult.success) {
        const updateResult = await LandlordQueries.updateProfileImage(profileId, uploadResult.url);

        if (updateResult.success) {
          setProfile(updateResult.data);
          setEditedData(updateResult.data);
          setSuccessMessage('Profile image updated successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);

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
    return <Loading fullScreen message="Loading profile..." />;
  }

  if (error && !profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh", flexDirection: "column", gap: "1rem" }}>
        <AlertCircle size={48} color={T.red} />
        <p style={{ color: T.textPrimary }}>Error loading profile: {error}</p>
        <PrimaryBtn onClick={loadProfile}>Retry</PrimaryBtn>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.name || "Landlord";

  const content = (
    <div className="ll-scope" style={{ maxWidth: "1200px", margin: "0 auto", minWidth: 0 }}>
      {successMessage && (
        <div style={{
          background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, borderRadius: "0.875rem",
          padding: "0.9rem 1.1rem", marginBottom: "1rem", color: T.emerald,
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600,
          animation: "llToast 0.25s ease-out"
        }}>
          <CheckCircle size={16} />
          {successMessage}
        </div>
      )}

      {error && (
        <div style={{
          background: T.redSoft, border: `1px solid ${T.redBorder}`, borderRadius: "0.875rem",
          padding: "0.9rem 1.1rem", marginBottom: "1rem", color: T.red,
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* HERO */}
      <div className="ll-anim-up" style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 55%, #eef6ff 100%)",
        borderRadius: T.radiusXl,
        padding: "clamp(1.5rem, 4vw, 2.25rem)",
        marginBottom: "1.75rem",
        border: `1px solid ${T.border}`,
        position: "relative",
        overflow: "hidden",
        boxShadow: T.shadow
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: "linear-gradient(90deg,#7dd3fc,#0ea5e9,#2563eb)" }} />
        <div style={{ position: "absolute", top: "-40%", right: "-8%", width: "320px", height: "320px", borderRadius: "50%", background: `radial-gradient(circle, rgba(56,189,248,0.16) 0%, transparent 70%)` }} />
        <div style={{ position: "absolute", bottom: "-50%", left: "30%", width: "260px", height: "260px", borderRadius: "50%", background: `radial-gradient(circle, rgba(129,140,248,0.12) 0%, transparent 70%)` }} />

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: "120px", height: "120px", borderRadius: "50%",
              background: `linear-gradient(135deg, ${T.accent} 0%, #7c3aed 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
              border: "3px solid #ffffff",
              boxShadow: "0 14px 34px -12px rgba(2,132,199,0.7)"
            }}>
              {uploadingImage ? (
                <div style={{ color: "#fff", fontSize: "0.75rem" }}>Uploading…</div>
              ) : profile?.profile_image_url ? (
                <img src={profile.profile_image_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: SERIF, fontSize: "2.6rem", color: "#fff" }}>{initials(displayName)}</span>
              )}
            </div>
            <label style={{
              position: "absolute", bottom: "2px", right: "2px",
              background: T.accent, padding: "9px", borderRadius: "50%", cursor: "pointer",
              border: "3px solid #ffffff", transition: "transform 0.15s", boxShadow: T.shadowSm
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <Camera size={15} color="#fff" />
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} disabled={uploadingImage} />
            </label>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
              <h1 style={{ fontFamily: SERIF, fontSize: "clamp(1.7rem, 4vw, 2.4rem)", color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
                {displayName}
              </h1>
              {profile?.landlord_code && (
                <span style={{
                  background: T.accentSoft, color: T.accent, fontSize: "0.7rem", fontWeight: 800,
                  padding: "4px 11px", borderRadius: 9999, border: `1px solid ${T.accentBorder}`, letterSpacing: "0.04em"
                }}>
                  {profile.landlord_code}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
              <VerificationBadge verified={profile?.ownership_proof_verified || false} label="Ownership Verified" />
              <VerificationBadge verified={profile?.email_verified || false} label="Email Verified" />
              <VerificationBadge verified={profile?.id_verified || false} label="ID Verified" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", color: T.textSecondary, marginBottom: "1rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Building size={14} color={T.accent} /> {profile?.total_properties || 0} Properties
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <User size={14} color={T.accent} /> {profile?.total_tenants || 0} Tenants
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Calendar size={14} color={T.accent} /> Joined {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={14} color={T.accent} />
                <span style={{ fontSize: "0.84rem", color: T.textSecondary }}>{profile?.email}</span>
                <button
                  onClick={() => copyToClipboard(profile?.email, 'email')}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
                >
                  {copiedField === 'email' ? <Check size={13} color={T.emerald} /> : <Copy size={13} color={T.textMuted} />}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Phone size={14} color={T.accent} />
                <span style={{ fontSize: "0.84rem", color: T.textSecondary }}>{profile?.phone || 'Not provided'}</span>
                <button
                  onClick={() => copyToClipboard(profile?.phone, 'phone')}
                  style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", display: "flex" }}
                >
                  {copiedField === 'phone' ? <Check size={13} color={T.emerald} /> : <Copy size={13} color={T.textMuted} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1.75rem", position: "relative", zIndex: 1 }}>
          <StatCard
            label="Total Income"
            value={profile?.total_income ? `R ${Number(profile.total_income).toLocaleString()}` : 'R0'}
            icon="CreditCard"
            accent={T.emerald}
          />
          <StatCard label="Properties" value={String(profile?.total_properties || 0)} icon="Building" accent={T.accent} />
          <StatCard label="Tenants" value={String(profile?.total_tenants || 0)} icon="Users" accent={T.purple} />
          <StatCard label="Trust Rating" value={`${profile?.trust_score || 100}%`} icon="Shield" accent={T.amber} />
        </div>
      </div>

      {/* Personal Information Section */}
      <ProfileSection
        title="Personal Information"
        subtitle="Identity and business registration details"
        icon={User}
        onEdit={() => handleEdit('personal')}
        isEditing={isEditing.personal}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
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
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
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
        subtitle="How tenants and agents reach you"
        icon={Phone}
        onEdit={() => handleEdit('contact')}
        isEditing={isEditing.contact}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
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
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
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
        subtitle="Registered place of business"
        icon={MapPin}
        onEdit={() => handleEdit('address')}
        isEditing={isEditing.address}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
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
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.25rem" }}>
            <PrimaryBtn onClick={() => handleEdit('address')} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('address')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      {/* Proof of Ownership & Verification Documents Section */}
      <div style={{
        background: "#ffffff", border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: "hidden", marginBottom: "1.5rem", boxShadow: T.shadowSm
      }}>
        <div style={{
          padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex",
          justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
          background: "linear-gradient(135deg, #ffffff 0%, #f3f9ff 100%)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 38, height: 38, borderRadius: "0.75rem", background: T.emeraldSoft, border: `1px solid ${T.emeraldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color={T.emerald} />
            </div>
            <div>
              <h2 style={{ fontFamily: SERIF, fontSize: "1.15rem", color: T.textPrimary, letterSpacing: "-0.01em" }}>
                Proof of Ownership & Verification Documents
              </h2>
              <p style={{ fontSize: "0.75rem", color: T.textMuted, marginTop: "2px" }}>
                Title deeds, municipal rates, ID documents, and compliance certificates
              </p>
            </div>
          </div>
          <PrimaryBtn onClick={() => setShowUploadDocModal(true)}>
            <Plus size={15} /> Upload Document
          </PrimaryBtn>
        </div>

        <div style={{ padding: "1.5rem" }}>
          {profile?.verification_documents && profile.verification_documents.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {profile.verification_documents.map((doc, idx) => (
                <div
                  key={doc.id || idx}
                  className="ll-card-hover"
                  style={{
                    background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: "1rem",
                    padding: "1rem", display: "flex", flexDirection: "column", gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "0.6rem", background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Shield size={16} color={T.accent} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: "0.64rem", textTransform: "uppercase", color: T.accent, fontWeight: 800, letterSpacing: "0.05em" }}>
                          {doc.documentType === "ownership" ? "Proof of Ownership" : doc.documentType}
                        </span>
                        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: T.textPrimary, lineHeight: 1.25 }}>
                          {doc.title}
                        </h4>
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.62rem", fontWeight: 800, padding: "3px 8px", borderRadius: 9999,
                      background: T.emeraldSoft, color: T.emerald, border: `1px solid ${T.emeraldBorder}`, flexShrink: 0
                    }}>
                      VERIFIED
                    </span>
                  </div>

                  <p style={{ fontSize: "0.75rem", color: T.textMuted }}>
                    Property: <strong style={{ color: T.textPrimary }}>{doc.propertyName || "Portfolio-wide"}</strong>
                  </p>
                  <p style={{ fontSize: "0.7rem", color: T.textMuted }}>
                    {doc.fileName} • {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Active"}
                  </p>

                  <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                    <button
                      onClick={() => { setSelectedPreviewDoc(doc); setIsPreviewOpen(true); }}
                      style={{
                        flex: 1, padding: "7px", background: T.accentSoft, border: `1px solid ${T.accentBorder}`,
                        borderRadius: 9999, color: T.accent, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.accent; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = T.accentSoft; e.currentTarget.style.color = T.accent; }}
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      onClick={() => setDocToReplace(doc)}
                      title="Replace with new file"
                      style={{
                        padding: "7px 11px", background: "#ffffff", border: `1px solid ${T.borderStrong}`,
                        borderRadius: 9999, color: T.textMuted, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "0.78rem", fontWeight: 600, transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = T.accentBorder; e.currentTarget.style.background = T.accentSofter; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = "#ffffff"; }}
                    >
                      <RefreshCw size={13} /> Replace
                    </button>
                    <button
                      onClick={() => setDocToDelete(doc)}
                      title="Remove document"
                      style={{
                        padding: "7px 11px", background: "#ffffff", border: `1px solid ${T.borderStrong}`,
                        borderRadius: 9999, color: T.textMuted, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.redBorder; e.currentTarget.style.background = T.redSoft; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.borderStrong; e.currentTarget.style.background = "#ffffff"; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: "center", padding: "2.5rem 2rem", background: T.surfaceAlt,
              borderRadius: "1rem", border: `1px dashed ${T.borderHover}`
            }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                <Shield size={26} color={T.accent} />
              </div>
              <p style={{ color: T.textPrimary, fontWeight: 700, fontSize: "1rem", fontFamily: SERIF }}>
                No verification documents uploaded yet
              </p>
              <p style={{ color: T.textMuted, fontSize: "0.82rem", maxWidth: "420px", margin: "6px auto 1.25rem", lineHeight: 1.6 }}>
                Upload your Title Deed or municipal rates clearance to get your landlord ownership verified.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <PrimaryBtn onClick={() => setShowUploadDocModal(true)}>
                  <Plus size={14} /> Upload Proof of Ownership
                </PrimaryBtn>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <ProfileSection title="Security" subtitle="Password and account protection" icon={Lock}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: "0.875rem", padding: "1.1rem 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.accentSoft, border: `1px solid ${T.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={18} color={T.accent} />
            </div>
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 700, color: T.textPrimary }}>Account password</p>
              <p style={{ fontSize: "0.76rem", color: T.textMuted, marginTop: 2 }}>Use a strong password you don't reuse elsewhere.</p>
            </div>
          </div>
          <SecondaryBtn onClick={() => setShowPasswordModal(true)}><Lock size={15} /> Change Password</SecondaryBtn>
        </div>
      </ProfileSection>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
        subtitle="Choose a new password for your landlord account"
        size="sm"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              New Password
            </label>
            <input
              type="password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              placeholder="At least 6 characters"
              style={{ width: "100%", padding: "0.7rem 0.85rem", background: "#ffffff", border: `1px solid ${T.borderStrong}`, borderRadius: "0.75rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 700, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              placeholder="Re-enter new password"
              style={{ width: "100%", padding: "0.7rem 0.85rem", background: "#ffffff", border: `1px solid ${T.borderStrong}`, borderRadius: "0.75rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "0.25rem" }}>
            <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? "Updating..." : "Update Password"}
            </PrimaryBtn>
            <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>

      <DocumentUploadModal
        isOpen={showUploadDocModal}
        onClose={() => setShowUploadDocModal(false)}
        profile={profile}
        user={user}
        defaultCategory="ownership"
        onDocumentUploaded={(updatedProfile) => {
          setProfile(updatedProfile);
          setEditedData(updatedProfile);
          setSuccessMessage("Proof of ownership document uploaded successfully!");
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />

      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        document={selectedPreviewDoc}
        profile={profile}
        user={user}
        onReplace={handleDocumentReplacedInProfile}
        onDelete={async (docId) => {
          const res = await LandlordQueries.removeVerificationDocument(profileId, docId);
          if (res.success) {
            setProfile(res.data);
            setEditedData(res.data);
            setSuccessMessage("Document removed.");
            setTimeout(() => setSuccessMessage(null), 2500);
          }
        }}
      />

      {/* Document Replace Modal */}
      <DocumentReplaceModal
        isOpen={!!docToReplace}
        onClose={() => setDocToReplace(null)}
        document={docToReplace}
        profile={profile}
        user={user}
        onDocumentReplaced={handleDocumentReplacedInProfile}
      />

      {/* Styled Document Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={!!docToDelete}
        title="Remove Verification Document?"
        itemName={docToDelete?.title}
        message="Are you sure you want to remove this verification document from your profile? This cannot be undone."
        confirmText="Yes, Remove Document"
        cancelText="Cancel"
        type="danger"
        isLoading={isDeletingDoc}
        onConfirm={handleConfirmDeleteDoc}
        onCancel={() => !isDeletingDoc && setDocToDelete(null)}
      />
    </div>
  );

  return content;
};
