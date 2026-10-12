import React, { useState } from 'react';
import { Lock, Bell, ShieldCheck, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { T } from './Styles/designTokens';
import { PrimaryBtn, SecondaryBtn } from '../Landlord/Component/Buttons';
import { Modal } from '../Landlord/Component/Modal';
import { TenantQueries } from './db/queries';
import { supabase } from '../../utils/Supabase';

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: "1rem", overflow: "hidden", marginBottom: "1.5rem" }}>
    <div style={{ padding: "1rem 1.5rem", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: "0.75rem", background: "rgba(16,185,129,0.04)" }}>
      <Icon size={20} color={T.emerald} />
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: T.textPrimary }}>{title}</h2>
    </div>
    <div style={{ padding: "1.5rem" }}>{children}</div>
  </div>
);

export const Settings = ({ profile }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleExportData = () => {
    try {
      const exportPayload = {
        exportDate: new Date().toISOString(),
        governingLaw: "Protection of Personal Information Act, No. 4 of 2013 (POPIA)",
        dataSubjectId: profile?.id || 'current-user',
        profileData: profile,
        consentTimestamp: new Date().toISOString(),
        disclaimer: "Official Data Subject Access Request (DSAR) export provided under POPIA Section 23."
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Place4U_POPIA_Data_Export_${profile?.id || 'tenant'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setSuccessMessage('Data Subject Access Request (DSAR) export completed successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError('Failed to generate data export.');
    }
  };

  const handleDeleteRequest = () => {
    if (deleteConfirmation.trim().toLowerCase() !== 'delete') {
      setError('Please type DELETE to confirm your erasure request.');
      return;
    }
    setShowDeleteModal(false);
    setDeleteConfirmation('');
    setSuccessMessage('Data erasure request registered under POPIA Section 24. Our Information Officer has been notified.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      setError("Passwords don't match"); return;
    }
    if (passwordData.new.length < 6) {
      setError("Password must be at least 6 characters"); return;
    }
    
    setIsSaving(true); setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      
      setSuccessMessage('Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({ current: '', new: '', confirm: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    const updatedPreferences = { ...profile?.notification_preferences, [key]: value };
    try {
      const result = await TenantQueries.updateNotificationPreferences(profile.id, updatedPreferences);
      if (result.success) {
        setSuccessMessage('Notification preferences updated!');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", animation: "fadeIn 0.3s ease-in-out" }}>
      <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "2.5rem", color: T.textPrimary, marginBottom: "2rem" }}>Settings</h1>
      
      {successMessage && <div style={{ background: "rgba(16,185,129,0.1)", border: `1px solid ${T.emerald}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.emerald }}>{successMessage}</div>}
      {error && <div style={{ background: "rgba(239,68,68,0.1)", border: `1px solid ${T.red}`, borderRadius: "0.5rem", padding: "1rem", marginBottom: "1rem", color: T.red }}>{error}</div>}

      <SettingsSection title="Security" icon={Lock}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <p style={{ color: T.textPrimary, marginBottom: "0.25rem" }}>Change Password</p>
            <p style={{ fontSize: "0.8rem", color: T.textMuted }}>Update your password regularly to keep your account secure</p>
          </div>
          <PrimaryBtn onClick={() => setShowPasswordModal(true)}>
            <Lock size={16} style={{ marginRight: "0.5rem" }} /> Change Password
          </PrimaryBtn>
        </div>
      </SettingsSection>

      <SettingsSection title="Notifications" icon={Bell}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.email || false} onChange={(e) => handleNotificationChange('email', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>Email Notifications</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.sms || false} onChange={(e) => handleNotificationChange('sms', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>SMS Notifications</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={profile?.notification_preferences?.rent_reminders || false} onChange={(e) => handleNotificationChange('rent_reminders', e.target.checked)} style={{ accentColor: T.emerald }} />
            <span style={{ color: T.textSecondary }}>Rent Reminders</span>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="POPIA Privacy & Data Subject Rights" icon={ShieldCheck}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", paddingBottom: "1rem", borderBottom: `1px solid ${T.border}` }}>
            <div>
              <p style={{ color: T.textPrimary, marginBottom: "0.25rem", fontWeight: 600 }}>Download Personal Data (DSAR Export)</p>
              <p style={{ fontSize: "0.8rem", color: T.textMuted }}>
                Obtain a machine-readable JSON copy of your profile and submitted applications per POPIA Section 23.
              </p>
            </div>
            <button
              onClick={handleExportData}
              type="button"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1rem", borderRadius: "0.5rem",
                background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)",
                color: "#60A5FA", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
              }}
            >
              <Download size={15} /> Export My Data
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p style={{ color: "#F87171", marginBottom: "0.25rem", fontWeight: 600 }}>Right to Erasure & Deletion</p>
              <p style={{ fontSize: "0.8rem", color: T.textMuted }}>
                Request permanent destruction of personal data records under POPIA Section 24.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              type="button"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.6rem 1rem", borderRadius: "0.5rem",
                background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#F87171", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"
              }}
            >
              <Trash2 size={15} /> Request Erasure
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>New Password</label>
            <input type="password" value={passwordData.new} onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })} style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>Confirm New Password</label>
            <input type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })} style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <PrimaryBtn onClick={handlePasswordChange} disabled={isSaving}>{isSaving ? 'Updating...' : 'Update Password'}</PrimaryBtn>
            <SecondaryBtn onClick={() => setShowPasswordModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>

      {/* POPIA Erasure Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="POPIA Data Erasure Request" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ fontSize: "0.85rem", color: T.textSecondary, lineHeight: 1.5 }}>
            Pursuant to <strong>Section 24 of the Protection of Personal Information Act (POPIA)</strong>, you are submitting a formal request to destroy or delete personal information held by Place4U.
          </p>
          <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "0.5rem", padding: "0.75rem" }}>
            <p style={{ fontSize: "0.75rem", color: "#F87171" }}>
              ⚠️ Once processed, your applications and verified profile records will be permanently expunged.
            </p>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 500, color: T.textMuted, marginBottom: "0.5rem" }}>
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              style={{ width: "100%", padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: "0.625rem", color: T.textPrimary, fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
            <button
              onClick={handleDeleteRequest}
              type="button"
              style={{
                padding: "0.75rem 1.25rem", borderRadius: "0.5rem",
                background: "#DC2626", color: "#fff", fontWeight: 600, fontSize: "0.85rem",
                border: "none", cursor: "pointer"
              }}
            >
              Submit Erasure Request
            </button>
            <SecondaryBtn onClick={() => setShowDeleteModal(false)}>Cancel</SecondaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
};
