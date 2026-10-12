import React, { useState, useEffect } from 'react';
import { User, Building, MapPin, Briefcase, Phone, FileText, CheckCircle, AlertCircle, Award, Save } from 'lucide-react';
import { AgentQueries } from './db/queries';
import './Profile.css';

export const Profile = ({ userRow, profile, user, onRefresh }) => {
  const [formData, setFormData] = useState({
    agency_name: profile?.agency_name || '',
    phone: profile?.phone || userRow?.phone || '',
    office_address: profile?.address || profile?.office_address || '',
    license_number: profile?.tax_number || profile?.license_number || '',
    years_experience: profile?.experience_years ?? profile?.years_experience ?? '',
    bio: profile?.bio || '',
    full_name: profile?.full_name || userRow?.full_name || ''
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null);

  // Update form data if profile loads asynchronously
  useEffect(() => {
    if (profile || userRow) {
      setFormData(prev => ({
        ...prev,
        agency_name: profile?.agency_name || prev.agency_name || '',
        phone: profile?.phone || userRow?.phone || prev.phone || '',
        office_address: profile?.address || profile?.office_address || prev.office_address || '',
        license_number: profile?.tax_number || profile?.license_number || prev.license_number || '',
        years_experience: profile?.experience_years ?? profile?.years_experience ?? prev.years_experience ?? '',
        bio: profile?.bio || prev.bio || '',
        full_name: profile?.full_name || userRow?.full_name || prev.full_name || ''
      }));
    }
  }, [profile, userRow]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const targetId = profile?.id || profile?.user_id || userRow?.id || user?.id;
      if (!targetId) throw new Error("Agent user ID not found.");

      const payload = {
        agency_name: formData.agency_name || null,
        phone: formData.phone || null,
        office_address: formData.office_address || null,
        address: formData.office_address || null,
        license_number: formData.license_number || null,
        tax_number: formData.license_number || null,
        years_experience: formData.years_experience ? parseInt(formData.years_experience) : null,
        experience_years: formData.years_experience ? parseInt(formData.years_experience) : null,
        bio: formData.bio || null
      };

      const result = await AgentQueries.updateAgentProfile(targetId, payload);
      
      if (result.success) {
        setStatus({ type: 'success', message: 'Profile updated successfully!' });
        if (onRefresh) onRefresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const isVerified = Boolean(profile?.is_verified === true);
  const isPending = profile?.verification_status === 'pending_review' || profile?.verification_status === 'interview_scheduled';

  return (
    <div className="profile-container">
      <div className="profile-wrapper">
        {/* Header */}
        <div className="profile-header">
          <div>
            <h1 className="profile-title">Agent Profile</h1>
            <p className="profile-subtitle">Manage your agency details, license information, and professional bio.</p>
          </div>
          <div className="profile-avatar">
            <User size={32} />
          </div>
        </div>

        {/* Verification Status Banner */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: isVerified 
            ? 'rgba(16, 185, 129, 0.1)' 
            : isPending 
            ? 'rgba(59, 130, 246, 0.1)' 
            : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${
            isVerified 
              ? 'rgba(16, 185, 129, 0.3)' 
              : isPending 
              ? 'rgba(59, 130, 246, 0.3)' 
              : 'rgba(245, 158, 11, 0.3)'
          }`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isVerified ? '#10b981' : isPending ? '#3b82f6' : '#f59e0b'
            }} />
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: isVerified ? '#10b981' : isPending ? '#60a5fa' : '#f59e0b'
              }}>
                {isVerified 
                  ? 'Verified Agent (FICA Compliant)' 
                  : isPending 
                  ? 'Verification Pending Review' 
                  : 'Account Inactive • Verification Required'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {isVerified 
                  ? 'Your profile is approved. You have full access to tenant matching and listings.' 
                  : isPending 
                  ? 'Your FICA documents and interview request are under review by Place4U compliance.' 
                  : 'Please complete your FICA document submission and interview on the dashboard to unlock all agent features.'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          {/* Basic Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <Briefcase size={20} className="section-icon" />
              <h2 className="section-title">Professional Details</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Agency Name</label>
                <div className="input-wrapper">
                  <Building size={18} className="input-icon" />
                  <input 
                    type="text" 
                    name="agency_name" 
                    value={formData.agency_name} 
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. Pam Golding Properties"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">License Number</label>
                <div className="input-wrapper">
                  <Award size={18} className="input-icon" />
                  <input 
                    type="text" 
                    name="license_number" 
                    value={formData.license_number} 
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. FFC-123456"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Years of Experience</label>
                <div className="input-wrapper">
                  <Award size={18} className="input-icon" />
                  <input 
                    type="number" 
                    name="years_experience" 
                    value={formData.years_experience} 
                    onChange={handleChange} 
                    min="0"
                    className="form-input"
                    placeholder="e.g. 5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input 
                    type="text" 
                    name="full_name" 
                    value={formData.full_name} 
                    disabled
                    className="form-input disabled"
                    placeholder="Your full name"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="profile-section">
            <div className="section-header">
              <Phone size={20} className="section-icon" />
              <h2 className="section-title">Contact & Office</h2>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Work Phone</label>
                <div className="input-wrapper">
                  <Phone size={18} className="input-icon" />
                  <input 
                    type="tel" 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g. 021 555 1234"
                  />
                </div>
              </div>
              
              <div className="form-group full-width">
                <label className="form-label">Office Address</label>
                <div className="input-wrapper">
                  <MapPin size={18} className="input-icon textarea-icon" />
                  <textarea 
                    name="office_address" 
                    value={formData.office_address} 
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="Enter full office address"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* About / Bio Section */}
          <div className="profile-section">
            <div className="section-header">
              <FileText size={20} className="section-icon" />
              <h2 className="section-title">Agent Biography</h2>
            </div>
            
            <div className="form-group full-width">
              <label className="form-label">Bio</label>
              <div className="input-wrapper">
                <textarea 
                  name="bio" 
                  value={formData.bio} 
                  onChange={handleChange}
                  className="form-textarea bio-textarea"
                  placeholder="Write a compelling biography that tenants and landlords will see..."
                  rows={6}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <div className="status-message">
              {status?.type === 'success' && (
                <div className="status-success">
                  <CheckCircle size={18} />
                  <span>{status.message}</span>
                </div>
              )}
              {status?.type === 'error' && (
                <div className="status-error">
                  <AlertCircle size={18} />
                  <span>{status.message}</span>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={isSaving}
              className="save-button"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};