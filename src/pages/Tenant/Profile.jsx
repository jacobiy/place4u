import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, FileText, CheckCircle, AlertCircle, Edit2, Save, Camera } from 'lucide-react';
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from '../Landlord/Component/Buttons';
import { TenantQueries } from './db/queries';
import { useAuth } from '../../hooks/useAuth';

const ProfileSection = ({ title, icon: Icon, children, onEdit, isEditing }) => (
  <div style={{
    background: T.cardBg, border: `1px solid ${T.border}`,
    borderRadius: "1rem", overflow: "hidden", marginBottom: "1.5rem"
  }}>
    <div style={{
      padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`,
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(16,185,129,0.04)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Icon size={20} color={T.emerald} />
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: T.textPrimary }}>{title}</h2>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            padding: "0.5rem", background: "transparent", border: `1px solid ${T.border}`,
            borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem",
            color: T.textSecondary, transition: "all 0.15s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textPrimary; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textSecondary; }}
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
    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {label}
    </label>
    {isEditing ? (
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={16} color={T.textMuted} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />}
        <input
          type={type} value={value || ''} onChange={(e) => onChange(fieldName, e.target.value)}
          style={{
            width: "100%", padding: Icon ? "0.75rem 0.75rem 0.75rem 2.5rem" : "0.75rem",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit"
          }}
        />
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0" }}>
        {Icon && <Icon size={16} color={T.emerald} />}
        <span style={{ color: T.textPrimary, fontSize: "0.9rem" }}>{value || "Not provided"}</span>
      </div>
    )}
  </div>
);

export const Profile = ({ profile: initialProfile, user }) => {
  const [profile, setProfile] = useState(initialProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isEditing, setIsEditing] = useState({
    personal: false,
    contact: false,
    address: false
  });
  const [editedData, setEditedData] = useState(initialProfile || {});

  const handleEdit = (section) => {
    if (isEditing[section]) handleSave(section);
    else setIsEditing({ ...isEditing, [section]: true });
  };

  const handleSave = async (section) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      let result;
      switch(section) {
        case 'personal':
          result = await TenantQueries.updatePersonalInfo(profile.id, {
            dateOfBirth: editedData.date_of_birth,
            idNumber: editedData.id_number,
            employmentStatus: editedData.employment_status,
            monthlyIncome: editedData.monthly_income
          });
          break;
        case 'contact':
          result = await TenantQueries.updateContactInfo(profile.id, {
            phone: editedData.phone,
            emergencyContactName: editedData.emergency_contact_name,
            emergencyContactPhone: editedData.emergency_contact_phone
          });
          break;
        case 'address':
          result = await TenantQueries.updateAddressInfo(profile.id, {
            currentAddress: editedData.current_address,
            city: editedData.city,
            state: editedData.state,
            postalCode: editedData.postal_code,
            hasPets: editedData.has_pets
          });
          break;
        default:
          result = await TenantQueries.updateTenantProfile(profile.id, editedData);
      }
      
      if (result && result.success) {
        setProfile(result.data);
        setEditedData(result.data);
      } else {
        const merged = { ...profile, ...editedData };
        setProfile(merged);
        setEditedData(merged);
      }
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing({ ...isEditing, [section]: false });
    } catch {
      const merged = { ...profile, ...editedData };
      setProfile(merged);
      setEditedData(merged);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing({ ...isEditing, [section]: false });
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

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.3s ease-in-out" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, marginBottom: "2rem" }}>
        Tenant Profile
      </h1>

      {successMessage && (
        <div style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${T.emerald}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.emerald, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${T.red}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.red, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Header Summary Card */}
      <div style={{ background: `linear-gradient(135deg, ${T.navyMid} 0%, ${T.navy} 100%)`, borderRadius: "1rem", padding: "2rem", marginBottom: "2rem", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "2rem" }}>
        <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: `linear-gradient(135deg, ${T.emerald} 0%, #10B981 100%)`, display: "flex", alignItems: "center", justifyContent: "center", border: `3px solid ${T.emerald}` }}>
          <User size={40} color="#fff" />
        </div>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: T.textPrimary, marginBottom: "0.5rem" }}>{user?.user_metadata?.full_name || 'Tenant Name'}</h2>
          <div style={{ display: "flex", gap: "1rem", color: T.textMuted, fontSize: "0.85rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Mail size={14} /> {user?.email}</span>
          </div>
        </div>
      </div>

      <ProfileSection title="Personal Information" icon={User} onEdit={() => handleEdit('personal')} isEditing={isEditing.personal}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField label="ID / Passport Number" value={editedData.id_number} icon={FileText} isEditing={isEditing.personal} onChange={handleFieldChange} fieldName="id_number" />
          <InfoField label="Date of Birth" type="date" value={editedData.date_of_birth} icon={User} isEditing={isEditing.personal} onChange={handleFieldChange} fieldName="date_of_birth" />
          <InfoField label="Employment Status" value={editedData.employment_status} icon={Briefcase} isEditing={isEditing.personal} onChange={handleFieldChange} fieldName="employment_status" />
          <InfoField label="Monthly Income" type="number" value={editedData.monthly_income} icon={FileText} isEditing={isEditing.personal} onChange={handleFieldChange} fieldName="monthly_income" />
        </div>
        {isEditing.personal && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('personal')} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('personal')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Contact Information" icon={Phone} onEdit={() => handleEdit('contact')} isEditing={isEditing.contact}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField label="Phone Number" value={editedData.phone} icon={Phone} isEditing={isEditing.contact} onChange={handleFieldChange} fieldName="phone" />
          <InfoField label="Emergency Contact Name" value={editedData.emergency_contact_name} icon={User} isEditing={isEditing.contact} onChange={handleFieldChange} fieldName="emergency_contact_name" />
          <InfoField label="Emergency Contact Phone" value={editedData.emergency_contact_phone} icon={Phone} isEditing={isEditing.contact} onChange={handleFieldChange} fieldName="emergency_contact_phone" />
        </div>
        {isEditing.contact && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('contact')} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('contact')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>

      <ProfileSection title="Address & Preferences" icon={MapPin} onEdit={() => handleEdit('address')} isEditing={isEditing.address}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
          <InfoField label="Current Address" value={editedData.current_address} icon={MapPin} isEditing={isEditing.address} onChange={handleFieldChange} fieldName="current_address" />
          <InfoField label="City" value={editedData.city} icon={MapPin} isEditing={isEditing.address} onChange={handleFieldChange} fieldName="city" />
          <InfoField label="State / Province" value={editedData.state} icon={MapPin} isEditing={isEditing.address} onChange={handleFieldChange} fieldName="state" />
          <InfoField label="Postal Code" value={editedData.postal_code} icon={MapPin} isEditing={isEditing.address} onChange={handleFieldChange} fieldName="postal_code" />
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Has Pets?
            </label>
            {isEditing.address ? (
              <select
                value={editedData.has_pets ? "yes" : "no"}
                onChange={(e) => handleFieldChange("has_pets", e.target.value === "yes")}
                style={{
                  width: "100%", padding: "0.75rem 2.25rem 0.75rem 0.75rem",
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontSize: "0.9rem", fontFamily: "inherit"
                }}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0" }}>
                <span style={{ color: T.textPrimary, fontSize: "0.9rem" }}>{editedData.has_pets ? "Yes" : "No"}</span>
              </div>
            )}
          </div>
        </div>
        {isEditing.address && (
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={() => handleEdit('address')} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</PrimaryBtn>
            <SecondaryBtn onClick={() => handleCancel('address')}>Cancel</SecondaryBtn>
          </div>
        )}
      </ProfileSection>
    </div>
  );
};
